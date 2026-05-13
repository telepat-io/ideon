# Troubleshooting & Edge Cases

This document covers common errors, edge cases, and recovery strategies for using the Ideon skill.

---

## Image Generation Issues (Replicate)

### Problem: Invalid Replicate API Token

**Symptoms:**
- "Invalid token" or "HTTP 401" error during Stage 5 (Image Rendering)
- Images fail to generate
- Agent stalls at image submission

**Recovery Steps:**
1. Verify token format: Replicate tokens typically start with `r8_`
2. Check token permissions: Token must have `predict` permission
3. Ask user to provide new token: "Let's update your Replicate API token"
4. Restart Stage 5 with new token

---

### Problem: Rate Limit Exceeded (HTTP 429)

**Symptoms:**
- "429 Too Many Requests" error from Replicate
- "Quota exceeded" message
- Errors occur during image rendering

**Recovery Steps:**
1. Ideon automatically retries 429s up to `t2i.maxAttempts` times (default 4), honoring `retry_after` from the response body or `Retry-After` header (capped at 60s per wait). No manual sleep needed before resuming.
2. If retries exhaust and the run fails, run `ideon write resume` — completed stages are skipped and only the failing image stage re-runs.
3. If 429s persist (e.g. Replicate credit below $5 caps you at 6 RPM/burst 1): top up credit, or raise `t2i.maxAttempts` to allow more waits, or switch to a cheaper/faster model (Flux Schnell instead of Flux Pro).
4. If still failing: skip images or rerun later.

---

## Content Quality Issues

### Problem: Output is Low Quality or Incoherent

**Symptoms:**
- Content has grammar errors, poor structure, or missing sections
- Sections are too short (< 80% of target word count)
- Content doesn't follow content plan
- Markdown formatting is invalid

**Recovery Steps:**

1. **For low-quality content:**
   - Regenerate with clearer system prompt
   - Include more concrete examples
   - Specify exact output format
   - If guides are too verbose, load only essential guides

2. **If still poor quality:**
   - Ask user for more specific instructions or examples
   - Break task into smaller parts (e.g., one section at a time)
   - Regenerate from Stage 2 with adjusted parameters

3. **If completely unusable:**
   - Fail gracefully with user notification
   - Save session state
   - Offer to restart or resume later

**Prevention:**
- Use a reliable writing strategy for the selected format/style/intent
- Include format examples in prompts
- Validate output against checklist before accepting

---

### Problem: Sections Too Short or Word Count Mismatch

**Symptoms:**
- Generated content is 300 words but target is 1400 words
- Content missing entire sections from plan
- Sections feel "skimmed over" instead of detailed

**Recovery Steps:**

1. **Check if plan was clear:**
   - Review content plan from Stage 2
   - If plan is too brief, regenerate plan with more detail
   - Restart Stage 3 with improved plan

2. **Re-prompt sections writer with explicit guidance:**
   - "Write approximately [X] words per section"
   - "Expand each point with examples and context"
   - "Write in detail, not summary format"

3. **If persistent:**
   - Ask user: "Should I expand with more examples, code snippets, or background info?"
   - Restart Stage 3 with stronger section-level constraints
   - Offer manual editing for specific sections

**Prevention:**
- Validate word count after Stage 3; if <80% of target, regenerate
- Use detailed content plan (not just section titles)

---

### Problem: Image Prompts Are Too Generic or Vague

**Symptoms:**
- Rendered images don't match content topics
- Images look unrelated to text
- Images lack detail/specificity

**Recovery Steps (Stage 4-5):**

1. **Improve image prompts:**
   - Add more specific details to prompt
   - Include style, composition, color palette
   - Avoid generic terms ("tech diagram" → "isometric 3D React architecture diagram...")

2. **Regenerate images:**
   - Request agent expand prompts with more detail
   - Restart image generation with improved prompts

3. **User override:**
   - Ask user: "Would you like to edit the image prompts manually?"
   - User provides better descriptions
   - Regenerate with user-provided prompts

**Prevention:**
- Include specific style guidance in image prompts (minimalist, technical, friendly, etc.)
- Reference format/style guides when expanding prompts

