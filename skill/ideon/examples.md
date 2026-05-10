# Workflow Examples: Quick Reference

---

## Example 1: Tech Deep-Dive + Multiple Formats

**Input:** React Suspense deep-dive → article + LinkedIn post, 4 images, technical style

**Timeline:** ~6 min | **Cost:** ~$0.04 writing + $0.72 images = $0.76 total

**Checkpoints:**
1. Plan review (title, outline) → Approve
2. Content + images review → Approve  
3. Output location confirmation → Save

**Output:** 2 markdown files + 4 WebP images + metadata

---

## Example 2: Newsletter (Quick & Budget)
- Images: $0.72
- Total: $0.76

Next: Enrich with external links (20–40 seconds)?
```
- **User:** "Yes, add links"
- **Agent:** ✅ Approved → Proceed to Stage 7

**Stage 6–7 (Output + Links):** ~30 seconds
- Agent generates markdown files for both formats:
  - `article-1.md` (1347 words, full formatting)
  - `linkedin-post-1.md` (280 words, condensed)
- Agent researches and integrates 8–10 external links

**Checkpoint 3:**
```
📁 READY TO SAVE OUTPUT
════════════════════════════════════════

Output Directory: /Users/user/ideon-output/20260509-153022-react-suspense/

Files to Create:
- session.json (1.2 MB)
- meta.json (8 KB)
- content/article-1.md (14 KB, 1347 words)
- content/linkedin-post-1.md (3 KB, 280 words)
- assets/images/ (4 WebP files, 600 KB total)
- artifacts/ (links JSON for both files)

Total: 9 files, ~1.6 MB

════════════════════════════════════════
```
- **User:** "Save to this location"
- **Agent:** ✅ Confirmed → Write files to disk

**Completion:**
```
✅ COMPLETE
════════════════════════════════════════
📍 Output Location: /Users/user/ideon-output/20260509-153022-react-suspense/

📊 Summary:
- Formats: article, linkedin-post
- Words: 1347 article + 280 linkedin
- Images: 4
- External Links: 8
- Total Time: 6 minutes 15 seconds
- Total Cost: $0.76

📄 Files:
✓ article-1.md (ready for blog)
✓ linkedin-post-1.md (ready to share)
✓ 4 professional images

🎯 Next Steps:
- Copy article-1.md to your blog (use Markdown importer)
- Upload images from assets/images/ to your blog's image library
- Share linkedin-post-1.md on LinkedIn

