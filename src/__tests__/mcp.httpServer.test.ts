import { jest } from '@jest/globals';
import { createBearerAuthMiddleware, createOriginValidator } from '../integrations/mcp/httpMiddleware.js';

describe('bearer auth middleware', () => {
  function makeRes() {
    const res: any = { statusCode: 0, jsonData: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: any) => { res.jsonData = data; return res; };
    return res;
  }

  it('rejects missing Authorization header', () => {
    const middleware = createBearerAuthMiddleware('secret');
    const req: any = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ message: expect.stringContaining('Unauthorized') }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-Bearer Authorization header', () => {
    const middleware = createBearerAuthMiddleware('secret');
    const req: any = { headers: { authorization: 'Basic abc' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects empty Bearer token', () => {
    const middleware = createBearerAuthMiddleware('secret');
    const req: any = { headers: { authorization: 'Bearer ' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects wrong API key', () => {
    const middleware = createBearerAuthMiddleware('secret');
    const req: any = { headers: { authorization: 'Bearer wrong' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ message: expect.stringContaining('Invalid API key') }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts valid API key', () => {
    const middleware = createBearerAuthMiddleware('secret');
    const req: any = { headers: { authorization: 'Bearer secret' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('origin validator middleware', () => {
  function makeRes() {
    const res: any = { statusCode: 0, jsonData: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: any) => { res.jsonData = data; return res; };
    return res;
  }

  it('passes requests with no Origin header', () => {
    const middleware = createOriginValidator('127.0.0.1', 3001);
    const req: any = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('passes requests from localhost origin', () => {
    const middleware = createOriginValidator('127.0.0.1', 3001);
    const req: any = { headers: { origin: 'http://localhost:3001' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('passes requests from 127.0.0.1 origin', () => {
    const middleware = createOriginValidator('127.0.0.1', 3001);
    const req: any = { headers: { origin: 'http://127.0.0.1:3001' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('passes requests from configured host origin', () => {
    const middleware = createOriginValidator('0.0.0.0', 8080);
    const req: any = { headers: { origin: 'http://0.0.0.0:8080' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects requests from disallowed origin', () => {
    const middleware = createOriginValidator('127.0.0.1', 3001);
    const req: any = { headers: { origin: 'http://evil.com' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ message: expect.stringContaining('Origin not allowed') }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests from wrong port', () => {
    const middleware = createOriginValidator('127.0.0.1', 3001);
    const req: any = { headers: { origin: 'http://127.0.0.1:9999' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes requests from https variant of allowed origin', () => {
    const middleware = createOriginValidator('127.0.0.1', 3001);
    const req: any = { headers: { origin: 'https://127.0.0.1:3001' } };
    const res = makeRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
