import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { defaultAppSettings, resolveDefaultMaxLinks } from '../config/schema.js';
import { enrichLinks } from '../generation/enrichLinks.js';
import type { ChatMessage } from '../llm/openRouterClient.js';
import type { LlmCallMetrics } from '../pipeline/analytics.js';

function createMetrics(): LlmCallMetrics {
  return {
    durationMs: 10,
    attempts: 1,
    retries: 0,
    retryBackoffMs: 0,
    modelId: defaultAppSettings.model,
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      providerTotalCostUsd: null,
    },
  };
}

function readExpression(messages: ChatMessage[]): string {
  const userMessage = messages.find((message) => message.role === 'user')?.content ?? '';
  const expressionLine = userMessage
    .split('\n')
    .find((line) => line.startsWith('Text to add link to (input text): '));

  if (!expressionLine) {
    return '';
  }

  const quotedExpression = expressionLine.match(/^Text to add link to \(input text\): "(.*)"$/);
  return quotedExpression?.[1] ?? '';
}

describe('enrichLinks', () => {
  it('skips short-form outputs entirely', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-enrich-links-short-'));

    try {
      const markdownPath = path.join(tempRoot, 'x-post-1.md');
      await writeFile(markdownPath, 'Short form content', 'utf8');

      const openRouter = {
        requestStructured: jest.fn(),
        requestWebSearch: jest.fn(),
      };

      const result = await enrichLinks({
        markdownFiles: [{ markdownPath, fileId: 'x-post-1', contentType: 'x-post' }],
        articleTitle: 'Ignored',
        articleDescription: 'Ignored',
        openRouter: openRouter as never,
        settings: defaultAppSettings,
        dryRun: false,
      });

      expect(result).toEqual([]);
      expect(openRouter.requestStructured).not.toHaveBeenCalled();
      expect(openRouter.requestWebSearch).not.toHaveBeenCalled();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('returns empty links for empty content, dry-run mode, and missing clients', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-enrich-links-empty-'));

    try {
      const emptyPath = path.join(tempRoot, 'article-1.md');
      const bodyPath = path.join(tempRoot, 'blog-1.md');
      const bodyNoClientPath = path.join(tempRoot, 'linkedin-1.md');
      await writeFile(emptyPath, '---\ntitle: Empty\n---\n', 'utf8');
      await writeFile(bodyPath, '# Blog\n\nContent with substance.\n', 'utf8');
      await writeFile(bodyNoClientPath, '# LinkedIn\n\nClient missing path.\n', 'utf8');

      const openRouter = {
        requestStructured: jest.fn(),
        requestWebSearch: jest.fn(),
      };

      const dryRunResult = await enrichLinks({
        markdownFiles: [
          { markdownPath: emptyPath, fileId: 'article-1', contentType: 'article' },
          { markdownPath: bodyPath, fileId: 'blog-1', contentType: 'blog-post' },
        ],
        articleTitle: 'Title',
        articleDescription: 'Description',
        openRouter: openRouter as never,
        settings: defaultAppSettings,
        dryRun: true,
      });

      const noClientResult = await enrichLinks({
        markdownFiles: [{ markdownPath: bodyNoClientPath, fileId: 'linkedin-1', contentType: 'linkedin-post' }],
        articleTitle: 'Title',
        articleDescription: 'Description',
        openRouter: null,
        settings: defaultAppSettings,
        dryRun: false,
      });

      expect(dryRunResult).toEqual([
        { fileId: 'article-1', contentType: 'article', markdownPath: emptyPath, links: [], customLinks: [] },
        { fileId: 'blog-1', contentType: 'blog-post', markdownPath: bodyPath, links: [], customLinks: [] },
      ]);
      expect(noClientResult).toEqual([
        { fileId: 'linkedin-1', contentType: 'linkedin-post', markdownPath: bodyNoClientPath, links: [], customLinks: [] },
      ]);
      expect(openRouter.requestStructured).not.toHaveBeenCalled();
      expect(openRouter.requestWebSearch).not.toHaveBeenCalled();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('emits predictable progress events for empty and dry-run content paths', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-enrich-links-progress-empty-dryrun-'));

    try {
      const emptyPath = path.join(tempRoot, 'article-1.md');
      const dryRunPath = path.join(tempRoot, 'blog-1.md');
      await writeFile(emptyPath, '---\ntitle: Empty\n---\n', 'utf8');
      await writeFile(dryRunPath, '# Blog\n\nContent with substance.\n', 'utf8');

      const progressByFile = new Map<string, string[]>();
      const openRouter = {
        requestStructured: jest.fn(),
        requestWebSearch: jest.fn(),
      };

      await enrichLinks({
        markdownFiles: [
          { markdownPath: emptyPath, fileId: 'article-1', contentType: 'article' },
          { markdownPath: dryRunPath, fileId: 'blog-1', contentType: 'blog-post' },
        ],
        articleTitle: 'Title',
        articleDescription: 'Description',
        openRouter: openRouter as never,
        settings: defaultAppSettings,
        dryRun: true,
        onItemProgress(event) {
          const existing = progressByFile.get(event.fileId) ?? [];
          existing.push(event.detail);
          progressByFile.set(event.fileId, existing);
        },
      });

      expect(progressByFile.get('article-1')).toEqual(['No content to enrich.']);
      expect(progressByFile.get('blog-1')).toEqual([
        'Selecting expressions.',
        'Dry run: skipped URL resolution.',
      ]);
      expect(openRouter.requestStructured).not.toHaveBeenCalled();
      expect(openRouter.requestWebSearch).not.toHaveBeenCalled();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('deduplicates expressions, resolves valid URLs, and skips unresolved candidates', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-enrich-links-main-'));

    try {
      const markdownPath = path.join(tempRoot, 'article-1.md');
      const markdown = [
        '---',
        'title: Example',
        '---',
        '',
        'OpenRouter is a routing layer for LLM APIs.',
        '',
        'GitHub Copilot improves editorial TypeScript workflows.',
        '',
        'Bad Url appears here for testing.',
      ].join('\n');
      await writeFile(markdownPath, markdown, 'utf8');

      const onLlmMetrics = jest.fn<(fileId: string, metrics: LlmCallMetrics) => void>();
      const requestStructured = jest.fn(async (request: {
        parse: (data: unknown) => { expressions: string[] };
        onMetrics?: (metrics: LlmCallMetrics) => void;
      }) => {
        request.onMetrics?.(createMetrics());
        return request.parse({ expressions: [' OpenRouter ', 'openrouter', 'GitHub Copilot', 'Copilot', 'Not Present', '', 'Bad Url'] });
      });
      const requestWebSearch = jest.fn(async (request: {
        messages: ChatMessage[];
        onMetrics?: (metrics: LlmCallMetrics) => void;
      }) => {
        request.onMetrics?.(createMetrics());
        const expression = readExpression(request.messages);
        if (expression === 'OpenRouter') {
          return {
            text: 'Read https://openrouter.ai/docs for details.',
            firstCitationUrl: null,
            firstCitationTitle: null,
          };
        }

        if (expression === 'GitHub Copilot') {
          return {
            text: 'https://github.com/features/copilot',
            firstCitationUrl: 'https://github.com/features/copilot',
            firstCitationTitle: 'GitHub Copilot',
          };
        }

        if (expression === 'Copilot') {
          return {
            text: 'https://github.com/features/copilot',
            firstCitationUrl: 'https://github.com/features/copilot',
            firstCitationTitle: 'Duplicate URL',
          };
        }

        if (expression === 'Bad Url') {
          return {
            text: 'javascript:alert(1)',
            firstCitationUrl: null,
            firstCitationTitle: null,
          };
        }

        return {
          text: 'none',
          firstCitationUrl: null,
          firstCitationTitle: null,
        };
      });

      const result = await enrichLinks({
        markdownFiles: [{ markdownPath, fileId: 'article-1', contentType: 'article' }],
        articleTitle: 'Editorial Routing',
        articleDescription: 'How routing and copilots fit together.',
        openRouter: { requestStructured, requestWebSearch } as never,
        settings: defaultAppSettings,
        dryRun: false,
        onLlmMetrics,
      });

      expect(result).toEqual([
        {
          fileId: 'article-1',
          contentType: 'article',
          markdownPath,
          links: [
            {
              expression: 'OpenRouter',
              url: 'https://openrouter.ai/docs',
              title: null,
            },
            {
              expression: 'GitHub Copilot',
              url: 'https://github.com/features/copilot',
              title: 'GitHub Copilot',
            },
          ],
          customLinks: [],
        },
      ]);
      expect(requestStructured).toHaveBeenCalledTimes(1);
      expect(requestWebSearch).toHaveBeenCalledTimes(4);
      expect(onLlmMetrics).toHaveBeenCalledTimes(5);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('emits granular progress updates including per-expression counters and truncation', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-enrich-links-progress-'));

    try {
      const markdownPath = path.join(tempRoot, 'article-1.md');
      await writeFile(markdownPath, '# Heading\n\nA paragraph mentioning OpenRouter routing patterns.\n', 'utf8');

      const veryLongExpression = 'This expression is intentionally very long so that the progress preview must be truncated for readability in the terminal UI';
      const progressDetails: string[] = [];

      const requestStructured = jest.fn(async (request: {
        parse: (data: unknown) => { expressions: string[] };
      }) => request.parse({ expressions: ['OpenRouter', veryLongExpression] }));

      const requestWebSearch = jest.fn(async (request: {
        messages: ChatMessage[];
      }) => {
        const expression = readExpression(request.messages);
        if (expression === 'OpenRouter') {
          return {
            text: 'https://openrouter.ai/docs',
            firstCitationUrl: 'https://openrouter.ai/docs',
            firstCitationTitle: 'OpenRouter Docs',
          };
        }

        return {
          text: 'none',
          firstCitationUrl: null,
          firstCitationTitle: null,
        };
      });

      await enrichLinks({
        markdownFiles: [{ markdownPath, fileId: 'article-1', contentType: 'article' }],
        articleTitle: 'Editorial Routing',
        articleDescription: 'Description',
        openRouter: { requestStructured, requestWebSearch } as never,
        settings: defaultAppSettings,
        dryRun: false,
        onItemProgress(event) {
          progressDetails.push(event.detail);
        },
      });

      expect(progressDetails).toContain('Selecting expressions.');
      expect(progressDetails).toContain('1/2: finding the perfect link for "OpenRouter"');
      const longExpressionDetail = progressDetails.find((detail) => detail.startsWith('2/2: finding the perfect link for "'));
      expect(longExpressionDetail).toBeDefined();
      expect(longExpressionDetail?.endsWith('..."')).toBe(true);
      expect(progressDetails).toContain('Resolved 1 links from 2 expressions.');
      expect(progressDetails).toContain('Resolution complete. Writing sidecar file.');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('emits explicit no-expression progress and skips web search requests', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-enrich-links-no-expr-'));

    try {
      const markdownPath = path.join(tempRoot, 'article-1.md');
      await writeFile(markdownPath, '# Heading\n\nSome paragraph content.\n', 'utf8');

      const progressDetails: string[] = [];
      const requestStructured = jest.fn(async (request: {
        parse: (data: unknown) => { expressions: string[] };
      }) => request.parse({ expressions: [] }));
      const requestWebSearch = jest.fn();

      const result = await enrichLinks({
        markdownFiles: [{ markdownPath, fileId: 'article-1', contentType: 'article' }],
        articleTitle: 'Editorial Routing',
        articleDescription: 'Description',
        openRouter: { requestStructured, requestWebSearch } as never,
        settings: defaultAppSettings,
        dryRun: false,
        onItemProgress(event) {
          progressDetails.push(event.detail);
        },
      });

      expect(result[0]?.links).toEqual([]);
      expect(progressDetails).toEqual([
        'Selecting expressions.',
        'No link expressions selected.',
        'Resolved 0 links from 0 expressions.',
        'Resolution complete. Writing sidecar file.',
      ]);
      expect(requestStructured).toHaveBeenCalledTimes(1);
      expect(requestWebSearch).not.toHaveBeenCalled();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('resolveDefaultMaxLinks', () => {
  it('returns 5 for small word counts', () => {
    expect(resolveDefaultMaxLinks(300)).toBe(5);
    expect(resolveDefaultMaxLinks(700)).toBe(5);
  });

  it('returns 8 for medium word counts', () => {
    expect(resolveDefaultMaxLinks(900)).toBe(8);
    expect(resolveDefaultMaxLinks(1150)).toBe(8);
  });

  it('returns 12 for large word counts', () => {
    expect(resolveDefaultMaxLinks(1400)).toBe(12);
    expect(resolveDefaultMaxLinks(2000)).toBe(12);
  });
});

describe('enrichLinks custom link behavior', () => {
  it('excludes custom link expressions from generated candidates', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-enrich-custom-'));

    try {
      const markdownPath = path.join(tempRoot, 'article-1.md');
      await writeFile(
        markdownPath,
        '# Article\n\nOpenRouter is used. React is great.\n',
        'utf8',
      );

      const capturedMessages: ChatMessage[][] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestStructured = jest.fn().mockImplementation((options: any) => {
        capturedMessages.push(options.messages as ChatMessage[]);
        return Promise.resolve(options.parse({ expressions: ['OpenRouter', 'React'] }));
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestWebSearch = jest.fn().mockImplementation((_options: any) => {
        return Promise.resolve({
          text: 'https://openrouter.ai',
          firstCitationUrl: 'https://openrouter.ai',
          firstCitationTitle: null,
        });
      });

      const result = await enrichLinks({
        markdownFiles: [{ markdownPath, fileId: 'article-1', contentType: 'article' }],
        articleTitle: 'Test Article',
        articleDescription: 'Testing custom link exclusion',
        openRouter: { requestStructured, requestWebSearch } as never,
        settings: defaultAppSettings,
        dryRun: false,
        customLinks: [{ expression: 'React', url: 'https://react.dev', title: null }],
      });

      // React was a custom link, so web search for it should be skipped
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolvedExpressions = (requestWebSearch as jest.Mock).mock.calls.map((call: any) =>
        readExpression((call[0] as { messages: ChatMessage[] }).messages),
      );
      expect(resolvedExpressions).not.toContain('React');
      expect(resolvedExpressions).toContain('OpenRouter');

      // customLinks should be passed through in the result
      expect(result[0]?.customLinks).toEqual([
        { expression: 'React', url: 'https://react.dev', title: null },
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('respects maxLinks cap on candidate count', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-enrich-maxlinks-'));

    try {
      const markdownPath = path.join(tempRoot, 'article-1.md');
      await writeFile(
        markdownPath,
        '# Article\n\nTerm1 Term2 Term3 Term4 Term5 are discussed.\n',
        'utf8',
      );

      let capturedMaxItems = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestStructured = jest.fn().mockImplementation((options: any) => {
        capturedMaxItems = options.schema.properties.expressions.maxItems as number;
        return Promise.resolve(options.parse({ expressions: ['Term1', 'Term2', 'Term3'] }));
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestWebSearch = jest.fn().mockImplementation((_options: any) => {
        return Promise.resolve({ text: 'none', firstCitationUrl: null, firstCitationTitle: null });
      });

      await enrichLinks({
        markdownFiles: [{ markdownPath, fileId: 'article-1', contentType: 'article' }],
        articleTitle: 'Test Article',
        articleDescription: 'Testing maxLinks',
        openRouter: { requestStructured, requestWebSearch } as never,
        settings: defaultAppSettings,
        dryRun: false,
        maxLinks: 3,
      });

      expect(capturedMaxItems).toBe(3);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
