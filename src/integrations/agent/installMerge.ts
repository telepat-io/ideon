import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export const IDEON_MANAGED_SERVER_KEY = 'ideon';
export const IDEON_TOOL_ID = 'ideon';

export interface JsonMergeResult {
  changed: boolean;
  skipped: boolean;
  reason?: string;
}

export async function readJsonObject(targetPath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(targetPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export async function writeJsonObject(targetPath: string, value: Record<string, unknown>, dryRun: boolean): Promise<void> {
  if (dryRun) {
    return;
  }
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function mergeOwnedJsonEntry(
  container: Record<string, unknown>,
  key: string,
  nextValue: unknown,
  force: boolean,
): JsonMergeResult {
  const existing = container[key];
  if (existing === undefined) {
    container[key] = nextValue;
    return { changed: true, skipped: false };
  }

  if (JSON.stringify(existing) === JSON.stringify(nextValue)) {
    return { changed: false, skipped: false };
  }

  if (!force) {
    return { changed: false, skipped: true, reason: `Existing "${key}" differs; use --force to replace.` };
  }

  container[key] = nextValue;
  return { changed: true, skipped: false };
}

export async function mergeMcpServersEntry(
  targetPath: string,
  serverEntry: Record<string, unknown>,
  options: { force: boolean; dryRun: boolean },
): Promise<JsonMergeResult> {
  const doc = await readJsonObject(targetPath);
  const servers = (doc.mcpServers && typeof doc.mcpServers === 'object' && !Array.isArray(doc.mcpServers)
    ? doc.mcpServers
    : {}) as Record<string, unknown>;

  const mergeResult = mergeOwnedJsonEntry(servers, IDEON_MANAGED_SERVER_KEY, serverEntry, options.force);
  if (mergeResult.changed) {
    doc.mcpServers = servers;
    await writeJsonObject(targetPath, doc, options.dryRun);
  }

  return mergeResult;
}

export async function removeMcpServersEntry(
  targetPath: string,
  options: { dryRun: boolean },
): Promise<boolean> {
  const doc = await readJsonObject(targetPath);
  const servers = doc.mcpServers;
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    return false;
  }

  const record = servers as Record<string, unknown>;
  if (!(IDEON_MANAGED_SERVER_KEY in record)) {
    return false;
  }

  delete record[IDEON_MANAGED_SERVER_KEY];
  doc.mcpServers = record;
  await writeJsonObject(targetPath, doc, options.dryRun);
  return true;
}

export async function mergeStringArrayEntry(
  targetPath: string,
  key: string,
  value: string,
  options: { force: boolean; dryRun: boolean },
): Promise<JsonMergeResult> {
  const doc = await readJsonObject(targetPath);
  const existing = Array.isArray(doc[key]) ? [...(doc[key] as string[])] : [];
  if (existing.includes(value)) {
    return { changed: false, skipped: false };
  }

  if (existing.length > 0 && !options.force) {
    const conflicting = existing.find((entry) => entry.includes('ideon'));
    if (conflicting && conflicting !== value) {
      return { changed: false, skipped: true, reason: `Existing ${key} entry "${conflicting}" differs; use --force to append.` };
    }
  }

  existing.push(value);
  doc[key] = existing;
  await writeJsonObject(targetPath, doc, options.dryRun);
  return { changed: true, skipped: false };
}

export async function removeStringArrayEntry(
  targetPath: string,
  key: string,
  value: string,
  options: { dryRun: boolean },
): Promise<boolean> {
  const doc = await readJsonObject(targetPath);
  if (!Array.isArray(doc[key])) {
    return false;
  }

  const next = (doc[key] as string[]).filter((entry) => entry !== value);
  if (next.length === (doc[key] as string[]).length) {
    return false;
  }

  doc[key] = next;
  await writeJsonObject(targetPath, doc, options.dryRun);
  return true;
}

export async function mergeVsCodeMcpServer(
  targetPath: string,
  serverEntry: Record<string, unknown>,
  options: { force: boolean; dryRun: boolean },
): Promise<JsonMergeResult> {
  const doc = await readJsonObject(targetPath);
  const servers = (doc.servers && typeof doc.servers === 'object' && !Array.isArray(doc.servers)
    ? doc.servers
    : {}) as Record<string, unknown>;

  const mergeResult = mergeOwnedJsonEntry(servers, IDEON_MANAGED_SERVER_KEY, serverEntry, options.force);
  if (mergeResult.changed) {
    doc.servers = servers;
    await writeJsonObject(targetPath, doc, options.dryRun);
  }

  return mergeResult;
}

export async function removeVsCodeMcpServer(targetPath: string, options: { dryRun: boolean }): Promise<boolean> {
  const doc = await readJsonObject(targetPath);
  const servers = doc.servers;
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    return false;
  }

  const record = servers as Record<string, unknown>;
  if (!(IDEON_MANAGED_SERVER_KEY in record)) {
    return false;
  }

  delete record[IDEON_MANAGED_SERVER_KEY];
  doc.servers = record;
  await writeJsonObject(targetPath, doc, options.dryRun);
  return true;
}

export async function mergeOpenCodeMcpEntry(
  targetPath: string,
  serverEntry: Record<string, unknown>,
  options: { force: boolean; dryRun: boolean },
): Promise<JsonMergeResult> {
  const doc = await readJsonObject(targetPath);
  const mcp = (doc.mcp && typeof doc.mcp === 'object' && !Array.isArray(doc.mcp) ? doc.mcp : {}) as Record<string, unknown>;
  const mergeResult = mergeOwnedJsonEntry(mcp, IDEON_MANAGED_SERVER_KEY, serverEntry, options.force);
  if (mergeResult.changed) {
    doc.mcp = mcp;
    await writeJsonObject(targetPath, doc, options.dryRun);
  }
  return mergeResult;
}

export async function removeOpenCodeMcpEntry(targetPath: string, options: { dryRun: boolean }): Promise<boolean> {
  const doc = await readJsonObject(targetPath);
  const mcp = doc.mcp;
  if (!mcp || typeof mcp !== 'object' || Array.isArray(mcp)) {
    return false;
  }

  const record = mcp as Record<string, unknown>;
  if (!(IDEON_MANAGED_SERVER_KEY in record)) {
    return false;
  }

  delete record[IDEON_MANAGED_SERVER_KEY];
  doc.mcp = record;
  await writeJsonObject(targetPath, doc, options.dryRun);
  return true;
}

const MARKER_START = '<!-- AUTO-GENERATED: ideon start -->';
const MARKER_END = '<!-- AUTO-GENERATED: ideon end -->';

export function buildMarkerSection(body: string): string {
  return `${MARKER_START}\n${body.trim()}\n${MARKER_END}`;
}

export async function mergeMarkerSection(
  targetPath: string,
  body: string,
  options: { force: boolean; dryRun: boolean },
): Promise<JsonMergeResult> {
  let existing = '';
  try {
    existing = await readFile(targetPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const section = buildMarkerSection(body);
  if (existing.includes(MARKER_START) && existing.includes(MARKER_END)) {
    const start = existing.indexOf(MARKER_START);
    const end = existing.indexOf(MARKER_END) + MARKER_END.length;
    const current = existing.slice(start, end);
    if (current === section) {
      return { changed: false, skipped: false };
    }
    if (!options.force) {
      return { changed: false, skipped: true, reason: `Marker section in ${targetPath} differs; use --force to replace.` };
    }
    const next = `${existing.slice(0, start)}${section}${existing.slice(end)}`;
    if (!options.dryRun) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
    }
    return { changed: true, skipped: false };
  }

  const next = existing.length > 0 ? `${existing.trimEnd()}\n\n${section}\n` : `${section}\n`;
  if (!options.dryRun) {
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, next, 'utf8');
  }
  return { changed: true, skipped: false };
}

export async function removeMarkerSection(targetPath: string, options: { dryRun: boolean }): Promise<boolean> {
  let existing = '';
  try {
    existing = await readFile(targetPath, 'utf8');
  } catch {
    return false;
  }

  if (!existing.includes(MARKER_START) || !existing.includes(MARKER_END)) {
    return false;
  }

  const start = existing.indexOf(MARKER_START);
  const end = existing.indexOf(MARKER_END) + MARKER_END.length;
  const next = `${existing.slice(0, start).trimEnd()}\n${existing.slice(end).trimStart()}`.trim();
  if (!options.dryRun) {
    if (next.length === 0) {
      await writeFile(targetPath, '', 'utf8');
    } else {
      await writeFile(targetPath, `${next}\n`, 'utf8');
    }
  }
  return true;
}

const CODEX_SECTION_HEADER = '[mcp_servers.ideon]';

export async function mergeCodexTomlSection(
  targetPath: string,
  options: { force: boolean; dryRun: boolean },
): Promise<JsonMergeResult> {
  const section = [
    CODEX_SECTION_HEADER,
    'command = "ideon"',
    'args = ["mcp", "serve"]',
    'enabled = true',
    '',
  ].join('\n');

  let existing = '';
  try {
    existing = await readFile(targetPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  if (existing.includes(CODEX_SECTION_HEADER)) {
    const start = existing.indexOf(CODEX_SECTION_HEADER);
    const nextHeader = existing.indexOf('\n[', start + CODEX_SECTION_HEADER.length);
    const end = nextHeader === -1 ? existing.length : nextHeader;
    const current = existing.slice(start, end).trimEnd();
    if (current === section.trimEnd()) {
      return { changed: false, skipped: false };
    }
    if (!options.force) {
      return { changed: false, skipped: true, reason: `Existing Codex MCP section differs; use --force to replace.` };
    }
    const merged = `${existing.slice(0, start).trimEnd()}\n\n${section}${nextHeader === -1 ? '' : existing.slice(nextHeader)}`;
    if (!options.dryRun) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, merged.endsWith('\n') ? merged : `${merged}\n`, 'utf8');
    }
    return { changed: true, skipped: false };
  }

  const merged = existing.length > 0 ? `${existing.trimEnd()}\n\n${section}` : section;
  if (!options.dryRun) {
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, merged.endsWith('\n') ? merged : `${merged}\n`, 'utf8');
  }
  return { changed: true, skipped: false };
}

