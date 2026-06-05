import { render, screen } from '@testing-library/react';
import type { PreviewArticleContent } from '../../types/preview.js';
import { PlanAssetsView } from './PlanAssetsView.js';

const detail: PreviewArticleContent = {
  title: 'Sample',
  generationId: 'gen-1',
  sourcePath: '/tmp/gen-1/article.md',
  interactions: { llmCalls: [], t2iCalls: [] },
  analyticsSummary: null,
  metaJson: {
    version: 1,
    title: 'Sample',
    slug: 'sample',
    idea: 'Build a reporting workflow',
    description: 'Description',
    subtitle: null,
    keywords: ['looker', 'snapchat'],
    contentType: 'article',
    style: 'professional',
    intent: 'announcement',
    targetLength: 'small',
    angle: null,
    cover: null,
    sections: [{ title: 'Intro', description: 'Set context' }],
    images: [],
    outputs: [],
    generatedAt: '2026-05-08T12:49:28.058Z',
    generationDir: '/tmp/gen-1',
    publication: 'tech-blog',
  },
  outputs: [],
};

describe('PlanAssetsView', () => {
  it('renders generation metadata as plan cards', () => {
    render(
      <PlanAssetsView
        detail={detail}
        publicationName="Tech Blog"
        seriesName={null}
      />,
    );

    expect(screen.getByText('Generation Metadata')).toBeInTheDocument();
    expect(screen.getByText('professional')).toBeInTheDocument();
    expect(screen.getByText('announcement')).toBeInTheDocument();
    expect(screen.getByText('Tech Blog')).toBeInTheDocument();
    expect(screen.getByText('looker')).toBeInTheDocument();
  });
});
