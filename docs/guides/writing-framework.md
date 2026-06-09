---
title: Writing Framework
description: Writing Framework documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Writing Framework

Ideon now uses guide-first prompt composition. Writing behavior is sourced from markdown guides under `writing-guide/` and assembled per stage.

## Core Principles

1. Structure with intent
2. Information density over filler
3. Specificity over vagueness
4. Rhythm and readability
5. Scannability and structural signposting
6. Active voice with concrete subjects
7. Storytelling with discipline
8. Channel-native delivery
9. Authenticity filter (plain, direct language)

## Do and Avoid

Do:

- Use concrete mechanisms and examples.
- Open with a clear hook.
- Build a clear throughline from opening to close.
- Use short, medium, and longer sentences to create natural cadence.
- Start paragraphs with meaningful declarative claims.
- Prefer measurable or operationally testable statements.
- Adapt structure to channel expectations.

Avoid:

- Generic claims without evidence.
- Repetitive sentence cadence.
- Marketing filler and hype language.
- Empty recap lines that add no new information.
- Over-polished AI-sounding transitions and dramatic cliches.
- Copying article structure into social formats unchanged.

## Style Selection

You can set one run-level style. Ideon uses this value to select the matching style guide file under `writing-guide/styles/`.

- `academic`
- `analytical`
- `authoritative`
- `conversational`
- `empathetic`
- `friendly`
- `journalistic`
- `minimalist`
- `persuasive`
- `playful`
- `professional`
- `storytelling`
- `technical`

## Prompt Composition Model

Ideon composes writing instructions by loading stage-specific guide bundles plus run metadata:

1. Stage bundle guides (planning, section writing, shared plan, channel adaptation)
2. Selected style guide (`writing-guide/styles/<style>.md`)
3. Selected intent guide (`writing-guide/content-intent/<intent>.md`)
4. Selected format guide(s) (`writing-guide/formats/<content-type>.md`)
5. Operational metadata in code (run context and target length)

This keeps writing behavior in versioned guide files while preserving deterministic runtime constraints.

## How This Applies in Multi-Output Runs

- The same selected style and intent guide applies to every output in the run.
- Format guides then specialize structure for each channel.
- When article output is included, social outputs can use that article as anchor context.

Practical implication:

- Use one style per run for coherence, then vary only targets and counts.
- If you need very different voices, split into separate runs.

## AI Search Extraction

Long-form runs load `writing-guide/seo/ai-search-extraction.md` during planning and section writing. This guide complements existing SEO rules with draft-time extractability:

- Question-shaped H2 headings for informational sections
- Self-contained paragraphs with explicit entity naming
- Comparison tables when a section evaluates three or more options
- Anti-gaming rules that prioritize accuracy over templated filler

### FAQ section

For informational intents on long-form primary targets, Ideon can append a `## FAQ` block after the conclusion via a separate `sections:faq` LLM call. Default-on intents:

- `tutorial`
- `how-to-guide`
- `cornerstone`
- `deep-dive-analysis`
- `case-study`
- `roundup-curation`

Control FAQ generation with:

- `faqSection: true` or `faqSection: false` in job settings or saved settings
- `--faq-section` to force FAQ generation
- `--no-faq-section` to skip FAQ generation

When unset, Ideon uses the intent-based default above.