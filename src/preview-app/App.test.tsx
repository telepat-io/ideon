import { jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PreviewApp from './App.js';

const bootstrapPayload = {
  title: 'Thinking in Rome',
  sourcePath: '/tmp/output/20260328-roman-forum/article-1.md',
  currentSlug: '20260328-roman-forum',
  emptyStateMessage: null,
};

const articleListPayload = [
  {
    slug: '20260328-roman-forum',
    title: 'Thinking in Rome',
    mtime: new Date('2026-03-28T12:00:00.000Z').getTime(),
    previewSnippet: 'How antiquity built durable decision systems.',
    coverImageUrl: null,
    publication: 'tech-blog',
    series: null,
    keywords: ['rome', 'history'],
  },
];

const articleDetailPayload = {
  title: 'Thinking in Rome',
  generationId: '20260328-roman-forum',
  sourcePath: '/tmp/output/20260328-roman-forum/article-1.md',
  analyticsSummary: {
    totalDurationMs: 3000,
    totalCostUsd: 0.0102,
    totalCostSource: 'estimated',
  },
  metaJson: {
    version: 1,
    title: 'Thinking in Rome',
    slug: 'thinking-in-rome',
    idea: 'Explore Roman decision systems',
    description: 'A longform article',
    subtitle: null,
    keywords: ['rome', 'history'],
    contentType: 'article',
    style: 'professional',
    intent: 'guide',
    targetLength: 'medium',
    angle: null,
    cover: null,
    sections: [{ title: 'Introduction', description: 'Set the stage' }],
    images: [],
    outputs: [],
    generatedAt: '2026-03-28T12:00:00.000Z',
    generationDir: '/tmp/output/20260328-roman-forum',
    publication: 'tech-blog',
  },
  interactions: {
    llmCalls: [
      {
        stageId: 'planning',
        operationId: 'outline',
        requestType: 'structured',
        provider: 'openrouter',
        modelId: 'openai/gpt-5.4',
        startedAt: '2026-03-28T12:00:00.000Z',
        endedAt: '2026-03-28T12:00:01.000Z',
        durationMs: 1000,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        status: 'succeeded',
        requestBody: JSON.stringify({
          messages: [
            { role: 'system', content: 'Draft an outline.' },
            { role: 'user', content: 'Focus on Roman thinkers.' },
          ],
        }),
        responseBody: JSON.stringify({
          choices: [{ message: { content: 'Structured outline response.' } }],
        }),
        errorMessage: null,
      },
    ],
    t2iCalls: [],
  },
  outputs: [
    {
      id: 'article-1',
      contentType: 'article',
      contentTypeLabel: 'Article',
      index: 1,
      slug: 'thinking-in-rome',
      title: 'Thinking in Rome',
      htmlBody: '<h1>Thinking in Rome</h1><p>Longform argument.</p>',
      markdownBody: '# Thinking in Rome\n\nLongform argument.',
    },
    {
      id: 'x-post-1',
      contentType: 'x-post',
      contentTypeLabel: 'X Post',
      index: 1,
      slug: 'thinking-in-rome',
      title: 'Shareable takeaway',
      htmlBody: '<p>A sharp social-ready takeaway.</p>',
      markdownBody: 'A sharp social-ready takeaway.',
    },
  ],
};

function createFetchMock(overrides: Partial<Record<string, () => Promise<Response>>> = {}) {
  return jest.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

    if (overrides[url]) {
      return overrides[url]();
    }

    if (url === '/api/bootstrap') {
      return { ok: true, status: 200, json: async () => bootstrapPayload } as Response;
    }

    if (url === '/api/articles') {
      return { ok: true, status: 200, json: async () => articleListPayload } as Response;
    }

    if (url === '/api/publications') {
      return {
        ok: true,
        status: 200,
        json: async () => [{ name: 'Tech Blog', slug: 'tech-blog', editorialPolicy: { tone: '', forbiddenTopics: [], disclosureRequirements: [], audienceRestrictions: [], notes: '' }, defaults: {} }],
      } as Response;
    }

    if (url === '/api/series') {
      return { ok: true, status: 200, json: async () => [] } as Response;
    }

    if (url === '/api/articles/20260328-roman-forum') {
      return { ok: true, status: 200, json: async () => articleDetailPayload } as Response;
    }

    return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
  }) as unknown as typeof fetch;
}

