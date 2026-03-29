---
title: Local Preview
---

# Local Preview

Ideon serves generated content through a React-based local web app so you can review copy, assets, and model interactions in one place.

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

### Left Rail

- one item per generation directory
- title, timestamp, and snippet preview
- quick reload button

### Main Content Area

- compact summary row (source path, generation count, output count, interaction count)
- active generation title and slug
- top-level channel tabs (`article`, `x-post`, `linkedin-post`, etc.)
- variant tabs within each channel (`Article 1`, `X Post 2`, and so on)
- rendered markdown body for the selected output

### Logs View

- stage-grouped interaction list (`shared-brief`, `planning`, `sections`, `image-prompts`, `images`, `output`, `links`)
- per-call inspector with metadata (model, status, duration)
- mode toggle for `Prompt / Response` and `Full JSON`

## Runtime Architecture

`ideon preview` now runs two layers:

1. API + static server (`src/server/previewServer.ts`)
2. React client app (`src/preview-app/`, built by Vite into `dist/preview/`)

On startup, the server tries to find the built React client and serves `index.html` at `/`.

- If the React build exists, the SPA UI is served.
- If the build is missing, preview falls back to a server-rendered shell so preview still works.

## Preview API Endpoints

The React app reads data from:

- `GET /api/bootstrap`: initial source-path and active-generation selection
- `GET /api/articles`: generation list for the left rail
- `GET /api/articles/:slug`: full output + interaction payload for one generation
- `GET /api/generations/:generationId/assets/*assetPath`: generation-scoped asset serving

## Selection And Fallback Behavior

- If `markdownPath` is omitted, preview picks the newest markdown output recursively.
- If `markdownPath` is provided, preview uses that generation as the initial selection when found.
- If the active generation disappears while preview is open, refresh safely falls back to the newest remaining generation.
- If no markdown remains, preview shows an empty-state message instead of crashing.

## Theme Behavior

- First load follows OS color scheme (`prefers-color-scheme`).
- Light/Dark toggle is persisted in local storage.
- The app uses Ant Design theme tokens and custom CSS for channel-specific output cards.

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
