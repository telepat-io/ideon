# Ideon

Ideon turns one idea into polished multi-channel Markdown content with optional generated imagery through a single CLI workflow.

[🇺🇸 English](./README.md) | [🇨🇳 简体中文](./README.zh-Hans.md)

[![CI](https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/telepat-io/ideon/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/telepat-io/ideon/graph/badge.svg)](https://codecov.io/gh/telepat-io/ideon)
[![npm version](https://img.shields.io/npm/v/%40telepat%2Fideon)](https://www.npmjs.com/package/@telepat/ideon)
[![Docs](https://img.shields.io/badge/docs-live-1f6feb)](https://docs.telepat.io/ideon)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/telepat-io/ideon/blob/main/LICENSE)

## What It Solves

Ideon helps small content and product teams ship consistent, high-quality written outputs without manually orchestrating planning, drafting, image prompting, and packaging.

Common use cases:

- Generate a long-form article plus social variants in one run.
- Produce repeatable outputs from JSON job files in CI or local workflows.
- Resume interrupted generation runs from local checkpoints.
- Preview generated markdown and assets locally before publishing.

## Quick Start

Install and run your first generation:

```bash
npm i -g @telepat/ideon
ideon settings
ideon write "How small editorial teams can productionize AI writing" --primary article=1 --secondary x-post=1
ideon preview
```

Expected outcome:

- A generation folder is written under `output/<timestamp>-<slug>/`.
- Markdown outputs and analytics artifacts are produced.
- Local preview opens to inspect content and linked assets.

## Requirements

- Node.js 20+
- npm 10+
- OpenRouter API key
- Replicate API token

## How It Works

Ideon runs a staged pipeline:

1. Resolve config and secrets from settings, environment, job file, and CLI flags.
2. Generate a shared brief and content plan for requested targets.
3. Produce section content and optional channel outputs.
4. Expand and render image prompts when applicable.
5. Assemble markdown outputs and analytics artifacts.
6. Optionally enrich links and expose results in local preview.

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
- Getting started: `docs/getting-started/quickstart.md`
- CLI reference: `docs/reference/cli-reference.md`
- Configuration guide: `docs/guides/configuration.md`
- Troubleshooting guide: `docs/guides/troubleshooting.md`
- Repository: https://github.com/telepat-io/ideon
- npm package: https://www.npmjs.com/package/@telepat/ideon

## Contributing

Contributions are welcome. Start with `docs/contributing/development.md` for setup, workflow, and quality gates, then follow `docs/contributing/releasing-and-docs-deploy.md` for release and docs deployment details.

## License

MIT. See [LICENSE](./LICENSE).
