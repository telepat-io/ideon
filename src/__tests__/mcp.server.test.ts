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
const configGetMock = jest.fn<(...args: any[]) => Promise<any>>();
const configSetMock = jest.fn<(...args: any[]) => Promise<any>>();
const isConfigKeyMock = jest.fn<(key: string) => boolean>();
const parsePrimaryAndSecondarySpecsMock = jest.fn();
const loadWriteSessionMock = jest.fn<(...args: any[]) => Promise<any>>();

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

jest.unstable_mockModule('../config/manage.js', () => ({
  configGet: configGetMock,
  configSet: configSetMock,
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
    'targetLength',
  ],
  configSecretKeys: ['openRouterApiKey', 'replicateApiToken'],
}));

jest.unstable_mockModule('../cli/commands/writeTargetSpecs.js', () => ({
  parsePrimaryAndSecondarySpecs: parsePrimaryAndSecondarySpecsMock,
}));

jest.unstable_mockModule('../pipeline/sessionStore.js', () => ({
  loadWriteSession: loadWriteSessionMock,
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
        },
      },
    });

    runPipelineShellMock.mockResolvedValue({
      artifact: {
        slug: 'slug',
        title: 'Title',
        outputCount: 1,
        markdownPath: '/tmp/out.md',
        markdownPaths: ['/tmp/out.md'],
        generationDir: '/tmp/gen',
        analyticsPath: '/tmp/a.json',
      },
    });

    isConfigKeyMock.mockReturnValue(true);
    configGetMock.mockResolvedValue({ key: 'style', value: 'professional', isSecret: false });
    configSetMock.mockResolvedValue(undefined);
    runDeleteCommandMock.mockResolvedValue(undefined);
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
  });

  it('registers tools and connects transport', async () => {
    await startIdeonMcpServer();

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(registeredTools.has('ideon_write')).toBe(true);
    expect(registeredTools.has('ideon_write_resume')).toBe(true);
    expect(registeredTools.has('ideon_delete')).toBe(true);
    expect(registeredTools.has('ideon_config_get')).toBe(true);
    expect(registeredTools.has('ideon_config_set')).toBe(true);
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
});
