---
title: Local Preview
---

# Local Preview

Ideon can serve generated articles in a clean local web view so you can quickly review copy and images.

## Quick Start

Serve the most recent article from your output directory:

```bash
npm run preview
```

This command:

- starts a local server on `http://localhost:4173`
- finds the latest generated markdown file in your configured markdown output directory
- serves images from your configured asset output directory
- opens your default browser automatically

If the article currently open in preview is deleted while the server is running, refreshing the page now safely falls back to the newest remaining article. If no markdown files remain, preview shows a friendly empty state instead of a crash.

## Preview a Specific Article

```bash
ideon preview ./output/my-article.md
```

Optional flags:

- `--port <port>` to use a different port
- `--no-open` to skip automatic browser launch

## Troubleshooting

If Ideon reports no generated articles found:

1. Run a generation command first (`ideon write "your idea"`).
2. Confirm your output directories in `ideon settings`.
3. If your markdown lives elsewhere, pass an explicit path to `ideon preview`.
