---
title: Writing Framework
description: Writing Framework documentation for Ideon users and contributors.
keywords: [ideon, documentation, cli, guides, reference]
---

# Writing Framework

Ideon prompt generation follows a shared writing framework across all content types.

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

## Style Overlays

You can set one run-level style:

- `professional`: concise, confident, decision-ready.
- `friendly`: warm, approachable, conversational, and naturally paced.
- `technical`: precise, implementation-oriented, explicit, and term-stable.
- `academic`: formal, analytical, carefully qualified, and evidence-aware.
- `opinionated`: clear stance with explicit tradeoffs and concrete support.
- `storytelling`: scene-first narrative with practical takeaways tied to utility.

## Adaptive Persuasion Frameworks

For article planning, Ideon can adapt the narrative structure to fit the objective and audience:

- AIDA for awareness-to-action flows.
- PAS for pain-first decision contexts.
- BAB for transformation-focused storytelling.

The planner chooses whichever framework best supports the specific topic and intent rather than forcing one universal formula.

## Prompt Composition Model

Ideon composes writing instructions in layers:

1. Base writing framework (shared principles and do/avoid examples)
2. Style directive (one run-level style)
3. Content-type directive (article, x-thread, x-post, newsletter, and so on)
4. Run context directive (the full set of requested output types)

This layering keeps voice and quality consistent while still adapting structure to each channel format.

## How This Applies in Multi-Output Runs

- The same framework and style overlay applies to every output in the run.
- Content-type directives then specialize formatting for each channel.
- When article output is included, social outputs can use that article as anchor context.

Practical implication:

- Use one style per run for coherence, then vary only targets and counts.
- If you need very different voices, split into separate runs.