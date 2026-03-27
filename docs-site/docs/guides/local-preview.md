---
title: Local Preview
---

# Local Preview

Ideon can serve generated content batches in a clean local web view so you can quickly review copy and images.

## Quick Start

Serve the most recent generated batch from your output directory:

```bash
npm run preview
```

This command:

- starts a local server on `http://localhost:4173`
- finds the latest generated markdown output in your configured markdown output directory
- serves images from your configured asset output directory
- opens your default browser automatically

Each generation appears as one sidebar item. In the content panel, preview now shows:

- top-level tabs for each generated content type in that generation (`article`, `x-post`, `linkedin-post`, etc.)
- sub-tabs for each variant index (for example `X Post 1`, `X Post 2`, `X Post 3`)
- channel-styled cards so social outputs look closer to their native platform context

Preview selection behavior:

- The preview route chooses an active generation from the newest markdown output when no explicit markdown path is provided.
- If you pass a markdown path, preview uses its generation as the initial selection when available.
- Generation asset links in markdown are rewritten to generation-scoped preview routes so relative image paths continue to work.

Theme behavior:

- Preview defaults to your OS-level color scheme (`prefers-color-scheme`) on first load.
- Use the theme button in the sidebar to switch between light and dark modes.
- Your manual choice is persisted in local storage and reused on later visits.

If the generation currently open in preview is deleted while the server is running, refreshing the page safely falls back to the newest remaining generation. If no markdown files remain, preview shows a friendly empty state instead of a crash.

## Preview a Specific Article

```bash
ideon preview ./output/my-article.md
```

Repository-local equivalent:

```bash
npm run preview -- ./output/my-article.md
```

Optional flags:

- `--port <port>` to use a different port
- `--no-open` to skip automatic browser launch

## Troubleshooting

If Ideon reports no generated content found:

1. Run a generation command first (`ideon write "your idea"`).
2. Confirm your output directories in `ideon settings`.
3. If your markdown lives elsewhere, pass an explicit path to `ideon preview`.

If preview fails to start on the default port:

1. Start on a different port: `ideon preview --port 8080 --no-open`
2. Check for local port conflicts on `4173`.

If a generation was deleted while preview is open:

- Refresh the page. Preview falls back to the newest remaining generation.
- If none remain, preview shows an empty state message.
