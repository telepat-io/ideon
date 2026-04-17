import { startIdeonMcpServer } from '../../integrations/mcp/server.js';

export async function runMcpServeCommand(): Promise<void> {
  await startIdeonMcpServer();
}