describe('PreviewApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = createFetchMock();
  });

  it('loads the selected generation, switches output types, and shows the interaction inspector', async () => {
    render(<PreviewApp />);

    expect((await screen.findAllByText('Thinking in Rome')).length).toBeGreaterThan(0);
    expect(await screen.findByText('How antiquity built durable decision systems.')).toBeInTheDocument();
    expect(await screen.findByText('Longform argument.')).toBeInTheDocument();
    expect(document.querySelector('.fmt-article')).toBeInTheDocument();
    expect(await screen.findByText(/Source: \/tmp\/output\/20260328-roman-forum\/article-1\.md/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'X Post' }));
    expect(await screen.findByText('A sharp social-ready takeaway.')).toBeInTheDocument();
    expect(document.querySelector('.fmt-x-post')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Logs' })[0]!);
    expect(await screen.findByText('planning')).toBeInTheDocument();
    expect(screen.getAllByText('outline').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Response' }));
    expect(screen.getByText('Structured outline response.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Full JSON' }));
    expect(screen.getAllByText(/openai\/gpt-5.4/).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/publications');
      expect(global.fetch).toHaveBeenCalledWith('/api/series');
    });
  });

  it('renders the friendly empty state when no generations exist', async () => {
    global.fetch = createFetchMock({
      '/api/bootstrap': async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ...bootstrapPayload,
          currentSlug: '',
          emptyStateMessage: 'No generated content found in output/ yet.',
        }),
      }) as Response,
      '/api/articles': async () => ({ ok: true, status: 200, json: async () => [] }) as Response,
    });

    render(<PreviewApp />);

    expect(await screen.findByText('No generated content found in output/ yet.')).toBeInTheDocument();
  });

  it('updates the displayed source path when switching projects from the sidebar', async () => {
    const secondSlug = '20260329-athens-debate';
    const secondSourcePath = '/tmp/output/20260329-athens-debate/article-1.md';

    global.fetch = createFetchMock({
      '/api/articles': async () => ({
        ok: true,
        status: 200,
        json: async () => [
          ...articleListPayload,
          {
            slug: secondSlug,
            title: 'Debating in Athens',
            mtime: new Date('2026-03-29T11:00:00.000Z').getTime(),
            previewSnippet: 'Second generation used to verify sidebar switching.',
            coverImageUrl: null,
            publication: null,
            series: null,
            keywords: [],
          },
        ],
      }) as Response,
      [`/api/articles/${secondSlug}`]: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ...articleDetailPayload,
          title: 'Debating in Athens',
          generationId: secondSlug,
          sourcePath: secondSourcePath,
          outputs: articleDetailPayload.outputs.map((output) => ({
            ...output,
            title: output.id === 'article-1' ? 'Debating in Athens' : output.title,
          })),
        }),
      }) as Response,
    });

    render(<PreviewApp />);

    expect(await screen.findByText(/Source: \/tmp\/output\/20260328-roman-forum\/article-1\.md/)).toBeInTheDocument();

    fireEvent.click(await screen.findByText('Debating in Athens'));

    expect(await screen.findByText(new RegExp(`Source: ${secondSourcePath.replaceAll('/', '\\/')}`))).toBeInTheDocument();
  });

  it('shows the preview index error state when the initial list load fails', async () => {
    global.fetch = createFetchMock({
      '/api/articles': async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Preview index unavailable.' }),
      }) as Response,
    });

    render(<PreviewApp />);

    expect(await screen.findByText('Unable to load preview index')).toBeInTheDocument();
    expect((await screen.findAllByText('Preview index unavailable.')).length).toBeGreaterThan(0);
  });

  it('shows the generation error state when detail loading fails', async () => {
    global.fetch = createFetchMock({
      '/api/articles/20260328-roman-forum': async () => ({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Generation no longer exists.' }),
      }) as Response,
    });

    render(<PreviewApp />);

    expect(await screen.findByText('Unable to load generation')).toBeInTheDocument();
    expect(await screen.findByText('Generation no longer exists.')).toBeInTheDocument();
  });

  it('shows empty output and log states for generations without outputs or interactions', async () => {
    global.fetch = createFetchMock({
      '/api/articles/20260328-roman-forum': async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ...articleDetailPayload,
          interactions: { llmCalls: [], t2iCalls: [] },
          outputs: [],
        }),
      }) as Response,
    });

    render(<PreviewApp />);

    expect(await screen.findByText('No content outputs found for this generation.')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Logs' })[0]!);
    expect(await screen.findByText('No interactions captured for this generation.')).toBeInTheDocument();
  });

  it('copies markdown from the actions dropdown', async () => {
    const clipboardWrite = jest.spyOn(navigator.clipboard, 'writeText');

    render(<PreviewApp />);

    await screen.findByText('Longform argument.');

    fireEvent.click(screen.getByRole('button', { name: /Actions/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }));

    await waitFor(() => {
      expect(clipboardWrite).toHaveBeenCalledWith('# Thinking in Rome\n\nLongform argument.');
    });
  });
});
