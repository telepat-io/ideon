import { jest } from '@jest/globals';
import { loadPreviewArticle, loadPreviewArticles, loadPreviewBootstrap } from './api.js';

describe('preview api client', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('loads bootstrap payloads from the bootstrap endpoint', async () => {
    globalThis.fetch = jest.fn(async (input: string | URL | Request) => {
      expect(input).toBe('/api/bootstrap');

      return {
        ok: true,
        json: async () => ({
          title: 'Preview title',
          sourcePath: '/tmp/output/article-1.md',
          currentSlug: 'preview-slug',
          emptyStateMessage: null,
        }),
      } as Response;
    }) as typeof fetch;

    await expect(loadPreviewBootstrap()).resolves.toEqual({
      title: 'Preview title',
      sourcePath: '/tmp/output/article-1.md',
      currentSlug: 'preview-slug',
      emptyStateMessage: null,
    });
  });

  it('uses API error payloads for failed article detail requests and encodes slugs', async () => {
    globalThis.fetch = jest.fn(async (input: string | URL | Request) => {
      expect(input).toBe('/api/articles/roman%20forum%2Fnotes');

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Generation no longer exists.' }),
      } as Response;
    }) as typeof fetch;

    await expect(loadPreviewArticle('roman forum/notes')).rejects.toThrow('Generation no longer exists.');
  });

  it('falls back to status text when failed responses do not return a usable json payload', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('invalid json');
      },
    })) as unknown as typeof fetch;

    await expect(loadPreviewArticles()).rejects.toThrow('Request failed with status 503');
  });

  it('falls back to status text when error payload is present but not a non-empty string', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'nested' } }),
    })) as unknown as typeof fetch;

    await expect(loadPreviewArticles()).rejects.toThrow('Request failed with status 500');
  });
});