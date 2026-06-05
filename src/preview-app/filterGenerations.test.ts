import { countByPublication, countBySeries, filterGenerations } from './filterGenerations.js';
import type { PreviewArticleListItem } from '../types/preview.js';

const articles: PreviewArticleListItem[] = [
  {
    slug: 'a',
    title: 'Alpha Article',
    mtime: 1,
    previewSnippet: 'alpha snippet',
    coverImageUrl: null,
    publication: 'tech-blog',
    series: 'seo-fundamentals',
    keywords: ['seo'],
  },
  {
    slug: 'b',
    title: 'Beta Notes',
    mtime: 2,
    previewSnippet: 'beta snippet',
    coverImageUrl: null,
    publication: 'dev-notes',
    series: null,
    keywords: ['react'],
  },
];

describe('filterGenerations', () => {
  it('filters by publication slug', () => {
    const result = filterGenerations(articles, {
      activePub: 'tech-blog',
      activeSeries: null,
      searchQuery: '',
    });

    expect(result.map((article) => article.slug)).toEqual(['a']);
  });

  it('filters by series slug within a publication scope', () => {
    const result = filterGenerations(articles, {
      activePub: 'tech-blog',
      activeSeries: 'seo-fundamentals',
      searchQuery: '',
    });

    expect(result.map((article) => article.slug)).toEqual(['a']);
  });

  it('filters by search query across title, snippet, keywords, and slug', () => {
    const result = filterGenerations(articles, {
      activePub: 'all',
      activeSeries: null,
      searchQuery: 'react',
    });

    expect(result.map((article) => article.slug)).toEqual(['b']);
  });

  it('counts publications and series for sidebar dropdowns', () => {
    expect(countByPublication(articles, 'all')).toBe(2);
    expect(countByPublication(articles, 'tech-blog')).toBe(1);
    expect(countBySeries(articles, 'seo-fundamentals', 'tech-blog')).toBe(1);
    expect(countBySeries(articles, 'seo-fundamentals', 'all')).toBe(1);
  });
});
