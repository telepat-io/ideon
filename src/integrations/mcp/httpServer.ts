import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import packageJson from '../../../package.json' with { type: 'json' };
import { registerIdeonTools } from './server.js';
import { createBearerAuthMiddleware, createOriginValidator } from './httpMiddleware.js';

export { createBearerAuthMiddleware, createOriginValidator } from './httpMiddleware.js';

export interface IdeonMcpHttpServerOptions {
  port: number;
  host: string;
  apiKey: string;
  endpoint: string;
}

function createMcpSessionServer(): McpServer {
  const server = new McpServer({
    name: 'ideon',
    version: packageJson.version,
  });
  registerIdeonTools(server);
  return server;
}

export function createIdeonMcpExpressApp(options: {
  apiKey: string;
  host: string;
  port: number;
  endpoint: string;
}): express.Express {
  const { apiKey, host, port, endpoint } = options;
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const app = express();
  app.use(cors({ origin: '*', exposedHeaders: ['Mcp-Session-Id'] }));
  app.use(express.json());
  app.use(createOriginValidator(host, port));

  const authMiddleware = createBearerAuthMiddleware(apiKey);

  app.post(endpoint, authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
        }
      };

      const sessionServer = createMcpSessionServer();
      await sessionServer.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  });

  app.get(endpoint, authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: Invalid or missing session ID' },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  app.delete(endpoint, authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: Invalid or missing session ID' },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  return app;
}

export function startIdeonMcpHttpServer(options: IdeonMcpHttpServerOptions): Promise<Server> {
  const { port, host, endpoint } = options;

  const app = createIdeonMcpExpressApp(options);

  return new Promise<Server>((resolve) => {
    const httpServer = app.listen(port, host, () => {
      console.log(`Ideon MCP HTTP server listening on http://${host}:${port}${endpoint}`);
      resolve(httpServer);
    });
  });
}
