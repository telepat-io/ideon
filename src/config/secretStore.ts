import keytar from 'keytar';
import type { SecretSettings } from './schema.js';

const SERVICE_NAME = 'ideon';
const OPENROUTER_ACCOUNT = 'openrouter-api-key';
const REPLICATE_ACCOUNT = 'replicate-api-token';

export async function loadSecrets(): Promise<SecretSettings> {
  const [openRouterApiKey, replicateApiToken] = await Promise.all([
    keytar.getPassword(SERVICE_NAME, OPENROUTER_ACCOUNT),
    keytar.getPassword(SERVICE_NAME, REPLICATE_ACCOUNT),
  ]);

  return {
    openRouterApiKey,
    replicateApiToken,
  };
}

export async function saveSecrets(secrets: Partial<SecretSettings>): Promise<void> {
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
  if (!value) {
    await keytar.deletePassword(SERVICE_NAME, account);
    return;
  }

  await keytar.setPassword(SERVICE_NAME, account, value);
}