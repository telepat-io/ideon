# Pipeline Orchestration: 8-Stage Workflow

This document details the execution flow for all 8 stages of the Ideon content generation pipeline. Agents should follow this sequence in order; stages are not skippable and must complete before proceeding to the next.

## Pipeline Overview

```
┌─ Stage 1: Shared Plan ─────────────────────────────────────────┐
│  Generate cross-channel content guidance based on user idea     │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Stage 2: Planning ────────────────────────────────────────────┐
│  Create title, slug, description, content plan, structure      │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    ⭐ CHECKPOINT 1 ⭐
                  (Plan Approval — MANDATORY)
                              ↓
┌─ Stage 3: Sections ────────────────────────────────────────────┐
│  Write long-form content (intro, body sections, conclusion)    │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Stage 4: SEO Check ───────────────────────────────────────────┐
│  Deterministic lint + optional editor agent (tool loop)         │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Stage 5: Image Prompts ──────────────────────────────────────┐
│  Expand & refine image descriptions via agent prompt synthesis  │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Stage 6: Image Rendering ────────────────────────────────────┐
│  Render images via Replicate (requires API token)              │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    ⭐ CHECKPOINT 2 ⭐
           (Content Review + Link Enrichment Decision)
                              ↓
┌─ Stage 7: Output Generation ──────────────────────────────────┐
│  Generate channel-specific formatted files (markdown)          │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Stage 8: Link Enrichment ──────────────────────────────────────┐
│  Find and integrate contextual external links                  │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    ⭐ CHECKPOINT 3 ⭐
              (Output Confirmation — MANDATORY)
                              ↓
              Write all files to disk
```

---

## Stage 1: Shared Plan

**Purpose:** Generate cross-channel content guidance

**Inputs:** Idea, formats, style, intent, length

**Agent:** Using system prompt with guides, generate cross-channel guidance (key themes, tone rules, format nuances)

**Output:** Plaintext guidance + token/cost estimate

**Error:** If generation fails, retry, then fail with user message

---

## Stage 2: Planning

**Purpose:** Generate title, slug, description, content plan, keywords

**Inputs:** Idea, cross-channel guidance, format/style/intent guides, SEO guides, length, keywords (optional)

**Agent:** Using system prompt (guides + instructions), generate: title (<60 chars), slug, description (120-160 chars), outline with sections/word counts, keywords (3-8, non-generic, not duplicating heading text), `primaryKeyword` (chosen from keywords), and per-section `targetKeywords` (0-2 each when keywords exist). Assign `primaryKeyword` to title and intro brief; ensure every keyword appears in title, a section title, or a section's `targetKeywords`; place at least one secondary keyword in a major H2. When user-provided keywords are present, skip keyword generation and use the provided set with the same placement rules.

**Output:** JSON with plan + token/cost estimate

**Validation:** Title <60 chars, slug matches `^[a-z0-9-]+$`, description 120-160 chars, word count ±20% of target

**Error:** If validation fails, regenerate with clearer format. If word count off, log warning and proceed.

**Next:** Proceed to Checkpoint 1

---

## Stage 3: Sections

**Purpose:** Write full long-form markdown content following the plan from Stage 2

**Inputs:** Plan, format/style/intent guides, SEO guides (cached), target length

**Agent:** Using tiered guide bundles (intro / section / outro) with system prompt (guides + plan + quality standards + SEO rules), generate full markdown with sections as outlined. Intro: place `primaryKeyword` in the first 100 words. Sections: open with a 40-60 word BLUF paragraph; use each section's `targetKeywords` when present. Each section must include at least one statistic or citation per on-page essentials and fact density guides. Apply E-E-A-T signals (practitioner observations, authoritative citations, competing viewpoints). After writing, run AI prose detection avoidance pass: scan for prohibited vocabulary, hedging language, and formulaic transitions.

**Output:** Full markdown + actual word count + token/cost

**Validation:** Valid markdown, word count ±10% of target, sections follow plan, no placeholder text

**Error:** If word count mismatches, regenerate with expansion/trim prompt. If timeout, retry 2x then proceed with partial content (document in meta.json).

**Cache:** Save in session.json

---

## Stage 4: SEO Check

**Purpose:** Validate and fix on-page SEO placement after section writing

**Inputs:** Plan (`primaryKeyword`, section `targetKeywords`), intro/section/outro drafts, keyword-integration guide excerpt

