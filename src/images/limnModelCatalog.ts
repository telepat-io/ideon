import { getSupportedModelCatalog } from '@telepat/limn';
import type { SupportedModelCatalogEntry } from '@telepat/limn';

export function getLimnGenerationModels(): SupportedModelCatalogEntry[] {
  return getSupportedModelCatalog().filter((entry) => entry.generationEnabled);
}

export const DEFAULT_LIMN_MODEL_ID = 'flux';

export function resolveFamilyFromReplicateModelId(replicateModelId: string): string | null {
  const match = getLimnGenerationModels().find((model) => model.replicateModelIds.includes(replicateModelId));
  return match?.family ?? null;
}

export function isKnownLimnFamily(family: string): boolean {
  return getLimnGenerationModels().some((model) => model.family === family);
}

export function isKnownReplicateModelId(replicateModelId: string): boolean {
  return getLimnGenerationModels().some((model) => model.replicateModelIds.includes(replicateModelId));
}

export function isReplicateModelIdForFamily(family: string, replicateModelId: string): boolean {
  const match = getLimnGenerationModels().find((model) => model.family === family);
  if (!match) {
    return false;
  }

  return match.replicateModelIds.includes(replicateModelId);
}
