import bytedanceSeedream4 from './definitions/bytedance__seedream-4.json' with { type: 'json' };
import flux2Pro from './definitions/black-forest-labs__flux-2-pro.json' with { type: 'json' };
import fluxSchnell from './definitions/black-forest-labs__flux-schnell.json' with { type: 'json' };
import googleNanoBananaPro from './definitions/google__nano-banana-pro.json' with { type: 'json' };
import prunaaiZImageTurbo from './definitions/prunaai__z-image-turbo.json' with { type: 'json' };

const modelDefinitions = [
  fluxSchnell,
  flux2Pro,
  bytedanceSeedream4,
  googleNanoBananaPro,
  prunaaiZImageTurbo,
] as const;

export type T2IModelDefinition = (typeof modelDefinitions)[number];

export const DEFAULT_T2I_MODEL_ID = 'black-forest-labs/flux-schnell';

export function getSupportedT2IModels(): readonly T2IModelDefinition[] {
  return modelDefinitions;
}

export function getT2IModel(modelId: string): T2IModelDefinition {
  const model = modelDefinitions.find((entry) => entry.modelId === modelId);
  if (!model) {
    throw new Error(`Unsupported T2I model: ${modelId}`);
  }

  return model;
}