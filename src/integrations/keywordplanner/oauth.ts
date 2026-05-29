import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { URL } from 'node:url';

const execFileAsync = promisify(execFile);

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/adwords';
const DEFAULT_REDIRECT_PORT = 9876;
const MAX_PORT_ATTEMPTS = 4;
const HTTP_TIMEOUT_MS = 120_000;

export interface OAuthFlowOptions {
  clientId: string;
  clientSecret: string;
}

export interface OAuthFlowResult {
  refreshToken: string;
}

export interface OAuthFlowDependencies {
  createHttpServer: typeof createServer;
  fetch: typeof globalThis.fetch;
  setTimeout: typeof globalThis.setTimeout;
  clearTimeout: typeof globalThis.clearTimeout;
  openBrowser: (url: string) => Promise<void>;
  log: (message: string) => void;
}

const defaultDependencies: OAuthFlowDependencies = {
  createHttpServer: createServer,
  fetch: globalThis.fetch.bind(globalThis),
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  openBrowser: async (url: string) => {
    if (process.platform === 'darwin') {
      await execFileAsync('open', [url]);
    } else if (process.platform === 'win32') {
      await execFileAsync('cmd', ['/c', 'start', '', url]);
    } else {
      await execFileAsync('xdg-open', [url]);
    }
  },
  log: (message: string) => console.log(message),
};

function buildAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  deps: OAuthFlowDependencies,
): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await deps.fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OAuth2 token exchange failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as TokenResponse;
  if (!data.refresh_token) {
    throw new Error('OAuth2 response did not include a refresh_token. Ensure prompt=consent was used.');
  }

  return data.refresh_token;
}

function waitForCode(
  server: Server,
  redirectPath: string,
  redirectUri: string,
  deps: OAuthFlowDependencies,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeout = deps.setTimeout(() => {
      server.close();
      reject(new Error('OAuth flow timed out after 120 seconds.'));
    }, HTTP_TIMEOUT_MS);

    function onRequest(req: IncomingMessage, res: ServerResponse): void {
      const url = new URL(req.url ?? '/', `http://localhost`);
      if (url.pathname !== redirectPath) {
        res.writeHead(404);
        res.end('Not found.');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        deps.clearTimeout(timeout);
        server.close();
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authorization failed</h1><p>${error}</p><p>Close this window and try again.</p>`);
        reject(new Error(`OAuth authorization error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Missing authorization code</h1><p>Close this window and try again.</p>');
        return;
      }

      deps.clearTimeout(timeout);
      server.close();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization successful</h1><p>You can close this window and return to the terminal.</p>');
      resolve(code);
    }

    server.on('request', onRequest);
    server.on('error', (err) => {
      deps.clearTimeout(timeout);
      reject(err);
    });
  });
}

async function startServerOnPort(
  port: number,
  deps: OAuthFlowDependencies,
): Promise<{ server: Server; redirectPath: string; redirectUri: string }> {
  const redirectPath = '/callback';
  const redirectUri = `http://localhost:${port}${redirectPath}`;

  const server = deps.createHttpServer();

  return new Promise<{ server: Server; redirectPath: string; redirectUri: string }>((resolve, reject) => {
    server.listen(port, () => {
      resolve({ server, redirectPath, redirectUri });
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is in use.`));
      } else {
        reject(err);
      }
    });
  });
}

export async function startOAuthFlow(
  options: OAuthFlowOptions,
  dependencies: Partial<OAuthFlowDependencies> = {},
): Promise<OAuthFlowResult> {
  const deps = { ...defaultDependencies, ...dependencies };

  let server: Server | null = null;
  let port = DEFAULT_REDIRECT_PORT;
  let redirectPath = '/callback';
  let redirectUri = '';

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
    try {
      const result = await startServerOnPort(port, deps);
      server = result.server;
      redirectPath = result.redirectPath;
      redirectUri = result.redirectUri;
      break;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Port') && err.message.endsWith('is in use.')) {
        port++;
        continue;
      }
      throw err;
    }
  }

  if (!server) {
    throw new Error(`All ports ${DEFAULT_REDIRECT_PORT}–${DEFAULT_REDIRECT_PORT + MAX_PORT_ATTEMPTS - 1} are in use. Close another process and try again.`);
  }

  const authUrl = buildAuthUrl(options.clientId, redirectUri);
  deps.log('Opening browser for Google Ads authorization...');
  deps.log(`If the browser does not open, visit:\n${authUrl}\n`);

  try {
    await deps.openBrowser(authUrl);
  } catch {
    deps.log('Could not open browser automatically. Please open the URL above manually.');
  }

  try {
    const code = await waitForCode(server, redirectPath, redirectUri, deps);
    const refreshToken = await exchangeCode(code, options.clientId, options.clientSecret, redirectUri, deps);
    return { refreshToken };
  } catch (err) {
    if (server && server.listening) {
      server.close();
    }
    throw err;
  }
}