---

## Image Generation Issues

### Problem: Image Generation Timeout (Exceeds 5 Minutes)

**Symptoms:**
- Single image stuck "generating" for >5 minutes
- Replicate API not returning completion status
- Agent waiting indefinitely

**Recovery Steps:**

1. **After 300 seconds (5 min):**
   - Agent polls status one more time
   - If still not done: Offer user choice

2. **User options:**
   ```
   ⏱️ IMAGE GENERATION TIMEOUT
   ════════════════════════════════════════
   Image "inline-2" has been generating for 5+ minutes.
   
   Options:
   (1) Retry (may time out again)
   (2) Skip this image (use placeholder)
   (3) Cancel entire run
   
   Choice: [1/2/3]
   ```

3. **If retry chosen:**
   - Try up to 2 more times
   - After 3 total failures: Mark image as failed, continue without it

4. **If skip chosen:**
   - Remove image from generation
   - Continue with remaining images
   - Mark in meta.json generation notes: "Image 'inline-2' skipped due to timeout"

**Prevention:**
- Set reasonable timeout (5 min per image standard)
- Use faster/cheaper model if timeouts are common (Schnell instead of Pro)
- Monitor Replicate service status before run

---

### Problem: Replicate Returns Low-Quality Image

**Symptoms:**
- Image renders but is blurry, distorted, or doesn't match prompt
- Image quality is noticeably worse than expected
- User is dissatisfied with image

**Recovery Steps:**

1. **Improve prompt & regenerate:**
   - Refine prompt with more specificity
   - Add quality descriptors (high resolution, sharp, detailed)
   - Increase guidance_scale if Replicate supports it

2. **Try different model:**
   - If using Pro: Switch to different model (SD3)
   - Regenerate image with alternative model

3. **Manual override:**
   - Ask user: "Provide better image description?"
   - User gives new prompt
   - Regenerate with user prompt

4. **Skip image:**
   - If repeated failures: Skip image, continue
   - Document skipped images in meta.json generation notes

**Prevention:**
- Include quality/detail guidance in prompts
- Review rendered images before Checkpoint 2
- Use reliable image model and settings

---

### Problem: Insufficient Disk Space for Images

**Symptoms:**
- Image download fails with "Disk full" or "Not enough space" error
- Agent cannot save images to output directory
- Process halts at Stage 5

**Recovery Steps:**

1. **Check disk space:**
   - Estimate: Each image ~150 KB WebP
   - 5 images = ~750 KB
   - 10 images = ~1.5 MB
   - (Plus session.json + content files)

2. **Offer user options:**
   - Choose different output directory with more space
   - Reduce image count (fewer images)
   - Reduce image resolution (1024x1024 → 512x512)
   - Cancel and clean up

3. **Free up space:**
   - Recommend user delete old output directories
   - Move images to external drive

**Prevention:**
- Check available disk space before Stage 5
- Warn user if output directory < 100 MB available

---

## Link Enrichment Issues

### Problem: Link Enrichment Times Out (>30 Seconds)

**Symptoms:**
- Web search for links taking >30 seconds
- Agent not responding at Checkpoint 2
- User wants faster completion

**Recovery Steps:**

At 30-second mark:

1. **Notify user:**
   ```
   ⏱️ LINK ENRICHMENT IN PROGRESS
   ════════════════════════════════════════
   Finding external links (takes 20–40 seconds)...
   
   Options:
   (1) Continue waiting (recommended)
   (2) Skip links, save now
   (3) Cancel
   
   Choice:
   ```

2. **If continue:**
   - Wait up to 60 seconds total (additional 30 seconds)
   - If successful: Show links, proceed
   - If still timing out: Offer skip or cancel

3. **If skip:**
   - Save content without links
   - Note in meta.json generation notes: "Link enrichment skipped by user"
   - User can manually add links later

**Prevention:**
- Use faster web search API
- Cache previous search results if possible
- Set reasonable timeout (60 seconds max)

---

### Problem: Web Search Returns No Relevant Links

