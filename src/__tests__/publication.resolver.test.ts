import { jest } from '@jest/globals';
import type { AppSettings, EnvSettings, SecretSettings } from '../config/schema.js';
import type { Publication } from '../types/publication.js';
import type { Series } from '../types/series.js';

const loadSavedSettingsMock = jest.fn<() => Promise<AppSettings>>();
const loadSecretsMock = jest.fn<(options?: { disableKeytar?: boolean }) => Promise<SecretSettings>>();
const readEnvSettingsMock = jest.fn<() => EnvSettings>();
const loadPublicationMock = jest.fn<(slug: string) => Promise<Publication>>();
const loadSeriesMock = jest.fn<(slug: string) => Promise<Series>>();

jest.unstable_mockModule('../config/settingsFile.js', () => ({
  loadSavedSettings: loadSavedSettingsMock,
}));

jest.unstable_mockModule('../config/secretStore.js', () => ({
  loadSecrets: loadSecretsMock,
}));

jest.unstable_mockModule('../config/env.js', () => ({
  readEnvSettings: readEnvSettingsMock,
}));

jest.unstable_mockModule('../config/publicationStore.js', () => ({
  loadPublication: loadPublicationMock,
}));

jest.unstable_mockModule('../config/seriesStore.js', () => ({
  loadSeries: loadSeriesMock,
}));

const { resolveRunInput } = await import('../config/resolver.js');

const baseSettings: AppSettings = {
  model: 'saved/model',
  modelSettings: { temperature: 0.5, maxTokens: 1500, topP: 0.9 },
  modelRequestTimeoutMs: 90000,
  modelRequestMaxAttempts: 4,
  t2i: { modelId: 'black-forest-labs/flux-schnell', inputOverrides: {}, maxAttempts: 4 },
  notifications: { enabled: false },
  contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
  style: 'professional',
  intent: 'tutorial',
  targetLength: 900,
  planModel: 'deepseek/deepseek-v4-pro',
  planIntentModel: 'deepseek/deepseek-v4-flash',
  seoCheckMode: 'errors-only',
  seoCheckMaxTurns: 10,
};

const baseSecrets: SecretSettings = {
  openRouterApiKey: 'key',
  replicateApiToken: 'token',
  googleAdsDeveloperToken: null,
  googleAdsClientId: null,
  googleAdsClientSecret: null,
  googleAdsRefreshToken: null,
  googleAdsCustomerId: null,
  googleAdsLoginCustomerId: null,
};

const basePublication: Publication = {
  name: 'Tech Blog',
  slug: 'tech-blog',
  editorialPolicy: {
    tone: 'authoritative',
    forbiddenTopics: ['competitors'],
    disclosureRequirements: ['FTC'],
    audienceRestrictions: ['no jargon'],
    notes: 'Always cite sources.',
  },
  defaults: {
    style: 'technical',
    intent: 'deep-dive-analysis',
    targetLength: 1400,
  },
};

