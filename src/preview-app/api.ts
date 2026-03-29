import type {
  PreviewArticleContent,
  PreviewArticleListItem,
  PreviewBootstrapData,
} from '../types/preview.js';

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === 'string' && payload.error.length > 0) {
        message = payload.error;
      }
    } catch {
      // Ignore invalid JSON error payloads and use the fallback message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function loadPreviewBootstrap(): Promise<PreviewBootstrapData> {
  return fetchJson<PreviewBootstrapData>('/api/bootstrap');
}

export function loadPreviewArticles(): Promise<PreviewArticleListItem[]> {
  return fetchJson<PreviewArticleListItem[]>('/api/articles');
}

export function loadPreviewArticle(slug: string): Promise<PreviewArticleContent> {
  return fetchJson<PreviewArticleContent>(`/api/articles/${encodeURIComponent(slug)}`);
}