**Symptoms:**
- Web search completes but finds 0–2 links
- Links are off-topic or from low-authority sources
- Content lacks external references

**Recovery Steps:**

1. **Retry with different keywords:**
   - Expand search terms
   - Try alternative keywords from content
   - Search for subtopics instead of main topic

2. **Manual links:**
   - Ask user: "Provide 2-3 external links manually?"
   - User provides URLs
   - Integrate into markdown

3. **Proceed without:**
   - Save content without external links
   - Note in meta.json generation notes: "Link search found 0 results"
   - User can add links manually later

**Prevention:**
- Use multiple keyword strategies
- Prioritize authoritative domains (.edu, .org, official docs)
- Validate links before inserting (check HTTP 200, page title)

---

### Problem: Link Anchor Text Sounds Awkward

**Symptoms:**
- Generated anchor text is stilted ("React official documentation")
- Links don't flow naturally in sentences
- Content reads unnaturally

**Recovery Steps:**

1. **Regenerate link descriptions:**
   - Prompt the agent writer: "Rewrite anchor text to sound more natural"
   - Provide context (surrounding sentence)
   - Regenerate with better anchor text

2. **Manual edit:**
   - Ask user: "Edit anchor text manually?"
   - User refines anchor text
   - Update markdown

**Prevention:**
- Include examples of natural anchor text in prompts
- Use the agent writer to generate natural anchor text before inserting

---

## Cost & Billing Issues

### Problem: Actual Cost Much Higher Than Estimate

**Symptoms:**
- Actual cost: $2.50
- Estimated: $0.80
- User surprised by bill

**Causes:**
- More images rendered than planned (retries due to failures)
- Higher token usage than expected (complex content)
- High-complexity writing run increased token usage

**Recovery Steps:**

1. **Explain cost breakdown:**
   - Show which stage cost most (usually images)
   - Document what happened (retries, token overages)
   - Show actual vs. estimated per stage

2. **Offer refund/credit (if applicable):**
   - If estimate was significantly wrong: Offer credit/refund
   - Document lesson learned for future runs

3. **Future runs:**
   - Recommend shorter target length
   - Recommend skipping images or using faster image model
   - Set explicit budget cap

**Prevention:**
- Show realistic cost estimate
- Document token usage during run
- Warn if approaching 150% of estimate

---

### Problem: User's Budget Exhausted Mid-Run

**Symptoms:**
- User has $5 API credit remaining
- Run will cost $8
- Agent should stop before incurring charges

**Recovery Steps:**

1. **Detect upfront:**
   - Before Stage 1, check remaining API balance
   - If insufficient: Warn user before starting

2. **Offer options:**
   - Use cheaper model (save ~$5)
   - Skip images (save ~$0.40)
   - Reduce content length (save tokens)
   - Add more credit / upgrade account

3. **If user proceeds:**
   - Confirm explicit approval ("Charge my account $X?")
   - Log approval for audit trail

**Prevention:**
- Check API balance before Stage 1
- Show cost estimate before proceeding
- Require explicit confirmation if cost will exceed stated budget

---

## Output & Filesystem Issues

### Problem: Output Directory Already Exists

**Symptoms:**
- Timestamp-based directory already exists (collision)
- Agent cannot create new directory
- Old content would be overwritten

**Recovery Steps:**

1. **Detect at Checkpoint 3:**
   - Agent checks if output directory already exists
   - If yes: Offer options

2. **User options:**
   - Use different directory (append suffix: `react-suspense-2`)
   - Overwrite existing directory (delete old content)
   - Choose entirely new path
   - Cancel

3. **After user choice:**
   - Confirm path again
   - Proceed with write

**Prevention:**
- Use unique timestamp (YYYYMMDD-HHmmss) in directory name
- Check for collisions early

---

### Problem: Output Directory Not Writable

**Symptoms:**
- Permission denied error
- Cannot write files to directory
- Agent stalls at file writing stage

**Recovery Steps:**

1. **Detect at Checkpoint 3:**
   - Try to create test file in output directory
   - If fails: Inform user of permission error

2. **Offer options:**
   - Choose different directory (user has permission)
   - Run `chmod` to fix permissions (if possible)
   - Use default directory (~/)

