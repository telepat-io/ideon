import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  mergeCodexTomlSection,
  mergeMarkerSection,
  mergeMcpServersEntry,
  mergeOpenCodeMcpEntry,
  mergeStringArrayEntry,
  mergeVsCodeMcpServer,
  removeMarkerSection,
  removeMcpServersEntry,
  removeCodexTomlSection,
  removeOpenCodeMcpEntry,
  removeVsCodeMcpServer,
} from '../integrations/agent/installMerge.js';
import {
  readIdeonPackageVersion,
  resetIdeonPackageRootCacheForTests,
  resolveIdeonPackageRoot,
} from '../integrations/agent/packageRoot.js';
import { installAgentRuntime } from '../integrations/agent/runtimeInstaller.js';
import { getInstalledAgentIntegration } from '../integrations/agent/store.js';
import { copySkillTree, installSkillLink, removeSkillLink } from '../integrations/agent/skillInstall.js';
import { resolveIdeonSkillDir } from '../integrations/agent/packageRoot.js';

describe('agent branch coverage', () => {
  let homeDir = '';
  let projectDir = '';
  let tempDir = '';

  beforeEach(async () => {
    homeDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-branch-home-'));
    projectDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-branch-project-'));
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-branch-tmp-'));
  });

  afterEach(async () => {
    await rm(homeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
    await rm(tempDir, { recursive: true, force: true });
    resetIdeonPackageRootCacheForTests();
  });

  describe('skillInstall branches', () => {
    it('skips when a real directory already exists without force', async () => {
      const target = path.join(tempDir, 'ideon-cli');
      await mkdir(target, { recursive: true });
      await writeFile(path.join(target, 'placeholder.txt'), 'keep', 'utf8');
      const result = await installSkillLink(resolveIdeonSkillDir('ideon-cli'), target, {
        dryRun: false,
        force: false,
      });
      expect(result.skipped).toBe(true);
      expect(result.method).toBe('none');
    });

    it('replaces an existing directory when force is enabled', async () => {
      const target = path.join(tempDir, 'ideon-cli');
      await mkdir(target, { recursive: true });
      await writeFile(path.join(target, 'placeholder.txt'), 'old', 'utf8');
      const result = await installSkillLink(resolveIdeonSkillDir('ideon-cli'), target, {
        dryRun: false,
        force: true,
      });
      expect(result.changed).toBe(true);
      await readFile(path.join(target, 'SKILL.md'), 'utf8');
    });

    it('skips copySkillTree when export path exists without force', async () => {
      const target = path.join(tempDir, 'export', 'ideon-cli');
      await mkdir(target, { recursive: true });
      const result = await copySkillTree(resolveIdeonSkillDir('ideon-cli'), target, {
        dryRun: false,
        force: false,
      });
      expect(result.skipped).toBe(true);
    });

    it('returns true when removeSkillLink target is missing due to force rm', async () => {
      expect(await removeSkillLink(path.join(tempDir, 'missing-link'), { dryRun: false })).toBe(true);
    });
  });

  describe('installMerge branches', () => {
    it('returns unchanged when string array already contains value', async () => {
      const skillPath = resolveIdeonSkillDir('ideon-cli');
      const target = path.join(tempDir, 'settings.json');
      await writeFile(target, JSON.stringify({ skills: [skillPath] }), 'utf8');
      const result = await mergeStringArrayEntry(target, 'skills', skillPath, { force: false, dryRun: false });
      expect(result.changed).toBe(false);
    });

    it('returns false when removing absent mcp server keys', async () => {
      const target = path.join(tempDir, 'mcp.json');
      await writeFile(target, JSON.stringify({ mcpServers: { other: { command: 'x' } } }), 'utf8');
      expect(await removeMcpServersEntry(target, { dryRun: false })).toBe(false);
    });

    it('returns false when removing absent vscode server keys', async () => {
      const target = path.join(tempDir, 'vscode-mcp.json');
      await writeFile(target, JSON.stringify({ servers: { other: { type: 'stdio' } } }), 'utf8');
      expect(await removeVsCodeMcpServer(target, { dryRun: false })).toBe(false);
    });

    it('returns false when removing absent opencode mcp keys', async () => {
      const target = path.join(tempDir, 'opencode.json');
      await writeFile(target, JSON.stringify({ mcp: { other: { type: 'local' } } }), 'utf8');
      expect(await removeOpenCodeMcpEntry(target, { dryRun: false })).toBe(false);
    });

    it('skips marker replacement without force when section differs', async () => {
      const target = path.join(tempDir, 'GEMINI.md');
      await mergeMarkerSection(target, 'original body', { force: false, dryRun: false });
      const skipped = await mergeMarkerSection(target, 'different body', { force: false, dryRun: false });
      expect(skipped.skipped).toBe(true);
    });

    it('is unchanged when marker section content matches', async () => {
      const target = path.join(tempDir, 'CLAUDE.md');
      await mergeMarkerSection(target, 'same body', { force: false, dryRun: false });
      const unchanged = await mergeMarkerSection(target, 'same body', { force: false, dryRun: false });
      expect(unchanged.changed).toBe(false);
    });

    it('clears marker-only files on removal', async () => {
      const target = path.join(tempDir, 'marker-only.md');
      await mergeMarkerSection(target, 'only ideon section', { force: false, dryRun: false });
      expect(await removeMarkerSection(target, { dryRun: false })).toBe(true);
      expect(await readFile(target, 'utf8')).toBe('');
    });

    it('returns unchanged when codex section already matches', async () => {
      const target = path.join(tempDir, 'config.toml');
      await mergeCodexTomlSection(target, { force: false, dryRun: false });
      const unchanged = await mergeCodexTomlSection(target, { force: false, dryRun: false });
      expect(unchanged.changed).toBe(false);
    });

    it('returns false when removing missing codex section', async () => {
      const target = path.join(tempDir, 'empty.toml');
      await writeFile(target, '# no mcp\n', 'utf8');
      expect(await removeCodexTomlSection(target, { dryRun: false })).toBe(false);
    });

    it('skips mcp merge when entry differs without force', async () => {
      const target = path.join(tempDir, 'cursor-mcp.json');
      await mergeMcpServersEntry(target, { command: 'ideon', args: ['mcp', 'serve'] }, { force: false, dryRun: false });
      const skipped = await mergeMcpServersEntry(target, { command: 'other', args: [] }, { force: false, dryRun: false });
      expect(skipped.skipped).toBe(true);
    });
  });

  describe('runtimeInstaller skip branches', () => {
    const baseOptions = () => ({
      force: false,
      dryRun: false,
      cwd: projectDir,
      homeDir,
      log: () => {},
      warn: () => {},
    });

    it('skips pi cli skill merge on conflicting settings', async () => {
      const settingsPath = path.join(homeDir, '.pi', 'agent', 'settings.json');
      await mkdir(path.dirname(settingsPath), { recursive: true });
      await writeFile(settingsPath, JSON.stringify({ skills: ['/other/ideon-cli'] }), 'utf8');
      const result = await installAgentRuntime({
        ...baseOptions(),
        runtime: 'pi',
        cliSkill: true,
        mcpSkill: false,
        project: false,
      });
      expect(result.mutations.some((mutation) => mutation.action === 'skip')).toBe(true);
    });

    it('skips pi mcp skill merge on conflicting settings', async () => {
      const settingsPath = path.join(homeDir, '.pi', 'agent', 'settings.json');
      await mkdir(path.dirname(settingsPath), { recursive: true });
      await writeFile(settingsPath, JSON.stringify({ skills: ['/other/ideon-mcp'] }), 'utf8');
      const result = await installAgentRuntime({
        ...baseOptions(),
        runtime: 'pi',
        cliSkill: false,
        mcpSkill: true,
        project: false,
      });
      expect(result.mutations.some((mutation) => mutation.action === 'skip')).toBe(true);
    });

    it('skips claude marker update when section conflicts', async () => {
      await writeFile(
        path.join(projectDir, 'CLAUDE.md'),
        '<!-- AUTO-GENERATED: ideon start -->\nconflict\n<!-- AUTO-GENERATED: ideon end -->\n',
        'utf8',
      );
      const result = await installAgentRuntime({
        ...baseOptions(),
        runtime: 'claude',
        cliSkill: true,
        mcpSkill: false,
        project: true,
      });
      expect(result.mutations.some((mutation) => mutation.detail.includes('CLAUDE.md'))).toBe(true);
    });

    it('skips codex mcp merge without force', async () => {
      const codexPath = path.join(homeDir, '.codex', 'config.toml');
      await mkdir(path.dirname(codexPath), { recursive: true });
      await writeFile(codexPath, '[mcp_servers.ideon]\ncommand = "other"\n', 'utf8');
      const result = await installAgentRuntime({
        ...baseOptions(),
        runtime: 'codex',
        cliSkill: false,
        mcpSkill: true,
        project: false,
      });
      expect(result.mutations.some((mutation) => mutation.action === 'skip')).toBe(true);
    });

    it('skips opencode and vscode mcp merges without force', async () => {
      const opencodePath = path.join(projectDir, 'opencode.json');
      await writeFile(opencodePath, JSON.stringify({ mcp: { ideon: { type: 'local', command: ['other'], enabled: true } } }), 'utf8');

      const vscodePath = path.join(projectDir, '.vscode', 'mcp.json');
      await mkdir(path.dirname(vscodePath), { recursive: true });
      await writeFile(vscodePath, JSON.stringify({ servers: { ideon: { type: 'stdio', command: 'other' } } }), 'utf8');

      for (const runtime of ['opencode', 'vscode'] as const) {
        const result = await installAgentRuntime({
          ...baseOptions(),
          runtime,
          cliSkill: false,
          mcpSkill: true,
          project: true,
        });
        expect(result.mutations.some((mutation) => mutation.action === 'skip')).toBe(true);
      }
    });

    it('skips cli skill install when target directory exists', async () => {
      const target = path.join(homeDir, '.cursor', 'skills', 'ideon-cli');
      await mkdir(target, { recursive: true });
      await writeFile(path.join(target, 'blocker.txt'), 'x', 'utf8');
      const result = await installAgentRuntime({
        ...baseOptions(),
        runtime: 'cursor',
        cliSkill: true,
        mcpSkill: false,
        project: false,
      });
      expect(result.mutations.some((mutation) => mutation.action === 'skip')).toBe(true);
    });

  });

  describe('packageRoot and store branches', () => {
    it('throws when package root cannot be resolved', () => {
      resetIdeonPackageRootCacheForTests();
      expect(() => resolveIdeonPackageRoot(`file://${path.join(tempDir, 'nowhere', 'module.js')}`)).toThrow(
        'Could not resolve @telepat/ideon package root.',
      );
    });

    it('uses cached package root after first resolution', () => {
      resetIdeonPackageRootCacheForTests();
      const first = resolveIdeonPackageRoot(import.meta.url);
      const second = resolveIdeonPackageRoot(import.meta.url);
      expect(first).toBe(second);
      expect(readIdeonPackageVersion(import.meta.url)).toMatch(/\d/);
    });

    it('returns undefined for missing integration entries', async () => {
      const storePath = path.join(tempDir, 'agent-integrations.json');
      await writeFile(storePath, JSON.stringify({ version: 1, integrations: {} }), 'utf8');
      await expect(getInstalledAgentIntegration('pi', storePath)).resolves.toBeUndefined();
    });
  });
});
