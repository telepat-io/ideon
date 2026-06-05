import path from 'node:path';
import os from 'node:os';

export default function envPaths(name: string, { suffix = 'nodejs' } = {}): Record<string, string> {
  const base = path.join(os.tmpdir(), suffix ? `${name}-${suffix}` : name);
  return { data: base, config: base, cache: base, log: base, temp: base };
}
