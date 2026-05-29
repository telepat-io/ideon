import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ReportedError } from '../reportedError.js';
import {
  configGet,
  configSet,
  configUnset,
  type ConfigSecretKey,
} from '../../config/manage.js';
import { readEnvSettings } from '../../config/env.js';
import { loadSecrets } from '../../config/secretStore.js';
import { startOAuthFlow } from '../../integrations/keywordplanner/oauth.js';
import { GkpClient } from '../../integrations/keywordplanner/client.js';

const GOOGLE_ADS_SECRET_KEYS: ConfigSecretKey[] = [
  'googleAdsDeveloperToken',
  'googleAdsClientId',
  'googleAdsClientSecret',
  'googleAdsRefreshToken',
  'googleAdsCustomerId',
  'googleAdsLoginCustomerId',
];

interface GadsCommandDependencies {
  log: (message: string) => void;
  prompt: (question: string) => Promise<string>;
  configSet: typeof configSet;
  configGet: typeof configGet;
  configUnset: typeof configUnset;
  startOAuthFlow: typeof startOAuthFlow;
  readEnvSettings: typeof readEnvSettings;
  loadSecrets: typeof loadSecrets;
  isTTY: boolean;
}

function createDefaultDependencies(): GadsCommandDependencies {
  const rl = readline.createInterface({ input, output });
  return {
    log: (message: string) => console.log(message),
    prompt: async (question: string) => rl.question(question),
    configSet,
    configGet,
    configUnset,
    startOAuthFlow,
    readEnvSettings,
    loadSecrets,
    isTTY: Boolean(input?.isTTY),
  };
}

interface LoginOptions {
  force?: boolean;
  developerToken?: string;
  clientId?: string;
  clientSecret?: string;
  customerId?: string;
  loginCustomerId?: string;
}

export async function runGadsLoginCommand(
  options: LoginOptions,
  dependencies: Partial<GadsCommandDependencies> = {},
): Promise<void> {
  const deps = { ...createDefaultDependencies(), ...dependencies };

  if (!deps.isTTY) {
    throw new ReportedError(
      'OAuth login requires an interactive terminal with browser access.\n\n' +
      'For CI/CD or headless environments, set credentials via environment variables:\n' +
      '  TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN\n' +
      '  TELEPAT_GOOGLE_ADS_CLIENT_ID\n' +
      '  TELEPAT_GOOGLE_ADS_CLIENT_SECRET\n' +
      '  TELEPAT_GOOGLE_ADS_REFRESH_TOKEN\n' +
      '  TELEPAT_GOOGLE_ADS_CUSTOMER_ID\n' +
      '  TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID (optional)\n\n' +
      'Environment variables bypass keychain storage entirely.',
    );
  }

  const envSettings = deps.readEnvSettings();
  const secrets = await deps.loadSecrets({ disableKeytar: envSettings.disableKeytar });

  const hasRefreshToken = Boolean(envSettings.googleAdsRefreshToken ?? secrets.googleAdsRefreshToken);
  if (hasRefreshToken && !options.force) {
    deps.log('Already authenticated with Google Ads. Use --force to re-authorize.');
    return;
  }

  const developerToken = options.developerToken ?? await deps.prompt('Google Ads developer token: ');
  if (!developerToken.trim()) {
    throw new ReportedError('Developer token cannot be empty.');
  }

  const clientId = options.clientId ?? await deps.prompt('OAuth2 client ID: ');
  if (!clientId.trim()) {
    throw new ReportedError('Client ID cannot be empty.');
  }

  const clientSecret = options.clientSecret ?? await deps.prompt('OAuth2 client secret: ');
  if (!clientSecret.trim()) {
    throw new ReportedError('Client secret cannot be empty.');
  }

  const customerId = options.customerId ?? await deps.prompt('Google Ads customer ID (10 digits, dashes optional): ');
  if (!customerId.trim()) {
    throw new ReportedError('Customer ID cannot be empty.');
  }

  if (options.loginCustomerId) {
    await deps.configSet('googleAdsLoginCustomerId', options.loginCustomerId);
  }

  await deps.configSet('googleAdsDeveloperToken', developerToken);
  await deps.configSet('googleAdsClientId', clientId);
  await deps.configSet('googleAdsClientSecret', clientSecret);
  await deps.configSet('googleAdsCustomerId', customerId);

  deps.log('Starting OAuth2 authorization flow...');
  deps.log('A browser window will open for Google Ads authorization.');

  const result = await deps.startOAuthFlow({ clientId, clientSecret });
  await deps.configSet('googleAdsRefreshToken', result.refreshToken);

  deps.log('Google Ads credentials saved successfully.');
  deps.log('Run `ideon gads test` to verify your credentials work.');
}

interface LogoutOptions {
  all?: boolean;
}

export async function runGadsLogoutCommand(
  options: LogoutOptions,
  dependencies: Partial<GadsCommandDependencies> = {},
): Promise<void> {
  const deps = { ...createDefaultDependencies(), ...dependencies };

  const keysToClear: ConfigSecretKey[] = options.all
    ? [...GOOGLE_ADS_SECRET_KEYS]
    : ['googleAdsRefreshToken'];

  for (const key of keysToClear) {
    await deps.configUnset(key);
  }

  const label = options.all ? 'All Google Ads credentials' : 'Google Ads refresh token';
  deps.log(`${label} cleared.`);
}

interface StatusOptions {
  json?: boolean;
}

interface CredentialStatus {
  set: boolean;
  source: 'env' | 'keychain' | null;
}

