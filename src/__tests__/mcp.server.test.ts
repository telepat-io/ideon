import { jest } from '@jest/globals';

const registeredTools = new Map<string, { handler: (input: any) => Promise<any> }>();
const connectMock = jest.fn<() => Promise<void>>();

class MockMcpServer {
  registerTool(name: string, _meta: unknown, handler: (input: any) => Promise<any>): void {
    registeredTools.set(name, { handler });
  }

  async connect(): Promise<void> {
    await connectMock();
  }
}

const resolveRunInputMock = jest.fn<(...args: any[]) => Promise<any>>();
const runPipelineShellMock = jest.fn<(...args: any[]) => Promise<any>>();
const runDeleteCommandMock = jest.fn<(...args: any[]) => Promise<any>>();
const runLinksCommandMock = jest.fn<(...args: any[]) => Promise<any>>();
const runOutputCommandMock = jest.fn<(...args: any[]) => Promise<any>>();
const configGetMock = jest.fn<(...args: any[]) => Promise<any>>();
const configSetMock = jest.fn<(...args: any[]) => Promise<any>>();
const configListMock = jest.fn<(...args: any[]) => Promise<any>>();
const configUnsetMock = jest.fn<(...args: any[]) => Promise<any>>();
const isConfigKeyMock = jest.fn<(key: string) => boolean>();
const parsePrimaryAndSecondarySpecsMock = jest.fn();
const loadWriteSessionMock = jest.fn<(...args: any[]) => Promise<any>>();
const patchWriteSessionMock = jest.fn<(...args: any[]) => Promise<any>>();
const loadSecretsMock = jest.fn<(...args: any[]) => Promise<any>>();
const readEnvSettingsMock = jest.fn<() => any>();
const gkpClientMock = {
  generateKeywordIdeas: jest.fn<(...args: any[]) => Promise<any>>(),
  getHistoricalMetrics: jest.fn<(...args: any[]) => Promise<any>>(),
  getForecastData: jest.fn<(...args: any[]) => Promise<any>>(),
};

const savePublicationMock = jest.fn<(...args: any[]) => Promise<void>>();
const listPublicationsMock = jest.fn<(...args: any[]) => Promise<any>>();
const loadPublicationMock = jest.fn<(...args: any[]) => Promise<any>>();
const deletePublicationMock = jest.fn<(...args: any[]) => Promise<void>>();
const publicationExistsMock = jest.fn<(...args: any[]) => Promise<boolean>>();

const saveSeriesMock = jest.fn<(...args: any[]) => Promise<void>>();
const listSeriesMock = jest.fn<(...args: any[]) => Promise<any>>();
const loadSeriesMock = jest.fn<(...args: any[]) => Promise<any>>();
const deleteSeriesMock = jest.fn<(...args: any[]) => Promise<void>>();
const seriesExistsMock = jest.fn<(...args: any[]) => Promise<boolean>>();

const generateQueueIdMock = jest.fn(() => 'test-uuid-1234');
const saveQueueEntryMock = jest.fn<(...args: any[]) => Promise<void>>();
const listQueueEntriesMock = jest.fn<(...args: any[]) => Promise<any>>();
const getNextPendingEntryMock = jest.fn<(...args: any[]) => Promise<any>>();
const deleteQueueEntryMock = jest.fn<(...args: any[]) => Promise<void>>();
const clearQueueMock = jest.fn<(...args: any[]) => Promise<number>>();
const claimNextPendingEntryMock = jest.fn<(...args: any[]) => Promise<any>>();
const deleteClaimedEntryMock = jest.fn<(...args: any[]) => Promise<void>>();
const revertClaimedEntryMock = jest.fn<(...args: any[]) => Promise<void>>();

const runPlanMock = jest.fn<(...args: any[]) => Promise<any>>();
const loadSavedSettingsMock = jest.fn<(...args: any[]) => Promise<any>>();
const runArticleListCommandMock = jest.fn<(...args: any[]) => Promise<void>>();

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: MockMcpServer,
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

jest.unstable_mockModule('../config/resolver.js', () => ({
  resolveRunInput: resolveRunInputMock,
}));

jest.unstable_mockModule('../pipeline/runner.js', () => ({
  runPipelineShell: runPipelineShellMock,
}));

jest.unstable_mockModule('../cli/commands/delete.js', () => ({
  runDeleteCommand: runDeleteCommandMock,
}));

jest.unstable_mockModule('../cli/commands/links.js', () => ({
  runLinksCommand: runLinksCommandMock,
}));

jest.unstable_mockModule('../cli/commands/export.js', () => ({
  runOutputCommand: runOutputCommandMock,
}));

jest.unstable_mockModule('../config/manage.js', () => ({
  configGet: configGetMock,
  configSet: configSetMock,
  configList: configListMock,
  configUnset: configUnsetMock,
  isConfigKey: isConfigKeyMock,
  configSettingKeys: [
    'model',
    'modelSettings.temperature',
    'modelSettings.maxTokens',
    'modelSettings.topP',
    'modelRequestTimeoutMs',
    'notifications.enabled',
    'markdownOutputDir',
    'assetOutputDir',
    'style',
    'intent',
    'targetLength',
  ],
  configSecretKeys: ['openRouterApiKey', 'replicateApiToken', 'googleAdsDeveloperToken', 'googleAdsClientId', 'googleAdsClientSecret', 'googleAdsRefreshToken', 'googleAdsCustomerId', 'googleAdsLoginCustomerId'],
}));

jest.unstable_mockModule('../cli/commands/writeTargetSpecs.js', () => ({
  parsePrimaryAndSecondarySpecs: parsePrimaryAndSecondarySpecsMock,
}));

jest.unstable_mockModule('../pipeline/sessionStore.js', () => ({
  loadWriteSession: loadWriteSessionMock,
  patchWriteSession: patchWriteSessionMock,
}));

