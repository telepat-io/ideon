---
name: ideon
description: Use this skill when users need to generate multi-format professional content (articles, blog posts, newsletters, social media posts, academic papers) from a single idea using the Ideon 7-stage deterministic pipeline.
---

# Ideon Skill: Agent-Driven Content Generation

This skill enables an agent to autonomously generate professional, multi-format content using Ideon's 7-stage deterministic pipeline. An agent using this skill will orchestrate planning, writing, image generation, link enrichment, and file output—with mandatory user approval gates at critical junctures.

## What This Skill Does

**Ideon** is a deterministic content generation system that converts a single idea into multiple professionally-formatted outputs (articles, blog posts, newsletters, social media posts, academic papers, etc.) via a 7-stage pipeline:

1. **Shared Plan** — Generate cross-channel content guidance
2. **Planning** — Create title, slug, description, and detailed content plan
3. **Sections** — Write long-form content (intro, body sections, conclusion)
4. **Image Prompts** — Expand and refine image descriptions
5. **Images** — Render images via Replicate AI
6. **Output** — Generate channel-specific formatted content (markdown + metadata)
7. **Links** — Enrich content with contextual external links via web search

The skill directs agents to execute this pipeline with **mandatory approval gates** where users can review and adjust outputs before proceeding.

## When to Use This Skill

**✅ Use for:** Multi-format content generation with images, links, and metadata. Ideal for articles, blog posts, newsletters, social media posts with professional guidance.

**❌ Skip for:** Quick snippets, single posts without images/links, real-time editing, no API access (requires agent-driven writing and optional Replicate image access).

## Required Inputs

An agent MUST collect these inputs from the user upfront before proceeding:

### Required
- **Idea** *(string, 10-500 chars)* — The content topic or concept
  - Example: "React suspense for data fetching", "AI risks in healthcare", "Building a SaaS side project"
- **Primary Target Format** *(one of: article, blog-post, newsletter, x-post, x-thread, reddit-post, linkedin-post, press-release, science-paper)* — The main output format

### Optional (with defaults)
- **Secondary Target Formats** *(list)* — Additional output formats to generate alongside primary
  - Default: None (only primary target)
- **Custom Links** *(list of expression -> URL pairs)* — Optional user-provided links to force into output during link enrichment
  - Default: None
  - Example: `"React Suspense API documentation" -> "https://react.dev/reference/react/Suspense"`
- **Writing Style** *(one of 13 options)*: professional, technical, friendly, analytical, empathetic, academic, persuasive, journalistic, authoritative, conversational, playful, minimalist, storytelling (default: professional)
- **Content Intent** *(one of 13 options)*: tutorial, case-study, opinion-piece, deep-dive-analysis, cornerstone, interview-q-and-a, how-to-guide, listicle, announcement, critique-review, counterargument, personal-essay, roundup-curation (default: tutorial)
- **Target Length** *(small | medium | large)* — Target word count
  - small: ~500 words
  - medium: ~900 words  
  - large: ~1400 words
  - Default: medium
- **Image Count** *(integer, 1–10)* — Maximum images to generate
  - Default: 3

### System Requirements (agent provides)
- **Replicate API Token** — For image generation (optional if image count = 0)

## Workflow Overview

An agent executing this skill follows this sequence:

```
1. Collect all required + optional inputs from user
2. Validate execution requirements (agent writing capability, optional Replicate token)
3. Load writing guides for chosen (format, style, intent)
4. Execute Stages 1–2 (Shared Plan + Planning)
5. ⭐ CHECKPOINT 1: Present plan to user (title, slug, description, content structure)
   └─ User must explicitly approve before proceeding
   └─ Options: Approve, Edit (adjust style/intent/length), Restart, Cancel
6. Execute Stage 3 (Sections) — Write long-form content
7. Execute Stage 4–5 (Image Prompts + Image Rendering) — Generate images via Replicate
8. ⭐ CHECKPOINT 2: Present full content + images to user
   └─ User reviews quality before proceeding to links
   └─ Options: Approve, Skip links (faster), Retry links, Cancel
   └─ Special: If link enrichment times out, offer user choice
9. Execute Stage 6 (Output) — Generate channel-specific formatted files
10. Execute Stage 7 (Links) — Enrich with contextual external links
11. ⭐ CHECKPOINT 3: Confirm output location + file list to user
    └─ User approves file placement before writing to disk
    └─ Options: Approve, Choose different directory, Cancel
12. Write all files to user-approved output location
13. Return meta.json summary + file paths to user
```

## Output Structure

The skill generates the following files in a user-configured output directory:

```
<output-dir>/<timestamp>-<slug>/
  ├─ session.json                    # Cached state (for future resumability)
  ├─ meta.json                       # Generation metadata (title, slug, keywords, timing, outputs)
  ├─ content/
  │  ├─ article-1.md                 # Primary format + frontmatter
  │  ├─ newsletter-1.md              # Secondary format (if chosen)
  │  ├─ x-thread-1.md                # Secondary format (if chosen)
  │  └─ [... one file per target format ...]
  ├─ assets/images/
  │  ├─ cover.webp                   # Cover image
  │  ├─ inline-1.webp, inline-2.webp # Inline images
  │  └─ [... one file per generated image ...]
  └─ artifacts/
    ├─ article-1.links.json         # Link enrichment v2 (customLinks + discovered links)
    ├─ newsletter-1.links.json      # Link enrichment v2 for secondary formats
     └─ [... one file per content file ...]
```

  See [output-spec.md](output-spec.md) for detailed structure of session.json, meta.json, links.json v2, and markdown frontmatter.

