# Approval Checkpoints: User Control Gates

Three mandatory checkpoints ensure users control content quality and output placement.

---

## Checkpoint 1: Plan Approval

**Trigger:** After Stage 2 (Planning) completes successfully

**Agent Responsibilities:**

1. **Present the generated plan clearly:**
   - Display title
   - Display slug (URL-safe version)
   - Display description (meta description)
   - Display content structure (outline with sections, word counts)
   - Display estimated total word count
   - Display writing voice summary (style + intent chosen)

2. **Example presentation:**
   ```
   📋 CONTENT PLAN GENERATED
   ════════════════════════════════════════

   Title: "React Suspense: A Deep Dive into Async Data Fetching"
   Slug: react-suspense-async-data-fetching
   Description: "Comprehensive guide to React Suspense APIs, patterns, and best practices for data fetching."

   Writing Style: Technical
   Content Intent: Deep-dive analysis
   Target Length: Large (~1400 words)

   Content Structure:
   ──────────────────
   1. Introduction (150 words)
      - Hook on why Suspense matters
      - Define Suspense APIs
      - Roadmap for reader

   2. How Suspense Works (300 words)
      - Conceptual overview
      - Three APIs: <Suspense>, useTransition(), useDeferredValue()
      - When to use each

   3. Data Fetching Patterns (400 words)
      - Fetching during render
      - Error boundaries + retry logic
      - Loading states & skeleton UI

   4. Advanced Usage (350 words)
      - Server components
      - Nested Suspense boundaries
      - Common pitfalls

   5. Conclusion (150 words)
      - Recap of key takeaways
      - Call-to-action

   Total Estimated Word Count: ~1350 words

   ════════════════════════════════════════
   ```

3. **Wait for user response** — Do NOT proceed until user explicitly chooses one of the options below

4. **Offer clear options:**

   **Option 1: ✅ Approve and continue**
   - User says: "Looks good, proceed" or "Approve" or "Continue"
   - Agent: Proceed to Stage 3 (Sections)

   **Option 2: 🔄 Edit plan**
   - User says: "Change the title to..." or "Make it more friendly" or "Shorter" or "Add a section on..."
   - Agent: Parse user's edit request
   - Possible edits:
     - Change writing style (e.g., "more friendly" → reload guides with friendly style)
     - Change content intent (e.g., "more tutorial-focused" → reload guides with tutorial intent)
     - Adjust length (e.g., "smaller" → regenerate plan with small word count)
     - Edit title directly (user provides new title → validate, regenerate plan if needed)
     - Add/remove sections (user specifies → regenerate plan)
   - Once edits are parsed, regenerate plan with adjusted inputs
   - Return to step 1 (present new plan)
   - Repeat until user approves

   **Option 3: 🔁 Restart with different inputs**
   - User says: "Start over" or "Different topic" or "Different format"
   - Agent: Return to input collection phase
   - Clear all cached data from previous attempt
   - Collect new inputs
   - Proceed from Stage 1

   **Option 4: ❌ Cancel**
   - User says: "Never mind" or "Cancel" or "Stop"
   - Agent: Clean up any temporary files, exit gracefully

**Error Handling:**

- **User response is unclear:** Ask for clarification with options listed
- **User asks for impossible edit (e.g., "Generate 10,000 words but make it short"):** Warn user of contradiction, ask to clarify
- **User edits require regenerating multiple stages:** Recalculate costs & timeline for user approval

**Costs:**
- Stage 1–2 execution cost: ~$0.05–0.10 (agent writing only)
- If user requests edit/regeneration: Re-run Stage 2 at ~$0.05 cost each time

## Checkpoint 2: Content Review

**Trigger:** After Stage 5 (Image Rendering)

**Agent presents:** Full rendered markdown, all images with captions, actual word count vs target, total cost (writing + images)

**User options:**
- ✅ **Approve** → Proceed to link enrichment
- 🔗 **Add custom links** → Provide expression -> URL pairs, then link enrichment
- ⚠️ **Skip links** → Save without external links (faster)
- 🔁 **Restart** → Return to input collection
- ❌ **Cancel**

**Special: Link Timeout (>30s)** - Offer: (1) Continue waiting, (2) Save without links, (3) Cancel

**Cost:** If regenerating: varies by content complexity and image count

---

## Checkpoint 3: Output Confirmation (MANDATORY)

**Trigger:** After Stage 6 & 7 complete (Output + Links finalized)

**Agent Responsibilities:**

1. **Present final file list & location:**
   - Output directory path (full, absolute path)
   - All files to be written (markdown + images + metadata)
   - Total file count
   - Total disk space required (estimate)

2. **Example presentation:**
   ```
   📁 READY TO SAVE OUTPUT
   ════════════════════════════════════════

   Output Directory: /Users/user/ideon-output/20260509-153022-react-suspense/

   Files to Create:
   - session.json (1.2 MB) — Cached state
   - meta.json (8 KB) — Metadata
   - content/article-1.md (14 KB)
   - content/linkedin-post-1.md (3 KB)
   - assets/images/cover.webp (156 KB)
   - assets/images/inline-1.webp (142 KB)
   - assets/images/inline-2.webp (138 KB)
   - artifacts/article-1.links.json (2 KB, v2 with customLinks)
   - artifacts/linkedin-post-1.links.json (1 KB, v2 with customLinks)

   Total: 9 files, ~1.5 MB disk space

   ════════════════════════════════════════
   ```

