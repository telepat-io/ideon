# Modern Web Writing Guide

This repository is a practical playbook for modern web writing.

It is intentionally focused on writing craft, not fiction craft and not standalone audience-growth strategy.

## Scope

This guide covers:
- Ideation and outlining
- Clear, high-velocity drafting
- Editing for clarity and usefulness
- Format-specific rules for common web mediums
- Style-specific rules that can be mixed responsibly
- Reusable references for cross-cutting concepts

This guide does not cover:
- Novel or long-form fiction techniques
- Platform growth tactics that are not directly tied to writing quality
- Tool-specific lint setup instructions

## Rule Block Format

Every guidance rule should use this structure:
1. Advice title (rule)
2. Description and explanation
3. Negative example
4. Positive example

## Directory Map

- `general/`: universal writing advice across formats
- [`formats/`](formats/README.md): medium-specific playbooks
- [`content-intent/`](content-intent/README.md): purpose-specific playbooks (what the piece is trying to achieve)
- [`styles/`](styles/README.md): voice and style playbooks
- [`references/`](references/README.md): reusable concept docs used by multiple documents

## Start Here

1. Read [general/core-web-writing-rules.md](general/core-web-writing-rules.md)
2. Read [general/idea-generation-systems.md](general/idea-generation-systems.md)
3. Pick your target medium in [`formats/`](formats/README.md)
4. Pick your content purpose in [`content-intent/`](content-intent/README.md)
5. Pick your primary voice in [`styles/`](styles/README.md)
6. Use shared standards in [`references/`](references/README.md)

## Format vs Content-Intent vs Style

- Format: where the piece publishes and how it is packaged (for example newsletter, article, x-thread)
- Content-intent: what the piece is trying to achieve (for example tutorial, case-study, opinion-piece)
- Style: how the piece sounds (for example analytical, friendly, persuasive)

Example: [`article`](formats/article.md) format + [`deep-dive-analysis`](content-intent/deep-dive-analysis.md) content-intent + [`analytical`](styles/analytical.md) style.

## Required Formats

- [article](formats/article.md)
- [blog-post](formats/blog-post.md)
- [newsletter](formats/newsletter.md)
- [x-post](formats/x-post.md)
- [x-thread](formats/x-thread.md)
- [reddit-post](formats/reddit-post.md)
- [linkedin-post](formats/linkedin-post.md)
- [press-release](formats/press-release.md)
- [science-paper](formats/science-paper.md)

## Required Styles

- [professional](styles/professional.md)
- [friendly](styles/friendly.md)
- [technical](styles/technical.md)
- [academic](styles/academic.md)
- [storytelling](styles/storytelling.md)
- [persuasive](styles/persuasive.md)
- [conversational](styles/conversational.md)
- [authoritative](styles/authoritative.md)
- [analytical](styles/analytical.md)
- [playful](styles/playful.md)
- [empathetic](styles/empathetic.md)
- [journalistic](styles/journalistic.md)
- [minimalist](styles/minimalist.md)

## Content Intent (V1)

- [tutorial](content-intent/tutorial.md)
- [how-to-guide](content-intent/how-to-guide.md)
- [opinion-piece](content-intent/opinion-piece.md)
- [interview-q-and-a](content-intent/interview-q-and-a.md)
- [case-study](content-intent/case-study.md)
- [roundup-curation](content-intent/roundup-curation.md)
- [announcement](content-intent/announcement.md)
- [personal-essay](content-intent/personal-essay.md)
- [critique-review](content-intent/critique-review.md)
- [deep-dive-analysis](content-intent/deep-dive-analysis.md)
- [listicle](content-intent/listicle.md)
- [counterargument](content-intent/counterargument.md)
- [cornerstone](content-intent/cornerstone.md)

## Quality Baselines

- Default readability target: Flesch Reading Ease above 70 for web-first writing
- Dense technical and strict academic contexts may run 60-70 when precision requires it
- Science paper guidance prioritizes precision, while still encouraging readability improvements
- Prose rules should align with plain-language checks and consistency checks defined in [references/prose-quality-checks.md](references/prose-quality-checks.md)

## Authoring Policy

- Keep guidance practical, testable, and example-driven
- Prefer clear over clever
- Keep examples realistic for web publishing contexts
- Avoid direct tool-brand language in guide text

## Prompt-Safe Policy

This guide is used in prompt contexts for content generation.
Write guidance so each excerpt is directly usable by an LLM drafting content.

Include:
- generation-time rules (structure, clarity, specificity, evidence, tone, sequencing)
- concrete negative and positive examples
- constraints that can be applied inside a single draft

Avoid:
- workflow or operations advice (publishing cadence, post-publish analytics, feedback loops)
- instructions to create multiple variants before choosing
- platform growth tactics not directly tied to writing quality
