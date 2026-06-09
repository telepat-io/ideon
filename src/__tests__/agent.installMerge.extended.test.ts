import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  mergeCodexTomlSection,
  mergeMarkerSection,
  mergeMcpServersEntry,
  mergeOpenCodeMcpEntry,
  mergeStringArrayEntry,
  mergeVsCodeMcpServer,
  readJsonObject,
  removeMarkerSection,
  removeMcpServersEntry,
  removeStringArrayEntry,
} from '../integrations/agent/installMerge.js';
import { installSkillLink, removeSkillLink, copySkillTree } from '../integrations/agent/skillInstall.js';
import { resolveIdeonSkillDir } from '../integrations/agent/packageRoot.js';
import { openCodeMcpServerEntry, vscodeMcpServerEntry } from '../integrations/agent/mcpConfig.js';

describe('installMerge extended', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-merge-ext-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('throws when json file is invalid', async () => {
    const target = path.join(tempDir, 'bad.json');
    await writeFile(target, 'not-json', 'utf8');
    await expect(readJsonObject(target)).rejects.toThrow();
  });

  it('handles string array conflicts and forced append', async () => {
    const target = path.join(tempDir, 'settings.json');
    await writeFile(target, JSON.stringify({ skills: ['/other/ideon-cli'] }), 'utf8');

    const skipped = await mergeStringArrayEntry(target, 'skills', resolveIdeonSkillDir('ideon-cli'), {
      force: false,
      dryRun: false,
    });
    expect(skipped.skipped).toBe(true);

    const forced = await mergeStringArrayEntry(target, 'skills', resolveIdeonSkillDir('ideon-cli'), {
      force: true,
      dryRun: false,
    });
    expect(forced.changed).toBe(true);
  });

  it('replaces marker sections when forced', async () => {
    const target = path.join(tempDir, 'GEMINI.md');
    await mergeMarkerSection(target, 'first body', { force: false, dryRun: false });
    const replaced = await mergeMarkerSection(target, 'second body', { force: true, dryRun: false });
    expect(replaced.changed).toBe(true);
    const content = await readFile(target, 'utf8');
    expect(content).toContain('second body');
    expect(await removeMarkerSection(target, { dryRun: false })).toBe(true);
  });

  it('skips vscode merge conflicts without force', async () => {
    const target = path.join(tempDir, 'mcp.json');
    await writeFile(target, JSON.stringify({ servers: { ideon: { type: 'stdio', command: 'other' } } }), 'utf8');
    const result = await mergeVsCodeMcpServer(target, vscodeMcpServerEntry(), { force: false, dryRun: false });
    expect(result.skipped).toBe(true);
  });

  it('returns false when removing missing mcp entry', async () => {
    const target = path.join(tempDir, 'missing.json');
    expect(await removeMcpServersEntry(target, { dryRun: false })).toBe(false);
  });

  it('returns empty object for non-object json roots', async () => {
    const target = path.join(tempDir, 'array.json');
    await writeFile(target, '[]', 'utf8');
    await expect(readJsonObject(target)).resolves.toEqual({});
  });

  it('skips opencode merge without force', async () => {
    const opencodePath = path.join(tempDir, 'opencode.json');
    await mergeOpenCodeMcpEntry(opencodePath, openCodeMcpServerEntry(), { force: false, dryRun: false });
    const opencodeSkipped = await mergeOpenCodeMcpEntry(opencodePath, { type: 'local', command: ['other'], enabled: true }, {
      force: false,
      dryRun: false,
    });
    expect(opencodeSkipped.skipped).toBe(true);
  });

  it('returns false when removing missing string array values', async () => {
    const target = path.join(tempDir, 'settings.json');
    expect(await removeStringArrayEntry(target, 'skills', '/missing', { dryRun: false })).toBe(false);
  });

  it('skips codex merge without force', async () => {
    const codexPath = path.join(tempDir, 'config.toml');
    await writeFile(codexPath, '[mcp_servers.ideon]\ncommand = "other"\n', 'utf8');
    const codexSkipped = await mergeCodexTomlSection(codexPath, { force: false, dryRun: false });
    expect(codexSkipped.skipped).toBe(true);
  });

  it('returns false when removing missing marker section', async () => {
    const target = path.join(tempDir, 'missing.md');
    expect(await removeMarkerSection(target, { dryRun: false })).toBe(false);
  });

  it('forces codex section replacement', async () => {
    const codexPath = path.join(tempDir, 'config.toml');
    await writeFile(codexPath, '[mcp_servers.ideon]\ncommand = "other"\n', 'utf8');
    const forced = await mergeCodexTomlSection(codexPath, { force: true, dryRun: false });
    expect(forced.changed).toBe(true);
  });

  it('skips skill path merge when conflicting ideon entry exists', async () => {
    const target = path.join(tempDir, 'settings.json');
    await writeFile(target, JSON.stringify({ skills: ['/tmp/other/ideon-cli-old'] }), 'utf8');
    const result = await mergeStringArrayEntry(target, 'skills', resolveIdeonSkillDir('ideon-cli'), {
      force: false,
      dryRun: false,
    });
    expect(result.skipped).toBe(true);
  });

  it('supports dry-run json writes without creating files', async () => {
    const target = path.join(tempDir, 'dry.json');
    await mergeMcpServersEntry(target, { command: 'ideon', args: ['mcp', 'serve'] }, { force: false, dryRun: true });
    await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('skillInstall extended', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-skill-ext-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('is idempotent when skill link already exists', async () => {
    const target = path.join(tempDir, 'ideon-cli');
    await installSkillLink(resolveIdeonSkillDir('ideon-cli'), target, { dryRun: false, force: true });
    const second = await installSkillLink(resolveIdeonSkillDir('ideon-cli'), target, { dryRun: false, force: false });
    expect(second.changed).toBe(false);
    expect(second.skipped).toBe(false);
  });

  it('returns true when removing missing skill link due to force rm', async () => {
    expect(await removeSkillLink(path.join(tempDir, 'missing'), { dryRun: false })).toBe(true);
  });

  it('supports dry-run without writing skill links or copies', async () => {
    const linkTarget = path.join(tempDir, 'ideon-cli');
    const copyTarget = path.join(tempDir, 'export', 'ideon-cli');
    const link = await installSkillLink(resolveIdeonSkillDir('ideon-cli'), linkTarget, { dryRun: true, force: true });
    const copy = await copySkillTree(resolveIdeonSkillDir('ideon-cli'), copyTarget, { dryRun: true, force: true });
    expect(link.changed).toBe(true);
    expect(copy.changed).toBe(true);
    await expect(access(linkTarget)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
