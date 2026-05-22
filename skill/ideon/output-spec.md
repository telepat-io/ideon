# Output Specification: File Formats & Directory Structure

This document defines the exact structure of all files output by the Ideon skill, including session state, metadata, markdown content, link enrichment, and generated images.

---

## Output Directory Structure

```
<output-base-dir>/<YYYYMMDD-HHmmss-slug>/
│
├─ session.json                        # Full cached session state (for resumability)
├─ meta.json                           # Generation metadata (authoritative runtime format)
│
├─ content/                            # Generated content files
│  ├─ article-1.md                     # Primary format (with frontmatter)
│  ├─ blog-post-1.md                   # Secondary format (if chosen)
│  ├─ newsletter-1.md                  # Additional format (if chosen)
│  └─ [one .md file per target format]
│
├─ assets/
│  └─ images/
│     ├─ cover.webp                    # Cover image (top of content)
│     ├─ inline-1.webp                 # First inline image
│     ├─ inline-2.webp                 # Second inline image
│     └─ [one .webp per rendered image]
│
└─ artifacts/
   ├─ article-1.links.json             # Link enrichment for article-1.md (v2 format with customLinks)
   ├─ blog-post-1.links.json           # Link enrichment for blog-post-1.md
   └─ [one .links.json per content file]
```

**Example full path:**
```
/Users/user/ideon-output/20260509-153022-react-suspense/
```

---

## File Format: session.json

**Purpose:** Store complete session state for future resumability. Not user-facing (for agents/system only).

**Location:** `<output-dir>/session.json`

**Key Content:**
- User inputs (immutable record of choices)
- Completed pipeline stages with outputs and costs
- Token usage and cost tracking per stage
- Timestamps for each stage
- Cached artifacts for resumability

See [pipeline.md](pipeline.md) for detailed session structure and how agents use this for resumability.

---

## File Format: meta.json

**Purpose:** Comprehensive metadata about the generation. User-facing and used by external tools/preview servers. This is the authoritative metadata file in Ideon runtime.

**Location:** `<output-dir>/meta.json`

**Structure:**

```json
{
  "version": 1,
  "title": "React Suspense: A Deep Dive into Async Data Fetching",
  "slug": "react-suspense-async-data-fetching",
  "idea": "React Suspense for data fetching",
  "description": "Comprehensive guide to React Suspense APIs, patterns, and best practices.",
  "subtitle": "Master async data fetching with modern React patterns",
  "keywords": [
    "React",
    "Suspense",
    "async",
    "data-fetching",
    "JavaScript"
  ],
  "contentType": "article",
  "style": "technical",
  "intent": "deep-dive-analysis",
  "targetLength": "large",
  "angle": "practical_patterns",
  "cover": {
    "path": "/full/path/to/assets/images/cover.webp",
    "relativePath": "assets/images/cover.webp",
    "description": "React Suspense architecture diagram"
  },
  "sections": [
    {
      "title": "Introduction",
      "description": "Hook on Suspense importance"
    },
    {
      "title": "How Suspense Works",
      "description": "APIs and conceptual overview"
    },
    {
      "title": "Data Fetching Patterns",
      "description": "Real-world patterns and best practices"
    }
  ],
  "images": [
    {
      "id": "cover",
      "kind": "cover",
      "path": "/full/path/to/assets/images/cover.webp",
      "relativePath": "assets/images/cover.webp",
      "description": "React Suspense architecture diagram",
      "anchorAfterSection": null
    },
    {
      "id": "inline-1",
      "kind": "inline",
      "path": "/full/path/to/assets/images/inline-1.webp",
      "relativePath": "assets/images/inline-1.webp",
      "description": "Data fetching flow with async boundaries",
      "anchorAfterSection": 1
    }
  ],
  "outputs": [
    {
      "fileId": "article-1",
      "contentType": "article",
      "path": "/full/path/to/content/article-1.md",
      "relativePath": "content/article-1.md"
    },
    {
      "fileId": "linkedin-post-1",
      "contentType": "linkedin-post",
      "path": "/full/path/to/content/linkedin-post-1.md",
      "relativePath": "content/linkedin-post-1.md"
    }
  ],
  "generatedAt": "2026-05-09T15:36:15Z",
  "generationDir": "/Users/user/ideon-output/20260509-153022-react-suspense"
}
```