3. **After resolution:**
   - Retry file writing

**Prevention:**
- Test directory writeability before Checkpoint 3
- Use user's home directory as default

---

### Problem: Generated Files Are Corrupted or Incomplete

**Symptoms:**
- session.json is truncated
- Markdown files have missing sections
- WebP images are corrupted
- Files cannot be opened

**Causes:**
- Disk full during write
- Network interruption during file transfer
- Process crashed mid-write
- Encoding error

**Recovery Steps:**

1. **Validate files:**
   - Check file sizes (too small = likely truncated)
   - Validate JSON (parse session.json, meta.json)
   - Validate markdown (check for syntax errors)
   - Validate WebP images (check magic bytes)

2. **If corrupted:**
   - Delete corrupted files
   - Attempt to re-generate from session state
   - Ask user if they have a backup

3. **If unrecoverable:**
   - Inform user
   - Offer to restart run
   - Check if partial content can be salvaged

**Prevention:**
- Validate files after writing
- Use atomic writes (write to temp file, then move)
- Log file checksums for audit trail

---

## User Interaction Issues

### Problem: User Unresponsive at Checkpoint (Timeout)

**Symptoms:**
- Agent waiting for user response at Checkpoint 1/2/3
- User has not responded for >5 minutes
- Agent state unclear (waiting indefinitely?)

**Recovery Steps (Agent):**

1. **After 5 minutes of waiting:**
   - Resend prompt with options
   - Include timeout warning: "This will cancel in 5 more minutes"

2. **After 10 minutes total:**
   - Offer to cancel: "No response received. Cancel this run?"

