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
- `formats/`: medium-specific playbooks
- `content-intent/`: purpose-specific playbooks (what the piece is trying to achieve)
- `styles/`: voice and style playbooks
- `references/`: reusable concept docs used by multiple documents

## Start Here

1. Read `general/core-web-writing-rules.md`
2. Read `general/idea-generation-systems.md`
3. Pick your target medium in `formats/`
4. Pick your content purpose in `content-intent/`
5. Pick your primary voice in `styles/`
6. Use shared standards in `references/`

## Format vs Content-Intent vs Style

- Format: where the piece publishes and how it is packaged (for example newsletter, article, x-thread)
- Content-intent: what the piece is trying to achieve (for example tutorial, case-study, opinion-piece)
- Style: how the piece sounds (for example analytical, friendly, persuasive)

Example: `article` format + `deep-dive-analysis` content-intent + `analytical` style.

## Required Formats

- article
- blog-post
- newsletter
- x-post
- x-thread
- reddit-post
- linkedin-post
- press-release
- science-paper

## Required Styles

- professional
- friendly
- technical
- academic
- persuasive
- conversational
- authoritative
- analytical
- playful
- empathetic
- journalistic
- minimalist

## Content Intent (V1)

- tutorial
- how-to-guide
- opinion-piece
- interview-q-and-a
- case-study
- roundup-curation
- announcement
- personal-essay
- critique-review
- deep-dive-analysis
- listicle
- counterargument
- cornerstone

## Quality Baselines

- Default readability target: Flesch Reading Ease above 70 for web-first writing
- Dense technical and strict academic contexts may run 60-70 when precision requires it
- Science paper guidance prioritizes precision, while still encouraging readability improvements
- Prose rules should align with plain-language checks and consistency checks defined in `references/prose-quality-checks.md`

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
