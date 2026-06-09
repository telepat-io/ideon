import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';

export interface PackClaudeDesktopOptions {
  dryRun: boolean;
  force: boolean;
}

export async function packClaudeDesktopMcpb(options: PackClaudeDesktopOptions): Promise<string> {
  const ideonPaths = envPaths('ideon', { suffix: '' });
  const outputDir = path.join(ideonPaths.data, 'mcpb');
  const bundlePath = path.join(outputDir, 'ideon.mcpb');

  const manifest = {
    manifest_version: '0.2',
    name: 'ideon',
    display_name: 'Ideon',
    version: '1.0.0',
    description: 'Ideon content generation MCP server for Claude Desktop.',
    author: {
      name: 'Telepat',
    },
    server: {
      type: 'stdio',
      command: 'ideon',
      args: ['mcp', 'serve'],
    },
  };

  if (options.dryRun) {
    return bundlePath;
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(bundlePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return bundlePath;
}