3. **If user doesn't respond:**
   - Cancel gracefully
   - Clean up temp files
   - Preserve session state (don't delete session.json)
   - Log timeout event

**Prevention:**
- Clearly state that agent is waiting ("Waiting for your response...")
- Set explicit timeouts (documented)
- Preserve session state so user can resume later

---

### Problem: User Provides Ambiguous Approval

**Symptoms:**
- User says "looks ok" (unclear if approval or suggestion)
- User says "maybe later" (unclear if cancel or defer)
- Agent unsure how to proceed

**Recovery Steps:**

1. **Clarify with specific options:**
   ```
   I want to make sure I understand.
   
   Did you mean:
   (A) Approve and proceed to next stage?
   (B) Ask to edit something first?
   (C) Cancel this run?
   
   Please choose A, B, or C.
   ```

2. **Re-prompt if still unclear**

**Prevention:**
- Always offer explicit options (radio buttons, numbered choices)
- Require unambiguous response ("yes", "no", "1", "2")
- Summarize: "So I'm proceeding to Stage 3, correct?"

---

## Rare / Edge Cases

### Problem: Plan Changes Mid-Run (User Changes Mind)

**Symptoms:**
- User wants to change topic at Stage 3
- User wants different style/intent mid-generation
- User wants to switch formats after planning

**Recovery Steps:**

1. **Checkpoints are gates:**
   - Offer restart option at each checkpoint
   - At Checkpoint 1: "Restart with different inputs?"
   - If user chooses restart: Return to input collection

2. **Mid-stage changes:**
   - If not at checkpoint: Finish current stage
   - At next checkpoint: Offer restart
   - Don't allow mid-stage edits (too complex)

**Prevention:**
- Checkpoints provide opportunity to change course
- Inform users: "You can restart with different inputs at each checkpoint"

---

### Problem: Very Long Content (>3000 words Requested)

**Symptoms:**
- User requests "extra-large" (not standard size)
- Content exceeds available context window
- Token usage explodes

**Recovery Steps:**

1. **Detect upfront:**
   - Limit content length to "large" (~1400 words)
   - If user wants more: Suggest generating multiple runs
   - Or suggest multiple format outputs from single run

2. **If user insists:**
   - Warn about increased costs (5–10x normal)
   - Warn about timeout risk for long generation runs
   - Require explicit approval ("Proceed despite these risks?")

**Prevention:**
- Cap length options to small/medium/large
- Document that "large" is max reasonable per run
- Suggest multi-run strategy for book-length content

---

### Problem: Unsupported Format Requested

**Symptoms:**
- User requests format not in list (e.g., "podcast script")
- Agent doesn't have guide for format
- Cannot proceed

**Recovery Steps:**

1. **Show supported formats:**
   - article, blog-post, newsletter, x-post, x-thread, reddit-post, linkedin-post, press-release, science-paper

2. **Suggest alternatives:**
   - "Podcast script" → Use press-release or newsletter format as base
   - "Whitepaper" → Use science-paper format
   - "Email campaign" → Use newsletter format

3. **If user insists:**
   - Can attempt custom prompt (not guided)
   - High risk of poor output (no format guide)
   - Document as unsupported

**Prevention:**
- Clearly list supported formats upfront
- Suggest closest alternative format

---

### Problem: Highly Specialized Topic (User Expects Expert Output)

**Symptoms:**
- Topic: "Quantum error correction in topological codes"
- Generated output is too generic or technically inaccurate
- User disappointed

**Recovery Steps:**

1. **Offer context/guidance:**
   - Ask user: "Can you provide a 1-2 paragraph summary of key points?"
   - Use user summary in system prompt
   - Agent output is typically more accurate with concrete context

2. **Increase domain grounding:**
   - Ask user for 2-3 concrete references or source notes
   - Regenerate sections using those references

3. **Manual edit:**
   - Ask user: "Should I include custom context/examples?"
   - User provides specialized details
   - Incorporate into content

4. **Disclaimer:**
   - Note in meta.json generation notes: "This content generated by AI; expert review recommended"

**Prevention:**
- Offer to incorporate user context upfront
- Use premium model for specialized topics
- Include disclaimer for technical/medical/legal content

---

## FAQ: Common Questions

### Q: Can I resume a run if it fails halfway through?

**A:** Yes! Session state is saved in session.json. In future versions, agents can resume from last completed stage. Currently, restart from beginning recommended.

### Q: How do I reduce costs?

- Use "small" length instead of "large" (~40% fewer tokens)

### Q: Can I edit content after generation?

**A:** Yes! All output is standard markdown. Edit files in any text editor before publishing.

### Q: What if images don't match my content?

**A:** Regenerate with improved image prompts (see image prompt engineering in [replicate.md](replicate.md)).

### Q: Can I use my own images instead?

**A:** Yes, but skill doesn't support this. Copy generated markdown, replace image paths with your own, edit manually.


**Prevention:**
- Validate word count after Stage 3; if <80% of target, regenerate
- Use detailed content plan (not just section titles)
- Set clear expectations in content plan

### Problem: Sections Too Short or Word Count Mismatch

**Symptoms:**
- Generated content is 300 words but target is 1400 words
- Content missing entire sections from plan
- Sections feel "skimmed over" instead of detailed

**Recovery Steps:**

1. **Check if plan was clear:**
   - Review content plan from Stage 2
   - If plan is too brief, regenerate with more detail
   - Restart Stage 3 with improved plan

2. **Re-prompt sections writer with explicit guidance:**
   - "Write approximately [X] words per section"
   - "Expand each point with examples and context"
   - "Write in detail, not summary format"

3. **If word count still mismatches:**
   - Ask user for more specific input or examples
   - Restart run with adjusted parameters
   - Offer manual editing option

**Prevention:**
- Validate word count after Stage 3; if <80% of target, regenerate
- Use detailed content plan (not just section titles)
- Set clear expectations in content plan
### Q: Can I generate multiple formats in one run?
### Q: What if I disagree with generated content?

**A:** Restart with different style/intent, or manually edit markdown files after generation.

---

## Escalation Path

If issue cannot be resolved:

1. **Collect diagnostic info:**
   - Error message (exact text)
   - Which stage failed
   - Session.json (if available)
   - LLM/image model used
   - API keys (hidden)

2. **Contact Ideon support:**
   - https://github.com/telepat-ai/ideon/issues
   - Include diagnostics above

3. **Report bug:**
   - If reproducible, provide steps to reproduce
   - Provide expected vs actual behavior

