import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { URL } from 'node:url';
import { tryConfigSetSecret } from '../../config/manage.js';
import { loadSecrets } from '../../config/secretStore.js';
import { readEnvSettings } from '../../config/env.js';
import {
  buildAuthUrl,
  exchangeCode,
  resolveGadsOAuthRedirect,
  startServerOnPort,
} from '../keywordplanner/oauth.js';

const DEFAULT_REDIRECT_PORT = 9876;
const MAX_PORT_ATTEMPTS = 4;
const HTTP_TIMEOUT_MS = 120_000;

export type GadsLoginStatus = 'not_started' | 'pending' | 'completed' | 'timed_out';

export interface GadsLoginState {
  status: GadsLoginStatus;
  authUrl: string;
  port: number;
  startedAt: number;
  message?: string;
  refreshToken?: string;
  saved?: boolean;
}

let currentState: GadsLoginState = {
  status: 'not_started',
  authUrl: '',
  port: 0,
  startedAt: 0,
};

let activeServer: Server | null = null;
let activeTimeout: ReturnType<typeof setTimeout> | null = null;

export function getGadsLoginStatus(): GadsLoginState {
  return { ...currentState };
}

export function resetGadsLoginState(): void {
  currentState = {
    status: 'not_started',
    authUrl: '',
    port: 0,
    startedAt: 0,
  };
}

async function handleCallback(
  req: IncomingMessage,
  res: ServerResponse,
  redirectPath: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname !== redirectPath) {
    res.writeHead(404);
    res.end('Not found.');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    cleanup();
    currentState = {
      ...currentState,
      status: 'timed_out',
      message: `OAuth authorization error: ${error}`,
    };
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h1>Authorization failed</h1><p>${error}</p><p>Close this window and try again.</p>`);
    return;
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>Missing authorization code</h1><p>Close this window and try again.</p>');
    return;
  }

  try {
    const refreshToken = await exchangeCode(
      code,
      clientId,
      clientSecret,
      redirectUri,
      { fetch: globalThis.fetch.bind(globalThis) },
    );

    const saveResult = await tryConfigSetSecret('googleAdsRefreshToken', refreshToken);

    cleanup();
    currentState = {
      ...currentState,
      status: 'completed',
      saved: saveResult.saved,
      refreshToken: saveResult.saved ? undefined : refreshToken,
    };

    const savedMessage = saveResult.saved
      ? 'Google Ads credentials saved. You can close this window and return to your MCP client.'
      : 'Authorization successful. Persist TELEPAT_GOOGLE_ADS_REFRESH_TOKEN in your environment and restart the toolbox container.';

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h1>Authorization successful</h1><p>${savedMessage}</p>`);
  } catch (exchangeError) {
    cleanup();
    const message = exchangeError instanceof Error ? exchangeError.message : 'Unknown error';
    currentState = {
      ...currentState,
      status: 'timed_out',
      message: `Token exchange failed: ${message}`,
    };
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(
      `<h1>Token exchange failed</h1>` +
      `<p>${message}</p>` +
      `<p>Close this window and try again.</p>`,
    );
  }
}

function cleanup(): void {
  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }
  if (activeServer && activeServer.listening) {
    activeServer.close();
    activeServer = null;
  }
}

export interface GadsLoginStartParams {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  customerId: string;
  loginCustomerId?: string;
  force?: boolean;
}

export async function startGadsLogin(params: GadsLoginStartParams): Promise<GadsLoginState> {
  if (currentState.status === 'pending' && activeServer) {
    return getGadsLoginStatus();
  }

  const envSettings = readEnvSettings();
  const secrets = await loadSecrets({ disableKeytar: envSettings.disableKeytar });
  const hasRefreshToken = Boolean(envSettings.googleAdsRefreshToken ?? secrets.googleAdsRefreshToken);

  if (hasRefreshToken && !params.force) {
    throw new Error(
      'Already authenticated with Google Ads. Pass force=true to re-authorize.',
    );
  }

  await tryConfigSetSecret('googleAdsDeveloperToken', params.developerToken);
  await tryConfigSetSecret('googleAdsClientId', params.clientId);
  await tryConfigSetSecret('googleAdsClientSecret', params.clientSecret);
  await tryConfigSetSecret('googleAdsCustomerId', params.customerId);
  if (params.loginCustomerId) {
    await tryConfigSetSecret('googleAdsLoginCustomerId', params.loginCustomerId);
  }

  const redirectConfig = resolveGadsOAuthRedirect(envSettings.googleAdsRedirectUrl, DEFAULT_REDIRECT_PORT);

  let server: Server | null = null;
  let port = redirectConfig.listenPort;
  let redirectPath = redirectConfig.redirectPath;
  let redirectUri = redirectConfig.redirectUri;

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
    try {
      const result = await startServerOnPort(
        port,
        { createHttpServer: createServer },
        { redirectUri, redirectPath },
      );
      server = result.server;
      redirectPath = result.redirectPath;
      redirectUri = result.redirectUri;
      break;
    } catch (err) {
      if (
        !envSettings.googleAdsRedirectUrl &&
        err instanceof Error &&
        err.message.startsWith('Port') &&
        err.message.endsWith('is in use.')
      ) {
        port++;
        const nextRedirect = resolveGadsOAuthRedirect(undefined, port);
        redirectPath = nextRedirect.redirectPath;
        redirectUri = nextRedirect.redirectUri;
        continue;
      }
      throw err;
    }
  }

  if (!server) {
    throw new Error(
      `All ports ${DEFAULT_REDIRECT_PORT}–${DEFAULT_REDIRECT_PORT + MAX_PORT_ATTEMPTS - 1} are in use. ` +
      `Close another process and try again.`,
    );
  }

  activeServer = server;

  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    void handleCallback(req, res, redirectPath, params.clientId, params.clientSecret, redirectUri);
  });

  activeTimeout = setTimeout(() => {
    cleanup();
    if (currentState.status === 'pending') {
      currentState = {
        ...currentState,
        status: 'timed_out',
        message: 'OAuth flow timed out after 120 seconds.',
      };
    }
  }, HTTP_TIMEOUT_MS);

  const authUrl = buildAuthUrl(params.clientId, redirectUri);

  currentState = {
    status: 'pending',
    authUrl,
    port,
    startedAt: Date.now(),
  };

  return getGadsLoginStatus();
}
