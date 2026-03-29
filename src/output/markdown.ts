import type { GeneratedArticle } from '../types/article.js';

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function renderMarkdownDocument(article: GeneratedArticle): string {
  const frontmatter = [
    '---',
    `title: ${yamlString(article.plan.title)}`,
    `subtitle: ${yamlString(article.plan.subtitle)}`,
    `slug: ${yamlString(article.plan.slug)}`,
    `description: ${yamlString(article.plan.description)}`,
    `keywords: [${article.plan.keywords.map((keyword) => yamlString(keyword)).join(', ')}]`,
    '---',
  ].join('\n');

  const imageAfterSection = new Map(article.renderedImages.filter((image) => image.kind === 'inline').map((image) => [image.anchorAfterSection, image]));
  const coverImage = article.renderedImages.find((image) => image.kind === 'cover') ?? null;

  const body: string[] = [`# ${article.plan.title}`, '', `_${article.plan.subtitle}_`, ''];

  if (coverImage) {
    body.push(`![${article.plan.title}](${coverImage.relativePath})`, '');
  }

  body.push(article.intro.trim(), '');

  article.sections.forEach((section, index) => {
    body.push(`## ${section.title}`, '', section.body.trim(), '');

    const inlineImage = imageAfterSection.get(index + 1) ?? null;
    if (inlineImage) {
      body.push(`![${inlineImage.description}](${inlineImage.relativePath})`, '');
    }
  });

  body.push('## Conclusion', '', article.outro.trim(), '');

  return `${frontmatter}\n\n${body.join('\n').trim()}\n`;
}