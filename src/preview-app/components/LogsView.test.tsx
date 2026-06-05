import { fireEvent, render, screen } from '@testing-library/react';
import type { PreviewArticleContent } from '../../types/preview.js';
import { LogsView } from './LogsView.js';

const detail: PreviewArticleContent = {
  title: 'Sample',
  generationId: 'gen-1',
  sourcePath: '/tmp/gen-1/article.md',
  analyticsSummary: null,
  metaJson: null,
  outputs: [],
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
          messages: [{ role: 'user', content: 'Plan this article.' }],
        }),
        responseBody: JSON.stringify({
          choices: [{ message: { content: 'Outline ready.' } }],
        }),
        errorMessage: null,
      },
    ],
    t2iCalls: [],
  },
};

describe('LogsView', () => {
  it('renders stage list and inspector using prototype layout classes', () => {
    const { container } = render(<LogsView detail={detail} />);

    expect(container.querySelector('.stage-panel')).toBeInTheDocument();
    expect(container.querySelector('.inspector-panel')).toBeInTheDocument();
    expect(screen.getByText('planning')).toBeInTheDocument();
    expect(screen.getByText(/Plan this article\./)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Response' }));
    expect(screen.getByText('Outline ready.')).toBeInTheDocument();
  });
});
