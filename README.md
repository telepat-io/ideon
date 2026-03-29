```text
ooooo oooooooooo.   oooooooooooo   .oooooo.   ooooo      ooo
`888' `888'   `Y8b  `888'     `8  d8P'  `Y8b  `888b.     `8'
 888   888      888  888         888      888  8 `88b.    8
 888   888      888  888oooo8    888      888  8   `88b.  8
 888   888      888  888    "    888      888  8     `88b.8
 888   888     d88'  888       o `88b    d88'  8       `888
o888o o888bood8P'   o888ooooood8  `Y8bood8P'  o8o        `8
```

# Ideon

[![CI](https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/telepat-io/ideon/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-92.5%25-brightgreen)](https://github.com/telepat-io/ideon)
[![npm version](https://img.shields.io/npm/v/%40telepat%2Fideon)](https://www.npmjs.com/package/@telepat/ideon)
[![npm downloads](https://img.shields.io/npm/dm/%40telepat%2Fideon)](https://www.npmjs.com/package/@telepat/ideon)
[![Docs](https://img.shields.io/badge/docs-live-1f6feb)](https://telepat-io.github.io/ideon/)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/telepat-io/ideon/blob/main/LICENSE)

Ideon is a TypeScript CLI that turns an idea into one or more Markdown outputs, with optional generated images for article runs.

## Features

- End-to-end pipeline with stage visibility: planning, sections, image prompts, image rendering, and output assembly
- Interactive terminal UI with clear per-stage status and summaries
- Non-interactive fallback logging for CI and piped runs
- Resume support through local stage checkpoints in `.ideon/write/state.json`
- Config precedence across saved settings, job files, environment variables, and CLI flags
- Secure secret storage in OS keychain (OpenRouter + Replicate tokens)
- Runtime validation for generated plan and image prompt payloads
- Retry + timeout hardening on OpenRouter requests

## Installation

Prerequisites:

- Node.js 20+
- npm 10+

Install globally:

```bash
npm i -g @telepat/ideon
```

Verify installation:

```bash
ideon --help
```

## Getting Started

1. Configure credentials interactively:

```bash
ideon settings
```

2. Generate your first article:

```bash
ideon write "How small editorial teams can productionize AI writing"
```

3. Generate multi-output runs:

```bash
ideon write "How small editorial teams can productionize AI writing" --target article=1 --target x-post=2 --style professional
```

4. Run a safe pipeline dry run (no provider calls):

```bash
ideon write --dry-run "How AI changes technical publishing"
```

## Core Commands

```bash
ideon settings
ideon write "An article idea"
ideon write --job ./job.json
ideon write --dry-run "An article idea"
ideon write resume
ideon delete my-article-slug
ideon preview
```

### Preview Generated Articles

Serve the latest generated article locally with assets and open it in your browser:

```bash
ideon preview
```

This launches the new React preview app (served from `dist/preview`) and the preview API server.

You can also preview a specific article and choose a port:

```bash
ideon preview ./output/my-article.md --port 4173
```

If you are iterating on preview UI code in `src/preview-app`, rebuild client assets after UI changes:

```bash
npm run build:preview
```

## Credentials

Live runs require:

- `IDEON_OPENROUTER_API_KEY`
- `IDEON_REPLICATE_API_TOKEN`

You can set these as environment variables, or save them via `ideon settings` (recommended).

## Output

By default, Ideon writes:

- Generation directories: `/output/<timestamp>-<slug>/`
- Markdown outputs per target: `article-1.md`, `x-1.md`, `linkedin-1.md`, and others
- Run artifacts per generation: `job.json`, `generation.analytics.json`
- Local resume artifacts: `.ideon/write/state.json`

## Development Scripts

```bash
npm run lint
npm test
npm run build
npm run preview
npm run pricing:refresh
```

## Documentation

- User and technical docs site source: `docs-site/`
- Start docs locally: `npm run docs:start`
- Build docs: `npm run docs:build`

Links:

- GitHub repository: [telepat-io/ideon](https://github.com/telepat-io/ideon)
- npm package: [@telepat/ideon](https://www.npmjs.com/package/@telepat/ideon)
- Documentation site: [telepat-io.github.io/ideon](https://telepat-io.github.io/ideon/)

Key docs:

- CLI commands: `docs-site/docs/reference/cli-reference.md`
- Configuration and precedence: `docs-site/docs/guides/configuration.md`
- Pipeline and resume: `docs-site/docs/guides/pipeline-stages.md`
- Output artifacts: `docs-site/docs/guides/output-structure.md`
- Performance tuning: `docs-site/docs/guides/performance-and-costs.md`

GitHub Pages URL:

- [https://telepat-io.github.io/ideon/](https://telepat-io.github.io/ideon/)