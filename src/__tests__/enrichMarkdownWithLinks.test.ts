import { enrichMarkdownWithLinks } from '../output/enrichMarkdownWithLinks.js';
import type { LinkEntry } from '../types/article.js';

function link(expression: string, url: string): LinkEntry {
  return { expression, url, title: null };
}

describe('enrichMarkdownWithLinks', () => {
  it('returns the original markdown unchanged when there are no links', () => {
    const md = '# Title\n\nSome text about Aristotle.';
    expect(enrichMarkdownWithLinks(md, [])).toBe(md);
  });

  it('injects a link on the first occurrence of an expression', () => {
    const md = 'Aristotle thought deeply. Aristotle also ate lunch.';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toBe('[Aristotle](https://example.com/aristotle) thought deeply. Aristotle also ate lunch.');
  });

  it('prefers longer expressions over shorter overlapping ones', () => {
    const md = 'OpenRouter API improves routing.';
    const result = enrichMarkdownWithLinks(md, [
      link('OpenRouter', 'https://openrouter.ai/'),
      link('OpenRouter API', 'https://openrouter.ai/docs'),
    ]);
    expect(result).toContain('[OpenRouter API](https://openrouter.ai/docs)');
    expect(result).not.toContain('[OpenRouter](https://openrouter.ai/)');
  });

  it('does not double-link an expression already inside an existing link', () => {
    const md = 'Read [TypeScript](https://typescriptlang.org/) docs.';
    const result = enrichMarkdownWithLinks(md, [link('TypeScript', 'https://example.com/ts')]);
    expect(result).toContain('[TypeScript](https://typescriptlang.org/)');
    expect(result).not.toContain('https://example.com/ts');
  });

  it('links italic expressions like *phronesis*', () => {
    const md = 'Aristotle called this *phronesis* — practical wisdom.';
    const result = enrichMarkdownWithLinks(md, [link('*phronesis*', 'https://example.com/phronesis')]);
    expect(result).toContain('[*phronesis*](https://example.com/phronesis)');
  });

  it('links a plain word on the same line as a previously injected italic expression', () => {
    // *phronesis* (11 chars) sorts before Aristotle (9 chars).
    // After *phronesis* is injected, Aristotle must NOT be blocked just because
    // the line now contains a link.
    const md = 'Aristotle called this *phronesis* — practical wisdom.';
    const result = enrichMarkdownWithLinks(md, [
      link('Aristotle', 'https://example.com/aristotle'),
      link('*phronesis*', 'https://example.com/phronesis'),
    ]);
    expect(result).toContain('[Aristotle](https://example.com/aristotle)');
    expect(result).toContain('[*phronesis*](https://example.com/phronesis)');
  });

  it('links multiple plain words on the same line that share it with an italic expression', () => {
    // Mirrors the real article: subtitle line contains Aristotle, Marcus Aurelius,
    // and Diogenes; Marcus Aurelius (15 chars) is injected first, which must not
    // block the shorter names on the same line.
    const md = '_How Aristotle, Marcus Aurelius, and Diogenes filter tasks._';
    const result = enrichMarkdownWithLinks(md, [
      link('Aristotle', 'https://example.com/aristotle'),
      link('Marcus Aurelius', 'https://example.com/marcus'),
      link('Diogenes', 'https://example.com/diogenes'),
    ]);
    expect(result).toContain('[Aristotle](https://example.com/aristotle)');
    expect(result).toContain('[Marcus Aurelius](https://example.com/marcus)');
    expect(result).toContain('[Diogenes](https://example.com/diogenes)');
  });

  it('leaves the markdown unchanged when no expression is present in the text', () => {
    const md = 'Nothing relevant here.';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toBe(md);
  });

  it('does not link an expression that appears only inside an existing link URL', () => {
    // "Aristotle" appears inside the URL path but not as standalone text.
    const md = 'Read more [here](https://example.com/Aristotle-fragments).';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toBe(md);
  });

  it('does not link an expression that appears only in an existing link display text', () => {
    const md = 'Read [Aristotle on virtue](https://example.com/virtue) for context.';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toContain('[Aristotle on virtue](https://example.com/virtue)');
    expect(result).not.toContain('https://example.com/aristotle');
  });

  it('skips the first occurrence inside an existing link and links the next standalone one', () => {
    const md = [
      '[Aristotle](https://example.com/existing)',
      '',
      'Aristotle was also a biologist.',
    ].join('\n');
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/new')]);
    // First occurrence is inside an existing link — skipped; second is linked.
    expect(result).toContain('[Aristotle](https://example.com/new) was also a biologist.');
    expect(result).toContain('[Aristotle](https://example.com/existing)');
  });

  it('does not link an expression inside an image alt text', () => {
    const md = '![Aristotle thinking](aristotle-bust.png)';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toBe(md);
  });

  it('does not link an expression inside an inline code span', () => {
    const md = 'Call `Aristotle` for the reference type.';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toBe(md);
  });

  it('links plain text occurrence but skips the one inside inline code on the same line', () => {
    const md = 'The `Aristotle` type wraps the Aristotle interface.';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toContain('`Aristotle`');
    expect(result).toContain('[Aristotle](https://example.com/aristotle) interface.');
    expect(result).not.toContain('`[Aristotle]');
  });

  it('is case-sensitive and does not match a different casing', () => {
    const md = 'aristotle of stagira.';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toBe(md);
  });

  it('links an expression at the very start of the content', () => {
    const md = 'Aristotle was the first.';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toBe('[Aristotle](https://example.com/aristotle) was the first.');
  });

  it('links an expression at the very end of the content', () => {
    const md = 'The founder was Aristotle';
    const result = enrichMarkdownWithLinks(md, [link('Aristotle', 'https://example.com/aristotle')]);
    expect(result).toBe('The founder was [Aristotle](https://example.com/aristotle)');
  });
});