jest.unstable_mockModule('../config/secretStore.js', () => ({
  loadSecrets: loadSecretsMock,
}));

jest.unstable_mockModule('../config/env.js', () => ({
  readEnvSettings: readEnvSettingsMock,
}));

jest.unstable_mockModule('../integrations/keywordplanner/client.js', () => ({
  GkpClient: class {
    generateKeywordIdeas = gkpClientMock.generateKeywordIdeas;
    getHistoricalMetrics = gkpClientMock.getHistoricalMetrics;
    getForecastData = gkpClientMock.getForecastData;
  },
}));

jest.unstable_mockModule('../integrations/keywordplanner/cachedClient.js', () => ({
  CachedGkpClient: class {
    private readonly inner: any;
    constructor(opts: any) {
      this.inner = opts.client;
    }
    generateKeywordIdeas = (...args: any[]) => this.inner.generateKeywordIdeas(...args);
    getHistoricalMetrics = (...args: any[]) => this.inner.getHistoricalMetrics(...args);
    getForecastData = (...args: any[]) => this.inner.getForecastData(...args);
  },
}));

jest.unstable_mockModule('../config/gkpStore.js', () => ({
  computeGkpFingerprint: () => 'fingerprint-mcp',
  isGkpQuerySnapshotFresh: () => false,
  loadGkpQuerySnapshot: async () => null,
  saveGkpQuerySnapshot: async (s: any) => s,
  loadGkpKeywordRecord: async () => null,
  saveGkpKeywordRecord: async (r: any) => r,
  normalizeKeywordKey: (k: string) => k.toLowerCase().replace(/\s+/g, '-'),
  listGkpQuerySnapshots: async () => [],
}));

jest.unstable_mockModule('../config/publicationStore.js', () => ({
  savePublication: savePublicationMock,
  listPublications: listPublicationsMock,
  loadPublication: loadPublicationMock,
  deletePublication: deletePublicationMock,
  publicationExists: publicationExistsMock,
}));

jest.unstable_mockModule('../config/seriesStore.js', () => ({
  saveSeries: saveSeriesMock,
  listSeries: listSeriesMock,
  loadSeries: loadSeriesMock,
  deleteSeries: deleteSeriesMock,
  seriesExists: seriesExistsMock,
}));

jest.unstable_mockModule('../config/queueStore.js', () => ({
  generateQueueId: generateQueueIdMock,
  saveQueueEntry: saveQueueEntryMock,
  listQueueEntries: listQueueEntriesMock,
  getNextPendingEntry: getNextPendingEntryMock,
  deleteQueueEntry: deleteQueueEntryMock,
  clearQueue: clearQueueMock,
  claimNextPendingEntry: claimNextPendingEntryMock,
  deleteClaimedEntry: deleteClaimedEntryMock,
  revertClaimedEntry: revertClaimedEntryMock,
}));

jest.unstable_mockModule('../plan/pipeline.js', () => ({
  runPlan: runPlanMock,
}));

jest.unstable_mockModule('../config/settingsFile.js', () => ({
  loadSavedSettings: loadSavedSettingsMock,
}));

const runEditorMock = jest.fn<(...args: any[]) => Promise<any>>();

jest.unstable_mockModule('../editor/runEditor.js', () => ({
  runEditor: runEditorMock,
}));

jest.unstable_mockModule('../llm/openRouterClient.js', () => ({
  OpenRouterClient: class {},
}));

jest.unstable_mockModule('../cli/commands/article.js', () => ({
  runArticleListCommand: runArticleListCommandMock,
}));

const startGadsLoginMock = jest.fn<(...args: any[]) => Promise<any>>();
const getGadsLoginStatusMock = jest.fn<() => any>();
const resetGadsLoginStateMock = jest.fn();

jest.unstable_mockModule('../integrations/mcp/oauthFlowManager.js', () => ({
  startGadsLogin: startGadsLoginMock,
  getGadsLoginStatus: getGadsLoginStatusMock,
  resetGadsLoginState: resetGadsLoginStateMock,
}));

const startManagedPreviewMock = jest.fn<(...args: any[]) => Promise<any>>();
const stopManagedPreviewMock = jest.fn<(...args: any[]) => Promise<any>>();
const getManagedPreviewStatusMock = jest.fn<() => any>();

jest.unstable_mockModule('../server/previewServerManager.js', () => ({
  startManagedPreview: startManagedPreviewMock,
  stopManagedPreview: stopManagedPreviewMock,
  getManagedPreviewStatus: getManagedPreviewStatusMock,
}));

const { startIdeonMcpServer } = await import('../integrations/mcp/server.js');

