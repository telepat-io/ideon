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

Ideon is a TypeScript CLI that turns a raw idea into a complete Markdown article with generated images.

## Features

- End-to-end pipeline: planning, section drafting, image prompt expansion, rendering, and markdown assembly
- Interactive terminal UI with clear per-stage status and summaries
- Non-interactive fallback logging for CI and piped runs
- Config precedence across saved settings, environment variables, and job files
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

3. Run a safe pipeline dry run (no provider calls):

```bash
npm run dev -- write --dry-run "How AI changes technical publishing"
```

## Core Commands

```bash
ideon settings
ideon write "An article idea"
ideon write --job ./job.json
ideon write --dry-run "An article idea"
```

## Credentials

Live runs require:

- `IDEON_OPENROUTER_API_KEY`
- `IDEON_REPLICATE_API_TOKEN`

You can set these as environment variables, or save them via `ideon settings` (recommended).

## Output

By default, Ideon writes:

- Markdown: `/output/<slug>.md` (resolved relative to current working directory)
- Assets: `/output/assets/`

## Development Scripts

```bash
npm run typecheck
npm test
npm run build
```

## Documentation

- User and technical docs site source: `docs-site/`
- Start docs locally: `npm run docs:start`
- Build docs: `npm run docs:build`

Planned GitHub Pages URL:

- `https://cozymantis.github.io/ideon/`