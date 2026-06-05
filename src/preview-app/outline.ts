export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  index: number;
}

export function extractOutlineFromHtml(html: string): OutlineItem[] {
  if (!html.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(html, 'text/html');
  const headings = documentFragment.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const items: OutlineItem[] = [];

  headings.forEach((heading, index) => {
    const level = Number(heading.tagName.slice(1));
    const text = heading.textContent?.trim() ?? '';
    if (!text) {
      return;
    }

    const id = `sec-${index}`;
    items.push({ id, level, text, index });
  });

  return items;
}

export function injectHeadingIds(html: string): string {
  if (!html.trim()) {
    return html;
  }

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(html, 'text/html');
  const headings = documentFragment.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach((heading, index) => {
    heading.id = `sec-${index}`;
  });

  return documentFragment.body.innerHTML;
}
