import keytar from 'keytar';
import type { SecretSettings } from './schema.js';

const SERVICE_NAME = 'ideon';
const OPENROUTER_ACCOUNT = 'openrouter-api-key';
const REPLICATE_ACCOUNT = 'replicate-api-token';

const KEYTAR_UNAVAILABLE_ERROR_NAME = 'KeytarUnavailableError';

let hasWarnedAboutUnavailableKeytar = false;

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

function isKeytarAvailabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const lowered = error.message.toLowerCase();
  return [
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

export async function loadSecrets(options: SecretStoreOptions = {}): Promise<SecretSettings> {
  if (shouldDisableKeytar(options)) {
    return nullSecrets();
  }

  try {
    const [openRouterApiKey, replicateApiToken] = await Promise.all([
      keytar.getPassword(SERVICE_NAME, OPENROUTER_ACCOUNT),
      keytar.getPassword(SERVICE_NAME, REPLICATE_ACCOUNT),
    ]);

    return {
      openRouterApiKey,
      replicateApiToken,
    };
  } catch (error) {
    if (isKeytarAvailabilityError(error)) {
      const message = error instanceof Error ? error.message : 'unknown error';
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

  const tasks: Promise<void>[] = [];

  if (secrets.openRouterApiKey !== undefined) {
    tasks.push(saveSecretValue(OPENROUTER_ACCOUNT, secrets.openRouterApiKey));
  }

  if (secrets.replicateApiToken !== undefined) {
    tasks.push(saveSecretValue(REPLICATE_ACCOUNT, secrets.replicateApiToken));
  }

  await Promise.all(tasks);
}

async function saveSecretValue(account: string, value: string | null): Promise<void> {
  try {
    if (!value) {
      await keytar.deletePassword(SERVICE_NAME, account);
      return;
    }

    await keytar.setPassword(SERVICE_NAME, account, value);
  } catch (error) {
    if (isKeytarAvailabilityError(error)) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new KeytarUnavailableError(
        `System keychain unavailable while saving credentials (${message}). Use IDEON_OPENROUTER_API_KEY and IDEON_REPLICATE_API_TOKEN instead.`,
      );
    }

    throw error;
  }
}