export async function readYamlObject(targetPath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(targetPath, 'utf8');
    const parsed = parseYaml(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export async function writeYamlObject(targetPath: string, value: Record<string, unknown>, dryRun: boolean): Promise<void> {
  if (dryRun) {
    return;
  }
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${stringifyYaml(value)}\n`, 'utf8');
}

export async function mergeHermesMcpServersEntry(
  targetPath: string,
  serverEntry: Record<string, unknown>,
  options: { force: boolean; dryRun: boolean },
): Promise<JsonMergeResult> {
  const doc = await readYamlObject(targetPath);
  const servers = (doc.mcp_servers && typeof doc.mcp_servers === 'object' && !Array.isArray(doc.mcp_servers)
    ? doc.mcp_servers
    : {}) as Record<string, unknown>;

  const mergeResult = mergeOwnedJsonEntry(servers, IDEON_MANAGED_SERVER_KEY, serverEntry, options.force);
  if (mergeResult.changed) {
    doc.mcp_servers = servers;
    await writeYamlObject(targetPath, doc, options.dryRun);
  }

  return mergeResult;
}

export async function removeHermesMcpServersEntry(
  targetPath: string,
  options: { dryRun: boolean },
): Promise<boolean> {
  const doc = await readYamlObject(targetPath);
  const servers = doc.mcp_servers;
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    return false;
  }

  const record = servers as Record<string, unknown>;
  if (!(IDEON_MANAGED_SERVER_KEY in record)) {
    return false;
  }

  delete record[IDEON_MANAGED_SERVER_KEY];
  doc.mcp_servers = record;
  await writeYamlObject(targetPath, doc, options.dryRun);
  return true;
}

export async function removeCodexTomlSection(targetPath: string, options: { dryRun: boolean }): Promise<boolean> {
  let existing = '';
  try {
    existing = await readFile(targetPath, 'utf8');
  } catch {
    return false;
  }

  if (!existing.includes(CODEX_SECTION_HEADER)) {
    return false;
  }

  const start = existing.indexOf(CODEX_SECTION_HEADER);
  const nextHeader = existing.indexOf('\n[', start + CODEX_SECTION_HEADER.length);
  const end = nextHeader === -1 ? existing.length : nextHeader;
  const next = `${existing.slice(0, start).trimEnd()}\n${nextHeader === -1 ? '' : existing.slice(nextHeader).trimStart()}`.trim();
  if (!options.dryRun) {
    await writeFile(targetPath, next.length > 0 ? `${next}\n` : '', 'utf8');
  }
  return true;
}
