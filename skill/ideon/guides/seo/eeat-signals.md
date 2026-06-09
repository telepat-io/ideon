# E-E-A-T Signals: Experience, Expertise, Authoritativeness, Trustworthiness

Use this guide to embed signals that demonstrate real-world credibility in generated content. E-E-A-T is how Google's quality raters evaluate whether content deserves to rank, especially for topics that impact health, finances, or safety.

Google's helpful-content guidance frames this as **Who**, **How**, and **Why**: who created the content, how it was produced, and why it exists. Ideon drafts omit bylines and AI disclosures — a human editor adds Who and How at publish time.

## Rule: Weave Supplied Experience Only
Description: Use first-person practitioner voice only when the author profile or experience notes provide real anecdotes, credentials, or situational detail. Do not invent "I deployed..." stories. Without supplied experience, write in third-person expert voice or insert explicit `[AUTHOR: add first-hand example here]` placeholders for human review.
Negative example: Inventing a Kubernetes production failure story when no author context was provided.
Positive example: Weaving a supplied anecdote from the author profile into a section where it directly supports the argument.

## Rule: Go Beyond Surface-Level Summaries
Description: Demonstrate expertise by naming specific mechanisms, trade-offs, and edge cases — not just restating common knowledge. If every competitor already says the same thing, the content adds no information gain.
Negative example: "Cloud computing offers many benefits including scalability, cost savings, and flexibility."
Positive example: "Cloud scalability is not automatic. Auto-scaling groups react to CPU metrics with a 60-to-90-second lag, which means traffic spikes shorter than that window will hit your existing instances before new ones spin up. For sub-minute spikes, you need provisioned capacity or a queue-backed architecture."

## Rule: Cite Primary Sources Over Secondary Ones
Description: Link to original research papers, official documentation, government datasets, and first-party announcements. Avoid citing blog posts that cite other blog posts. The citation chain should end at verifiable ground truth.
Negative example: Linking to a Medium summary of a study instead of the study itself.
Positive example: Linking directly to the arXiv paper, the NIST publication, or the official RFC, with a one-sentence summary of the relevant finding.

## Rule: Acknowledge Competing Views and Trade-offs
Description: Authority is built by showing you understand the full landscape, not by pretending your position is the only valid one. Name when alternatives are reasonable and under what conditions.
Negative example: "Microservices are always the right architecture choice for any application."
Positive example: "Microservices work well when your team owns multiple independent domains and can deploy separately. For a three-person startup with a single product, a modular monolith will ship faster and cost less to operate. The breakpoint is typically around 6-8 engineers maintaining a single codebase."

## Rule: Never Fabricate Statistics, Quotes, or Credentials
Description: Every number, every named source, and every credential must be verifiable. If you cannot confirm a statistic, either omit it or frame it as an illustrative estimate with an explicit caveat. Hallucinated authority destroys trustworthiness instantly.
Negative example: "According to a 2024 Gartner report, 78% of enterprises have adopted AI." (fabricated)
Positive example: "While adoption numbers vary by sector, the pattern is clear: engineering teams that adopt AI-assisted code review report faster cycle times, with one Shopify engineering team documenting a 15% reduction in review latency after six months."

## Rule: Defer Authorship and AI Disclosure to Publish Time
Description: Do not add author bylines or AI/methodology notes to draft body copy. A human editor adds a named author byline and a brief disclosure (for example, "Drafted with AI assistance and reviewed by…") before publish. Publication dates are added at publish time, not in the pipeline draft.
Negative example: Adding "Written by AI" or a fabricated author name in the article body.
Positive example: Draft ends with substantive content only; editorial checklist reminds the reviewer to add byline and disclosure before publish.