3. **Display directory structure (tree format):**
   ```
   20260509-153022-react-suspense/
   ├─ session.json
   ├─ meta.json
   ├─ content/
   │  ├─ article-1.md
   │  └─ linkedin-post-1.md
   ├─ assets/
   │  └─ images/
   │     ├─ cover.webp
   │     ├─ inline-1.webp
   │     └─ inline-2.webp
   └─ artifacts/
      ├─ article-1.links.json
      └─ linkedin-post-1.links.json
   ```

4. **Wait for user response** — Do NOT write files until user explicitly confirms

5. **Offer options:**

   **Option 1: ✅ Save to this location**
   - User says: "Yes, save" or "Looks good" or "Confirm"
   - Agent: Write all files to the specified directory
   - Proceed to completion

   **Option 2: 📁 Choose different directory**
   - User says: "Save to..." or "Different location" or "Use /path/to/dir"
   - Agent: Prompt for new directory path
   - Validate path is writable
   - Write all files to new location

   **Option 3: 🔁 Start over**
   - User says: "Start over" or "Different inputs"
   - Agent: Return to input collection

   **Option 4: ❌ Cancel**
   - User says: "Don't save" or "Cancel"
   - Agent: Exit without writing files, clean up temp directory

**Error Handling:**

- **Directory doesn't exist:** Offer to create it
- **Directory not writable:** Ask user for different location
- **File already exists:** Offer to overwrite or choose new name/location
- **Disk space too low:** Warn user, ask for different location
- **Write failure during Stage 3:** Inform user which files failed, offer retry or different location

---

## Post-Completion: Summary & Next Steps

After all checkpoints pass and files are written:

1. **Display completion summary:**
   ```
   ✅ COMPLETE
   ════════════════════════════════════════
   Content generated successfully!

   📍 Output Location: /Users/user/ideon-output/20260509-153022-react-suspense/

   📊 Generation Summary:
   - Formats: article, linkedin-post
   - Words: 1347 (target: 1400)
   - Images: 3
   - External Links: 8
   - Total Time: 4 minutes 22 seconds
   - Total Cost: $1.17 (Writing $0.42 + Images $0.75)

   📄 Files Created:
   - article-1.md (14 KB, 1347 words)
   - linkedin-post-1.md (3 KB, 280 words)
   - 3 WebP images
   - Metadata + links JSON

   🎯 Next Steps:
   - Review content in /Users/user/ideon-output/20260509-153022-react-suspense/content/
   - Copy markdown files to your blog/CMS
   - Upload images from assets/images/
   - Review suggested links in artifacts/*.links.json

   ════════════════════════════════════════
   ```

2. **Offer additional actions:**
   - "Would you like to generate another variant?"
   - "Would you like to edit and regenerate?"
   - "Would you like to run another idea?"

---

## Checkpoint Decision Tree

```
               Input Collection
                      ↓
              Stage 1–2 (Planning)
                      ↓
          ┌─→ CHECKPOINT 1 ←─┐
          │   Plan Approval  │
          └────────┬─────────┘
                   │
         ┌─────┬───┴────┬──────┐
         ↓     ↓        ↓      ↓
      ✅ OK  🔄 Edit   🔁 Restart ❌ Cancel
         │     │        │      │
         │  Regenerate  │      └─→ Exit
         │   Plan       └─────→ Input Collection
         │     │
         │     └─→ Return to Checkpoint 1
         │
      Stage 3–5 (Sections + Images)
         │
         ├─→ CHECKPOINT 2 ←─┐
         │   Content Review │
         └────────┬─────────┘
                  │
        ┌─────┬───┴────┬──────┐
        ↓     ↓        ↓      ↓
     ✅ OK  ⚠️ Skip   🔁 Restart ❌ Cancel
        │    Links   │      │
        │     │      │      └─→ Exit
        │     │      └─────→ Input Collection
        │     │
     Stage 6–7 (Output + Links)
        │     │
        ├──→  └────→ Skip Stage 7 (Links)
        │
     CHECKPOINT 3 ←─┐
     Output Confirm │
     └────────┬─────┘
              │
    ┌─────┬───┴────┬──────┐
    ↓     ↓        ↓      ↓
 ✅ Save 📁 Different 🔁 Restart ❌ Cancel
    │      Dir      │      │
    │     │      └─→ Input Collection
    │     │
    └──→ Write to Disk
         │
      ✅ COMPLETE
```

---

## Agent Checklist for Checkpoints

- [ ] After Stage 2, present plan & wait for explicit user choice (don't auto-continue)
- [ ] Support plan editing without losing previous work
- [ ] Before Stage 7, present content preview with images
- [ ] Before Stage 7, confirm whether user wants to add or modify custom links
- [ ] Handle link enrichment timeout gracefully (offer choice at 30s mark)
- [ ] After all stages, show final file list & location
- [ ] Wait for explicit user confirmation before writing any files
- [ ] Display completion summary with file locations & next steps
- [ ] Offer additional actions post-completion (regenerate, new idea, etc.)
