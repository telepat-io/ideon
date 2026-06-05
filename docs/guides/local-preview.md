---
title: Local Preview
description: Local Preview documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Local Preview

Ideon serves generated content through a React-based local web app so you can review copy, assets, plan metadata, and model interactions in one place.

## Quick Start

Serve the most recent generated batch from your output directory:

```bash
ideon preview
```

This command:

- starts a local server on `http://localhost:4173`
- serves the built React preview client (`dist/preview`)
- loads generation metadata from preview API endpoints
- serves generation-local assets from your configured asset output directory
- opens your default browser automatically

## What You See In The UI

The preview app uses the Telepat dark visual system (glow backgrounds, Poppins typography, violet accents).

### Header

- brand and refresh controls
- **Info** opens the metadata drawer (publication, series, and generation context)
- **Actions** menu: Copy Markdown, Download meta.json, Open Source Folder (copies the generation path)

### Left Sidebar

- search across titles, snippets, keywords, and slugs
- publication and series dropdown filters (resolved from your Ideon config)
- generation list grouped by date, with cover thumbnails when available
- publication and keyword badges on each list item

### Main Views

Three tabs are available for the active generation:

| View | Purpose |
|------|---------|
| **Content** | Channel-specific preview frames per output type (article, blog post, X post, LinkedIn, etc.) with format tabs, variant tabs, and a section outline for long-form types |
| **Plan & Assets** | Original idea, content-plan sections, image gallery, and style/intent metadata from `meta.json` |
| **Logs** | Stage-grouped LLM and image interaction inspector (`Prompt / Response` and `Full JSON`) |

Publication and series are optional. Generations without them still preview normally; related UI sections are omitted.

### Content format previews

Each supported Ideon output type maps to a channel-specific preview frame in the Content tab:

- Long-form types (`article`, `blog-post`, `science-paper`) show supplementary chrome from `meta.json` (cover, keywords, byline or abstract) plus the real markdown body, with a scroll-synced section outline.
- Social and distribution types (`x-post`, `x-thread`, `linkedin-post`, `reddit-post`, `newsletter`, `press-release`) wrap the real output in platform-style cards with decorative scaffolding (avatars, action bars, static engagement placeholders).
- Author chrome is derived from the resolved publication name when available; otherwise a neutral preview label is used.
- Decorative UI (comment threads, reaction counts, sponsor blocks) is static preview scaffolding, not data from the generation pipeline.
- Unknown output types fall back to generic markdown typography.

## Runtime Architecture

`ideon preview` runs two layers:

1. API + static server (`src/server/previewServer.ts`)
2. React client app (`src/preview-app/`, built by Vite into `dist/preview/`)

On startup, the server tries to find the built React client and serves `index.html` at `/`.

- If the React build exists, the SPA UI is served.
- If the build is missing, preview falls back to a server-rendered shell so preview still works.

## Preview API Endpoints

The React app reads data from:

- `GET /api/bootstrap`: initial source-path and active-generation selection
- `GET /api/articles`: generation list (includes `publication`, `series`, and `keywords` when present in `meta.json`)
- `GET /api/articles/:slug`: full output payload, typed `metaJson`, and `markdownBody` per output
- `GET /api/publications`: configured publications for sidebar filters and the metadata drawer
- `GET /api/series`: configured series for sidebar filters and the metadata drawer
- `GET /api/generations/:generationId/assets/*assetPath`: generation-scoped asset serving

## Selection And Fallback Behavior

- If `markdownPath` is omitted, preview picks the newest markdown output recursively.
- If `markdownPath` is provided, preview uses that generation as the initial selection when found.
- If the active generation disappears while preview is open, refresh safely falls back to the newest remaining generation.
- If no markdown remains, preview shows an empty-state message instead of crashing.
- Sidebar filters auto-reselect the first matching generation when the current selection is filtered out.

## Preview a Specific Article

```bash
ideon preview ./output/my-article.md
```

If you are in this repository and want preview-client rebuild + launch in one command, you can also run:

```bash
npm run preview -- ./output/my-article.md
```

Optional flags:

- `--port <port>` to use a different port
- `--no-open` to skip automatic browser launch

## Contributor Notes

If you are developing preview UI locally:

1. Build the React client once:

```bash
npm run build:preview
```

2. Start preview without opening a browser:

```bash
ideon preview --no-open
```

3. Rebuild the client when preview-app code changes:

```bash
npm run build:preview
```

`npm run preview` is an optional repository convenience script that does both a preview build and server launch.

## Troubleshooting

If Ideon reports no generated content found:

1. Run a generation command first (`ideon write "your idea"`).
2. Confirm your output directories in `ideon settings`.
3. If markdown lives elsewhere, pass an explicit path to `ideon preview`.

If preview fails to start on the default port:

1. Start on a different port: `ideon preview --port 8080 --no-open`
2. Check local port conflicts on `4173`.

If UI changes are not visible:

1. Re-run `npm run build:preview`.
2. Refresh browser with hard reload.
3. Confirm `dist/preview/index.html` has a recent timestamp.

If images do not load:

1. Ensure preview is pointed at the same workspace output root used for generation.
2. Verify markdown uses generation-relative asset paths.
3. Open browser devtools and confirm `/api/generations/:id/assets/...` returns `200`.

If publication or series filters are empty:

1. Create publications with `ideon publication add`.
2. Create series with `ideon series add`.
3. Re-run generation so `meta.json` records the chosen publication/series slugs.