describe('ideon MCP server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registeredTools.clear();

    resolveRunInputMock.mockResolvedValue({
      idea: 'test idea',
      targetAudienceHint: undefined,
      job: null,
      config: {
        settings: {
          contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
        },
        secrets: {
          openRouterApiKey: 'token',
          replicateApiToken: 'token',
          googleAdsDeveloperToken: null,
          googleAdsClientId: null,
          googleAdsClientSecret: null,
          googleAdsRefreshToken: null,
          googleAdsCustomerId: null,
          googleAdsLoginCustomerId: null,
        },
      },
    });

    runPipelineShellMock.mockResolvedValue({
      artifact: {
        slug: 'slug',
        title: 'Title',
        sectionCount: 0,
        imageCount: 0,
        outputCount: 1,
        markdownPath: '/tmp/out.md',
        markdownPaths: ['/tmp/out.md'],
        generationDir: '/tmp/gen',
        assetDir: '/tmp/gen',
        analyticsPath: '/tmp/a.json',
        interactionsPath: '/tmp/i.json',
        planPath: null,
        metaJsonPath: '/tmp/meta.json',
      },
    });

    isConfigKeyMock.mockReturnValue(true);
    configGetMock.mockResolvedValue({ key: 'style', value: 'professional', isSecret: false });
    configSetMock.mockResolvedValue(undefined);
    configListMock.mockResolvedValue({
      settings: { style: 'professional' },
      secrets: { openRouterApiKey: true },
    });
    configUnsetMock.mockResolvedValue(undefined);
    runDeleteCommandMock.mockResolvedValue(undefined);
    runLinksCommandMock.mockResolvedValue(undefined);
    runOutputCommandMock.mockResolvedValue(undefined);
    parsePrimaryAndSecondarySpecsMock.mockReturnValue(undefined);
    connectMock.mockResolvedValue(undefined);
    loadWriteSessionMock.mockResolvedValue({
      idea: 'resume idea',
      targetAudienceHint: undefined,
      job: null,
      settings: {
        contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      },
      status: 'failed',
    });

    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: 'token',
      replicateApiToken: 'token',
      googleAdsDeveloperToken: 'gkp-dev-token',
      googleAdsClientId: 'gkp-client-id',
      googleAdsClientSecret: 'gkp-client-secret',
      googleAdsRefreshToken: 'gkp-refresh-token',
      googleAdsCustomerId: '1234567890',
      googleAdsLoginCustomerId: null,
    });

    readEnvSettingsMock.mockReturnValue({ disableKeytar: undefined });
    gkpClientMock.generateKeywordIdeas.mockResolvedValue({ ideas: [], count: 0 });
    gkpClientMock.getHistoricalMetrics.mockResolvedValue({ keywords: [], count: 0 });
    gkpClientMock.getForecastData.mockResolvedValue({ keywords: [], count: 0 });

    // Publication store mocks
    publicationExistsMock.mockResolvedValue(false);
    savePublicationMock.mockResolvedValue(undefined);
    listPublicationsMock.mockResolvedValue([]);
    loadPublicationMock.mockResolvedValue({
      name: 'Test Pub',
      slug: 'test-pub',
      editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' },
      defaults: {},
    });
    deletePublicationMock.mockResolvedValue(undefined);

    // Series store mocks
    seriesExistsMock.mockResolvedValue(false);
    saveSeriesMock.mockResolvedValue(undefined);
    listSeriesMock.mockResolvedValue([]);
    loadSeriesMock.mockResolvedValue({
      name: 'Test Series',
      slug: 'test-series',
      topic: 'testing',
      publication: undefined,
      editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' },
      defaults: {},
    });
    deleteSeriesMock.mockResolvedValue(undefined);

    // Queue store mocks
    generateQueueIdMock.mockReturnValue('test-uuid-1234');
    saveQueueEntryMock.mockResolvedValue(undefined);
    listQueueEntriesMock.mockResolvedValue([]);
    getNextPendingEntryMock.mockResolvedValue(null);
    deleteQueueEntryMock.mockResolvedValue(undefined);
    clearQueueMock.mockResolvedValue(0);
    claimNextPendingEntryMock.mockResolvedValue(null);
    deleteClaimedEntryMock.mockResolvedValue(undefined);
    revertClaimedEntryMock.mockResolvedValue(undefined);

    // Plan pipeline mock
    runPlanMock.mockResolvedValue({
      mode: 'new-idea',
      lowVolumeMode: false,
      researchStats: { queryRoundsCompleted: 1, candidatesEvaluated: 5, candidatesPassed: 3, cacheHits: 0, apiCallsMade: 1 },
      series: [{ name: 'Test Series', pillarKeyword: 'test', funnelStage: 'middle', clusterRationale: 'rationale', coverageGapNote: '', articles: [] }],
      articles: [],
      discardedCandidates: [],
    });

    // Settings file mock
    loadSavedSettingsMock.mockResolvedValue({
      model: 'deepseek/deepseek-v4-pro',
      planModel: 'deepseek/deepseek-v4-pro',
      planIntentModel: 'deepseek/deepseek-v4-flash',
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      style: 'professional',
      intent: 'tutorial',
      targetLength: 900,
    });

    // Article list mock
    runArticleListCommandMock.mockResolvedValue(undefined);

    runEditorMock.mockResolvedValue({
      snapshot: {
        plan: { title: 'SEO Plan' },
        text: { intro: 'Intro', sections: [], outro: 'Outro' },
        structureChanged: false,
        imagesChanged: false,
      },
      lint: { passed: true, issues: [] },
      turnsUsed: 0,
      skippedAgent: true,
      maxTurnsReached: false,
    });
    patchWriteSessionMock.mockResolvedValue({});

    // GAds login mocks
    startGadsLoginMock.mockResolvedValue({
      status: 'pending',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?test=1',
      port: 9876,
      startedAt: Date.now(),
    });
    getGadsLoginStatusMock.mockReturnValue({ status: 'not_started', authUrl: '', port: 0, startedAt: 0 });
    resetGadsLoginStateMock.mockReturnValue(undefined);
  });

  it('registers tools and connects transport', async () => {
    await startIdeonMcpServer();

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(registeredTools.has('ideon_write')).toBe(true);
    expect(registeredTools.has('ideon_write_resume')).toBe(true);
    expect(registeredTools.has('ideon_run_seo_check')).toBe(true);
    expect(registeredTools.has('ideon_delete')).toBe(true);
    expect(registeredTools.has('ideon_links')).toBe(true);
    expect(registeredTools.has('ideon_export')).toBe(true);
    expect(registeredTools.has('ideon_config_get')).toBe(true);
    expect(registeredTools.has('ideon_config_set')).toBe(true);
    expect(registeredTools.has('ideon_config_list')).toBe(true);
    expect(registeredTools.has('ideon_config_unset')).toBe(true);
    expect(registeredTools.has('gkp_generate_ideas')).toBe(true);
    expect(registeredTools.has('gkp_get_historical_data')).toBe(true);
    expect(registeredTools.has('gkp_get_forecast_data')).toBe(true);
  });

  it('executes ideon_write tool handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_write');

    const result = await tool?.handler({
      idea: 'My idea',
      style: 'professional',
      length: 'medium',
      dryRun: true,
      enrichLinks: false,
    });

    expect(parsePrimaryAndSecondarySpecsMock).toHaveBeenCalled();
    expect(resolveRunInputMock).toHaveBeenCalledWith(expect.objectContaining({ idea: 'My idea' }));
    expect(runPipelineShellMock).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ runMode: 'fresh' }));
    expect(result?.structuredContent?.slug).toBe('slug');
  });

  it('accepts numeric word count length for ideon_write tool handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_write');

    await tool?.handler({
      idea: 'My idea',
      style: 'professional',
      length: 1200,
      dryRun: true,
      enrichLinks: false,
    });

    expect(resolveRunInputMock).toHaveBeenCalledWith(expect.objectContaining({ targetLength: 1200 }));
  });

  it('passes intent to resolveRunInput in ideon_write handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_write');

    await tool?.handler({
      idea: 'My idea',
      intent: 'tutorial',
      dryRun: true,
    });

    expect(resolveRunInputMock).toHaveBeenCalledWith(expect.objectContaining({ intent: 'tutorial' }));
  });

  it('passes link params through ideon_write handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_write');

    await tool?.handler({
      idea: 'My idea',
      link: ['React->https://react.dev'],
      unlink: ['Old'],
      maxLinks: 5,
      dryRun: true,
    });

    expect(runPipelineShellMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ customLinks: ['React->https://react.dev'], unlinks: ['Old'], maxLinks: 5 }),
    );
  });

  it('defaults enrichLinks to false in ideon_write handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_write');

    await tool?.handler({
      idea: 'My idea',
      dryRun: true,
    });

    expect(runPipelineShellMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ enrichLinks: false }),
    );
  });

  it('returns tool error when config key is unsupported', async () => {
    isConfigKeyMock.mockReturnValue(false);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_config_get');

    const result = await tool?.handler({ key: 'bad.key' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('Unsupported config key');
  });

  it('executes ideon_run_seo_check tool handler', async () => {
    loadWriteSessionMock.mockResolvedValue({
      idea: 'seo idea',
      dryRun: true,
      settings: { model: 'deepseek/deepseek-v4-pro' },
      plan: {
        contentType: 'article',
        title: 'SEO Article',
        subtitle: 'Sub',
        primaryKeyword: 'seo',
        keywords: ['seo', 'keywords', 'check'],
        slug: 'seo-article',
        description: 'Description long enough for meta checks that exceeds one hundred and twenty characters total for validation purposes here.',
        introBrief: 'Intro',
        outroBrief: 'Outro',
        sections: [
          { title: 'One', description: 'One' },
          { title: 'Two', description: 'Two' },
        ],
        coverImageDescription: 'Cover',
        inlineImages: [],
      },
      text: {
        intro: 'SEO intro text.',
        sections: [
          { title: 'One', body: 'Body one.' },
          { title: 'Two', body: 'Body two.' },
        ],
        outro: 'Outro.',
      },
    });

    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_run_seo_check');
    const result = await tool?.handler({});

    expect(runEditorMock).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
    expect(patchWriteSessionMock).toHaveBeenCalled();
    expect(result?.isError).toBeFalsy();
    expect(result?.content?.[0]?.text).toContain('"passed"');
  });

  it('returns tool error when resume session is missing', async () => {
    loadWriteSessionMock.mockResolvedValue(null);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_write_resume');

    const result = await tool?.handler({});

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('No resumable write session found');
  });

  it('returns tool error when resume session is already completed', async () => {
    loadWriteSessionMock.mockResolvedValue({
      idea: 'resume idea',
      targetAudienceHint: undefined,
      job: null,
      settings: {
        contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      },
      status: 'completed',
    });

    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_write_resume');

    const result = await tool?.handler({});

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('already completed');
  });

  it('executes ideon_delete and ideon_config_set handlers', async () => {
    await startIdeonMcpServer();

    const deleteTool = registeredTools.get('ideon_delete');
    const deleteResult = await deleteTool?.handler({ slug: 'my-slug' });
    expect(runDeleteCommandMock).toHaveBeenCalledWith(
      { slug: 'my-slug', force: true },
      expect.objectContaining({ cwd: expect.any(String), log: expect.any(Function) }),
    );
    expect(deleteResult?.structuredContent?.deleted).toBe(true);

    const configSetTool = registeredTools.get('ideon_config_set');
    const configResult = await configSetTool?.handler({ key: 'style', value: 'technical' });
    expect(configSetMock).toHaveBeenCalledWith('style', 'technical');
    expect(configResult?.structuredContent?.updated).toBe(true);
  });

  it('returns tool error when delete command fails', async () => {
    runDeleteCommandMock.mockRejectedValue(new Error('delete failed'));

    await startIdeonMcpServer();
    const deleteTool = registeredTools.get('ideon_delete');

    const result = await deleteTool?.handler({ slug: 'my-slug' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('delete failed');
  });

  it('executes ideon_links handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_links');

    const result = await tool?.handler({
      slug: 'my-article',
      mode: 'append',
      link: ['React->https://react.dev'],
      maxLinks: 5,
    });

    expect(runLinksCommandMock).toHaveBeenCalledWith(
      { slug: 'my-article', mode: 'append', links: ['React->https://react.dev'], unlinks: undefined, maxLinks: 5 },
      expect.objectContaining({ cwd: expect.any(String), log: expect.any(Function) }),
    );
    expect(result?.structuredContent?.slug).toBe('my-article');
  });

  it('executes ideon_export handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_export');

    const result = await tool?.handler({
      generationId: '20260504-123000-my-article',
      destinationPath: '/tmp/exports',
      index: 2,
      overwrite: true,
    });

    expect(runOutputCommandMock).toHaveBeenCalledWith(
      {
        generationId: '20260504-123000-my-article',
        destinationPath: '/tmp/exports',
        index: 2,
        overwrite: true,
      },
      expect.objectContaining({ cwd: expect.any(String), log: expect.any(Function) }),
    );
    expect(result?.structuredContent).toEqual({
      generationId: '20260504-123000-my-article',
      destinationPath: '/tmp/exports',
      index: 2,
      overwrite: true,
      messages: [],
    });
  });

  it('defaults index and overwrite in ideon_export handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_export');

    const result = await tool?.handler({
      generationId: '20260504-123000-my-article',
      destinationPath: '/tmp/exports',
    });

    expect(runOutputCommandMock).toHaveBeenCalledWith(
      {
        generationId: '20260504-123000-my-article',
        destinationPath: '/tmp/exports',
        index: undefined,
        overwrite: undefined,
      },
      expect.objectContaining({ cwd: expect.any(String), log: expect.any(Function) }),
    );
    expect(result?.structuredContent).toEqual({
      generationId: '20260504-123000-my-article',
      destinationPath: '/tmp/exports',
      index: 1,
      overwrite: false,
      messages: [],
    });
  });

  it('returns tool error when ideon_export fails', async () => {
    runOutputCommandMock.mockRejectedValue(new Error('export failed'));

    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_export');

    const result = await tool?.handler({
      generationId: '20260504-123000-my-article',
      destinationPath: '/tmp/exports',
    });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('export failed');
  });

  it('returns tool error when ideon_links fails', async () => {
    runLinksCommandMock.mockRejectedValue(new Error('links failed'));

    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_links');

    const result = await tool?.handler({ slug: 'my-article' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('links failed');
  });

  it('executes ideon_config_list handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_config_list');

    const result = await tool?.handler({});

    expect(configListMock).toHaveBeenCalled();
    expect(result?.structuredContent).toEqual({
      settings: { style: 'professional' },
      secrets: { openRouterApiKey: true },
    });
  });

  it('returns tool error when ideon_config_list fails', async () => {
    configListMock.mockRejectedValue(new Error('list failed'));

    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_config_list');

    const result = await tool?.handler({});

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('list failed');
  });

  it('executes ideon_config_unset handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_config_unset');

    const result = await tool?.handler({ key: 'style' });

    expect(configUnsetMock).toHaveBeenCalledWith('style');
    expect(result?.structuredContent?.updated).toBe(true);
  });

  it('returns tool error when ideon_config_unset key is unsupported', async () => {
    isConfigKeyMock.mockReturnValue(false);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_config_unset');

    const result = await tool?.handler({ key: 'bad.key' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('Unsupported config key');
  });

  it('executes gkp_generate_ideas handler', async () => {
    gkpClientMock.generateKeywordIdeas.mockResolvedValue({
      ideas: [{ text: 'test keyword', avgMonthlySearches: 1000, competition: 'HIGH', competitionIndex: 80, lowTopOfPageBidMicros: 500000, highTopOfPageBidMicros: 1500000, closeVariants: [] }],
      count: 1,
    });

    await startIdeonMcpServer();
    const tool = registeredTools.get('gkp_generate_ideas');

    const result = await tool?.handler({ seedKeywords: ['test'] });

    expect(gkpClientMock.generateKeywordIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ seedKeywords: ['test'] }),
    );
    expect(result?.structuredContent?.count).toBe(1);
  });

  it('executes gkp_get_historical_data handler', async () => {
    gkpClientMock.getHistoricalMetrics.mockResolvedValue({
      keywords: [{ text: 'test keyword', avgMonthlySearches: 2000, competition: 'MEDIUM', competitionIndex: 50, lowTopOfPageBidMicros: 300000, highTopOfPageBidMicros: 900000, monthlySearchVolumes: [] }],
      count: 1,
    });

    await startIdeonMcpServer();
    const tool = registeredTools.get('gkp_get_historical_data');

    const result = await tool?.handler({ keywords: ['test'] });

    expect(gkpClientMock.getHistoricalMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: ['test'] }),
    );
    expect(result?.structuredContent?.count).toBe(1);
  });

  it('executes gkp_get_forecast_data handler', async () => {
    gkpClientMock.getForecastData.mockResolvedValue({
      keywords: [{ text: 'test keyword', matchType: 'BROAD', impressions: 1000, clicks: 50, costMicros: 25000, ctr: 0.05 }],
      count: 1,
    });

    await startIdeonMcpServer();
    const tool = registeredTools.get('gkp_get_forecast_data');

    const result = await tool?.handler({ keywords: ['test'] });

    expect(gkpClientMock.getForecastData).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: ['test'] }),
    );
    expect(result?.structuredContent?.count).toBe(1);
  });

  it('returns tool error when gkp_generate_ideas fails', async () => {
    gkpClientMock.generateKeywordIdeas.mockRejectedValue(new Error('API error'));

    await startIdeonMcpServer();
    const tool = registeredTools.get('gkp_generate_ideas');

    const result = await tool?.handler({ seedKeywords: ['test'] });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('API error');
  });

  // ─── Publication tool tests ──────────────────────────────────────────────

  it('registers all 17 new tools', async () => {
    await startIdeonMcpServer();

    const newTools = [
      'ideon_publication_add', 'ideon_publication_list', 'ideon_publication_edit', 'ideon_publication_remove',
      'ideon_series_add', 'ideon_series_list', 'ideon_series_edit', 'ideon_series_remove',
      'ideon_queue_add', 'ideon_queue_list', 'ideon_queue_peek', 'ideon_queue_remove', 'ideon_queue_clear', 'ideon_queue_write',
      'ideon_plan_explore', 'ideon_plan_expand',
      'ideon_article_list',
      'gads_login', 'gads_login_status', 'gads_test',
    ];
    for (const name of newTools) {
      expect(registeredTools.has(name)).toBe(true);
    }
  });

  it('executes ideon_publication_add handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_publication_add');

    const result = await tool?.handler({ name: 'My Pub', style: 'technical', tone: 'formal' });

    expect(publicationExistsMock).toHaveBeenCalledWith('my-pub');
    expect(savePublicationMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My Pub',
      slug: 'my-pub',
      defaults: expect.objectContaining({ style: 'technical' }),
      editorialPolicy: expect.objectContaining({ tone: 'formal' }),
    }));
    expect(result?.content?.[0]?.text).toContain('My Pub');
  });

  it('returns tool error when publication already exists', async () => {
    publicationExistsMock.mockResolvedValue(true);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_publication_add');

    const result = await tool?.handler({ name: 'Existing Pub' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('already exists');
  });

  it('executes ideon_publication_list handler', async () => {
    listPublicationsMock.mockResolvedValue([
      { name: 'Pub 1', slug: 'pub-1', editorialPolicy: {}, defaults: {} },
      { name: 'Pub 2', slug: 'pub-2', editorialPolicy: {}, defaults: {} },
    ]);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_publication_list');

    const result = await tool?.handler({});

    expect(listPublicationsMock).toHaveBeenCalled();
    expect(result?.content?.[0]?.text).toContain('pub-1');
  });

  it('executes ideon_publication_edit handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_publication_edit');

    const result = await tool?.handler({ slug: 'test-pub', style: 'academic', tone: 'scholarly' });

    expect(loadPublicationMock).toHaveBeenCalledWith('test-pub');
    expect(savePublicationMock).toHaveBeenCalled();
    expect(result?.content?.[0]?.text).toContain('test-pub');
  });

  it('executes ideon_publication_remove handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_publication_remove');

    const result = await tool?.handler({ slug: 'test-pub' });

    expect(deletePublicationMock).toHaveBeenCalledWith('test-pub');
    expect(result?.content?.[0]?.text).toContain('true');
  });

  // ─── Series tool tests ───────────────────────────────────────────────────

  it('executes ideon_series_add handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_series_add');

    const result = await tool?.handler({ name: 'My Series', topic: 'testing', publication: 'my-pub', keywords: ['test', 'series'] });

    expect(seriesExistsMock).toHaveBeenCalledWith('my-series');
    expect(saveSeriesMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My Series',
      slug: 'my-series',
      topic: 'testing',
      publication: 'my-pub',
      defaults: expect.objectContaining({ keywords: ['test', 'series'] }),
    }));
    expect(result?.content?.[0]?.text).toContain('My Series');
  });

  it('returns tool error when series already exists', async () => {
    seriesExistsMock.mockResolvedValue(true);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_series_add');

    const result = await tool?.handler({ name: 'Existing Series' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('already exists');
  });

  it('executes ideon_series_list handler', async () => {
    listSeriesMock.mockResolvedValue([
      { name: 'Series 1', slug: 'series-1', topic: 't1', editorialPolicy: {}, defaults: {} },
    ]);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_series_list');

    const result = await tool?.handler({ publication: 'my-pub' });

    expect(listSeriesMock).toHaveBeenCalledWith({ publicationSlug: 'my-pub' });
    expect(result?.content?.[0]?.text).toContain('series-1');
  });

  it('executes ideon_series_edit handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_series_edit');

    const result = await tool?.handler({ slug: 'test-series', topic: 'updated topic', keywords: ['new'] });

    expect(loadSeriesMock).toHaveBeenCalledWith('test-series');
    expect(saveSeriesMock).toHaveBeenCalled();
    expect(result?.content?.[0]?.text).toContain('test-series');
  });

  it('executes ideon_series_remove handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_series_remove');

    const result = await tool?.handler({ slug: 'test-series' });

    expect(deleteSeriesMock).toHaveBeenCalledWith('test-series');
    expect(result?.content?.[0]?.text).toContain('true');
  });

  // ─── Queue tool tests ────────────────────────────────────────────────────

  it('executes ideon_queue_add handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_add');

    const result = await tool?.handler({ idea: 'Write about testing', publication: 'my-pub' });

    expect(resolveRunInputMock).toHaveBeenCalled();
    expect(saveQueueEntryMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-uuid-1234',
      status: 'pending',
      idea: 'Write about testing',
    }));
    expect(result?.content?.[0]?.text).toContain('test-uuid-1234');
  });

  it('executes ideon_queue_list handler', async () => {
    listQueueEntriesMock.mockResolvedValue([
      { id: 'q1', status: 'pending', idea: 'idea 1', addedAt: '2025-01-01T00:00:00Z', type: 'new' },
    ]);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_list');

    const result = await tool?.handler({ status: 'pending' });

    expect(listQueueEntriesMock).toHaveBeenCalledWith({ status: 'pending', publicationSlug: undefined });
    expect(result?.content?.[0]?.text).toContain('q1');
  });

  it('executes ideon_queue_peek handler', async () => {
    getNextPendingEntryMock.mockResolvedValue({ id: 'q1', status: 'pending', idea: 'next idea' });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_peek');

    const result = await tool?.handler({});

    expect(getNextPendingEntryMock).toHaveBeenCalled();
    expect(result?.content?.[0]?.text).toContain('next idea');
  });

  it('returns null when queue is empty on peek', async () => {
    getNextPendingEntryMock.mockResolvedValue(null);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_peek');

    const result = await tool?.handler({});

    expect(result?.content?.[0]?.text).toContain('null');
  });

  it('executes ideon_queue_remove handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_remove');

    const result = await tool?.handler({ id: 'q1' });

    expect(deleteQueueEntryMock).toHaveBeenCalledWith('q1');
    expect(result?.content?.[0]?.text).toContain('true');
  });

  it('executes ideon_queue_clear handler', async () => {
    clearQueueMock.mockResolvedValue(3);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_clear');

    const result = await tool?.handler({});

    expect(clearQueueMock).toHaveBeenCalled();
    expect(result?.content?.[0]?.text).toContain('3');
  });

  it('executes ideon_queue_write handler successfully', async () => {
    claimNextPendingEntryMock.mockResolvedValue({
      id: 'q1',
      status: 'in-progress',
      idea: 'queued idea',
      settings: { contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }] },
      job: null,
      publication: null,
      series: null,
    });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_write');

    const result = await tool?.handler({ dryRun: true });

    expect(claimNextPendingEntryMock).toHaveBeenCalled();
    expect(runPipelineShellMock).toHaveBeenCalled();
    expect(deleteClaimedEntryMock).toHaveBeenCalledWith('q1');
    expect(result?.content?.[0]?.text).toContain('Generated');
  });

  it('reverts claimed entry when ideon_queue_write fails', async () => {
    const entry = {
      id: 'q1',
      status: 'in-progress' as const,
      idea: 'queued idea',
      settings: { contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }] },
      job: null,
      publication: null,
      series: null,
    };
    claimNextPendingEntryMock.mockResolvedValue(entry);
    runPipelineShellMock.mockRejectedValue(new Error('write failed'));
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_write');

    const result = await tool?.handler({});

    expect(revertClaimedEntryMock).toHaveBeenCalledWith(entry);
    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('write failed');
  });

  it('returns tool error when no pending entries for ideon_queue_write', async () => {
    claimNextPendingEntryMock.mockResolvedValue(null);
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_queue_write');

    const result = await tool?.handler({});

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('No pending articles');
  });

  // ─── Plan tool tests ─────────────────────────────────────────────────────

  it('executes ideon_plan_explore handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_plan_explore');

    const result = await tool?.handler({ idea: 'content marketing', publication: 'test-pub', dryRun: true });

    expect(loadPublicationMock).toHaveBeenCalledWith('test-pub');
    expect(runPlanMock).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ mode: 'new-idea', contentIdea: 'content marketing' }),
    }));
    expect(result?.content?.[0]?.text).toContain('Test Series');
  });

  it('returns tool error when plan explore GKP credentials are missing', async () => {
    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: 'token',
      replicateApiToken: null,
      googleAdsDeveloperToken: null,
      googleAdsClientId: null,
      googleAdsClientSecret: null,
      googleAdsRefreshToken: null,
      googleAdsCustomerId: null,
      googleAdsLoginCustomerId: null,
    });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_plan_explore');

    const result = await tool?.handler({ idea: 'test', publication: 'test-pub' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('Google Ads developer token not configured');
  });

  it('executes ideon_plan_expand handler', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_plan_expand');

    const result = await tool?.handler({ seriesSlug: 'test-series', publication: 'test-pub', dryRun: true });

    expect(loadSeriesMock).toHaveBeenCalledWith('test-series');
    expect(runPlanMock).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ mode: 'expand-series', seriesSlug: 'test-series' }),
    }));
    expect(result?.content?.[0]?.text).toContain('Test Series');
  });

  it('returns tool error when plan expand OpenRouter key is missing', async () => {
    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: null,
      replicateApiToken: null,
      googleAdsDeveloperToken: 'gkp-dev-token',
      googleAdsClientId: 'gkp-client-id',
      googleAdsClientSecret: 'gkp-client-secret',
      googleAdsRefreshToken: 'gkp-refresh-token',
      googleAdsCustomerId: '1234567890',
      googleAdsLoginCustomerId: null,
    });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_plan_expand');

    const result = await tool?.handler({ seriesSlug: 'test-series' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('OpenRouter API key not configured');
  });

  // ─── Article tool tests ──────────────────────────────────────────────────

  it('executes ideon_article_list handler', async () => {
    runArticleListCommandMock.mockImplementation(async (_opts: any, deps: any) => {
      deps.log(JSON.stringify([{ slug: 'art-1', title: 'Article 1' }]));
    });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_article_list');

    const result = await tool?.handler({});

    expect(runArticleListCommandMock).toHaveBeenCalled();
    expect(result?.content?.[0]?.text).toContain('art-1');
  });

  // ─── GAds login tool tests ─────────────────────────────────────────────

  it('executes gads_login handler and returns auth URL', async () => {
    await startIdeonMcpServer();
    const tool = registeredTools.get('gads_login');

    const result = await tool?.handler({
      developerToken: 'dev-token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      customerId: '1234567890',
    });

    expect(startGadsLoginMock).toHaveBeenCalledWith({
      developerToken: 'dev-token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      customerId: '1234567890',
      loginCustomerId: undefined,
      force: undefined,
    });
    expect(result?.structuredContent?.authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth?test=1');
    expect(result?.structuredContent?.status).toBe('pending');
  });

  it('returns tool error when gads_login fails', async () => {
    startGadsLoginMock.mockRejectedValue(new Error('Already authenticated'));
    await startIdeonMcpServer();
    const tool = registeredTools.get('gads_login');

    const result = await tool?.handler({
      developerToken: 'dev',
      clientId: 'id',
      clientSecret: 'secret',
      customerId: '123',
    });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('Already authenticated');
  });

  it('executes ideon_preview start handler', async () => {
    startManagedPreviewMock.mockResolvedValue({
      status: 'running',
      url: 'http://localhost:4173',
      port: 4173,
      markdownPath: '/tmp/sample.md',
      startedAt: Date.now(),
    });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_preview');

    const result = await tool?.handler({ action: 'start', port: 4173 });

    expect(startManagedPreviewMock).toHaveBeenCalledWith({
      port: 4173,
      markdownPath: undefined,
      cwd: expect.any(String),
    });
    expect(result?.structuredContent).toEqual({
      status: 'running',
      url: 'http://localhost:4173',
      port: 4173,
      markdownPath: '/tmp/sample.md',
    });
    expect(result?.content?.[0]?.text).toContain('http://localhost:4173');
  });

  it('executes ideon_preview stop handler', async () => {
    stopManagedPreviewMock.mockResolvedValue({ status: 'stopped', url: '', port: 0, markdownPath: '', startedAt: 0 });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_preview');

    const result = await tool?.handler({ action: 'stop' });

    expect(stopManagedPreviewMock).toHaveBeenCalled();
    expect(result?.structuredContent).toEqual({ status: 'stopped' });
    expect(result?.content?.[0]?.text).toContain('stopped');
  });

  it('executes ideon_preview status handler when running', async () => {
    getManagedPreviewStatusMock.mockReturnValue({
      status: 'running',
      url: 'http://localhost:4173',
      port: 4173,
      markdownPath: '/tmp/sample.md',
      startedAt: 1234,
    });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_preview');

    const result = await tool?.handler({ action: 'status' });

    expect(getManagedPreviewStatusMock).toHaveBeenCalled();
    expect(result?.structuredContent).toEqual({
      status: 'running',
      url: 'http://localhost:4173',
      port: 4173,
      markdownPath: '/tmp/sample.md',
      startedAt: 1234,
    });
  });

  it('executes ideon_preview status handler when stopped', async () => {
    getManagedPreviewStatusMock.mockReturnValue({ status: 'stopped', url: '', port: 0, markdownPath: '', startedAt: 0 });
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_preview');

    const result = await tool?.handler({ action: 'status' });

    expect(result?.structuredContent).toEqual({ status: 'stopped' });
    expect(result?.content?.[0]?.text).toContain('not running');
  });

  it('returns error when ideon_preview start fails', async () => {
    startManagedPreviewMock.mockRejectedValue(new Error('No generated articles found'));
    await startIdeonMcpServer();
    const tool = registeredTools.get('ideon_preview');

    const result = await tool?.handler({ action: 'start' });

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('No generated articles found');
  });

  it('executes gads_login_status handler for not_started', async () => {
    getGadsLoginStatusMock.mockReturnValue({ status: 'not_started', authUrl: '', port: 0, startedAt: 0 });
    await startIdeonMcpServer();
    const tool = registeredTools.get('gads_login_status');

    const result = await tool?.handler({});

    expect(result?.structuredContent?.status).toBe('not_started');
    expect(result?.content?.[0]?.text).toContain('No OAuth flow');
  });

  it('executes gads_login_status handler for pending', async () => {
    getGadsLoginStatusMock.mockReturnValue({
      status: 'pending',
      authUrl: 'https://accounts.google.com/test',
      port: 9876,
      startedAt: Date.now() - 5000,
    });
    await startIdeonMcpServer();
    const tool = registeredTools.get('gads_login_status');

    const result = await tool?.handler({});

    expect(result?.structuredContent?.status).toBe('pending');
    expect(result?.content?.[0]?.text).toContain('pending');
  });

  it('executes gads_login_status handler for completed', async () => {
    getGadsLoginStatusMock.mockReturnValue({ status: 'completed', authUrl: '', port: 0, startedAt: 0 });
    await startIdeonMcpServer();
    const tool = registeredTools.get('gads_login_status');

    const result = await tool?.handler({});

    expect(result?.structuredContent?.status).toBe('completed');
    expect(result?.content?.[0]?.text).toContain('completed');
    expect(resetGadsLoginStateMock).toHaveBeenCalled();
  });

  it('executes gads_login_status handler for timed_out', async () => {
    getGadsLoginStatusMock.mockReturnValue({ status: 'timed_out', authUrl: '', port: 0, startedAt: 0, message: 'Timed out after 120 seconds.' });
    await startIdeonMcpServer();
    const tool = registeredTools.get('gads_login_status');

    const result = await tool?.handler({});

    expect(result?.structuredContent?.status).toBe('timed_out');
    expect(result?.content?.[0]?.text).toContain('Timed out');
    expect(resetGadsLoginStateMock).toHaveBeenCalled();
  });

  it('executes gads_test handler with valid credentials', async () => {
    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: 'token',
      replicateApiToken: 'token',
      googleAdsDeveloperToken: 'dev-token',
      googleAdsClientId: 'client-id',
      googleAdsClientSecret: 'client-secret',
      googleAdsRefreshToken: 'refresh-token',
      customerId: '1234567890',
      googleAdsCustomerId: '1234567890',
      googleAdsLoginCustomerId: null,
    });
    readEnvSettingsMock.mockReturnValue({ disableKeytar: undefined });
    await startIdeonMcpServer();
    const tool = registeredTools.get('gads_test');

    const result = await tool?.handler({});

    expect(result?.structuredContent?.verified).toBe(true);
    expect(result?.structuredContent?.customerId).toBe('1234567890');
  });

  it('returns error when gads_test has missing credentials', async () => {
    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: 'token',
      replicateApiToken: 'token',
      googleAdsDeveloperToken: null,
      googleAdsClientId: null,
      googleAdsClientSecret: null,
      googleAdsRefreshToken: null,
      googleAdsCustomerId: null,
      googleAdsLoginCustomerId: null,
    });
    readEnvSettingsMock.mockReturnValue({ disableKeytar: undefined });
    await startIdeonMcpServer();
    const tool = registeredTools.get('gads_test');

    const result = await tool?.handler({});

    expect(result?.isError).toBe(true);
    expect(result?.content?.[0]?.text).toContain('Missing required Google Ads credentials');
  });
});
