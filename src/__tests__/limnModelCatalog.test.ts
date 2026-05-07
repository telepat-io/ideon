import { jest } from '@jest/globals';

const getSupportedModelCatalogMock = jest.fn<() => Array<{
  family: string;
  generationEnabled: boolean;
  replicateModelIds: string[];
}>>();

jest.unstable_mockModule('@telepat/limn', () => ({
  getSupportedModelCatalog: getSupportedModelCatalogMock,
}));

const {
  getLimnGenerationModels,
  resolveFamilyFromReplicateModelId,
  isKnownLimnFamily,
  isKnownReplicateModelId,
  isReplicateModelIdForFamily,
} = await import('../images/limnModelCatalog.js');

describe('limnModelCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSupportedModelCatalogMock.mockReturnValue([
      {
        family: 'flux',
        generationEnabled: true,
        replicateModelIds: ['black-forest-labs/flux-schnell', 'black-forest-labs/flux-2-pro'],
      },
      {
        family: 'imagen',
        generationEnabled: false,
        replicateModelIds: ['google/imagen-4'],
      },
      {
        family: 'sdxl',
        generationEnabled: true,
        replicateModelIds: ['stability-ai/sdxl'],
      },
    ]);
  });

  it('returns only generation-enabled models', () => {
    const models = getLimnGenerationModels();

    expect(models.map((model) => model.family)).toEqual(['flux', 'sdxl']);
  });

  it('resolves replicate model id to family when known and enabled', () => {
    expect(resolveFamilyFromReplicateModelId('black-forest-labs/flux-schnell')).toBe('flux');
  });

  it('returns null when replicate model id is unknown or only in disabled family', () => {
    expect(resolveFamilyFromReplicateModelId('google/imagen-4')).toBeNull();
    expect(resolveFamilyFromReplicateModelId('unknown/model')).toBeNull();
  });

  it('checks known family membership among generation-enabled models only', () => {
    expect(isKnownLimnFamily('flux')).toBe(true);
    expect(isKnownLimnFamily('imagen')).toBe(false);
  });

  it('checks known replicate model id among generation-enabled models only', () => {
    expect(isKnownReplicateModelId('stability-ai/sdxl')).toBe(true);
    expect(isKnownReplicateModelId('google/imagen-4')).toBe(false);
  });

  it('validates replicate model id for a specific family', () => {
    expect(isReplicateModelIdForFamily('flux', 'black-forest-labs/flux-2-pro')).toBe(true);
    expect(isReplicateModelIdForFamily('flux', 'stability-ai/sdxl')).toBe(false);
    expect(isReplicateModelIdForFamily('unknown-family', 'black-forest-labs/flux-2-pro')).toBe(false);
  });
});
