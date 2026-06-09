# Guide Loading System for Ideon

This document explains how to load modular writing guides for the Ideon skill. Ideon uses composable guides based on three dimensions: **format**, **style**, and **content intent**. An agent loads the appropriate guides based on user input, avoiding context bloat by only reading what's needed for the current run.

## Quick Overview

Ideon's writing guides are included with this skill in the `guides/` directory and are organized by:

- **formats/** — 10 content output types (article, blog-post, newsletter, x-post, x-thread, reddit-post, linkedin-post, press-release, science-paper)
- **styles/** — 13 writing voices (professional, technical, friendly, analytical, empathetic, academic, persuasive, journalistic, authoritative, conversational, playful, minimalist, storytelling)
- **content-intent/** — 14 content purposes (tutorial, case-study, opinion-piece, deep-dive-analysis, cornerstone, interview-q-and-a, and 8 more)
- **general/** — Universal web writing rules (one-time load, applies to all runs)
- **seo/** — Search optimization rules for traditional SERPs and generative engines (always loaded for long-form)
- **references/** — Shared concept docs (headline-writing, content-frameworks, readability, etc.; load on-demand)

## Guide Composition Strategy

When an agent begins a run with user inputs `(format, style, intent)`, it should:

1. **Load general guides upfront** (once per run)
   - These apply universally to all content
   - Locations: `general/core-web-writing-rules.md`, `general/idea-generation-systems.md`

2. **Load SEO guides upfront** (for long-form content)
   - These apply to all long-form outputs (article, blog-post, newsletter, press-release, science-paper)
   - Locations: `seo/on-page-essentials.md`, `seo/eeat-signals.md`, `seo/fact-density.md`

3. **Load format guide** (based on user's primary target)
   - Example: User wants blog-post → load `formats/blog-post.md`

4. **Load style guide** (based on user's writing style choice)
   - Example: User wants technical voice → load `styles/technical.md`

5. **Load intent guide** (based on user's content purpose)
   - Example: User wants deep-dive analysis → load `content-intent/deep-dive-analysis.md`

6. **Load references on-demand** (if agent needs clarification)
   - Example: During section writing, if agent needs headline guidance, load `references/headline-writing-systems.md`

This creates a **composable 5-part guide bundle** with minimal context for long-form runs:
- Universal rules + SEO rules + Format guidance + Style guidance + Intent guidance = Complete context for one run

Short-form runs (x-post, x-thread, linkedin-post, reddit-post) skip SEO guides.

## Guide Format & Structure

Each guide follows a consistent "Rule Block Format" designed for reliable agent comprehension:

```markdown
## Rule Block Title

**Description:** 
A 1-2 sentence explanation of what this rule is about.

**Negative Example:**
```
❌ Bad example showing what NOT to do
```

**Positive Example:**
```
✅ Good example showing the desired approach
```

**Implementation Notes:**
- Bullet points with specific, actionable guidance
- How to apply this rule in practice
```

This format allows agents to extract rules efficiently without extensive parsing.

## Stage-Specific Guide Usage

Different stages of the pipeline benefit from different guides:

### Stage 2: Planning
- **Load:** General + SEO + Format + Style + Intent guides
- **Purpose:** Help the agent generate SEO-optimized title, slug, description, and content structure
- **Key rules:** On-page essentials (title length, meta description, heading hierarchy), content frameworks, target length
- **When keywords present:** Load `seo/keyword-integration.md`; assign `primaryKeyword` and per-section `targetKeywords` (0-2 each); ensure every keyword appears in title, a section title, or section `targetKeywords`

### Stage 3: Sections (tiered bundles)
- **Intro calls:** `buildIntroGuideInstruction` — core web rules, skimmability, on-page + E-E-A-T, keyword-integration when keywords exist
- **Section calls:** `buildSectionGuideInstruction` — adds fact-density, prose quality, readability, emotional resonance, keyword-integration when keywords exist
- **Outro calls:** `buildOutroGuideInstruction` — lighter bundle (no keyword-integration)
- **Purpose:** Write intro, body sections, and conclusion with strong E-E-A-T signals and fact density
- **Keyword rules:** Primary keyword in intro first 100 words; section `targetKeywords` in BLUF openers (40-60 words, definition-first)
- **On-demand references:** Skimmability patterns, content frameworks, AI prose detection avoidance (for post-draft cleanup)

### Stage 4: SEO Check
- **Load:** Full draft markdown, keyword-integration guide, lint issue list, inline issue playbook (runtime)
- **Purpose:** Deterministic placement validation; surgical five-tool editor agent when triggered (`errors-only` default; `strict` optional)
- **Tools:** `edit_plan_metadata`, `edit_section_heading`, `edit_intro`, `edit_section_body`, `edit_outro` only
- **Skip / re-run:** `--no-seo-check` on write; `ideon write resume --seo-check`; override with `--seo-check-mode` / `--seo-check-max-turns`

### Stage 5: Image Prompts
- **Load:** Format + References (if needed)
- **Purpose:** Expand and refine image descriptions
- **Key rules:** Visual storytelling, image-text alignment

### Stage 8: Links
- **Load:** General + Intent
- **Purpose:** Find and describe contextual external links
- **Key rules:** Link relevance, anchor text quality, bias toward authoritative sources

## Loading Implementation for Agents

### Step 1: Build File List
Given user inputs `(format, style, intent)`, agents should reference `guide-map.json` to get:
- General guides (always included)
- Format file path
- Style file path
- Intent file path

**Example:**
```json
{
  "format": "blog-post",
  "style": "technical",
  "intent": "deep-dive-analysis"
}
```

→ Load from local guide paths:
- `guides/general/core-web-writing-rules.md`
- `guides/formats/blog-post.md`
- `guides/styles/technical.md`
- `guides/content-intent/deep-dive-analysis.md`

### Step 2: Compose Guide Bundle
Concatenate all loaded guides in order:
1. General guides header
2. Format guide
3. Style guide
4. Intent guide

Include a note at the top: "These guides are specific to your choices: blog-post (format), technical (style), deep-dive-analysis (intent)."

### Step 3: Include in Agent Prompt Context
Add the composed guide bundle to the agent's writing prompt context for all planning/writing stages.

### Step 4: On-Demand References
If agent needs clarification during stages, it can load reference docs:
- During stage 3 (sections), if struggling with section organization → load `references/content-frameworks.md`
- During stage 3, if struggling with readability → load `references/readability-and-pace.md`
- During stage 7 (links), if needing guidance on anchor text → load `references/link-integration-best-practices.md`

See list of available references below.

## Available Guides

### General Guides (Always Load)
- `general/core-web-writing-rules.md` — Universal web writing principles
- `general/idea-generation-systems.md` — How to expand ideas into full content structures

### Format Guides
- `formats/article.md` — Long-form investigative/informational articles
- `formats/blog-post.md` — Personal or professional blog posts
- `formats/newsletter.md` — Email newsletters with digestible sections
- `formats/x-post.md` — Twitter/X single posts (280 chars or less)
- `formats/x-thread.md` — Twitter/X threaded posts (multiple connected posts)
- `formats/reddit-post.md` — Reddit posts with community-specific tone
- `formats/linkedin-post.md` — Professional LinkedIn posts (1–3K chars)
- `formats/press-release.md` — Formal press releases (journalistic tone, structured)
- `formats/science-paper.md` — Academic-style research papers (abstract, citations, formal)

### Style Guides
- `styles/professional.md` — Corporate, formal, authoritative tone
- `styles/technical.md` — Precise, jargon-forward, developer-oriented
- `styles/friendly.md` — Warm, approachable, conversational
- `styles/analytical.md` — Data-driven, logical, evidence-based
- `styles/empathetic.md` — Emotionally aware, human-centered, compassionate
- `styles/academic.md` — Scholarly, citations, formal structure
- `styles/persuasive.md` — Argumentative, call-to-action focused
- `styles/journalistic.md` — Objective reporting, news-style, fact-based
- `styles/authoritative.md` — Expert, commanding, trustworthy
- `styles/conversational.md` — Casual, dialogue-like, personal voice
- `styles/playful.md` — Humorous, irreverent, entertaining
- `styles/minimalist.md` — Sparse, concise, every word counts
- `styles/storytelling.md` — Narrative-driven, character-focused, compelling

### Content Intent Guides
- `content-intent/tutorial.md` — Step-by-step instructional content
- `content-intent/case-study.md` — Real-world example with problem + solution
- `content-intent/opinion-piece.md` — Authored perspective on a topic
- `content-intent/deep-dive-analysis.md` — Comprehensive exploration of a complex topic
- `content-intent/cornerstone.md` — Foundational, comprehensive resource (SEO-focused)
- `content-intent/interview-q-and-a.md` — Interview format with Q&A structure
- `content-intent/how-to-guide.md` — Practical how-to instructions
- `content-intent/listicle.md` — List-based content (10 tips, 5 mistakes, etc.)
- `content-intent/announcement.md` — News or product announcement
- `content-intent/critique-review.md` — Critical review or analysis
- `content-intent/counterargument.md` — Opposing viewpoint with rebuttal
- `content-intent/personal-essay.md` — Personal reflection or memoir
- `content-intent/roundup-curation.md` — Curated collection of resources/links

### SEO Guides (Always Load for Long-Form)
- `seo/on-page-essentials.md` — Title tag, meta description, heading hierarchy, BLUF paragraphs, formatting for search visibility
- `seo/eeat-signals.md` — Embedding Experience, Expertise, Authoritativeness, and Trustworthiness signals
- `seo/fact-density.md` — Statistics, citations, quotations requirements per section for generative engine visibility
- `seo/keyword-integration.md` — Structured keyword targeting (`primaryKeyword`, per-section `targetKeywords`, placement rules; load when `keywords.length > 0`)

### Reference Guides (Load On-Demand)
- `references/headline-writing-systems.md` — How to write compelling headlines
- `references/content-frameworks.md` — Structural patterns for organizing content
- `references/readability-and-pace.md` — Pacing, sentence length, paragraph structure
- `references/skimmability-patterns.md` — How to format for scanning (lists, bold, subheaders)
- `references/emotional-resonance.md` — How to make content emotionally compelling
- `references/prose-quality-checks.md` — Grammar, clarity, style consistency
- `references/target-length-guidance.md` — How to hit word count targets
- `references/visual-storytelling.md` — How images enhance narrative
- `references/link-integration-best-practices.md` — How to integrate external links naturally
- `references/ai-prose-detection-avoidance.md` — How to reduce AI-detectable linguistic patterns (prohibited vocabulary, hedging, formulaic transitions)

## Caching & Reuse Within a Run

**Important:** Once guides are loaded at the start of a run (Checkpoint 1), agents should cache them for the entire pipeline. Do NOT re-load guides for each stage. This ensures:
- Consistency across planning, sections, images, and links stages
- Reduced token overhead (guides are large; load once, reference throughout)
- Faster execution

## Edge Cases

**Q: What if the user's chosen style + intent combination seems unusual (e.g., "playful" + "science-paper")?**
- A: Load both guides as requested. Include a note: "Warning: Playful style + Science paper format is unconventional; the resulting output may not meet academic conventions. Consider switching to academic style or a different format."

**Q: What if agent is regenerating content (user asked to "restart with different inputs")?**
- A: Load fresh guides based on new inputs. Do NOT reuse guides from the previous attempt.

**Q: Should agents load all references upfront?**
- A: No. Load only general + format + style + intent upfront. Load references only when agent explicitly needs clarification during a stage.

## Troubleshooting Guide Loading

**Problem:** Agent includes raw guide information in user-facing output
- **Solution:** Guides are system-level context only. Never expose raw guide rules to users; integrate them into agent instructions instead.

**Problem:** Agent re-loads guides multiple times during a run
- **Solution:** Load guides once after input collection, cache in agent state, reference for all stages.

**Problem:** Agent doesn't know which reference to load for a given scenario
- **Solution:** See the "Stage-Specific Guide Usage" section above for guidance on which references apply to each stage.

## Guide Maintenance

**Note:** The guides in this skill are self-contained and maintained separately from the rest of the Ideon codebase. All required guides are bundled in the `guides/` directory.

If you need to update the writing guides (e.g., to reflect new best practices or fix content), contact the skill maintainer. Guide updates are coordinated through the main Ideon project repository and synced into this skill.

### Guide Structure

All guides are stored locally:
```
guides/
  ├── README.md
  ├── general/           # Universal writing rules
  ├── formats/           # Content format guides
  ├── styles/            # Writing voice guides
  ├── content-intent/    # Content purpose guides
  └── references/        # Reference/lookup guides
```

The index file `guide-map.json` maps format/style/intent combinations to their corresponding guide files.