**Key fields:**
- `version` — Format version (1)
- `title`, `slug`, `idea`, `description` — Content identifiers and metadata
- `keywords` — SEO keywords (array)
- `contentType`, `style`, `intent`, `targetLength` — Generation parameters from user choices
- `cover` — Cover image with full/relative paths and description
- `sections[]` — Outline: title and description for each section
- `images[]` — All images (cover + inline) with paths, descriptions, and anchor points
- `outputs[]` — Generated markdown files with content type mappings
- `generatedAt` — ISO 8601 timestamp of generation
- `generationDir` — Full path to output directory (for tooling reference)

**Difference from session.json:**
- **meta.json**: User-facing metadata designed for external tools and display
- **session.json**: System-facing cached state designed for resumability and cost tracking

---

## File Format: Markdown Content Files

**Purpose:** Formatted content ready for publishing. Each file represents one output format.

**Location:** `<output-dir>/content/<format>-<number>.md`

**Examples:**
- `article-1.md` — Article format
- `blog-post-1.md` — Blog post format
- `newsletter-1.md` — Newsletter format
- `linkedin-post-1.md` — LinkedIn post format
- `x-thread-1.md` — Twitter thread format

**Structure (with YAML frontmatter):**

```markdown
---
title: "React Suspense: A Deep Dive into Async Data Fetching"
slug: react-suspense-async-data-fetching
description: "Comprehensive guide to React Suspense APIs, patterns, and best practices."
author: Generated by Ideon
date: 2026-05-09
format: article
style: technical
intent: deep-dive-analysis
keywords:
  - React
  - Suspense
  - async
  - data-fetching
  - JavaScript
images:
  - id: cover
    path: ../assets/images/cover.webp
    caption: "React Suspense architecture overview"
    anchorAfterSection: 0
  - id: inline-1
    path: ../assets/images/inline-1.webp
    caption: "Data fetching flow with async boundaries"
    anchorAfterSection: 1
generated_at: 2026-05-09T15:36:15Z
version: 1.0
---

# React Suspense: A Deep Dive into Async Data Fetching

## Introduction

React Suspense is a powerful API for managing asynchronous operations in React applications...

[Content continues with sections matching outline from meta.json]

---

## External Resources

- [React Suspense – React](https://react.dev/reference/react/Suspense) — Official React documentation
- [Fetching with Suspense](https://example.com/suspense-patterns) — Community patterns guide
```

**Frontmatter fields:**
- `title`, `slug`, `description` — Content metadata
- `format` — Output format (article, blog-post, etc.)
- `style`, `intent` — Writing choices
- `keywords` — SEO keywords (array)
- `images` — Image metadata with relative paths and anchor points
- `generated_at` — Generation timestamp
- `version` — Format version

**Content structure:**
- Full markdown with headings, lists, bold/italics
- Images: `![caption](../assets/images/xxx.webp)` with relative paths
- External links: `[text](https://url)` (auto-inserted by link enrichment stage)
- Sections follow content plan outline from meta.json

---

## File Format: Link Enrichment JSON (v2)

**Purpose:** Metadata about external links for each content file. Supports both auto-discovered links and custom user-provided links.

**Location:** `<output-dir>/artifacts/<format>-<number>.links.json`

**Structure (v2 format with custom links support):**

```json
{
  "version": 2,
  "customLinks": [
    {
      "expression": "React Suspense API documentation",
      "url": "https://react.dev/reference/react/Suspense",
      "title": "React Suspense – React",
      "isCustom": true
    }
  ],
  "links": [
    {
      "expression": "async data fetching",
      "url": "https://example.com/suspense-patterns",
      "title": "Advanced Suspense Patterns",
      "isCustom": false
    },
    {
      "expression": "error boundaries",
      "url": "https://react.dev/reference/react/Component#catching-rendering-errors",
      "title": "Error Boundary – React",
      "isCustom": false
    }
  ]
}
```

**Fields:**
- `version` — Always 2 for new runs
- `customLinks[]` — User-provided links (inserted first, take precedence)
  - `expression` — Text phrase to search for and link in markdown
  - `url` — Full URL (must be valid and accessible)
  - `title` — Page title
  - `isCustom` — Always `true` for custom links
- `links[]` — Auto-discovered links from Stage 7 web search
  - Same structure as customLinks
  - `isCustom` is `false`
  - Deduplicated against customLinks (no duplicate URLs)

**Link Insertion Behavior:**
- Custom links inserted into markdown first
- Auto-discovered links fill remaining opportunities
- Protected zones (code blocks, existing links, headings) never re-linked
- Duplicate URLs eliminated (custom link takes precedence)
- Markdown links already present in content are preserved

