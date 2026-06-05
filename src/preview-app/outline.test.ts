import { extractOutlineFromHtml, injectHeadingIds } from './outline.js';

describe('outline helpers', () => {
  it('extracts headings and injects stable section ids', () => {
    const html = '<h1>Title</h1><p>Intro</p><h2>Section</h2>';
    const withIds = injectHeadingIds(html);
    const outline = extractOutlineFromHtml(withIds);

    expect(outline).toEqual([
      { id: 'sec-0', level: 1, text: 'Title', index: 0 },
      { id: 'sec-1', level: 2, text: 'Section', index: 1 },
    ]);
    expect(withIds).toContain('id="sec-0"');
    expect(withIds).toContain('id="sec-1"');
  });
});
