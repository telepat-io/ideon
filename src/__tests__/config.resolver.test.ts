import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';
import type { AppSettings, EnvSettings, SecretSettings } from '../config/schema.js';

const loadSavedSettingsMock = jest.fn<() => Promise<AppSettings>>();
const loadSecretsMock = jest.fn<(options?: { disableKeytar?: boolean }) => Promise<SecretSettings>>();
const readEnvSettingsMock = jest.fn<() => EnvSettings>();

jest.unstable_mockModule('../config/settingsFile.js', () => ({
  loadSavedSettings: loadSavedSettingsMock,
}));

jest.unstable_mockModule('../config/secretStore.js', () => ({
  loadSecrets: loadSecretsMock,
}));

jest.unstable_mockModule('../config/env.js', () => ({
  readEnvSettings: readEnvSettingsMock,
}));

const { resolveRunInput } = await import('../config/resolver.js');

describe('resolveRunInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    loadSavedSettingsMock.mockResolvedValue({
      model: 'saved/model',
      modelSettings: { temperature: 0.5, maxTokens: 1500, topP: 0.9 },
      modelRequestTimeoutMs: 90000,
      t2i: { modelId: 'black-forest-labs/flux-schnell', inputOverrides: {} },
      notifications: { enabled: false },
      markdownOutputDir: '/saved-out',
      assetOutputDir: '/saved-out/assets',
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      style: 'professional',
      targetLength: 'medium',
    });

    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: 'saved-openrouter-key',
      replicateApiToken: 'saved-replicate-token',
    });

    readEnvSettingsMock.mockReturnValue({});
  });

  it('resolves from direct idea when provided and merges saved settings', async () => {
    const result = await resolveRunInput({ idea: 'direct cli idea' });

    expect(result.idea).toBe('direct cli idea');
    expect(result.job).toBeNull();
    expect(result.config.settings.model).toBe('saved/model');
    expect(result.config.settings.modelSettings.temperature).toBe(0.5);
    expect(result.config.secrets.openRouterApiKey).toBe('saved-openrouter-key');
  });

  it('applies settings precedence saved < job < env', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-config-test-'));

    try {
      const jobPath = path.join(tempDir, 'job.json');
      await writeFile(
        jobPath,
        JSON.stringify({
          idea: 'job file idea',
          settings: {
            model: 'job/model',
            modelRequestTimeoutMs: 120000,
            modelSettings: { maxTokens: 2200, topP: 0.7 },
            markdownOutputDir: '/job-out',
            assetOutputDir: '/job-out/assets',
          },
        }),
        'utf8',
      );

      readEnvSettingsMock.mockReturnValue({
        model: 'env/model',
        temperature: 1.1,
        modelRequestTimeoutMs: 150000,
        markdownOutputDir: '/env-out',
        assetOutputDir: '/env-out/assets',
      });

      const result = await resolveRunInput({ jobPath });

      expect(result.idea).toBe('job file idea');
      expect(result.config.settings.model).toBe('env/model');
      expect(result.config.settings.modelRequestTimeoutMs).toBe(150000);
      expect(result.config.settings.modelSettings.temperature).toBe(1.1);
      expect(result.config.settings.modelSettings.maxTokens).toBe(2200);
      expect(result.config.settings.modelSettings.topP).toBe(0.7);
      expect(result.config.settings.markdownOutputDir).toBe('/env-out');
      expect(result.config.settings.assetOutputDir).toBe('/env-out/assets');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers direct idea over job idea and prompt', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-config-idea-priority-'));

    try {
      const jobPath = path.join(tempDir, 'job.json');
      await writeFile(
        jobPath,
        JSON.stringify({
          idea: 'job idea',
          prompt: 'job prompt fallback',
        }),
        'utf8',
      );

      const result = await resolveRunInput({
        idea: 'cli wins',
        jobPath,
      });

      expect(result.idea).toBe('cli wins');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to job prompt when idea is absent', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-config-prompt-fallback-'));

    try {
      const jobPath = path.join(tempDir, 'job.json');
      await writeFile(
        jobPath,
        JSON.stringify({
          prompt: 'prompt as fallback idea',
        }),
        'utf8',
      );

      const result = await resolveRunInput({ jobPath });
      expect(result.idea).toBe('prompt as fallback idea');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves target audience from CLI and trims whitespace', async () => {
    const result = await resolveRunInput({
      idea: 'audience override test',
      audience: '  Solo founders running lean content ops  ',
    });

    expect(result.targetAudienceHint).toBe('Solo founders running lean content ops');
  });

  it('falls back to job targetAudience when CLI audience is absent', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-config-audience-fallback-'));

    try {
      const jobPath = path.join(tempDir, 'job.json');
      await writeFile(
        jobPath,
        JSON.stringify({
          idea: 'job audience fallback',
          targetAudience: 'In-house content teams scaling from ad hoc to repeatable workflows.',
        }),
        'utf8',
      );

      const result = await resolveRunInput({ jobPath });
      expect(result.targetAudienceHint).toBe('In-house content teams scaling from ad hoc to repeatable workflows.');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers env secrets over saved secrets', async () => {
    readEnvSettingsMock.mockReturnValue({
      openRouterApiKey: 'env-openrouter-key',
      replicateApiToken: 'env-replicate-token',
    });

    const result = await resolveRunInput({ idea: 'secret precedence test' });

    expect(result.config.secrets.openRouterApiKey).toBe('env-openrouter-key');
    expect(result.config.secrets.replicateApiToken).toBe('env-replicate-token');
  });

  it('passes disable-keytar env flag into secret loading', async () => {
    readEnvSettingsMock.mockReturnValue({
      disableKeytar: true,
    });

    await resolveRunInput({ idea: 'disable keytar test' });

    expect(loadSecretsMock).toHaveBeenCalledWith({ disableKeytar: true });
  });

  it('still resolves when keytar returns null secrets and env provides keys', async () => {
    loadSecretsMock.mockResolvedValue({
      openRouterApiKey: null,
      replicateApiToken: null,
    });
    readEnvSettingsMock.mockReturnValue({
      openRouterApiKey: 'env-openrouter-key',
      replicateApiToken: 'env-replicate-token',
    });

    const result = await resolveRunInput({ idea: 'env fallback key test' });

    expect(result.config.secrets.openRouterApiKey).toBe('env-openrouter-key');
    expect(result.config.secrets.replicateApiToken).toBe('env-replicate-token');
  });

  it('uses job timeout when env timeout is absent', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-config-timeout-job-'));

    try {
      const jobPath = path.join(tempDir, 'job.json');
      await writeFile(
        jobPath,
        JSON.stringify({
          idea: 'job timeout test',
          settings: {
            modelRequestTimeoutMs: 120000,
          },
        }),
        'utf8',
      );

      const result = await resolveRunInput({ jobPath });
      expect(result.config.settings.modelRequestTimeoutMs).toBe(120000);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('throws when no idea is provided in CLI or job', async () => {
    await expect(resolveRunInput({})).rejects.toThrow('No idea provided');
  });

  it('uses professional style and one article target by default', async () => {
    loadSavedSettingsMock.mockResolvedValue({
      model: 'saved/model',
      modelSettings: { temperature: 0.5, maxTokens: 1500, topP: 0.9 },
      modelRequestTimeoutMs: 90000,
      t2i: { modelId: 'black-forest-labs/flux-schnell', inputOverrides: {} },
      notifications: { enabled: false },
      markdownOutputDir: '/saved-out',
      assetOutputDir: '/saved-out/assets',
      style: 'professional',
      contentTargets: [{ contentType: 'article', role: 'primary', count: 1 }],
      targetLength: 'medium',
    });

    const result = await resolveRunInput({ idea: 'defaults test' });

    expect(result.config.settings.style).toBe('professional');
    expect(result.config.settings.contentTargets).toEqual([{ contentType: 'article', role: 'primary', count: 1 }]);
    expect(result.config.settings.notifications.enabled).toBe(false);
  });

  it('applies notification enabled precedence saved < job < env', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-config-notifications-'));

    try {
      const jobPath = path.join(tempDir, 'job.json');
      await writeFile(
        jobPath,
        JSON.stringify({
          idea: 'notifications test',
          settings: {
            notifications: {
              enabled: true,
            },
          },
        }),
        'utf8',
      );

      readEnvSettingsMock.mockReturnValue({
        notificationsEnabled: false,
      });

      const result = await resolveRunInput({ jobPath });
      expect(result.config.settings.notifications.enabled).toBe(false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('applies direct style and target overrides', async () => {
    const result = await resolveRunInput({
      idea: 'override test',
      style: 'technical',
      targetLength: 'large',
      contentTargets: [
        { contentType: 'article', role: 'primary', count: 1 },
        { contentType: 'x-thread', role: 'secondary', count: 2 },
        { contentType: 'x-post', role: 'secondary', count: 1 },
      ],
    });

    expect(result.config.settings.style).toBe('technical');
    expect(result.config.settings.targetLength).toBe('large');
    expect(result.config.settings.contentTargets).toEqual([
      { contentType: 'article', role: 'primary', count: 1 },
      { contentType: 'x-thread', role: 'secondary', count: 2 },
      { contentType: 'x-post', role: 'secondary', count: 1 },
    ]);
  });

  it('throws hard error when legacy xMode is provided', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-config-legacy-xmode-'));

    try {
      const jobPath = path.join(tempDir, 'job.json');
      await writeFile(
        jobPath,
        JSON.stringify({
          idea: 'legacy mode test',
          settings: {
            contentTargets: [{ contentType: 'x-post', role: 'primary', count: 1, xMode: 'thread' }],
          },
        }),
        'utf8',
      );

      await expect(resolveRunInput({ jobPath })).rejects.toThrow('Unsupported legacy xMode');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('applies env target length when provided', async () => {
    readEnvSettingsMock.mockReturnValue({
      targetLength: 'small',
    });

    const result = await resolveRunInput({ idea: 'env length test' });
    expect(result.config.settings.targetLength).toBe('small');
  });
});