**Backward Compatibility:**
- Legacy v1 format: `{ version: 1, links: LinkEntry[] }` (no customLinks field)
- Agents reading v1 files can treat customLinks as empty array

**Custom Link Workflow for Agents:**

1. **Upfront collection (optional, during user input phase):**
   - Agent asks: "Any external links you'd like included?"
   - User provides pairs: `expression text → URL`
   - Store as customLinks in links.json

2. **Post-Stage 7 merge:**
   - Auto-discovered links added to `links` array
   - CustomLinks from upfront preserved intact
   - Deduplication: if same URL appears in both, keep custom link

3. **Markdown injection:**
   - Search for each `expression` text in markdown
   - If found and not in protected zone: auto-link to URL
   - Order: customLinks first, then links

**Example insertion:**

Before markdown generation:
```
User input: "React Suspense API documentation" → "https://react.dev/reference/react/Suspense"
```

After auto-linking:
```markdown
Learn the [React Suspense API documentation](https://react.dev/reference/react/Suspense) to understand async patterns.
```

---

## Image Files

**Purpose:** Embedded images generated via Replicate (Stage 5).

**Location:** `<output-dir>/assets/images/`

**Format & Specifications:**
- **Format:** WebP (lossless quality, smaller than PNG)
- **Resolution:** 1024×1024 (standard; alternatives in [replicate.md](replicate.md))
- **Naming convention:**
  - `cover.webp` — Cover image (first image, top of content)
  - `inline-1.webp`, `inline-2.webp`, ... — Inline images (distributed through content)

**Metadata (stored in markdown frontmatter):**
- Image ID, kind (cover vs. inline), caption
- Anchor point (after which section should appear)
- Generation model, duration, cost (in session.json)

**Image characteristics:**
- All images follow consistent style (defined in Stage 4 prompt engineering)
- Generated using model specified in Stage 5 (Flux Pro by default)
- File size: 100–200 KB typical per WebP image

---

## Validation Checklist

Before finalizing output, agent should verify:

- [ ] `session.json` is valid JSON ✓
- [ ] `meta.json` contains all required fields (version, title, slug, idea, description, keywords, contentType, style, intent, outputs, generatedAt) ✓
- [ ] Title is under 60 characters (search display safety) ✓
- [ ] Description is 120-160 characters (meta description effectiveness) ✓
- [ ] Keywords are specific, non-generic, and not exact-match duplicates of heading text ✓
- [ ] All markdown files have complete YAML frontmatter ✓
- [ ] Each H2 section contains at least one statistic, citation, or data point (for long-form) ✓
- [ ] No prohibited AI vocabulary present (delve, realm, leverage, etc.) ✓
- [ ] All image paths in markdown are relative & correct (e.g., `../assets/images/cover.webp`) ✓
- [ ] All WebP images exist in `assets/images/` ✓
- [ ] All `.links.json` files follow v2 format with both customLinks and links arrays ✓
- [ ] No duplicate URLs in customLinks + links combined ✓
- [ ] All `.links.json` files reference valid markdown files ✓
- [ ] Directory structure matches specification above ✓
- [ ] No temporary or failed files left in directory ✓

---

## Directory Cleanup

Before user sees final output:

1. Delete any temporary files (partial renders, failed generation attempts, debug files)
2. Ensure only production-ready files remain
3. Verify all file permissions are readable
4. Confirm total disk space usage matches estimate provided in Checkpoint 3

---

## Example Complete Directory

```
20260509-153022-react-suspense/
├─ session.json                 (1.2 MB)
├─ meta.json                    (12 KB)
├─ content/
│  ├─ article-1.md             (14 KB, 1347 words)
│  └─ linkedin-post-1.md       (3 KB, 280 words)
├─ assets/
│  └─ images/
│     ├─ cover.webp            (156 KB)
│     ├─ inline-1.webp         (142 KB)
│     └─ inline-2.webp         (138 KB)
└─ artifacts/
   ├─ article-1.links.json     (3 KB, v2 format with customLinks)
   └─ linkedin-post-1.links.json (2 KB, v2 format with customLinks)

Total: 10 files, ~1.5 MB, ready for publication
```

---

## References

- **Session structure:** See [pipeline.md](pipeline.md) for detailed session.json schema
- **Custom link workflow:** See [pipeline.md](pipeline.md) Stage 7 (Links Enrichment) and [checkpoints.md](checkpoints.md) Checkpoint 2 for user interaction points
- **Image generation:** See [replicate.md](replicate.md) for model options and specifications
- **Writing generation:** Agent tracks token/cost estimation during planning, sections, image-prompt expansion, and links stages
