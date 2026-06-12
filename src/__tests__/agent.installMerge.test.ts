import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  mergeHermesMcpServersEntry,
  mergeMcpServersEntry,
  mergeOwnedJsonEntry,
  mergeMarkerSection,
  removeHermesMcpServersEntry,
  removeMcpServersEntry,
} from '../integrations/agent/installMerge.js';

describe('installMerge', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-merge-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('merges mcpServers.ideon idempotently', async () => {
    const target = path.join(tempDir, 'mcp.json');
    const entry = { command: 'ideon', args: ['mcp', 'serve'] };

    const first = await mergeMcpServersEntry(target, entry, { force: false, dryRun: false });
    const second = await mergeMcpServersEntry(target, entry, { force: false, dryRun: false });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);

    const raw = JSON.parse(await readFile(target, 'utf8')) as { mcpServers: Record<string, unknown> };
    expect(raw.mcpServers.ideon).toEqual(entry);
  });

  it('skips conflicting entries unless forced', async () => {
    const container: Record<string, unknown> = {
      ideon: { command: 'other' },
    };

    const skipped = mergeOwnedJsonEntry(container, 'ideon', { command: 'ideon' }, false);
    expect(skipped.skipped).toBe(true);

    const forced = mergeOwnedJsonEntry(container, 'ideon', { command: 'ideon' }, true);
    expect(forced.changed).toBe(true);
    expect(container.ideon).toEqual({ command: 'ideon' });
  });

  it('removes managed mcp server entry', async () => {
    const target = path.join(tempDir, 'mcp.json');
    await mergeMcpServersEntry(target, { command: 'ideon', args: ['mcp', 'serve'] }, { force: false, dryRun: false });
    const removed = await removeMcpServersEntry(target, { dryRun: false });
    expect(removed).toBe(true);
    const raw = JSON.parse(await readFile(target, 'utf8')) as { mcpServers?: Record<string, unknown> };
    expect(raw.mcpServers?.ideon).toBeUndefined();
  });

  it('merges mcp_servers.ideon in Hermes config.yaml idempotently', async () => {
    const target = path.join(tempDir, 'config.yaml');
    const entry = { command: 'ideon', args: ['mcp', 'serve'] };

    const first = await mergeHermesMcpServersEntry(target, entry, { force: false, dryRun: false });
    const second = await mergeHermesMcpServersEntry(target, entry, { force: false, dryRun: false });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);

    const raw = parseYaml(await readFile(target, 'utf8')) as { mcp_servers: Record<string, unknown> };
    expect(raw.mcp_servers.ideon).toEqual(entry);
  });

  it('skips conflicting Hermes MCP entries unless forced', async () => {
    const target = path.join(tempDir, 'config.yaml');
    await mergeHermesMcpServersEntry(target, { command: 'other' }, { force: false, dryRun: false });

    const skipped = await mergeHermesMcpServersEntry(
      target,
      { command: 'ideon', args: ['mcp', 'serve'] },
      { force: false, dryRun: false },
    );
    expect(skipped.skipped).toBe(true);

    const forced = await mergeHermesMcpServersEntry(
      target,
      { command: 'ideon', args: ['mcp', 'serve'] },
      { force: true, dryRun: false },
    );
    expect(forced.changed).toBe(true);

    const raw = parseYaml(await readFile(target, 'utf8')) as { mcp_servers: Record<string, unknown> };
    expect(raw.mcp_servers.ideon).toEqual({ command: 'ideon', args: ['mcp', 'serve'] });
  });

  it('removes managed Hermes MCP server entry', async () => {
    const target = path.join(tempDir, 'config.yaml');
    await mergeHermesMcpServersEntry(target, { command: 'ideon', args: ['mcp', 'serve'] }, { force: false, dryRun: false });
    const removed = await removeHermesMcpServersEntry(target, { dryRun: false });
    expect(removed).toBe(true);
    const raw = parseYaml(await readFile(target, 'utf8')) as { mcp_servers?: Record<string, unknown> };
    expect(raw.mcp_servers?.ideon).toBeUndefined();
  });

  it('writes marker sections', async () => {
    const target = path.join(tempDir, 'CLAUDE.md');
    const result = await mergeMarkerSection(target, 'Ideon integration guidance.', { force: false, dryRun: false });
    expect(result.changed).toBe(true);
    const content = await readFile(target, 'utf8');
    expect(content).toContain('AUTO-GENERATED: ideon start');
    expect(content).toContain('Ideon integration guidance.');
  });
});