describe('resolveRunInput with publications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadSavedSettingsMock.mockResolvedValue(baseSettings);
    loadSecretsMock.mockResolvedValue(baseSecrets);
    readEnvSettingsMock.mockReturnValue({});
  });

  it('loads publication from CLI --publication flag', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog' });

    expect(loadPublicationMock).toHaveBeenCalledWith('tech-blog');
    expect(result.publication).toEqual(basePublication);
    expect(result.config.settings.style).toBe('technical');
    expect(result.config.settings.intent).toBe('deep-dive-analysis');
    expect(result.config.settings.targetLength).toBe(1400);
  });

  it('loads publication from job file', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);

    const result = await resolveRunInput({ idea: 'test', jobPath: undefined });
    // When no publication slug is provided, publication should not be loaded
    expect(result.publication).toBeNull();
  });

  it('loads publication from defaultPublication setting', async () => {
    loadSavedSettingsMock.mockResolvedValue({
      ...baseSettings,
      defaultPublication: 'tech-blog',
    });
    loadPublicationMock.mockResolvedValue(basePublication);

    const result = await resolveRunInput({ idea: 'test' });

    expect(loadPublicationMock).toHaveBeenCalledWith('tech-blog');
    expect(result.publication).toEqual(basePublication);
    expect(result.config.settings.style).toBe('technical');
  });

  it('CLI --publication overrides defaultPublication', async () => {
    loadSavedSettingsMock.mockResolvedValue({
      ...baseSettings,
      defaultPublication: 'other-pub',
    });

    loadPublicationMock.mockResolvedValue(basePublication);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog' });

    expect(loadPublicationMock).toHaveBeenCalledWith('tech-blog');
    expect(result.publication!.slug).toBe('tech-blog');
  });

  it('CLI style overrides publication style', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog', style: 'playful' });

    expect(result.config.settings.style).toBe('playful');
  });

  it('CLI intent overrides publication intent', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog', intent: 'how-to-guide' });

    expect(result.config.settings.intent).toBe('how-to-guide');
  });

  it('CLI targetLength overrides publication targetLength', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog', targetLength: 'small' });

    expect(result.config.settings.targetLength).toBe(500);
  });

  it('publication targetAudienceHint is used when CLI audience is absent', async () => {
    const pubWithAudience: Publication = {
      ...basePublication,
      defaults: {
        ...basePublication.defaults,
        targetAudienceHint: 'B2B SaaS founders',
      },
    };
    loadPublicationMock.mockResolvedValue(pubWithAudience);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog' });

    expect(result.targetAudienceHint).toBe('B2B SaaS founders');
  });

  it('CLI audience overrides publication targetAudienceHint', async () => {
    const pubWithAudience: Publication = {
      ...basePublication,
      defaults: {
        ...basePublication.defaults,
        targetAudienceHint: 'B2B SaaS founders',
      },
    };
    loadPublicationMock.mockResolvedValue(pubWithAudience);

    const result = await resolveRunInput({
      idea: 'test',
      publication: 'tech-blog',
      audience: 'Marketing teams',
    });

    expect(result.targetAudienceHint).toBe('Marketing teams');
  });

  it('publication contentTargets override settings contentTargets', async () => {
    const pubWithTargets: Publication = {
      ...basePublication,
      defaults: {
        ...basePublication.defaults,
        contentTargets: [
          { contentType: 'blog-post', role: 'primary', count: 1 },
          { contentType: 'x-thread', role: 'secondary', count: 2 },
        ],
      },
    };
    loadPublicationMock.mockResolvedValue(pubWithTargets);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog' });

    expect(result.config.settings.contentTargets).toEqual([
      { contentType: 'blog-post', role: 'primary', count: 1 },
      { contentType: 'x-thread', role: 'secondary', count: 2 },
    ]);
  });

  it('CLI contentTargets override publication contentTargets', async () => {
    const pubWithTargets: Publication = {
      ...basePublication,
      defaults: {
        ...basePublication.defaults,
        contentTargets: [
          { contentType: 'blog-post', role: 'primary', count: 1 },
        ],
      },
    };
    loadPublicationMock.mockResolvedValue(pubWithTargets);

    const result = await resolveRunInput({
      idea: 'test',
      publication: 'tech-blog',
      contentTargets: [
        { contentType: 'article', role: 'primary', count: 1 },
        { contentType: 'linkedin-post', role: 'secondary', count: 1 },
      ],
    });

    expect(result.config.settings.contentTargets[0]!.contentType).toBe('article');
  });

  it('returns null publication when no slug is provided', async () => {
    const result = await resolveRunInput({ idea: 'test' });

    expect(result.publication).toBeNull();
    expect(loadPublicationMock).not.toHaveBeenCalled();
  });

  it('publication defaults do not override env settings', async () => {
    readEnvSettingsMock.mockReturnValue({ style: 'journalistic' });
    loadPublicationMock.mockResolvedValue(basePublication);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog' });

    expect(result.config.settings.style).toBe('journalistic');
  });

  it('publication model settings are applied when no env overrides exist', async () => {
    const pubWithModel: Publication = {
      ...basePublication,
      defaults: {
        temperature: 0.9,
        maxTokens: 8000,
        topP: 0.95,
      },
    };
    loadPublicationMock.mockResolvedValue(pubWithModel);

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog' });

    expect(result.config.settings.modelSettings.temperature).toBe(0.9);
    expect(result.config.settings.modelSettings.maxTokens).toBe(8000);
    expect(result.config.settings.modelSettings.topP).toBe(0.95);
  });

  it('series style overrides publication style', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);
    loadSeriesMock.mockResolvedValue({
      name: 'Test Series',
      slug: 'test-series',
      topic: 'AI topic',
      publication: 'tech-blog',
      defaults: { style: 'storytelling' },
      editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' },
    });

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog', series: 'test-series' });

    expect(result.config.settings.style).toBe('storytelling');
  });

  it('series intent overrides publication intent', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);
    loadSeriesMock.mockResolvedValue({
      name: 'Test Series',
      slug: 'test-series',
      topic: 'AI topic',
      publication: 'tech-blog',
      defaults: { intent: 'how-to-guide' },
      editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' },
    });

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog', series: 'test-series' });

    expect(result.config.settings.intent).toBe('how-to-guide');
  });

  it('series targetLength overrides publication targetLength', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);
    loadSeriesMock.mockResolvedValue({
      name: 'Test Series',
      slug: 'test-series',
      topic: 'AI topic',
      publication: 'tech-blog',
      defaults: { targetLength: 500 },
      editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' },
    });

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog', series: 'test-series' });

    expect(result.config.settings.targetLength).toBe(500);
  });

  it('series contentTargets overrides publication contentTargets', async () => {
    const pubWithTargets: Publication = {
      ...basePublication,
      defaults: {
        ...basePublication.defaults,
        contentTargets: [
          { contentType: 'blog-post', role: 'primary', count: 1 },
        ],
      },
    };
    loadPublicationMock.mockResolvedValue(pubWithTargets);
    loadSeriesMock.mockResolvedValue({
      name: 'Test Series',
      slug: 'test-series',
      topic: 'AI topic',
      publication: 'tech-blog',
      defaults: {
        contentTargets: [
          { contentType: 'newsletter', role: 'primary', count: 1 },
        ],
      },
      editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' },
    });

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog', series: 'test-series' });

    expect(result.config.settings.contentTargets[0]!.contentType).toBe('newsletter');
  });

  it('series modelSettings layers on top of publication modelSettings', async () => {
    const pubWithModel: Publication = {
      ...basePublication,
      defaults: {
        temperature: 0.9,
        maxTokens: 8000,
      },
    };
    loadPublicationMock.mockResolvedValue(pubWithModel);
    loadSeriesMock.mockResolvedValue({
      name: 'Test Series',
      slug: 'test-series',
      topic: 'AI topic',
      publication: 'tech-blog',
      defaults: {
        maxTokens: 4000,
        topP: 0.95,
      },
      editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' },
    });

    const result = await resolveRunInput({ idea: 'test', publication: 'tech-blog', series: 'test-series' });

    expect(result.config.settings.modelSettings.temperature).toBe(0.9);
    expect(result.config.settings.modelSettings.maxTokens).toBe(4000);
    expect(result.config.settings.modelSettings.topP).toBe(0.95);
  });

  it('CLI flags override both publication and series', async () => {
    loadPublicationMock.mockResolvedValue(basePublication);
    loadSeriesMock.mockResolvedValue({
      name: 'Test Series',
      slug: 'test-series',
      topic: 'AI topic',
      publication: 'tech-blog',
      defaults: { style: 'storytelling', intent: 'how-to-guide' },
      editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' },
    });

    const result = await resolveRunInput({
      idea: 'test',
      publication: 'tech-blog',
      series: 'test-series',
      style: 'playful',
      intent: 'tutorial',
    });

    expect(result.config.settings.style).toBe('playful');
    expect(result.config.settings.intent).toBe('tutorial');
  });
});
