import type { PreviewArticleListItem } from '../types/preview.js';

export interface SidebarFilterState {
  activePub: 'all' | string;
  activeSeries: string | null;
  searchQuery: string;
}

export function filterGenerations(
  articles: PreviewArticleListItem[],
  filters: SidebarFilterState,
): PreviewArticleListItem[] {
  let result = [...articles];

  if (filters.activePub !== 'all') {
    result = result.filter((article) => (article.publication ?? '') === filters.activePub);
  }

  if (filters.activeSeries) {
    result = result.filter((article) => (article.series ?? '') === filters.activeSeries);
  }

  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter((article) =>
      article.title.toLowerCase().includes(query)
      || article.previewSnippet.toLowerCase().includes(query)
      || article.keywords.some((keyword) => keyword.toLowerCase().includes(query))
      || article.slug.toLowerCase().includes(query),
    );
  }

  return result;
}

export function groupArticlesByDate(articles: PreviewArticleListItem[]): Map<string, PreviewArticleListItem[]> {
  const groups = new Map<string, PreviewArticleListItem[]>();

  for (const article of articles) {
    const dateKey = formatListDate(article.mtime);
    const bucket = groups.get(dateKey) ?? [];
    bucket.push(article);
    groups.set(dateKey, bucket);
  }

  return groups;
}

export function formatListDate(mtime: number): string {
  return new Date(mtime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function countByPublication(
  articles: PreviewArticleListItem[],
  publicationSlug: string,
): number {
  if (publicationSlug === 'all') {
    return articles.length;
  }

  return articles.filter((article) => article.publication === publicationSlug).length;
}

export function countBySeries(
  articles: PreviewArticleListItem[],
  seriesSlug: string,
  publicationSlug: 'all' | string,
): number {
  return articles.filter((article) => {
    if (article.series !== seriesSlug) {
      return false;
    }

    if (publicationSlug === 'all') {
      return true;
    }

    return article.publication === publicationSlug;
  }).length;
}
