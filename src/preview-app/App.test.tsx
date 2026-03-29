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
  },
];

const articleDetailPayload = {
  title: 'Thinking in Rome',
  generationId: '20260328-roman-forum',
  sourcePath: '/tmp/output/20260328-roman-forum/article-1.md',
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
    t2iCalls: [
      {
        stageId: 'images',
        operationId: 'cover-image',
        provider: 'replicate',
        modelId: 'black-forest-labs/flux-schnell',
        kind: 'cover',
        startedAt: '2026-03-28T12:00:02.000Z',
        endedAt: '2026-03-28T12:00:04.000Z',
        durationMs: 2000,
        attempts: 1,
        retries: 0,
        retryBackoffMs: 0,
        status: 'succeeded',
        prompt: 'An austere marble forum at sunrise.',
        input: { aspect_ratio: '16:9' },
        errorMessage: null,
      },
    ],
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
    },
    {
      id: 'x-post-1',
      contentType: 'x-post',
      contentTypeLabel: 'X Post',
      index: 1,
      slug: 'thinking-in-rome',
      title: 'Shareable takeaway',
      htmlBody: '<p>A sharp social-ready takeaway.</p>',
    },
  ],
};

describe('PreviewApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/bootstrap') {
        return { ok: true, status: 200, json: async () => bootstrapPayload };
      }

      if (url === '/api/articles') {
        return { ok: true, status: 200, json: async () => articleListPayload };
      }

      if (url === '/api/articles/20260328-roman-forum') {
        return { ok: true, status: 200, json: async () => articleDetailPayload };
      }

      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }) as unknown as typeof fetch;
  });

  it('loads the selected generation, switches output types, and shows the interaction inspector', async () => {
    render(<PreviewApp />);

    // Title appears in both the sidebar list item and the detail panel heading.
    const titleElements = await screen.findAllByText('Thinking in Rome');
    expect(titleElements.length).toBeGreaterThan(0);
    expect(await screen.findByText('How antiquity built durable decision systems.')).toBeInTheDocument();

    fireEvent.click(await screen.findByText('X Post'));
    expect(await screen.findByText('Shareable takeaway')).toBeInTheDocument();

    fireEvent.click(await screen.findByText('Logs'));
    expect(await screen.findByText('Interaction Inspector')).toBeInTheDocument();
    expect(screen.getAllByText('outline').length).toBeGreaterThan(0);
    expect(screen.getByText('Structured outline response.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Full JSON' }));
    expect(screen.getAllByText(/openai\/gpt-5.4/).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  it('renders the friendly empty state when no generations exist', async () => {
    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/bootstrap') {
        return { ok: true, status: 200, json: async () => ({
          ...bootstrapPayload,
          currentSlug: '',
          emptyStateMessage: 'No generated content found in output/ yet.',
        }) };
      }

      if (url === '/api/articles') {
        return { ok: true, status: 200, json: async () => [] };
      }

      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }) as unknown as typeof fetch;

    render(<PreviewApp />);

    expect(await screen.findByText('No generated content found in output/ yet.')).toBeInTheDocument();
  });

  it('updates the displayed source path when switching projects from the sidebar', async () => {
    const secondSlug = '20260329-athens-debate';
    const secondSourcePath = '/tmp/output/20260329-athens-debate/article-1.md';

    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;

      if (url === '/api/bootstrap') {
        return { ok: true, status: 200, json: async () => bootstrapPayload };
      }

      if (url === '/api/articles') {
        return {
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
            },
          ],
        };
      }

      if (url === '/api/articles/20260328-roman-forum') {
        return { ok: true, status: 200, json: async () => articleDetailPayload };
      }

      if (url === `/api/articles/${secondSlug}`) {
        return {
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
        };
      }

      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }) as unknown as typeof fetch;

    render(<PreviewApp />);

    expect(await screen.findByText('/tmp/output/20260328-roman-forum/article-1.md')).toBeInTheDocument();

    const nextProjectTitle = await screen.findByText('Debating in Athens');
    const nextProjectButton = nextProjectTitle.closest('button');
    expect(nextProjectButton).not.toBeNull();
    fireEvent.click(nextProjectButton as HTMLButtonElement);

    expect(await screen.findByText(secondSourcePath)).toBeInTheDocument();
  });
});