**Process:** Run deterministic `lintArticleSeo` with `seoCheckMode` (`errors-only` default | `strict`). BLUF lint measures the `**Key takeaway:**` block when present, otherwise the first paragraph (≥40 words). Agent runs when errors exist (`errors-only`), any issue exists (`strict`), or `force` is set. Surgical editor uses five tools only: `edit_plan_metadata`, `edit_section_heading`, `edit_intro`, `edit_section_body`, `edit_outro`. Prompt includes full draft markdown, keyword-integration guide, opener stats per issue, and inline issue playbook. Max turns from `seoCheckMaxTurns` (default 10).

**Output:** Patched plan/text in session; `seoCheck` block in `meta.json` with `seoCheckMode`, `warningsRemaining`, mode-aware `passed`, and full `issues[]`

**Skip / re-run:** `--no-seo-check` on write; `ideon write resume --seo-check` to force re-run. Override mode/turns with `--seo-check-mode`, `--seo-check-max-turns`, or MCP params on `ideon_write` / `ideon_write_resume`.

**Failure mode:** Warn, record issues in `meta.json`, continue pipeline

---

## Stage 5: Image Prompts

**Purpose:** Expand image descriptions for Replicate generation

**Inputs:** Full text, image count, guides, idea

**Agent:** Identify image slots (cover + inline positions). Using system prompt (visual storytelling guides), expand each prompt (subject, style, mood, composition, 30+ chars, Replicate-friendly).

**Output:** Image slots with expanded prompts (JSON) + token/cost

**Error:** If quality poor, refine via additional generation. If too many slots, trim to text capacity.

**Cache:** Save prompts in session.json

---

## Stage 6: Image Rendering

**Purpose:** Render images via Replicate using expanded prompts

**Inputs:** Image prompts, Replicate token, image count

**Agent:** Validate token. For each prompt: call Replicate API (model: flux, size: 1024x1024), wait for completion (~30-120s/image), download, convert to WebP, track metadata.

**Output:** WebP files + image metadata (ID, prompt, duration, cost) + total cost estimate

**Timeout:** If >5min/image, offer user choice (skip, retry, cancel). Retry max 2x with exponential backoff.

**Error:** Token invalid: stop, ask user. Network timeout: retry 2x. Unsupported model: fallback to Flux.

**Cache:** Save metadata in session.json. Proceed to Checkpoint 2.

---

## Stage 7: Output Generation

**Purpose:** Generate channel-specific markdown files for each target format

**Inputs:** Full text, metadata, images, target formats, format guides

**Agent:** For each target format: load format guide, transform text (long-form: full; short-form: condensed), generate markdown with YAML frontmatter (title, slug, description, keywords, format, date, images), validate YAML/markdown/image paths.

**Output:** Markdown files (one per format, with frontmatter) + meta.json + cost/timing metadata

**Error:** If transformation fails, use generic version (log warning). If validation fails, fix automatically.

---

## Stage 8: Link Enrichment

**Purpose:** Research and integrate contextual external links

**Inputs:** Content files, idea, keywords, format guides, optional custom links

**Agent:** For each file: validate custom links (if provided), research relevant resources (5-10 per file), deduplicate URLs, merge custom links first + discovered links second, insert naturally (avoid spam, respect protected zones), generate links.json v2 with customLinks + links arrays.

**Output:** Updated markdown + links.json v2 per file

**Timeout:** If >30s, at Checkpoint 2 offer user choice (continue without, retry, cancel). If no results, skip file. Dead links: skip. Invalid custom URL: warn user, skip that entry, continue.

**Cache:** Save links.json for all files

**Next:** Agent proceeds to **Checkpoint 3** (see [checkpoints.md](checkpoints.md))

---

## Session Caching & Resumability

After each stage, agent saves: stage ID, outputs, inputs, timestamps, costs to session.json. This enables resuming interrupted runs.

## Agent Checklist

- [ ] Collect inputs + Validate APIs + Load guides
- [ ] Stage 1-2: Shared Plan & Planning
- [ ] **CHECKPOINT 1:** Approve plan
- [ ] Stage 3-5: Sections + Images
- [ ] **CHECKPOINT 2:** Review content
- [ ] Stage 6-7: Output + Links
- [ ] **CHECKPOINT 3:** Confirm save location
- [ ] Write files + Return summary
