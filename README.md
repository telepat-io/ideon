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

Install dependencies:

```bash
npm install
```

Run the CLI in development mode:

```bash
npm run dev -- --help
```

## Getting Started

1. Configure credentials interactively:

```bash
npm run dev -- settings
```

2. Generate your first article:

```bash
npm run dev -- write "How small editorial teams can productionize AI writing"
```

3. Generate multi-output runs:

```bash
npm run dev -- write "How small editorial teams can productionize AI writing" --target article=1 --target x-post=2 --style professional
```

4. Run a safe pipeline dry run (no provider calls):

```bash
npm run dev -- write --dry-run "How AI changes technical publishing"
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
npm run preview
```

You can also preview a specific article and choose a port:

```bash
npm run dev -- preview ./output/my-article.md --port 4173
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

Key docs:

- CLI commands: `docs-site/docs/reference/cli-reference.md`
- Configuration and precedence: `docs-site/docs/guides/configuration.md`
- Pipeline and resume: `docs-site/docs/guides/pipeline-stages.md`
- Output artifacts: `docs-site/docs/guides/output-structure.md`
- Performance tuning: `docs-site/docs/guides/performance-and-costs.md`

Planned GitHub Pages URL:

- `https://cozymantis.github.io/ideon/`