import { getSupportedModelCatalog } from '@telepat/limn';
import type { SupportedModelCatalogEntry } from '@telepat/limn';

export function getLimnGenerationModels(): SupportedModelCatalogEntry[] {
  return getSupportedModelCatalog().filter((entry) => entry.generationEnabled);
}

export const DEFAULT_LIMN_MODEL_ID = 'flux';
