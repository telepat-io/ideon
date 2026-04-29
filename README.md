<p align="center"><img src="./ideon-logo.webp" width="128" alt="Ideon"></p>
<h1 align="center">Ideon</h1>
<p align="center"><em>One idea. Endless formats.</em></p>

<p align="center">
  <a href="https://docs.telepat.io/ideon">📖 Docs</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/ideon/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/ideon"><img src="https://codecov.io/gh/telepat-io/ideon/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/ideon"><img src="https://img.shields.io/npm/v/@telepat/ideon" alt="npm"></a>
  <a href="https://github.com/telepat-io/ideon/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Ideon is an AI content writer that turns one idea into publish-ready content across multiple formats, styles, and channels.

## What It Solves

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
```

## Using With AI Agents

Ideon is built for agentic workflows:

- **MCP server** — `ideon mcp serve` exposes 5 tools over stdio for content generation, resume, deletion, and config management. Compatible with Claude Code, ChatGPT, Gemini, and any generic MCP host.
- **Agent runtime registration** — `ideon agent install <runtime>` registers integration profiles for supported platforms. Check status with `ideon agent status --json`.
- **Non-interactive mode** — `ideon write --no-interactive ...` removes all prompts for CI and automation.
- **Machine-readable config** — `ideon config list --json` and `ideon config get <key> --json` for agent inspection.
- **Skill package** — Install `ideon-cli-skill/` into your agent host for a full lifecycle skill covering install, setup, operations, and debugging.
- **Agent docs** — [For Agents](https://docs.telepat.io/ideon/for-agents) covers MCP servers, skills, and maintenance.

## Security And Trust

- Secrets are stored in the OS keychain by default via `ideon settings`.
- In CI or containerized environments, use `IDEON_OPENROUTER_API_KEY` and `IDEON_REPLICATE_API_TOKEN`.
- Set `IDEON_DISABLE_KEYTAR=true` when keychain access is unavailable.
- Generated outputs can include model-produced content, so review content before publication.

To report a security issue, open a private report through the repository security flow or contact maintainers through repository issue channels with minimal sensitive detail.

## Documentation And Support

- [Documentation site](https://docs.telepat.io/ideon)
- [Quickstart](https://docs.telepat.io/ideon/getting-started/quickstart)
- [CLI reference](https://docs.telepat.io/ideon/reference/cli-reference)
- [Configuration guide](https://docs.telepat.io/ideon/guides/configuration)
- [Troubleshooting](https://docs.telepat.io/ideon/guides/troubleshooting)
- [For Agents](https://docs.telepat.io/ideon/for-agents)
- Language support: English and Simplified Chinese
- [Repository](https://github.com/telepat-io/ideon)
- [npm package](https://www.npmjs.com/package/@telepat/ideon)

## Contributing

Contributions are welcome. Start with [Development](https://docs.telepat.io/ideon/contributing/development) for setup, workflow, and quality gates, then follow [Releasing and Docs Deploy](https://docs.telepat.io/ideon/contributing/releasing-and-docs-deploy) for release and docs deployment details.

For user-facing documentation changes, update both English and Simplified Chinese content in the same change.

## License

MIT. See [LICENSE](./LICENSE).
