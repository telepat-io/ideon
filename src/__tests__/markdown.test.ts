import { renderMarkdownDocument } from '../output/markdown.js';
import type { GeneratedArticle } from '../types/article.js';

describe('renderMarkdownDocument', () => {
  const createBasicArticle = (overrides?: Partial<GeneratedArticle>): GeneratedArticle => {
    return {
      plan: {
        title: 'The Future of AI',
        subtitle: 'Trends to watch in 2026',
        keywords: ['AI', 'technology', 'innovation'],
        slug: 'future-of-ai',
        description: 'An article about AI trends',
        introBrief: 'Introduction brief',
        outroBrief: 'Conclusion brief',
        sections: [
          { title: 'Section 1', description: 'Description 1' },
          { title: 'Section 2', description: 'Description 2' },
          { title: 'Section 3', description: 'Description 3' },
          { title: 'Section 4', description: 'Description 4' },
        ],
        coverImageDescription: 'Cover image description',
        inlineImages: [],
      },
      intro: 'This is the introduction text.',
      sections: [
        { title: 'Section 1', body: 'This is the content of section 1.' },
        { title: 'Section 2', body: 'This is the content of section 2.' },
        { title: 'Section 3', body: 'This is the content of section 3.' },
        { title: 'Section 4', body: 'This is the content of section 4.' },
      ],
      outro: 'This is the conclusion text.',
      imagePrompts: [],
      renderedImages: [],
      ...overrides,
    };
  };

  describe('frontmatter generation', () => {
    it('should render valid YAML frontmatter', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      expect(markdown).toContain('---');
      expect(markdown).toContain(`title: "${article.plan.title}"`);
      expect(markdown).toContain(`subtitle: "${article.plan.subtitle}"`);
      expect(markdown).toContain(`slug: "${article.plan.slug}"`);
    });

    it('should properly escape special characters in frontmatter', () => {
      const article = createBasicArticle({
        plan: {
          ...createBasicArticle().plan,
          title: 'Article with "Quotes" and Escapes',
        },
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown).toContain(`title: "Article with \\"Quotes\\" and Escapes"`);
    });

    it('should include all keywords in YAML array', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      expect(markdown).toContain('keywords: [');
      article.plan.keywords.forEach((keyword) => {
        expect(markdown).toContain(keyword);
      });
    });

    it('should place frontmatter at the start', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      const lines = markdown.split('\n');
      expect(lines[0]).toBe('---');
      expect(lines[lines.length - 3] || lines[lines.length - 2]).not.toBe('---');
    });

    it('should separate frontmatter from body with double newline', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      const parts = markdown.split('---');
      expect(parts.length).toBe(3); // Opening ---, content, closing ---
      expect(parts[2].trimStart()).not.toMatch(/^\s*$/); // Content after frontmatter
    });
  });

  describe('body structure', () => {
    it('should have main title as H1', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      expect(markdown).toContain(`# ${article.plan.title}`);
    });

    it('should have subtitle after title', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      const titleIndex = markdown.indexOf(`# ${article.plan.title}`);
      const subtitleIndex = markdown.indexOf(`_${article.plan.subtitle}_`);
      expect(titleIndex).toBeLessThan(subtitleIndex);
    });

    it('should include introduction text', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      expect(markdown).toContain(article.intro);
    });

    it('should include all sections as H2 headings', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      article.sections.forEach((section) => {
        expect(markdown).toContain(`## ${section.title}`);
        expect(markdown).toContain(section.body);
      });
    });

    it('should have Conclusion heading', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      expect(markdown).toContain('## Conclusion');
      expect(markdown).toContain(article.outro);
    });

    it('should trim whitespace from section bodies', () => {
      const article = createBasicArticle({
        sections: [
          { title: 'Section 1', body: '  \n  Content with whitespace\n  ' },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown).toContain('Content with whitespace');
      expect(markdown).not.toContain('  \n');
    });
  });

  describe('cover image handling', () => {
    it('should include cover image when provided', () => {
      const article = createBasicArticle({
        renderedImages: [
          {
            id: 'cover-1',
            kind: 'cover',
            prompt: 'Cover prompt',
            description: 'Cover description',
            anchorAfterSection: null,
            outputPath: '/path/to/cover.jpg',
            relativePath: 'assets/cover.jpg',
          },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown).toContain('![The Future of AI](assets/cover.jpg)');
    });

    it('should include cover image after subtitle', () => {
      const article = createBasicArticle({
        renderedImages: [
          {
            id: 'cover-1',
            kind: 'cover',
            prompt: 'Cover prompt',
            description: 'Cover description',
            anchorAfterSection: null,
            outputPath: '/path/to/cover.jpg',
            relativePath: 'assets/cover.jpg',
          },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      const subtitleIndex = markdown.indexOf(`_${article.plan.subtitle}_`);
      const coverIndex = markdown.indexOf('assets/cover.jpg');
      expect(subtitleIndex).toBeLessThan(coverIndex);
    });

    it('should not include cover image when not provided', () => {
      const article = createBasicArticle({
        renderedImages: [],
      });

      const markdown = renderMarkdownDocument(article);
      const coverSectionMatch = markdown.match(/!\[\w+\]\(assets\/cover\.jpg\)/);
      expect(coverSectionMatch).toBeNull();
    });
  });

  describe('inline images', () => {
    it('should include inline images after corresponding sections', () => {
      const article = createBasicArticle({
        renderedImages: [
          {
            id: 'inline-1',
            kind: 'inline',
            prompt: 'Inline prompt',
            description: 'First inline image',
            anchorAfterSection: 1,
            outputPath: '/path/to/inline-1.jpg',
            relativePath: 'assets/inline-1.jpg',
          },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown).toContain('![First inline image](assets/inline-1.jpg)');
    });

    it('should place inline image after correct section', () => {
      const article = createBasicArticle({
        sections: [
          { title: 'Section 1', body: 'Content 1' },
          { title: 'Section 2', body: 'Content 2' },
          { title: 'Section 3', body: 'Content 3' },
          { title: 'Section 4', body: 'Content 4' },
        ],
        renderedImages: [
          {
            id: 'inline-1',
            kind: 'inline',
            prompt: 'Inline prompt',
            description: 'Image after section 2',
            anchorAfterSection: 2,
            outputPath: '/path/to/inline.jpg',
            relativePath: 'assets/inline.jpg',
          },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      const section2Index = markdown.indexOf('## Section 2');
      const section3Index = markdown.indexOf('## Section 3');
      const imageIndex = markdown.indexOf('assets/inline.jpg');

      expect(section2Index).toBeLessThan(imageIndex);
      expect(imageIndex).toBeLessThan(section3Index);
    });

    it('should handle multiple inline images', () => {
      const article = createBasicArticle({
        renderedImages: [
          {
            id: 'inline-1',
            kind: 'inline',
            prompt: 'Prompt 1',
            description: 'Image 1',
            anchorAfterSection: 1,
            outputPath: '/path/to/inline-1.jpg',
            relativePath: 'assets/inline-1.jpg',
          },
          {
            id: 'inline-2',
            kind: 'inline',
            prompt: 'Prompt 2',
            description: 'Image 2',
            anchorAfterSection: 3,
            outputPath: '/path/to/inline-2.jpg',
            relativePath: 'assets/inline-2.jpg',
          },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown).toContain('assets/inline-1.jpg');
      expect(markdown).toContain('assets/inline-2.jpg');
    });

    it('should not include inline images when anchorAfterSection is null', () => {
      const article = createBasicArticle({
        renderedImages: [
          {
            id: 'orphan',
            kind: 'inline',
            prompt: 'Prompt',
            description: 'Orphan image',
            anchorAfterSection: null,
            outputPath: '/path/to/orphan.jpg',
            relativePath: 'assets/orphan.jpg',
          },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown).not.toContain('assets/orphan.jpg');
    });
  });

  describe('output format', () => {
    it('should end with newline', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      expect(markdown).toMatch(/\n$/);
    });

    it('should have proper spacing between sections', () => {
      const article = createBasicArticle();
      const markdown = renderMarkdownDocument(article);

      // Check that sections have empty lines between them
      expect(markdown).toMatch(/## Section \d+\n\n.+\n\n/);
    });

    it('should produce valid markdown structure', () => {
      const article = createBasicArticle({
        renderedImages: [
          {
            id: 'cover-1',
            kind: 'cover',
            prompt: 'Cover',
            description: 'Cover',
            anchorAfterSection: null,
            outputPath: '/path/to/cover.jpg',
            relativePath: 'assets/cover.jpg',
          },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      // Should have exactly one closing triple dash
      const dashCount = (markdown.match(/^---$/gm) || []).length;
      expect(dashCount).toBe(2); // Opening and closing
    });
  });

  describe('edge cases', () => {
    it('should handle articles with minimal content', () => {
      const article = createBasicArticle({
        intro: 'x',
        outro: 'y',
        sections: [
          { title: 'A', body: 'a' },
          { title: 'B', body: 'b' },
          { title: 'C', body: 'c' },
          { title: 'D', body: 'd' },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown).toContain('# The Future of AI');
      expect(markdown).toContain('## A');
      expect(markdown.length).toBeGreaterThan(100);
    });

    it('should handle long content without issues', () => {
      const longContent = 'Lorem ipsum dolor sit amet. '.repeat(100);
      const article = createBasicArticle({
        intro: longContent,
        outro: longContent,
        sections: [
          { title: 'Section 1', body: longContent },
          { title: 'Section 2', body: longContent },
          { title: 'Section 3', body: longContent },
          { title: 'Section 4', body: longContent },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown.length).toBeGreaterThan(10000);
      expect(markdown).toContain('# The Future of AI');
    });

    it('should preserve formatting in section bodies', () => {
      const article = createBasicArticle({
        sections: [
          {
            title: 'Section 1',
            body: 'Text with **bold** and *italic* and `code`.',
          },
        ],
      });

      const markdown = renderMarkdownDocument(article);
      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('*italic*');
      expect(markdown).toContain('`code`');
    });
  });
});