type StatusResult = Record<string, CredentialStatus>;

function detectCredentialSource(
  envValue: string | undefined | null,
  keyValue: string | null,
): CredentialStatus {
  if (envValue) return { set: true, source: 'env' };
  if (keyValue) return { set: true, source: 'keychain' };
  return { set: false, source: null };
}

export function buildStatusResult(
  envSettings: ReturnType<typeof readEnvSettings>,
  secrets: Awaited<ReturnType<typeof loadSecrets>>,
): StatusResult {
  return {
    googleAdsDeveloperToken: detectCredentialSource(envSettings.googleAdsDeveloperToken, secrets.googleAdsDeveloperToken),
    googleAdsClientId: detectCredentialSource(envSettings.googleAdsClientId, secrets.googleAdsClientId),
    googleAdsClientSecret: detectCredentialSource(envSettings.googleAdsClientSecret, secrets.googleAdsClientSecret),
    googleAdsRefreshToken: detectCredentialSource(envSettings.googleAdsRefreshToken, secrets.googleAdsRefreshToken),
    googleAdsCustomerId: detectCredentialSource(envSettings.googleAdsCustomerId, secrets.googleAdsCustomerId),
    googleAdsLoginCustomerId: detectCredentialSource(envSettings.googleAdsLoginCustomerId, secrets.googleAdsLoginCustomerId),
  };
}

function formatStatusTTY(result: StatusResult): string {
  const lines: string[] = ['', 'Google Ads Credential Status', '─────────────────────────────────────'];

  for (const [key, status] of Object.entries(result)) {
    const label = key.replace('googleAds', '').replace(/([A-Z])/g, ' $1').trim();
    const displayLabel = label.charAt(0).toLowerCase() + label.slice(1);

    if (status.set) {
      lines.push(`  ${displayLabel.padEnd(20)} ✓ ${status.source}`);
    } else {
      const suffix = key === 'googleAdsLoginCustomerId' ? ' (optional)' : '';
      lines.push(`  ${displayLabel.padEnd(20)} — not set${suffix}`);
    }
  }

  lines.push('');
  lines.push('Run `ideon gads test` to verify credentials work.');

  const allSet = Object.entries(result)
    .filter(([k]) => k !== 'googleAdsLoginCustomerId')
    .every(([, s]) => s.set);
  if (!allSet) {
    lines.push('Run `ideon gads login` to set up missing credentials.');
  }

  lines.push('');
  return lines.join('\n');
}

export async function runGadsStatusCommand(
  options: StatusOptions,
  dependencies: Partial<GadsCommandDependencies> = {},
): Promise<void> {
  const deps = { ...createDefaultDependencies(), ...dependencies };

  const envSettings = deps.readEnvSettings();
  const secrets = await deps.loadSecrets({ disableKeytar: envSettings.disableKeytar });
  const result = buildStatusResult(envSettings, secrets);

  if (options.json) {
    deps.log(JSON.stringify(result, null, 2));
    return;
  }

  deps.log(formatStatusTTY(result));
}

export async function runGadsTestCommand(
  _options: Record<string, never>,
  dependencies: Partial<GadsCommandDependencies> = {},
): Promise<void> {
  const deps = { ...createDefaultDependencies(), ...dependencies };

  const envSettings = deps.readEnvSettings();
  const secrets = await deps.loadSecrets({ disableKeytar: envSettings.disableKeytar });

  const devToken = envSettings.googleAdsDeveloperToken ?? secrets.googleAdsDeveloperToken;
  const clientId = envSettings.googleAdsClientId ?? secrets.googleAdsClientId;
  const clientSecret = envSettings.googleAdsClientSecret ?? secrets.googleAdsClientSecret;
  const refreshToken = envSettings.googleAdsRefreshToken ?? secrets.googleAdsRefreshToken;
  const customerId = envSettings.googleAdsCustomerId ?? secrets.googleAdsCustomerId;
  const loginCustomerId = envSettings.googleAdsLoginCustomerId ?? secrets.googleAdsLoginCustomerId;

  const missing: string[] = [];
  if (!devToken) missing.push('googleAdsDeveloperToken');
  if (!clientId) missing.push('googleAdsClientId');
  if (!clientSecret) missing.push('googleAdsClientSecret');
  if (!refreshToken) missing.push('googleAdsRefreshToken');
  if (!customerId) missing.push('googleAdsCustomerId');

  if (missing.length > 0) {
    const setCommands = missing.map((k) => `ideon config set ${k} <value>`).join('\n  ');
    throw new ReportedError(
      `Missing required Google Ads credentials:\n  ${missing.join(', ')}\n\nSet them via:\n  ${setCommands}\n\nOr run \`ideon gads login\` for guided setup.`,
    );
  }

  const client = new GkpClient({
    developerToken: devToken!,
    clientId: clientId!,
    clientSecret: clientSecret!,
    refreshToken: refreshToken!,
    customerId: customerId!,
    loginCustomerId: loginCustomerId || undefined,
  });

  try {
    const result = await client.generateKeywordIdeas({
      seedKeywords: ['test'],
      pageSize: 1,
    });
    deps.log(`✓ Google Ads credentials verified.`);
    deps.log(`  Customer ID: ${customerId}`);
    deps.log(`  API response received successfully (${result.count} keyword${result.count === 1 ? '' : 's'} returned).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new ReportedError(
      `Google Ads credentials test failed:\n${message}\n\nRun \`ideon gads status\` to check configuration, or \`ideon gads login\` to re-authorize.`,
    );
  }
}
