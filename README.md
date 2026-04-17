# Ideon

Ideon is an AI content writer that turns one idea into publish-ready content across multiple formats, styles, and channels.

[🇺🇸 English](./README.md) | [🇨🇳 简体中文](./README.zh-Hans.md)

[![CI](https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/telepat-io/ideon/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/telepat-io/ideon/graph/badge.svg)](https://codecov.io/gh/telepat-io/ideon)
[![npm version](https://img.shields.io/npm/v/%40telepat%2Fideon)](https://www.npmjs.com/package/@telepat/ideon)
[![Docs](https://img.shields.io/badge/docs-live-1f6feb)](https://docs.telepat.io/ideon)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/telepat-io/ideon/blob/main/LICENSE)

## Why Teams Use Ideon

Ideon helps teams move from idea to publishable content faster, with less manual rewriting between channels.

With one run, Ideon can:

- Write multiple output types from the same core idea, including article, blog post, newsletter, Reddit post, LinkedIn post, X thread, and X post.
- Apply a consistent writing style across outputs (`professional`, `friendly`, `technical`, `academic`, `opinionated`, `storytelling`).
- Build research-informed briefs, enrich outputs with relevant links, and produce visuals for article-led runs.
- Support iteration through repeatable job files, configurable settings, and resumable runs.

This makes Ideon useful for content teams, developer advocates, product marketers, founders, and anyone shipping multi-channel writing on a schedule.

## Quick Start

Install and generate your first content set:

```bash
npm i -g @telepat/ideon
ideon settings
ideon write "How small editorial teams can productionize AI writing" --primary article=1 --secondary x-post=1
ideon preview
```

Expected outcome:

- A generation folder is written under `output/<timestamp>-<slug>/`.
- One or more publish-ready Markdown outputs are produced.
- Analytics and artifact metadata are saved for review and reproducibility.
- Local preview opens to inspect content, links, and generated assets.

## Requirements

- Node.js 20+
- npm 10+
- OpenRouter API key
- Replicate API token

## Core Capabilities

- Multi-format writing from one idea: article, blog, newsletter, Reddit, LinkedIn, X thread, X post, landing-page copy.
- Style control per run: choose one voice and apply it consistently across all outputs.
- Research and enrichment: generate planning briefs and add relevant links via link enrichment.
- Image generation: render cover and inline visuals for article-focused runs.
- Iteration workflows: rerun with different targets/styles, resume interrupted jobs, and use job files for repeatable execution.
- Local review: preview generated outputs and assets in a browser before publishing.

## How It Works

Ideon runs a staged writing pipeline: planning, drafting, image prompt expansion, image rendering, channel output generation, and optional link enrichment.

It combines configuration from settings, environment variables, job files, and CLI flags, then writes structured artifacts for traceability and reuse.

Core commands:

```bash
ideon settings
ideon config list --json
ideon write "An article idea" --primary article=1
ideon write --no-interactive --idea "An article idea" --primary article=1 --style technical --length medium
ideon write --job ./job.json
ideon write resume
ideon delete my-article-slug
ideon preview --no-open
ideon mcp serve
ideon agent status --json
```

Agent integration scope:

- Supported: CLI and MCP runtime workflows.
- Not supported: Cursor and VS Code runtime integrations.

## Security And Trust

- Secrets are stored in the OS keychain by default via `ideon settings`.
- In CI or containerized environments, use `IDEON_OPENROUTER_API_KEY` and `IDEON_REPLICATE_API_TOKEN`.
- Set `IDEON_DISABLE_KEYTAR=true` when keychain access is unavailable.
- Generated outputs can include model-produced content, so review content before publication.

To report a security issue, open a private report through the repository security flow or contact maintainers through repository issue channels with minimal sensitive detail.

## Documentation And Support

- Documentation site: https://docs.telepat.io/ideon
- Language support: English and Simplified Chinese (`README.md` / `README.zh-Hans.md`, plus docs locales)
- Getting started: `docs/getting-started/quickstart.md`
- CLI reference: `docs/reference/cli-reference.md`
- Configuration guide: `docs/guides/configuration.md`
- Troubleshooting guide: `docs/guides/troubleshooting.md`
- Repository: https://github.com/telepat-io/ideon
- npm package: https://www.npmjs.com/package/@telepat/ideon

## Contributing

Contributions are welcome. Start with `docs/contributing/development.md` for setup, workflow, and quality gates, then follow `docs/contributing/releasing-and-docs-deploy.md` for release and docs deployment details.

For user-facing documentation changes, update both English and Simplified Chinese content in the same change.

## License

MIT. See [LICENSE](./LICENSE).