════════════════════════════════════════
```

**Deliverables:**
- ✅ 1347-word article (blog-ready)
- ✅ 280-word LinkedIn version
- ✅ 4 professional WebP images embedded
- ✅ 8 contextual external links
- ✅ All files in organized directory

---

## Example 2: Newsletter Edition with Budget Constraints

**Scenario:** Content marketer generates a weekly newsletter focused on AI trends. Budget-conscious, wants fast turnaround.

### User Input

```
Idea: "Top 5 AI trends in enterprise software this week"
Primary Format: newsletter
Secondary Formats: (none)
Writing Style: friendly
Content Intent: listicle
Target Length: small
Image Count: 2
Writing Mode: budget-focused (agent selected)
Image Model: flux-schnell (fast & cheap)
```

### Estimated Costs & Timeline

```
Writing generation:     $0.01
Images (2x Schnell):    $0.06
Total:                  $0.07
Est. Time:              ~3 minutes
```

### Pipeline Execution

**Stages 1–2:** ~15 seconds
- Agent generates title, slug, description, and outline

**Checkpoint 1:**
```
Title: "5 Must-Watch AI Trends in Enterprise This Week"
Slug: 5-ai-trends-enterprise-weekly
...
OK to proceed? [Y/N]
```
- **User:** "Y"

**Stage 3:** ~20 seconds (budget writing mode)
- Generates ~500-word listicle format with 5 short sections

**Stages 4–5:** ~30 seconds
- 2 images rendered via Flux Schnell (5–10s each)

**Checkpoint 2:**
```
Word Count: 485 (Target: 500) ✓
Images: 2/2 ✓
Cost so far: $0.07
Add links? [Y/N]
```
- **User:** "N" (skip links for faster turnaround)

**Stages 6–7:** ~10 seconds
- Generates newsletter markdown
- Skips link enrichment (user chose to skip)

**Checkpoint 3:**
```
Ready to save? Output dir: ~/ideon-output/[timestamp]/
[Y/N]
```
- **User:** "Y"

**Completion:** Total cost $0.07, time ~3 minutes

---

## Example 3: Social Media Thread from Research Paper

**Scenario:** Academic wants to create Twitter/X thread summarizing a research paper on quantum computing for non-experts.

### User Input

```
Idea: "Quantum computing breakthroughs in error correction explained for everyone"
Primary Format: x-thread
Secondary Formats: reddit-post
Writing Style: friendly
Content Intent: explainer
Target Length: small
Image Count: 3
```

### Pipeline Notes

**Challenge:** X-threads have special constraints
- Max ~280 chars per post
- Need compelling hooks for each post
- Short, punchy language

**Format guide:** Agent loads `formats/x-thread.md` which includes:
- Twitter thread structure (5–15 posts, connected narrative)
- Hooking strategies
- Conciseness guidelines

**Execution Flow:**
- Stages 1–2: Generate plan optimized for Twitter thread structure
  - Outline: Hook tweet → 3 technical explanation tweets → 2 implication tweets → CTA tweet
- Stage 3: Write 7 connected tweets (total ~1500 chars, each one thread-ready)
- Stages 4–5: Generate 3 visualizations (diagrams explaining quantum concepts)
- Stage 6: Output as `x-thread-1.md` (markdown with thread structure) + `reddit-post-1.md`
  - Reddit version: Expand thread into ~800-word post format
- Stage 7: Integrate links (quantum papers, MIT news, IBM announcements)

**Cost:** ~$0.45 (lower writing cost for shorter content, 3 images)

**Output:**
- 7-post X thread (ready to copy/paste to Twitter)
- Reddit post version (for r/quantumcomputing)
- 3 educational diagrams

---

## Example 4: Press Release for Product Launch

**Scenario:** Startup founder creates an official press release announcing Series A funding.

### User Input

```
Idea: "TechCorp announces $10M Series A funding led by Sequoia Capital"
Primary Format: press-release
Secondary Formats: (none)
Writing Style: professional
Content Intent: announcement
Target Length: small
Image Count: 0
```

### Pipeline Notes

**Format guide:** `formats/press-release.md` includes:
- Standard press release structure (headline, subheading, body, boilerplate, contact)
- Journalistic tone
- Who, what, when, where, why focus
- Quote integration best practices

**Execution:**
- Stages 1–2: Agent generates traditional PR headline, subheading, and outline
  - Example: "TechCorp Secures $10M Series A Funding to Expand AI-Powered Analytics Platform"
- Stage 3: Writes 400-word press release body with quotes from CEO/lead investor
- Stage 4–5: Skipped (user set image count to 0)
- Stage 6: Outputs as `press-release-1.md` with proper boilerplate
- Stage 7: Finds relevant business news sources for distribution

**Cost:** ~$0.03 (no images, short content)

**Output:**
- Press release (ready to send to journalists)
- Suggested distribution contacts via link research

---

## Example 5: Tutorial Blog Post with Full Optimization

**Scenario:** Developer creates comprehensive tutorial: "Build a Real-Time Chat App with Node.js and Socket.io"

### User Input

```
Idea: "Complete tutorial: Real-time chat app with Node.js, Express, Socket.io, React"
Primary Format: blog-post
Secondary Formats: (none)
Writing Style: technical
Content Intent: tutorial
Target Length: large
Image Count: 6
Writing Mode: quality-focused (agent selected)
Image Model: flux (default, high quality)
```

### Estimated Costs & Timeline

```
Writing generation:    $0.05
Images (6x Flux):      $1.08
Total:                 $1.13
Est. Time:             ~8 minutes
```

### Expected Output Structure

**Content plan:**
1. Intro: What you'll build (150 words)
2. Prerequisites & Setup (200 words)
3. Backend Architecture (300 words) [+image: system diagram]
4. Frontend Components (350 words) [+image: React component tree]
5. Socket.io Integration (400 words) [+image: event flow]
6. Real-Time Features (300 words) [+image: message flow]
7. Deployment (200 words) [+image: deployment architecture]
8. Conclusion (150 words) [+image: final app screenshot]

Total: ~2000 words (large tutorial)

**Images:**
1. System architecture diagram
2. React component hierarchy
3. Socket.io event flow
4. Message passing sequence
5. Deployment architecture
6. Final app interface mockup

**Links researched:**
- Official documentation (Node.js, Express, Socket.io, React)
- GitHub repos for reference implementations
- Deployment guides (Heroku, Render, Railway)
- Security best practices

**Output:**
- Complete blog post (2000 words, 6 embedded images)
- 10+ contextual external links integrated

---

## Common Success Patterns

✅ **Technical tutorials** → Use `technical` style + `tutorial` intent
✅ **Executive summaries** → Use `professional` style + `executive-summary` intent (create custom if needed)
✅ **Opinion pieces** → Use `storytelling` style + `opinion-piece` intent
✅ **Product launches** → Use `professional` style + `announcement` intent
✅ **Educational content** → Use `friendly` style + `how-to-guide` or `explainer` intent
✅ **Listicles** → Use any style + `listicle` intent
✅ **Case studies** → Use `analytical` style + `case-study` intent

---

## When to Use Different Lengths

| Length | Word Count | Best For |
|--------|-----------|----------|
| Small | ~500 | Newsletter, short blog post, X thread |
| Medium | ~900 | Standard blog post, LinkedIn article |
| Large | ~1400 | Tutorial, deep-dive, cornerstone content |

---

## When to Skip Images

❌ **Skip images if:**
- Social media posts (images typically added separately)
- Press releases (logos/headshots added separately)
- Quick news items (time is critical)
- Budget is very tight ($0.40+ for 3 images)

✅ **Include images if:**
- Blog post/article (doubles engagement)
- Tutorial (helps visual learners)
- Long-form content (breaks up text)
- Visual topics (design, architecture, diagrams)

---

## Typical Content Results by Format

### Article (long-form)
- **Typical:** 1200–1500 words
- **Sections:** 5–7 major sections
- **Images:** 3–5 embedded
- **Links:** 8–12 external
- **Time:** 5–7 minutes
- **Cost:** $0.50–1.00

### Blog Post
- **Typical:** 800–1200 words
- **Sections:** 4–6
- **Images:** 2–4
- **Links:** 5–8
- **Time:** 4–6 minutes
- **Cost:** $0.30–0.60

### Newsletter
- **Typical:** 400–700 words
- **Sections:** 3–5
- **Images:** 1–2
- **Links:** 2–4
- **Time:** 2–4 minutes
- **Cost:** $0.15–0.30

### X Thread
- **Typical:** 1400 chars (7 posts @ 200 chars)
- **Sections:** 7–12 connected posts
- **Images:** 0–3 (usually added separately)
- **Links:** 2–5
- **Time:** 3–5 minutes
- **Cost:** $0.10–0.40

### LinkedIn Post
- **Typical:** 250–500 words
- **Sections:** 2–4
- **Images:** 1
- **Links:** 1–3
- **Time:** 2–3 minutes
- **Cost:** $0.10–0.20

