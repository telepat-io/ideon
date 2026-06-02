---
slug: /features
title: "One Idea. Endless Formats."
description: What Ideon can do for marketers, founders, and content teams.
keywords: [ideon, features, content generation, ai writing, multi-channel]
sidebar_label: Features
sidebar_position: 1
---

# One Idea. Endless Formats.

Ideon turns a single idea into a complete content campaign — publish-ready drafts across every channel, all sharing one voice, one style, and one strategy.

Built for marketers, founders, and lean teams who need to ship high-quality content at scale without hiring a full editorial department.

---

## Write Once, Publish Everywhere

Turn one idea into an article, blog post, newsletter, X thread, X post, LinkedIn post, and Reddit post — all in a single run. Your article is the anchor. Everything else promotes it.

```bash
ideon write "Our new AI feature" \
  --primary article=1 \
  --secondary x-thread=2 \
  --secondary linkedin-post=1 \
  --secondary reddit-post=1
```

No more manually rewriting the same announcement seven different ways. Ideon adapts structure, length, and tone for each channel while keeping the core message intact.

---

## Writing That Sounds Like You

Pick a style and an intent. Every output in the run shares the same voice — so your X thread sounds like it came from the same writer as your article.

| Style | Intent | Result |
|---|---|---|
| `technical` | `tutorial` | Educational deep-dives developers actually read |
| `professional` | `case-study` | Credibility-building founder content |
| `storytelling` | `announcement` | Product launches that hook from the first line |
| `persuasive` | `opinion-piece` | Thought leadership with edge |
| `friendly` | `how-to-guide` | Approachable, shareable tutorials |

**13 styles.** **13 intents.** One consistent voice across every channel.

---

## Publications and Series

Organize your content strategy with **publications** and **series**.

**Publications** let you define editorial policies, default styles, intents, and audience hints per publication. Set it once, and every write run under that publication inherits the right voice.

**Series** group related articles under a shared topic and editorial thread. A series can override publication defaults, and every article written under it gets contextual prompt injection — the LLM knows it's part of a larger narrative and maintains thematic coherence.

```bash
# Create a publication
ideon publication add "Tech Blog" --style technical --intent tutorial --tone authoritative

# Create a series under it
ideon series add "AI Deep Dives" --topic "Exploring cutting-edge AI technologies" --publication tech-blog

# Write with series context
ideon write "How RAG systems work" --series ai-deep-dives --primary article=1
```

- **Layered defaults** — saved settings → job → env → publication → series → CLI flags
- **Override anything** — series can override style, intent, length, content targets, model settings, and editorial policy
- **Standalone or linked** — series work with or without a publication
- **Thematic injection** — series name and topic are injected into every prompt for coherent multi-article arcs

---

## Content Queue

Plan your content pipeline ahead of time with the **content queue**. Add articles to a global queue with full parameter snapshots, then write them one at a time when you're ready.

```bash
# Queue articles for later
ideon queue add "How RAG systems work" --primary article=1 --publication tech-blog --style technical
ideon queue add "Our Q3 product launch" --primary article=1 --secondary x-thread=2 --intent announcement

# See what's queued
ideon queue list

# Write the next one
ideon write --from-queue

# Write the next one for a specific publication
ideon write --from-queue --publication tech-blog
```

- **Self-contained snapshots** — publication and series defaults are resolved at enqueue time
- **Atomic dequeue** — concurrent writes can't double-pick the same entry
- **Auto-revert** — failed or interrupted writes restore the entry to the queue
- **Override at write time** — CLI flags override queued settings

---

## Research-Backed Drafts

Ideon browses the web and inserts contextual external links like a human writer would — no manual research, no generic placeholder URLs. Just credible, relevant links that add depth and authority to your drafts.

---

## SEO-Optimized From the Start

Ideon's writing pipeline enforces on-page SEO best practices at every stage of content generation — not as an afterthought, but as a baked-in layer of the writing process.

**During planning**, titles are constrained to search-safe lengths and meta descriptions are shaped for click-through impact. **During writing**, three dedicated SEO guides shape every section:

- **On-page essentials** — heading hierarchy, BLUF paragraphs, key takeaway blocks, and paragraph structure optimized for both human readers and search crawlers
- **E-E-A-T signals** — Experience, Expertise, Authoritativeness, and Trustworthiness embedded through practitioner observations, competing viewpoints, and primary-source citations
- **Fact density** — statistics, data points, and authoritative citations per section, inspired by Princeton's Generative Engine Optimization research showing up to 40% visibility gains in AI-generated summaries

No keyword stuffing. No SEO hacks. Just disciplined writing that happens to perform in both traditional search results and generative AI summaries.

---

## Your Model, Your Choice

Plug in any LLM via OpenRouter. Switch models without changing your workflow. Use Claude for nuance, GPT-4 for speed, or any model OpenRouter supports — Ideon works the same way regardless.

---

## Built on Proven Writing Principles

Ideon's writing engine is grounded in a guide-first prompt composition system compiled from a large corpus of real writing advice and best practices. Every generation follows concrete rules for:

- Structure and clarity
- Specificity over vagueness
- Rhythm and scannability
- Active voice with concrete subjects
- Channel-native delivery

No generic AI filler. No over-polished transitions. Just disciplined, human-sounding prose.

---

## Smarter Than a Skill. Cheaper Than Raw Prompts.

Most AI content tools treat the LLM like a black box you feed everything into. Ideon doesn't. It drives the entire pipeline with deterministic code — planning, orchestration, formatting, file management, and state tracking — and only calls the model when actual language generation is needed.

You pay for tokens when they matter (drafting prose, planning structure, expanding ideas) and never for things code does better (parsing arguments, routing outputs, managing runs, rendering Markdown). Compared to agent skills or general-purpose LLM workflows that burn context windows on orchestration chatter, Ideon is leaner, faster, and dramatically cheaper at scale.

---

## Visual Storytelling, Automated

Article-led runs get auto-generated cover and inline images rendered via Replicate. Your content looks as good as it reads, straight out of the CLI.

---

## Built for Agents and Automation

Ideon is designed to slot into modern agentic and CI workflows:

- **MCP server** — Expose Ideon tools to Claude Code, ChatGPT, Gemini, or any MCP host
- **Agent runtime registration** — `ideon agent install` registers integration profiles for supported platforms
- **Non-interactive mode** — `ideon write --no-interactive` removes all prompts for CI and automation
- **Machine-readable config** — `ideon config list --json` for agent inspection and orchestration
- **Resumable runs** — Pick up exactly where you left off with `ideon write resume`

---

## Google Keyword Planner Integration

Query real keyword data from Google Ads directly from the CLI or through MCP tools:

- **Keyword ideas** — Generate related keywords from seed keywords, a URL, or a site
- **Historical metrics** — Get search volume, competition, and CPC data for any keyword
- **Forecast data** — Project impressions, clicks, and cost for keyword campaigns

```bash
ideon gkp ideas --keywords seo,marketing --country US
ideon gkp historical --keywords seo --json
ideon gkp forecast --keywords seo --match-type EXACT --country US
```

Set up credentials once with `ideon gads login`, then query keyword data from the CLI or expose it to any MCP-compatible agent.

---

## Ready to Ship More Content?

[Get Started →](./getting-started/installation.md)

Or jump straight to the [CLI Reference](./reference/cli-reference.md) and [Writing Guide](/writing-guide).
