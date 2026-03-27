---
title: Writing Framework
---

# Writing Framework

Ideon prompt generation follows a shared writing framework across all content types.

## Core Principles

1. Structure with intent
2. Specificity over vagueness
3. Rhythm and readability
4. Storytelling with discipline
5. Channel-native delivery

## Do and Avoid

Do:

- Use concrete mechanisms and examples.
- Open with a clear hook.
- Build a clear throughline from opening to close.
- Adapt structure to channel expectations.

Avoid:

- Generic claims without evidence.
- Repetitive sentence cadence.
- Marketing filler and hype language.
- Copying article structure into social formats unchanged.

## Style Overlays

You can set one run-level style:

- `professional`: concise, confident, decision-ready.
- `friendly`: warm, approachable, conversational.
- `technical`: precise, implementation-oriented, explicit.
- `academic`: formal, analytical, carefully qualified.
- `opinionated`: clear stance with strong argumentation.
- `storytelling`: scene-first narrative with practical takeaways.

## Prompt Composition Model

Ideon composes writing instructions in layers:

1. Base writing framework (shared principles and do/avoid examples)
2. Style directive (one run-level style)
3. Content-type directive (article, x-post, newsletter, and so on)
4. Run context directive (the full set of requested output types)

This layering keeps voice and quality consistent while still adapting structure to each channel format.

## How This Applies in Multi-Output Runs

- The same framework and style overlay applies to every output in the run.
- Content-type directives then specialize formatting for each channel.
- When article output is included, social outputs can use that article as anchor context.

Practical implication:

- Use one style per run for coherence, then vary only targets and counts.
- If you need very different voices, split into separate runs.