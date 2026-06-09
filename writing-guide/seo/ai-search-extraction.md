# AI Search Extraction

Use this guide when drafting long-form content that may appear in generative search and answer experiences. The goal is to make accurate, useful prose easy for AI systems to extract and cite — not to game retrieval with templated filler.

These practices overlap heavily with modern SEO and people-first readability. BLUF openers, fact density, and E-E-A-T signals in sibling guides already cover much of the foundation. This guide adds extraction-specific structure: entity clarity, question-shaped headings, comparison tables, and FAQ blocks.

## Rule: Prefer Question-Shaped H2s for Informational Sections
Description: When a section answers a reader question, phrase the H2 as that question. Generative engines often match conversational queries to question headings followed by direct answers. Use declarative headings when they are clearer — listicle item titles, case-study chapter names, or narrative transitions.
Negative example: "Container orchestration overview" as the heading for a section that defines what orchestration is and why teams use it.
Positive example: "What is container orchestration?" followed by a 40-to-60-word definition-first opener.

## Rule: Write Self-Contained Paragraphs
Description: Assume any paragraph may be quoted in isolation. Name the subject explicitly; avoid pronouns whose referent is more than one sentence back. After a subhead, repeat the primary entity on first mention so the paragraph stands alone without prior context.
Negative example: "This approach works well because it reduces overhead. Teams should adopt it early."
Positive example: "Implementing structured data markup helps AI models understand content relationships and extract information more accurately. Teams that add JSON-LD to product pages typically see clearer entity recognition in search summaries."

## Rule: Use Comparison Tables for Multi-Option Sections
Description: When a section compares three or more options, metrics, timelines, or feature sets, prefer a GitHub-flavored Markdown table over a dense prose paragraph. Tables give extractors explicit row-and-column relationships and reduce interpretation work.
Negative example: A single paragraph listing five tools with scattered pros, cons, and pricing details woven through subordinate clauses.
Positive example: A short intro sentence followed by a table with columns for tool name, best fit, key trade-off, and starting price.

## Rule: Structure FAQ for Extraction
Description: When the piece includes an FAQ block, use four to six questions drawn from section themes. Format each item as a `###` question heading followed by a one-to-two-sentence direct answer. Answers must trace to content already established in the article — do not introduce new claims.
Negative example: "Q: What is SEO? A: SEO is important for websites." (vague, unsupported, keyword-stuffed)
Positive example: "### How long does a typical Kubernetes rollout take?" followed by "Most teams complete a first production rollout in two to four weeks when they already run containerized workloads, based on the timeline patterns described in the deployment section above."

## Rule: Avoid Extraction Gaming
Description: Structure serves accuracy first. Do not invent statistics to hit density targets, force FAQ items that duplicate section headings without adding value, or template listicles solely for pattern matching. Skip the FAQ block when sections already answer the likely reader questions. If a claim cannot be sourced, omit the number or mark it as an illustrative estimate with an explicit caveat.
Negative example: Adding six FAQ items that restate H2 titles with generic filler answers and fabricated percentages.
Positive example: Three FAQ items that answer follow-up questions the body sections raised but did not close, each grounded in earlier evidence.
