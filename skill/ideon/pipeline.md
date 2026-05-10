# Pipeline Orchestration: 7-Stage Workflow

This document details the execution flow for all 7 stages of the Ideon content generation pipeline. Agents should follow this sequence in order; stages are not skippable and must complete before proceeding to the next.

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
┌─ Stage 4: Image Prompts ──────────────────────────────────────┐
│  Expand & refine image descriptions via agent prompt synthesis  │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Stage 5: Image Rendering ────────────────────────────────────┐
│  Render images via Replicate (requires API token)              │
└────────────────────────────────────────────────────────────────┘
                              ↓
                    ⭐ CHECKPOINT 2 ⭐
           (Content Review + Link Enrichment Decision)
                              ↓
┌─ Stage 6: Output Generation ──────────────────────────────────┐
│  Generate channel-specific formatted files (markdown)          │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Stage 7: Link Enrichment ────────────────────────────────────┐
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

**Inputs:** Idea, cross-channel guidance, format/style/intent guides, length

**Agent:** Using system prompt (guides + instructions), generate: title (<70 chars), slug, description (<160 chars), outline with sections/word counts, keywords (5-10).

**Output:** JSON with plan + token/cost estimate

**Validation:** Title <70 chars, slug matches `^[a-z0-9-]+$`, description <160 chars, word count ±20% of target

**Error:** If validation fails, regenerate with clearer format. If word count off, log warning and proceed.

**Next:** Proceed to Checkpoint 1

---

## Stage 3: Sections

**Purpose:** Write full long-form markdown content following the plan from Stage 2

**Inputs:** Plan, format/style/intent guides (cached), target length

**Agent:** Using system prompt (guides + plan + quality standards), generate full markdown with sections as outlined.

**Output:** Full markdown + actual word count + token/cost

**Validation:** Valid markdown, word count ±10% of target, sections follow plan, no placeholder text

**Error:** If word count mismatches, regenerate with expansion/trim prompt. If timeout, retry 2x then proceed with partial content (document in meta.json).

**Cache:** Save in session.json

---

## Stage 4: Image Prompts

**Purpose:** Expand image descriptions for Replicate generation

**Inputs:** Full text, image count, guides, idea

**Agent:** Identify image slots (cover + inline positions). Using system prompt (visual storytelling guides), expand each prompt (subject, style, mood, composition, 30+ chars, Replicate-friendly).

**Output:** Image slots with expanded prompts (JSON) + token/cost

**Error:** If quality poor, refine via additional generation. If too many slots, trim to text capacity.

**Cache:** Save prompts in session.json

---

## Stage 5: Image Rendering

**Purpose:** Render images via Replicate using expanded prompts

**Inputs:** Image prompts, Replicate token, image count

**Agent:** Validate token. For each prompt: call Replicate API (model: flux, size: 1024x1024), wait for completion (~30-120s/image), download, convert to WebP, track metadata.

**Output:** WebP files + image metadata (ID, prompt, duration, cost) + total cost estimate

**Timeout:** If >5min/image, offer user choice (skip, retry, cancel). Retry max 2x with exponential backoff.

**Error:** Token invalid: stop, ask user. Network timeout: retry 2x. Unsupported model: fallback to Flux.

**Cache:** Save metadata in session.json. Proceed to Checkpoint 2.

---

## Stage 6: Output Generation

**Purpose:** Generate channel-specific markdown files for each target format

**Inputs:** Full text, metadata, images, target formats, format guides

**Agent:** For each target format: load format guide, transform text (long-form: full; short-form: condensed), generate markdown with YAML frontmatter (title, slug, description, keywords, format, date, images), validate YAML/markdown/image paths.

**Output:** Markdown files (one per format, with frontmatter) + meta.json + cost/timing metadata

**Error:** If transformation fails, use generic version (log warning). If validation fails, fix automatically.

---

## Stage 7: Link Enrichment

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
