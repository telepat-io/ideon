<p align="center"><img src="./assets/avatar/ideon-logo.webp" width="128" alt="Ideon"></p>
<h1 align="center">Ideon</h1>
<p align="center"><em>Turn one idea into articles, threads, and social posts. Quality content without the token tax.</em></p>

<p align="center">
  <a href="https://docs.telepat.io/ideon">📖 Docs</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
  · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/ideon/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/ideon/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/ideon"><img src="https://codecov.io/gh/telepat-io/ideon/graph/badge.svg" alt="Codecov"></a>
  <a href="https://sonarcloud.io/summary/new_code?id=telepat-io_ideon"><img src="https://sonarcloud.io/api/project_badges/measure?project=telepat-io_ideon&metric=alert_status" alt="Quality Gate Status"></a>
  <a href="https://www.npmjs.com/package/@telepat/ideon"><img src="https://img.shields.io/npm/v/@telepat/ideon" alt="npm"></a>
  <a href="https://github.com/telepat-io/ideon/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Ideon is an AI content writer that turns a single idea into publish-ready content across multiple formats, styles, and channels. Describe your topic once, and Ideon produces an article plus X threads, LinkedIn posts, Reddit posts, newsletters, and blog posts — all sharing one voice and one strategy.

Built for marketers, founders, and lean teams who need to ship high-quality content at scale without manually rewriting one idea for every channel.

## Features

- **Write once, publish everywhere** — One idea turns into article, blog, newsletter, X, LinkedIn, and Reddit posts in a single run. Your article anchors the campaign. Everything else promotes it.
- **Style and intent control** — 13 styles × 13 intents. Every output shares one consistent voice across every channel.
- **Publications and series** — Organize content with editorial policies per publication, and group related articles under series with shared topics, defaults, and thematic prompt injection.
- **Author profiles** — First-class author entities with experience, voice, and credentials injected into every writing stage. Resolve per run (`--author`), series default, or publication default; supplement with `--experience` anecdotes. Draft-first editorial checklist in `meta.json` reminds editors to add bylines and AI disclosure before publish.
- **Research-backed links** — Ideon browses the web and inserts contextual external links like a human writer would. No manual research.
- **SEO-optimized output** — On-page SEO, E-E-A-T credibility signals, fact density, and AI search extraction rules baked into the writing pipeline. Optional FAQ sections for informational long-form intents (`--faq-section` / `--no-faq-section`). After section drafting, a default-on `seo-check` stage lints placement and runs a surgical editor agent when needed (`errors-only` by default; `--seo-check-mode strict` for zero warnings). Content built to rank in both traditional search and AI-generated summaries.
- **Any model via OpenRouter** — Plug in Claude, GPT-4, or any supported model. Switch without changing your workflow.
- **Writing guide-driven** — Prompt composition grounded in proven writing principles compiled from real advice. No generic AI filler.
- **Code-driven efficiency** — Deterministic pipeline code handles orchestration. You pay for tokens only when drafting prose.
- **Visual storytelling** — Auto-generated cover and inline images via Replicate for article-led runs.
- **Agent and CI ready** — MCP server, non-interactive mode, machine-readable config, and resumable runs.
- **Google Keyword Planner** — Query real keyword data from Google Ads: ideas, historical metrics, and forecasts. Set up with `ideon gads login`, query with `ideon gkp`.
- **Data-backed content planning** — `ideon plan explore` / `ideon plan expand` research your content ideas against real search data, cluster keywords into series, and plan articles — all reviewed through an interactive TUI before saving to your queue.

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

Ideon runs a staged writing pipeline: planning, section drafting, optional FAQ generation, SEO lint and optional editor pass, image prompt expansion, image rendering, channel output generation, and optional link enrichment.

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
ideon gads login
ideon gkp ideas --keywords seo,marketing
ideon plan explore "Your next big topic" --publication my-blog
ideon plan expand my-series --publication my-blog
```

## Using With AI Agents

Ideon is built for agentic workflows:

- **MCP server** — `ideon mcp serve` exposes tools over stdio for content generation, resume, deletion, config management, and Google Keyword Planner queries. Compatible with Claude Code, ChatGPT, Gemini, and any generic MCP host.
- **Agent runtime integration** — `ideon agent install <runtime>` configures skills and MCP registration for supported hosts (`pi`, `claude`, `cursor`, `codex`, `gemini`, `vscode`, `opencode`, `chatgpt`, `claude-desktop`, `generic-mcp`). Default installs the `ideon-cli` skill; use `--mcp-skill` for MCP + `ideon-mcp`. Check artifacts with `ideon agent status --json`.
- **Non-interactive mode** — `ideon write --no-interactive ...` removes all prompts for CI and automation.
- **Machine-readable config** — `ideon config list --json` and `ideon config get <key> --json` for agent inspection.
- **Skill packages** — Install `skill/ideon-cli/` for lifecycle writing workflows, and `skill/ideon-plan/` for approval-gated content planning and GKP-backed strategist workflows.
- **Agent docs** — [For Agents](https://docs.telepat.io/ideon/for-agents) covers MCP servers, skills, and maintenance.

## Security And Trust

- Secrets are stored in the OS keychain by default via `ideon settings`.
- In CI or containerized environments, use `TELEPAT_OPENROUTER_KEY` and `TELEPAT_REPLICATE_TOKEN`.
- Set `TELEPAT_DISABLE_KEYTAR=true` when keychain access is unavailable.
- Generated outputs can include model-produced content, so review content before publication.

To report a security issue, open a private report through the repository security flow or contact maintainers through repository issue channels with minimal sensitive detail.

## Documentation And Support

- [Documentation site](https://docs.telepat.io/ideon)
- [Quickstart](https://docs.telepat.io/ideon/getting-started/quickstart)
- [CLI reference](https://docs.telepat.io/ideon/reference/cli-reference)
- [Configuration guide](https://docs.telepat.io/ideon/guides/configuration)
- [Troubleshooting](https://docs.telepat.io/ideon/guides/troubleshooting)
- [For Agents](https://docs.telepat.io/ideon/for-agents)
- [Repository](https://github.com/telepat-io/ideon)
- [npm package](https://www.npmjs.com/package/@telepat/ideon)

## Contributing

Contributions are welcome. Start with [Development](https://docs.telepat.io/ideon/contributing/development) for setup, workflow, and quality gates, then follow [Releasing and Docs Deploy](https://docs.telepat.io/ideon/contributing/releasing-and-docs-deploy) for release and docs deployment details.

For user-facing documentation changes, update both English and Simplified Chinese content in the same change.

## License

MIT. See [LICENSE](./LICENSE).
