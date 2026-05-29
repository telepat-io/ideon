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
const loadSecretsMock = jest.fn<(...args: any[]) => Promise<any>>();
const readEnvSettingsMock = jest.fn<() => any>();
const gkpClientMock = {
  generateKeywordIdeas: jest.fn<(...args: any[]) => Promise<any>>(),
  getHistoricalMetrics: jest.fn<(...args: any[]) => Promise<any>>(),
  getForecastData: jest.fn<(...args: any[]) => Promise<any>>(),
};

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
  });

  it('registers tools and connects transport', async () => {
    await startIdeonMcpServer();

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(registeredTools.has('ideon_write')).toBe(true);
    expect(registeredTools.has('ideon_write_resume')).toBe(true);
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
});