## API Requirements

### Replicate (Image Generation - Optional)
- Only needed if image count > 0
- Default model: `flux` (see [replicate.md](replicate.md) for details)
- Estimated cost: $0.10–0.25 USD per image
- Timeout: If image rendering >5 minutes per image, offer user choice (skip, retry, cancel)

For LLM-based stages (planning, sections, links), the agent using this skill handles all LLM calls directly.

## Approval Checkpoints

### Checkpoint 1: Plan Approval (MANDATORY)

**When:** After Stages 1–2 (Shared Plan + Planning) complete

**Agent presents:**
- Title (auto-generated)
- URL slug (auto-generated)
- Description (auto-generated)
- Content plan structure (sections, estimated word count, key topics)

**User options:**
- ✅ **"Approve and continue to sections"** — Proceed to Stage 3
- 🔄 **"Edit plan"** — Adjust style, intent, or length; regenerate plan
- 🔁 **"Restart with different inputs"** — Return to input collection step
- ❌ **"Cancel"** — Abort the entire run



### Checkpoint 2: Content Review (with Link Timeout Handling)

**When:** After Stages 3–5 complete (Sections + Images)

**Agent presents:**
- Full rendered markdown content (with image placeholders showing where images will appear)
- All generated images with captions
- Estimated word count vs. target
- Preview of how content will look in primary format

**User options:**
- ✅ **"Approve and continue to link enrichment"** — Proceed to Stage 7
- 🔗 **"Add or edit custom links"** — Provide/modify expression -> URL links before Stage 7 merge
- ⚠️ **"Skip links, save now"** — Skip Stage 7 and go to output (faster, no external links)
- 🔁 **"Start over with different inputs"** — Return to input collection
- ❌ **"Cancel"** — Abort

**Special: Link Enrichment Timeout Handling**
- If Stage 7 (link enrichment) exceeds 30 seconds, agent pauses with message:
  - "Link enrichment is taking longer than expected. Options: (1) Continue waiting, (2) Save content without links, (3) Cancel"
  - User chooses, agent proceeds accordingly

### Checkpoint 3: Output Confirmation (MANDATORY)

**When:** After all content is ready (post-Stage 7)

**Agent presents:**
- Output directory path (full path on user's machine)
- File list (all markdown files + images + metadata)
- Total estimated cost breakdown (LLM + images)
- Metadata filename (`meta.json`)

**User options:**
- ✅ **"Save to this location"** — Write all files to disk
- 📁 **"Choose different directory"** — Specify alternate path, then save
- ❌ **"Cancel"** — Abort before writing files



## Error Handling & Recovery

See [troubleshooting.md](troubleshooting.md) for detailed guidance on:
- API failures (quota exceeded, rate limits, invalid tokens)
- Image generation failures (Replicate timeouts, unsupported models)
- Content quality issues (sections too short, links not found)
- Network timeouts and retry strategies

## Reference Documentation

This skill references the following detailed guides. Agents should load these as needed:

| Document | Purpose |
|----------|---------|
| [guides.md](guides.md) | How to load modular writing guides (format + intent + style + seo) |
| [guide-map.json](guide-map.json) | Index mapping content types, styles, intents, seo to guide files |
| [pipeline.md](pipeline.md) | Detailed 7-stage workflow orchestration |
| [checkpoints.md](checkpoints.md) | Approval checkpoint logic and user interaction patterns |
| [output-spec.md](output-spec.md) | Output file formats (session.json, meta.json, markdown, links.json v2) |
| [replicate.md](replicate.md) | Image generation integration (models, costs, error handling) |
| [examples.md](examples.md) | End-to-end workflow examples for common scenarios |
| [troubleshooting.md](troubleshooting.md) | Edge cases, error recovery, and FAQ |

### 📌 Self-Contained Writing Guides

All writing guides (formats, styles, content intents, seo, references) are synced into this skill directory under `guides/`. This ensures agents have full access to all required guides without external dependencies.

**Location:** `ideon/skill/ideon/guides/` (populated via `npm run guides:sync`)

**To update guides:** Run `npm run guides:sync` in the ideon directory to sync the latest guides from the canonical source (`ideon/writing-guide/`).

See [guides.md](guides.md#guide-sync--maintenance) for detailed sync instructions.

## Quick Start Example

**Request:** *"Technical deep-dive blog post on Rust async/await + LinkedIn version + 4 images"*

**Workflow:** Collect inputs → Validate APIs → Load guides → Plan (✓ checkpoint) → Sections → Images (✓ checkpoint) → Output + Links (✓ checkpoint) → Save files → Done

