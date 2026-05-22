# E-E-A-T Signals: Experience, Expertise, Authoritativeness, Trustworthiness

Use this guide to embed signals that demonstrate real-world credibility in generated content. E-E-A-T is how Google's quality raters evaluate whether content deserves to rank, especially for topics that impact health, finances, or safety.

## Rule: Inject First-Person Practitioner Observations
Description: Simulate the perspective of someone who has done the work. Use concrete, situational details that an LLM would not produce by default — specific failure modes, unexpected edge cases, or counterintuitive lessons.
Negative example: "It is important to test your code before deploying to production."
Positive example: "The first time I deployed a Kubernetes cluster to production, the readiness probe passed but the liveness probe failed silently because the health check endpoint returned 200 OK for a database connection that had already timed out. We shipped a broken service for six hours before a customer reported it."

## Rule: Go Beyond Surface-Level Summaries
Description: Demonstrate expertise by naming specific mechanisms, trade-offs, and edge cases — not just restating common knowledge. If every competitor already says the same thing, the content adds no Information Gain.
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

## Rule: Date Content and Note AI Involvement Where Appropriate
Description: Prominent dates signal freshness to both users and search crawlers. If automation was used substantially in content creation, disclosing it builds trust — Google's guidelines encourage transparency rather than penalizing it.
Negative example: Publishing an article with no date, no author information, and no indication of how the content was produced.
Positive example: A visible publication date, an author byline (even if the author is an AI-assisted editorial system), and a brief methodology note: "This article was drafted with AI assistance and reviewed for accuracy by our editorial team."
