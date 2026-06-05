import type { Request, Response, NextFunction } from 'express';

export function createBearerAuthMiddleware(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Unauthorized: Missing or invalid Authorization header' },
        id: null,
      });
      return;
    }

    const token = authHeader.slice(7);
    if (token !== apiKey) {
      res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Forbidden: Invalid API key' },
        id: null,
      });
      return;
    }

    next();
  };
}

export function createOriginValidator(host: string, port: number) {
  const allowedOrigins = [
    `http://${host}:${port}`,
    `https://${host}:${port}`,
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ];

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Forbidden: Origin not allowed' },
        id: null,
      });
      return;
    }
    next();
  };
}
