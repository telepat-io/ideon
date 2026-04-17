import type { SecretSettings } from './schema.js';

const SERVICE_NAME = 'ideon';
const OPENROUTER_ACCOUNT = 'openrouter-api-key';
const REPLICATE_ACCOUNT = 'replicate-api-token';

const KEYTAR_UNAVAILABLE_ERROR_NAME = 'KeytarUnavailableError';

let hasWarnedAboutUnavailableKeytar = false;
let keytarClientPromise: Promise<KeytarClient | null> | null = null;
let keytarUnavailableReason: string | null = null;

interface KeytarClient {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export interface SecretStoreOptions {
  disableKeytar?: boolean;
}

export class KeytarUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = KEYTAR_UNAVAILABLE_ERROR_NAME;
  }
}

export function isKeytarUnavailableError(error: unknown): error is KeytarUnavailableError {
  return error instanceof Error && error.name === KEYTAR_UNAVAILABLE_ERROR_NAME;
}

function nullSecrets(): SecretSettings {
  return {
    openRouterApiKey: null,
    replicateApiToken: null,
  };
}

function shouldDisableKeytar(options: SecretStoreOptions): boolean {
  return options.disableKeytar === true;
}

function readErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

function isKeytarAvailabilityError(error: unknown): boolean {
  const code = readErrorCode(error);
  if (code === 'ERR_DLOPEN_FAILED' || code === 'MODULE_NOT_FOUND') {
    return true;
  }

  const lowered = readErrorMessage(error).toLowerCase();
  return [
    'libsecret',
    'cannot open shared object file',
    'dlopen',
    'dbus',
    'd-bus',
    'org.freedesktop.secrets',
    'secret service',
    'secret-service',
    'keychain',
    'keyring',
    'credential store',
    'credentials were unavailable',
    'cannot autolaunch',
    'no such interface',
    'not supported in this environment',
  ].some((fragment) => lowered.includes(fragment));
}

function warnKeytarUnavailable(details: string): void {
  if (hasWarnedAboutUnavailableKeytar) {
    return;
  }

  hasWarnedAboutUnavailableKeytar = true;
  console.warn(
    `System keychain unavailable (${details}). Falling back to environment variables for secrets. Set IDEON_DISABLE_KEYTAR=true to skip keychain access in this environment.`,
  );
}

async function getKeytarClient(): Promise<KeytarClient | null> {
  if (keytarClientPromise) {
    return keytarClientPromise;
  }

  keytarClientPromise = import('keytar')
    .then((loaded) => loaded.default as KeytarClient)
    .catch((error) => {
      if (isKeytarAvailabilityError(error)) {
        keytarUnavailableReason = readErrorMessage(error);
        return null;
      }

      throw error;
    });

  return keytarClientPromise;
}

export async function loadSecrets(options: SecretStoreOptions = {}): Promise<SecretSettings> {
  if (shouldDisableKeytar(options)) {
    return nullSecrets();
  }

  const keytarClient = await getKeytarClient();
  if (!keytarClient) {
    warnKeytarUnavailable(keytarUnavailableReason ?? 'keytar module failed to load');
    return nullSecrets();
  }

  try {
    const [openRouterApiKey, replicateApiToken] = await Promise.all([
      keytarClient.getPassword(SERVICE_NAME, OPENROUTER_ACCOUNT),
      keytarClient.getPassword(SERVICE_NAME, REPLICATE_ACCOUNT),
    ]);

    return {
      openRouterApiKey,
      replicateApiToken,
    };
  } catch (error) {
    if (isKeytarAvailabilityError(error)) {
      const message = readErrorMessage(error);
      warnKeytarUnavailable(message);
      return nullSecrets();
    }

    throw error;
  }
}

export async function saveSecrets(secrets: Partial<SecretSettings>, options: SecretStoreOptions = {}): Promise<void> {
  if (shouldDisableKeytar(options)) {
    throw new KeytarUnavailableError(
      'System keychain access is disabled by IDEON_DISABLE_KEYTAR=true. Use IDEON_OPENROUTER_API_KEY and IDEON_REPLICATE_API_TOKEN instead.',
    );
  }

  const keytarClient = await getKeytarClient();
  if (!keytarClient) {
    throw new KeytarUnavailableError(
      `System keychain unavailable while saving credentials (${keytarUnavailableReason ?? 'keytar module failed to load'}). Use IDEON_OPENROUTER_API_KEY and IDEON_REPLICATE_API_TOKEN instead.`,
    );
  }

  const tasks: Promise<void>[] = [];

  if (secrets.openRouterApiKey !== undefined) {
    tasks.push(saveSecretValue(keytarClient, OPENROUTER_ACCOUNT, secrets.openRouterApiKey));
  }

  if (secrets.replicateApiToken !== undefined) {
    tasks.push(saveSecretValue(keytarClient, REPLICATE_ACCOUNT, secrets.replicateApiToken));
  }

  await Promise.all(tasks);
}

async function saveSecretValue(keytarClient: KeytarClient, account: string, value: string | null): Promise<void> {
  try {
    if (!value) {
      await keytarClient.deletePassword(SERVICE_NAME, account);
      return;
    }

    await keytarClient.setPassword(SERVICE_NAME, account, value);
  } catch (error) {
    if (isKeytarAvailabilityError(error)) {
      const message = readErrorMessage(error);
      throw new KeytarUnavailableError(
        `System keychain unavailable while saving credentials (${message}). Use IDEON_OPENROUTER_API_KEY and IDEON_REPLICATE_API_TOKEN instead.`,
      );
    }

    throw error;
  }
}