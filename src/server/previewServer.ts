import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { marked } from 'marked';
import { stripFrontmatter, extractHeadingTitle, listAllArticles, extractArticleMetadata } from './previewHelpers.js';

const execFileAsync = promisify(execFile);

export interface PreviewServerOptions {
  markdownPath: string;
  assetDir: string;
  markdownOutputDir: string;
  port: number;
  openBrowser: boolean;
}

export interface StartedPreviewServer {
  url: string;
  close: () => Promise<void>;
}

interface ArticleContent {
  title: string;
  htmlBody: string;
}

export async function startPreviewServer(options: PreviewServerOptions): Promise<StartedPreviewServer> {
  const app = express();
  app.disable('x-powered-by');
  app.use('/assets', express.static(options.assetDir));

  // API endpoints
  app.get('/api/articles', async (_req, res) => {
    try {
      const articles = await listAllArticles(options.markdownOutputDir);
      res.status(200).type('application/json').json(articles);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error listing articles';
      res.status(500).type('application/json').json({ error: message });
    }
  });

  app.get('/api/articles/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const markdownPath = path.join(options.markdownOutputDir, `${slug}.md`);
      const content = await getArticleContent(markdownPath);
      res.status(200).type('application/json').json(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error loading article';
      res.status(404).type('application/json').json({ error: message });
    }
  });

  // Main preview page
  app.get('/', async (_req, res) => {
    try {
      const markdown = await readFile(options.markdownPath, 'utf8');
      const title = extractHeadingTitle(stripFrontmatter(markdown)) ?? path.basename(options.markdownPath, '.md');
      const currentSlug = path.basename(options.markdownPath, '.md');
      const html = renderShell({
        title,
        sourcePath: options.markdownPath,
        currentSlug,
      });

      res.status(200).type('html').send(html);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown preview rendering error.';
      res.status(500).type('text').send(`Failed to render preview: ${message}`);
    }
  });

  const server = await new Promise<import('node:http').Server>((resolve, reject) => {
    const instance = app.listen(options.port, () => {
      resolve(instance);
    });

    instance.on('error', (error) => {
      reject(error);
    });
  });

  const url = `http://localhost:${options.port}`;
  if (options.openBrowser) {
    void tryOpenBrowser(url);
  }

  return {
    url,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

async function getArticleContent(markdownPath: string): Promise<ArticleContent> {
  const markdown = await readFile(markdownPath, 'utf8');
  const htmlBody = await renderArticleHtml(markdown);
  const title = extractHeadingTitle(stripFrontmatter(markdown)) ?? path.basename(markdownPath, '.md');

  return { title, htmlBody };
}

async function renderArticleHtml(markdown: string): Promise<string> {
  const content = stripFrontmatter(markdown);
  return await marked.parse(content);
}

function renderShell({ title, sourcePath, currentSlug }: { title: string; sourcePath: string; currentSlug: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | Ideon Preview</title>
    <style>
      :root {
        --bg: #f4efe6;
        --paper: #fffdf9;
        --text: #1f1c18;
        --muted: #6c6257;
        --accent: #0b6e4f;
        --border: #d9cfbf;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        color: var(--text);
        background:
          radial-gradient(circle at 0% 0%, #efe3cf 0%, transparent 45%),
          radial-gradient(circle at 100% 0%, #dceadf 0%, transparent 35%),
          var(--bg);
        font-family: "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif;
        line-height: 1.65;
      }

      main {
        display: flex;
        min-height: 100vh;
      }

      aside {
        width: 280px;
        background: #f9f4ed;
        border-right: 1px solid var(--border);
        overflow-y: auto;
        padding: 1.5rem 0;
        flex-shrink: 0;
      }

      @media (min-width: 1200px) {
        aside {
          width: 350px;
        }

        .sidebar-header {
          padding: 0 1.75rem;
        }

        .article-item {
          margin: 0.25rem 0.75rem;
        }

        .article-item button {
          padding: 1rem 1.25rem;
        }
      }

      .sidebar-header {
        padding: 0 1.5rem;
        margin-bottom: 1rem;
        font-size: 0.9rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }

      .article-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .article-item {
        margin: 0.25rem 0.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .article-item:hover {
        background: #f0e9de;
      }

      .article-item.active {
        background: var(--accent);
      }

      .article-item button {
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        padding: 0.75rem 1rem;
        cursor: pointer;
        color: inherit;
        font: inherit;
      }

      .article-item.active button {
        color: white;
      }

      .article-title {
        display: block;
        font-weight: 600;
        font-size: 0.95rem;
        margin: 0 0 0.25rem 0;
        line-height: 1.3;
      }

      .article-meta {
        display: block;
        font-size: 0.75rem;
        color: var(--muted);
        margin: 0 0 0.5rem 0;
      }

      .article-item.active .article-meta {
        color: rgba(255, 255, 255, 0.8);
      }

      .article-snippet {
        display: block;
        font-size: 0.8rem;
        color: var(--muted);
        margin: 0;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .article-item.active .article-snippet {
        color: rgba(255, 255, 255, 0.7);
      }

      .content-wrapper {
        flex: 1;
        overflow-y: auto;
      }

      .container {
        max-width: 860px;
        margin: 2.5rem auto;
        padding: 0 1.25rem;
      }

      .card {
        background: var(--paper);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: 0 10px 40px rgba(21, 18, 12, 0.08);
        overflow: hidden;
      }

      .meta {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        color: var(--muted);
        font-size: 0.92rem;
      }

      article {
        padding: 1.75rem 1.5rem 2rem;
      }

      article h1,
      article h2,
      article h3 {
        font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
        line-height: 1.2;
        margin-top: 1.8rem;
        margin-bottom: 0.8rem;
      }

      article h1 {
        font-size: clamp(2rem, 5vw, 3rem);
        margin-top: 0;
      }

      article h2 {
        font-size: clamp(1.35rem, 3vw, 1.8rem);
      }

      article p {
        margin: 1rem 0;
        font-size: 1.08rem;
      }

      article img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 12px;
        margin: 1.25rem 0;
        border: 1px solid var(--border);
      }

      article a {
        color: var(--accent);
      }

      article blockquote {
        margin: 1.2rem 0;
        padding: 0.5rem 1rem;
        border-left: 4px solid #c4b299;
        background: #faf5ed;
      }

      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--muted);
      }

      @media (max-width: 700px) {
        main {
          flex-direction: column;
        }

        aside {
          width: 100%;
          border-right: none;
          border-bottom: 1px solid var(--border);
          max-height: 200px;
          display: none;
        }

        aside.visible {
          display: block;
        }

        .container {
          margin: 1.25rem auto;
          padding: 0 0.75rem;
        }

        article {
          padding: 1.2rem 1rem 1.5rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <aside id="sidebar">
        <div class="sidebar-header">Articles</div>
        <ul class="article-list" id="articleList">
          <li style="padding: 1rem; color: var(--muted); font-size: 0.9rem;">Loading...</li>
        </ul>
      </aside>
      <div class="content-wrapper">
        <div class="container">
          <section class="card">
            <div class="meta">Source: ${escapeHtml(sourcePath)}</div>
            <article id="article" class="loading">
              Loading article...
            </article>
          </section>
        </div>
      </div>
    </main>

    <script>
      const currentSlug = '${escapeHtml(currentSlug)}';
      const articleElement = document.getElementById('article');
      const articleListElement = document.getElementById('articleList');

      async function loadArticles() {
        try {
          const response = await fetch('/api/articles');
          if (!response.ok) throw new Error('Failed to load articles');
          const articles = await response.json();

          articleListElement.innerHTML = articles
            .map(
              (article) =>
                \`<li class="article-item\${article.slug === currentSlug ? ' active' : ''}" data-slug="\${article.slug}">
              <button onclick="loadArticle(this.parentElement.dataset.slug); return false;">
                <span class="article-title">\${escapeHtml(article.title)}</span>
                <span class="article-meta">\${formatDate(new Date(article.mtime))}</span>
                <span class="article-snippet">\${escapeHtml(article.previewSnippet)}</span>
              </button>
            </li>\`
            )
            .join('');
        } catch (error) {
          console.error('Error loading articles:', error);
          articleListElement.innerHTML = '<li style="padding: 1rem; color: red;">Error loading articles</li>';
        }
      }

      async function loadArticle(slug) {
        articleElement.innerHTML = '<div class="loading">Loading article...</div>';

        try {
          const response = await fetch(\`/api/articles/\${slug}\`);
          if (!response.ok) throw new Error('Article not found');
          const { title, htmlBody } = await response.json();

          articleElement.innerHTML = htmlBody;
          articleElement.classList.remove('loading');

          // Update active state in sidebar by matching data-slug attribute
          document.querySelectorAll('.article-item').forEach((item) => {
            if (item.dataset.slug === slug) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });

          // Update document title
          document.title = \`\${title} | Ideon Preview\`;

          // Scroll to top
          window.scrollTo(0, 0);
        } catch (error) {
          console.error('Error loading article:', error);
          articleElement.innerHTML = '<div style="color: red; padding: 2rem;">Error loading article</div>';
          articleElement.classList.remove('loading');
        }
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      // Load articles and initial content
      loadArticles();
      if (currentSlug) {
        loadArticle(currentSlug);
      }
    </script>
  </body>
</html>`;
}

async function tryOpenBrowser(url: string): Promise<void> {
  try {
    if (process.platform === 'darwin') {
      await execFileAsync('open', [url]);
      return;
    }

    if (process.platform === 'win32') {
      await execFileAsync('cmd', ['/c', 'start', '', url]);
      return;
    }

    await execFileAsync('xdg-open', [url]);
  } catch {
    // Browser auto-open is best-effort and should not block preview server startup.
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
