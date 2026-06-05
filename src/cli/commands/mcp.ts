import { startIdeonMcpServer } from '../../integrations/mcp/server.js';
import { startIdeonMcpHttpServer } from '../../integrations/mcp/httpServer.js';

export async function runMcpServeCommand(): Promise<void> {
  await startIdeonMcpServer();
}

export interface McpServeHttpOptions {
  port: string;
  host: string;
  apiKey: string;
  endpoint: string;
}

export async function runMcpServeHttpCommand(options: McpServeHttpOptions): Promise<void> {
  const port = parseInt(options.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }

  if (!options.apiKey) {
    throw new Error('--api-key is required (or set IDEON_MCP_API_KEY env var)');
  }

  await startIdeonMcpHttpServer({
    port,
    host: options.host,
    apiKey: options.apiKey,
    endpoint: options.endpoint,
  });
}
