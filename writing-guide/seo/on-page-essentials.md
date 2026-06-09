# On-Page SEO Essentials

Use this guide for title tags, meta descriptions, heading structure, and formatting rules that help people-first content perform in traditional search and generative answers. Structure should serve readers first — clear headings, scannable paragraphs, and definition-first section openers make content easier to use and cite. For additional extraction rules (question-shaped headings, self-contained paragraphs, tables, FAQ), see [ai-search-extraction.md](ai-search-extraction.md).

## Rule: Structure for People-First Readability
Description: Google's helpful-content guidance rewards pages that leave readers feeling they learned enough to achieve their goal. BLUF paragraphs, short blocks, and entity-rich headings are not SEO tricks — they reduce reader effort and match how quality raters evaluate clarity.
Negative example: Long introductory throat-clearing before the first useful sentence; headings that tease without describing content.
Positive example: Each H2 answered in the opening sentence; the reader can skim headings and BLUF openers and still grasp the full argument.

## Rule: Keep Titles Under 60 Characters
Description: Search engines truncate titles past ~600px display width. Lead with the primary entity.
Negative example: "A Comprehensive and In-Depth Guide to Understanding Modern Cloud Infrastructure Patterns and Architectures for Enterprise Applications"
Positive example: "Cloud Infrastructure Patterns: A Guide to Modern Enterprise Architectures"

## Rule: Write Meta Descriptions in the 120-160 Character Range
Description: The description should include the primary entity, an action verb, and a clear value proposition. Shorter gets truncated; longer gets cut mid-sentence.
Negative example: "This article talks about some things related to cloud computing that you might find interesting."
Positive example: "Learn the 5 cloud infrastructure patterns that reduce deployment failures by 60%. Includes real-world examples from AWS, GCP, and Azure."

## Rule: Open Each Section With a BLUF Paragraph
Description: Bottom Line Up Front. Place a 40-to-60-word definition-first paragraph immediately after each H2 that directly answers the heading's question. Formula: "[Concept] is because..."
Negative example: "Let's dive into the fascinating world of container orchestration. In this section, we will explore various aspects..."
Positive example: "Container orchestration is the automated management of containerized applications across clusters because manual deployment cannot scale past a handful of services. It handles scheduling, scaling, networking, and self-healing without operator intervention."

## Rule: Keep Paragraphs to 2-4 Sentences
Description: Long blocks of dense text increase the processing cost for crawlers and dilute the relevance of specific data points. Short paragraphs make content scannable for both humans and AI extractors.
Negative example: A 12-sentence paragraph spanning three distinct ideas with no visual breaks or transitions between concepts, making it impossible for a skimmer or a snippet extractor to locate the primary claim without reading the entire block end-to-end.
Positive example: Two crisp sentences that make one claim. Followed by a separate paragraph with the supporting evidence.

## Rule: Place Key Takeaway Blocks at Section Tops
Description: A styled summary block at the beginning of each major section acts as a ready-made highlight for generative engines to extract and display in conversational answers. Use bold lead-ins or labeled callouts.
Negative example: Hiding the section's main point three paragraphs deep with no visual signposting.
Positive example: "**Key takeaway:** Container orchestration reduces deployment failures by 60% and cuts infrastructure costs by 30% when you standardize on a single control plane. The trade-off is upfront configuration complexity."

## Rule: Write Descriptive, Entity-Rich Image Alt Text
Description: Alt text serves both accessibility and image search. Describe what the image shows using concrete nouns and context, not generic labels. Match the visible content around the image.
Negative example: "Image of a diagram"
Positive example: "Architecture diagram showing a Kubernetes cluster with three worker nodes, a control plane, and an external load balancer distributing traffic across pods."
