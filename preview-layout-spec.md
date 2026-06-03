# Ideon Preview App — Layout Update Spec

> **Purpose:** This document is a comprehensive design specification for the Ideon Preview App layout redesign. It describes the information architecture, page structure, wireframes, component behavior, data contracts, and responsive breakpoints required for implementation. Feed this spec directly into a design-focused AI coder agent.

---

## 1. Overview & Goals

### Current State

The Ideon Preview App is a React-based local web application (`src/preview-app/`) that displays generated content for review. It currently features:

- Left sidebar with generation list (title, timestamp, snippet, cover thumbnail)
- Main content area with channel tabs, variant tabs, and rendered markdown
- Logs view with stage-grouped interaction inspector
- Light/dark theme toggle (warm neutral palette with teal `#0e7490` accent)
- Ant Design component library with custom CSS overrides

### Design Goals

1. **Adopt the Telepat visual identity** — dark-first surfaces, paired radial glow (blue top-right, magenta bottom-left), Poppins 300 typography, violet CTAs, atmospheric depth via glow + `mix-blend-mode: lighten`, no drop shadows. Reference: `@telepat-io/telepat-design-system`.

2. **Surface rich generation metadata** — publication, series, keywords, content plan sections, image gallery, original idea, style/intent/target length — all currently stored in `meta.json` but never rendered.

3. **Introduce three distinct views** — Content, Plan & Assets, and Logs — replacing the current Content/Logs toggle.

4. **Add sidebar filtering and search** — filter by publication, series, or keyword; free-text search across title, idea, keywords, slug.

5. **Simplify output presentation** — remove channel-specific output shells (X dark background, LinkedIn blue, etc.). All outputs render in a uniform neutral container on the dark surface.

6. **Add a metadata drawer** — a slide-out drawer (desktop) or bottom sheet (mobile) for generation context: publication details, series details, keywords, style/intent metadata, and actions.

7. **Minimal export actions** — Copy Markdown, Download meta.json, Open Source Folder.

---

## 2. Information Architecture

### Top-Level Views

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header (brand, theme toggle, actions)                               │
├────────────┬──────────────────────────────────────────────────────────┤
│            │  View Tabs: [ Content ] [ Plan & Assets ] [ Logs ]      │
│  Sidebar   │──────────────────────────────────────────────────────────│
│  (filters, │                                                          │
│  search,   │  Active View Content                                     │
│  gen list) │                                                          │
│            │                                                          │
│            │                                                          │
├────────────┴──────────────────────────────────────────────────────────┤
│  [Metadata Drawer — slides from right, or bottom sheet on mobile]     │
└─────────────────────────────────────────────────────────────────────┘
```

### View Descriptions

| View | Purpose | Primary Content |
|------|---------|-----------------|
| **Content** | Read the generated output | Rendered markdown body with auto-generated table of contents outline |
| **Plan & Assets** | Inspect the generation plan, images, and metadata | Original idea, content plan sections, image gallery, style/intent/length metadata |
| **Logs** | Debug LLM and image generation calls | Stage-grouped interaction list with inspector (prompt/response/JSON) |

### Metadata Drawer

Triggered by an "Info" button in the generation header. Contains:

- **Publication Context** — name, slug, editorial policy (tone, forbidden topics, disclosure requirements, audience restrictions, notes), defaults (style, intent, target length, content targets, audience hint, country/language, max images/links, model, temperature, max tokens, topP)
- **Series Context** — name, slug, topic, editorial policy, defaults, associated publication
- **Keywords** — clickable tag chips that filter the sidebar
- **Generation Metadata** — idea, description, subtitle, angle, content type, generated timestamp, generation directory

---

## 3. Wireframes

### 3.1 Desktop Layout (≥1024px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [logo] IDEON                         [⟳] [☀/🌙] [ℹ Info] [⋯ Actions] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌─── SIDEBAR ─────┐ ┌── MAIN CONTENT ─────────────────────────────────────┐ │
│ │                  │ │                                                      │ │
│ │ [🔍 Search...]   │ │  ┌─ VIEW TABS ────────────────────────────────────┐ │ │
│ │                  │ │  │ [Content] [Plan & Assets] [Logs]               │ │ │
│ │ Filter: All ▼   │ │  └────────────────────────────────────────────────┘ │ │
│ │                  │ │                                                      │ │
│ │ ┌──────────────┐ │ │  ┌─ GENERATION HEADER ────────────────────────────┐ │ │
│ │ │ [img] Title  │ │ │  │ Title: "How to..."                            │ │ │
│ │ │ Jun 3, 2026  │ │ │  │ Gen ID: abc123  Slug: how-to-xyz              │ │ │
│ │ │ Snippet...   │ │ │  │ Source: /path/to/output                       │ │ │
│ │ └──────────────┘ │ │  │ ⏱ 2m 34s  💲 $0.0423                         │ │ │
│ │                  │ │  │ [📋 Publication Badge] [📚 Series Badge]       │ │ │
│ │ ┌──────────────┐ │ │  │ Keywords: [seo] [ai-writing] [content]         │ │ │
│ │ │ [img] Title  │ │ │  └────────────────────────────────────────────────┘ │ │
│ │ │ Jun 2, 2026  │ │ │                                                      │ │
│ │ │ Snippet...   │ │ │  ┌─ OUTLINE (auto TOC from headings) ────────────┐ │ │
│ │ └──────────────┘ │ │  │ 1. Introduction                               │ │ │
│ │                  │ │  │ 2. Why SEO Matters                            │ │ │
│ │ ┌──────────────┐ │ │  │    2.1 On-Page vs Off-Page                    │ │ │
│ │ │ [img] Title  │ │ │  │ 3. Implementation Guide                       │ │ │
│ │ │ Jun 1, 2026  │ │ │  │ 4. Conclusion                                │ │ │
│ │ │ Snippet...   │ │ │  └────────────────────────────────────────────────┘ │ │
│ │ └──────────────┘ │ │                                                      │ │
│ │                  │ │  ┌─ RENDERED CONTENT ─────────────────────────────┐ │ │
│ │ (scrollable)     │ │  │                                               │ │ │
│ │                  │ │  │  <rendered markdown>                           │ │ │
│ │                  │ │  │                                               │ │ │
│ │                  │ │  └────────────────────────────────────────────────┘ │ │
│ └──────────────────┘ └──────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌── METADATA DRAWER (slides from right) ─────────────────────────────────┐  │
│ │                                                                        │  │
│ │  Publication Context                                                   │  │
│ │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│ │  │ Name: Tech Blog                                                  │  │  │
│ │  │ Slug: tech-blog                                                  │  │  │
│ │  │ Editorial Policy                                                 │  │  │
│ │  │   Tone: Professional, authoritative                              │  │  │
│ │  │   Forbidden Topics: [list]                                       │  │  │
│ │  │   Disclosure Requirements: [list]                                │  │  │
│ │  │   Audience Restrictions: [list]                                  │  │  │
│ │  │   Notes: ...                                                     │  │  │
│ │  │ Defaults                                                         │  │  │
│ │  │   Style: professional  Intent: tutorial  Length: medium           │  │  │
│ │  │   Content Targets: [article=primary, x-post=secondary]           │  │  │
│ │  │   Target Audience: Developers                                    │  │  │
│ │  │   Country: US  Language: en                                      │  │  │
│ │  │   Max Images: 4  Max Links: 12                                   │  │  │
│ │  │   Model: deepseek/deepseek-v4-pro  Temp: 0.7                     │  │  │
│ │  └──────────────────────────────────────────────────────────────────┘  │  │
│ │                                                                        │  │
│ │  Series Context                                                        │  │
│ │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│ │  │ Name: SEO Fundamentals                                           │  │  │
│ │  │ Slug: seo-fundamentals                                           │  │  │
│ │  │ Topic: Comprehensive guide to SEO best practices                 │  │  │
│ │  │ Publication: Tech Blog                                           │  │  │
│ │  │ Editorial Policy (if different from publication)                  │  │  │
│ │  │ Defaults (if different from publication)                          │  │  │
│ │  └──────────────────────────────────────────────────────────────────┘  │  │
│ │                                                                        │  │
│ │  Generation Metadata                                                   │  │
│ │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│ │  │ Idea: "How small editorial teams can productionize AI writing"   │  │  │
│ │  │ Description: A comprehensive guide...                            │  │  │
│ │  │ Subtitle: null                                                   │  │  │
│ │  │ Angle: Practical implementation focus                            │  │  │
│ │  │ Content Type: article                                            │  │  │
│ │  │ Generated At: 2026-06-03T10:30:00Z                               │  │  │
│ │  └──────────────────────────────────────────────────────────────────┘  │  │
│ │                                                                        │  │
│ │  [✕ Close Drawer]                                                      │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile Layout (<768px)

```
┌──────────────────────────────┐
│ [☰] IDEON            [⟳] [☀]│  ← hamburger opens sidebar drawer
├──────────────────────────────┤
│ [Content] [Plan] [Logs]      │  ← bottom tabs
├──────────────────────────────┤
│                              │
│ Generation Title             │
│ ⏱ 2m 34s  💲 $0.0423       │
│                              │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │  <rendered markdown>     │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│ [ℹ Generation Details]       │  ← opens bottom sheet
│                              │
├──────────────────────────────┤
│ [Content] [Plan] [Logs]      │  ← bottom tabs (fixed)
└──────────────────────────────┘

┌── BOTTOM SHEET (Generation Details) ──┐
│                                        │
│  Publication: Tech Blog                │
│  Series: SEO Fundamentals              │
│  Keywords: [seo] [ai-writing] [content]│
│                                        │
│  Style: professional                   │
│  Intent: tutorial                      │
│  Length: medium                         │
│                                        │
│  [✕ Close]                             │
└────────────────────────────────────────┘

┌── SIDEBAR DRAWER (slides from left) ──┐
│  [✕]                                   │
│  [🔍 Search...]                        │
│                                        │
│  Filter: [All] [Publication] [Series]  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Title 1 · Jun 3                  │  │
│  │ Snippet...                       │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ Title 2 · Jun 2                  │  │
│  │ Snippet...                       │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

### 3.3 Content View Wireframe (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│  VIEW TABS: [Content] [Plan & Assets] [Logs]                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ OUTLINE (sticky left, auto-generated from headings) ────────┐  │
│  │                                                               │  │
│  │  1. Introduction                                    ← active │  │
│  │  2. Why SEO Matters                                            │  │
│  │     2.1 On-Page vs Off-Page                                    │  │
│  │  3. Implementation Guide                                       │  │
│  │  4. Conclusion                                                 │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ RENDERED OUTPUT (center, main reading area) ─────────────────┐  │
│  │                                                               │  │
│  │  # How to Productionize AI Writing                            │  │
│  │                                                               │  │
│  │  A comprehensive guide for small editorial teams...           │  │
│  │                                                               │  │
│  │  ## Introduction                                              │  │
│  │                                                               │  │
│  │  <article body continues>                                     │  │
│  │                                                               │  │
│  │  ![cover image](path)                                         │  │
│  │                                                               │  │
│  │  <article body continues>                                     │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Plan & Assets View Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  VIEW TABS: [Content] [Plan & Assets] [Logs]                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ ORIGINAL IDEA ───────────────────────────────────────────────┐  │
│  │  "How small editorial teams can productionize AI writing"     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ CONTENT PLAN (sections) ─────────────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │ 1. Introduction                                         │  │  │
│  │  │    Set the context for why AI writing is relevant...    │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │ 2. Why SEO Matters                                      │  │  │
│  │  │    Explain the relationship between content quality...  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │ 3. Implementation Guide                                 │  │  │
│  │  │    Step-by-step instructions for setting up...          │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │ 4. Conclusion                                           │  │  │
│  │  │    Summarize key takeaways and next steps...            │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ IMAGE GALLERY ───────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │  │
│  │  │              │  │              │  │              │        │  │
│  │  │   [image]    │  │   [image]    │  │   [image]    │        │  │
│  │  │              │  │              │  │              │        │  │
│  │  │  Cover       │  │  Inline      │  │  Inline      │        │  │
│  │  │  "A modern   │  │  "A diagram  │  │  "A team     │        │  │
│  │  │  office..."  │  │  showing..." │  │  collabor..."│        │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ GENERATION METADATA ─────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Style: professional    Intent: tutorial    Length: medium     │  │
│  │  Content Type: article  Angle: Practical implementation focus  │  │
│  │  Generated: 2026-06-03T10:30:00Z                              │  │
│  │  Publication: Tech Blog  Series: SEO Fundamentals             │  │
│  │  Keywords: [seo] [ai-writing] [content-marketing]             │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Logs View Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  VIEW TABS: [Content] [Plan & Assets] [Logs]                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ STAGE LIST ──────────┐  ┌─ INTERACTION INSPECTOR ───────────┐  │
│  │                       │  │                                    │  │
│  │  shared-plan          │  │  Operation: article-section-3      │  │
│  │  ┌─────────────────┐  │  │  Stage: sections                   │  │
│  │  │ plan-gen        │  │  │  Source: llm                       │  │
│  │  │ structured      │  │  │  Status: succeeded                 │  │
│  │  │ 1.2s            │  │  │  Model: deepseek/deepseek-v4-pro   │  │
│  │  └─────────────────┘  │  │  Duration: 4523 ms                 │  │
│  │                       │  │                                    │  │
│  │  sections             │  │  [Prompt / Response] [Full JSON]    │  │
│  │  ┌─────────────────┐  │  │                                    │  │
│  │  │ section-1       │  │  │  ┌─ Prompt ──────────────────────┐ │  │
│  │  │ structured      │  │  │  │                               │ │  │
│  │  │ 3.1s            │  │  │  │ [system] You are an expert... │ │  │
│  │  └─────────────────┘  │  │  │ [user] Write section 3...     │ │  │
│  │  ┌─────────────────┐  │  │  │                               │ │  │
│  │  │ section-2       │  │  │  └───────────────────────────────┘ │  │
│  │  │ structured      │  │  │                                    │  │
│  │  │ 4.5s            │  │  │  ┌─ Response ─────────────────────┐ │  │
│  │  └─────────────────┘  │  │  │                               │ │  │
│  │  ┌─────────────────┐  │  │  │ {                             │ │  │
│  │  │ section-3   [←] │  │  │  │   "title": "Implementation",  │ │  │
│  │  │ structured      │  │  │  │   "description": "...",       │ │  │
│  │  │ 4.5s            │  │  │  │   ...                         │ │  │
│  │  └─────────────────┘  │  │  │ }                             │ │  │
│  │                       │  │  │                               │ │  │
│  │  images               │  │  └───────────────────────────────┘ │  │
│  │  ┌─────────────────┐  │  │                                    │  │
│  │  │ cover-gen       │  │  │                                    │  │
│  │  │ t2i             │  │  │                                    │  │
│  │  │ 12.8s           │  │  │                                    │  │
│  │  └─────────────────┘  │  │                                    │  │
│  │                       │  │                                    │  │
│  └───────────────────────┘  └────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Inventory

### 4.1 New Components

| Component | Location | Description |
|-----------|----------|-------------|
| `ViewTabs` | Header area below generation metadata | Three-tab switcher: Content, Plan & Assets, Logs. Controlled component with `activeView` state. |
| `SidebarFilters` | Top of sidebar | Filter chip row: "All", publication name chips, series name chips. Clicking a chip activates/deactivates the filter. |
| `SidebarSearch` | Below filter chips | Text input with search icon. Filters generation list by title, idea, keywords, slug. Debounced (300ms). |
| `ContentOutline` | Sticky left column within Content view | Auto-generated table of contents from rendered markdown headings. Clicking a heading scrolls to it. Highlights active heading on scroll. |
| `MetadataDrawer` | Slide-out from right (desktop) / bottom sheet (mobile) | Contains PublicationContext, SeriesContext, Keywords, GenerationMetadata sub-sections. Triggered by "Info" button in header. |
| `PublicationContext` | Inside MetadataDrawer | Displays publication name, slug, editorial policy (tone, forbidden topics, disclosure requirements, audience restrictions, notes), and defaults (style, intent, target length, content targets, audience hint, country/language, max images/links, model settings). |
| `SeriesContext` | Inside MetadataDrawer | Displays series name, slug, topic, associated publication, editorial policy, and defaults. |
| `KeywordsPanel` | Inside MetadataDrawer | Renders keyword array as clickable tag chips. Clicking a keyword activates a sidebar filter for that keyword. |
| `GenerationMetadataPanel` | Inside MetadataDrawer or Plan & Assets view | Displays idea, description, subtitle, angle, content type, generated timestamp, generation directory. |
| `ContentPlanSections` | Plan & Assets view | Renders `metaJson.sections[]` as a vertical list of cards, each showing section title and description. |
| `ImageGallery` | Plan & Assets view | Grid of image cards. Each card shows thumbnail, kind badge (cover/inline), description/prompt text. Click opens full-size image in new tab. |
| `ActionsDropdown` | Header | Dropdown menu with: Copy Markdown, Download meta.json, Open Source Folder. |

### 4.2 Modified Components

| Component | Changes |
|-----------|---------|
| `SidebarContent` | Add `SidebarFilters` and `SidebarSearch` above the generation list. Add filter state management. Add publication/series badge display on each list item. |
| `PreviewApp` (root) | Add `activeView` state (`'content' \| 'plan' \| 'logs'`). Add `drawerOpen` state. Add `activeFilter` state (null or `{ type: 'publication' \| 'series' \| 'keyword', value: string }`). Add `searchQuery` state. Replace the Content/Logs `Segmented` with `ViewTabs`. |
| `OutputCard` | Remove channel-specific class names and styling (`preview-output-shell--x-post`, etc.). Render all outputs in a uniform container. |
| `GenerationHeader` | Add publication badge, series badge, keyword tags. Add "Info" button to open drawer. Add `ActionsDropdown`. |
| `LogsPanel` | No structural changes. Visual update to use Telepat design tokens. |

### 4.3 Removed Components / Styles

| Item | Reason |
|------|--------|
| `preview-output-shell--x-post` | Channel-specific output styling removed |
| `preview-output-shell--x-thread` | Channel-specific output styling removed |
| `preview-output-shell--linkedin-post` | Channel-specific output styling removed |
| `preview-output-shell--reddit-post` | Channel-specific output styling removed |
| `preview-output-shell--newsletter` | Channel-specific output styling removed |
| `CONTENT_TYPE_ICONS` map | Channel-specific icons removed; all outputs use a generic document icon |

---

## 5. State & Interactions

### 5.1 State Model

```typescript
interface PreviewAppState {
  // Theme
  themeMode: 'light' | 'dark';

  // Data
  bootstrap: PreviewBootstrapData | null;
  articles: PreviewArticleListItem[];
  selectedSlug: string;
  detail: PreviewArticleContent | null;

  // View
  activeView: 'content' | 'plan' | 'logs';
  activeType: string;        // content type tab (article, x-post, etc.)
  activeOutputId: string;    // variant tab

  // Sidebar
  activeFilter: SidebarFilter | null;
  searchQuery: string;

  // Drawer
  drawerOpen: boolean;

  // Logs
  interactionViewMode: 'text' | 'json';
  selectedInteractionId: string;

  // UI feedback
  copiedSlug: string;
}

type SidebarFilter =
  | { type: 'publication'; value: string }
  | { type: 'series'; value: string }
  | { type: 'keyword'; value: string };
```

### 5.2 Interaction Flows

#### Flow: Select a Generation

1. User clicks a generation item in the sidebar.
2. `selectedSlug` updates.
3. `loadDetail(slug)` fires.
4. `detail` populates with full content, interactions, analytics, metaJson.
5. `activeType` and `activeOutputId` reset to first output.
6. `activeView` resets to `'content'`.
7. `drawerOpen` resets to `false`.
8. Document title updates.

#### Flow: Filter Sidebar by Publication

1. User clicks a publication badge in the generation header or drawer.
2. `activeFilter` is set to `{ type: 'publication', value: 'Tech Blog' }`.
3. Sidebar list is filtered to show only generations whose `metaJson.publication` matches.
4. A filter pill appears above the generation list: "Publication: Tech Blog [✕]".
5. Clicking the pill's ✕ clears the filter.

#### Flow: Filter Sidebar by Keyword

1. User clicks a keyword tag chip (in header, drawer, or Plan & Assets view).
2. `activeFilter` is set to `{ type: 'keyword', value: 'seo' }`.
3. Sidebar list is filtered to show only generations whose `metaJson.keywords` includes that keyword.
4. A filter pill appears: "Keyword: seo [✕]".
5. Clicking the pill's ✕ clears the filter.

#### Flow: Search Sidebar

1. User types in the search input.
2. `searchQuery` updates (debounced 300ms).
3. Sidebar list is filtered to show generations whose title, idea, keywords, or slug contain the query (case-insensitive substring match).
4. If `activeFilter` is also set, both filters apply (intersection).

#### Flow: Open Metadata Drawer

1. User clicks the "Info" button in the generation header.
2. `drawerOpen` is set to `true`.
3. On desktop (≥1024px): a 400px-wide drawer slides in from the right, overlaying the main content.
4. On mobile (<1024px): a bottom sheet slides up from the bottom, covering ~60% of the viewport.
5. Drawer contains PublicationContext, SeriesContext, Keywords, GenerationMetadata.
6. Clicking outside the drawer or pressing the close button sets `drawerOpen` to `false`.

#### Flow: Switch Views

1. User clicks a view tab (Content, Plan & Assets, Logs).
2. `activeView` updates.
3. The main content area re-renders with the selected view's content.
4. The drawer state is preserved (it overlays any view).

#### Flow: Actions Dropdown

1. User clicks the "Actions" button in the header.
2. A dropdown menu appears with three options:
   - **Copy Markdown** — copies the active output's raw markdown to the clipboard. Shows a "Copied" toast.
   - **Download meta.json** — triggers a browser download of the `meta.json` file for the active generation.
   - **Open Source Folder** — copies the source path to the clipboard (since the preview app runs in a browser, it cannot open a folder directly). Shows "Path copied" toast.

#### Flow: Scroll-linked Outline Highlighting (Content View)

1. As the user scrolls the rendered markdown, the ContentOutline component observes which heading is currently in the viewport.
2. The corresponding outline item receives an "active" visual state (left border accent, bolder text).
3. Clicking an outline item scrolls the rendered markdown to that heading with smooth scrolling.

---

## 6. Data Model Extensions

### 6.1 Extended `metaJson` Type

The preview server currently serves `metaJson` as `unknown`. The following typed interface should replace that:

```typescript
// From src/types/meta.ts — already exists, reference it:
// metaJsonSchema defines: version, title, slug, idea, description, subtitle,
// keywords, contentType, style, intent, targetLength, angle, cover, sections,
// images, outputs, generatedAt, generationDir, publication, series

// New: typed preview-specific wrapper
interface PreviewMetaJson {
  version: 1;
  title: string;
  slug: string;
  idea: string;
  description: string;
  subtitle: string | null;
  keywords: string[];
  contentType: string;
  style: string;
  intent: string;
  targetLength: string | null;
  angle: string | null;
  cover: PreviewCoverImage | null;
  sections: PreviewSection[];
  images: PreviewImage[];
  outputs: PreviewOutputRef[];
  generatedAt: string;
  generationDir: string;
  publication?: string;
  series?: string;
}

interface PreviewCoverImage {
  path: string;
  relativePath: string;
  description: string;
}

interface PreviewSection {
  title: string;
  description: string;
}

interface PreviewImage {
  id: string;
  kind: 'cover' | 'inline';
  path: string;
  relativePath: string;
  description: string;
  anchorAfterSection: number | null;
}

interface PreviewOutputRef {
  fileId: string;
  contentType: string;
  path: string;
  relativePath: string;
}
```

### 6.2 Extended `PreviewArticleContent`

```typescript
interface PreviewArticleContent {
  title: string;
  generationId: string;
  sourcePath: string;
  interactions: PreviewInteractionsPayload;
  analyticsSummary: PreviewAnalyticsSummary | null;
  metaJson: PreviewMetaJson | null;  // was: unknown | null
  outputs: PreviewArticleOutput[];
}
```

### 6.3 Extended `PreviewArticleListItem`

```typescript
interface PreviewArticleListItem {
  slug: string;
  title: string;
  mtime: number;
  previewSnippet: string;
  coverImageUrl: string | null;
  // NEW fields for sidebar filtering:
  publication: string | null;
  series: string | null;
  keywords: string[];
}
```

### 6.4 New API Endpoints

#### `GET /api/publications`

Returns the list of all configured publications for sidebar filter chips.

```typescript
// Response
interface PreviewPublicationSummary {
  name: string;
  slug: string;
  editorialPolicy: {
    tone: string;
    forbiddenTopics: string[];
    disclosureRequirements: string[];
    audienceRestrictions: string[];
    notes: string;
  };
  defaults: {
    style?: string;
    intent?: string;
    targetLength?: number;
    contentTargets?: Array<{
      contentType: string;
      role: 'primary' | 'secondary';
      count: number;
    }>;
    targetAudienceHint?: string;
    countryCodes?: string[];
    language?: string;
    maxImages?: number;
    maxLinks?: number;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}
```

#### `GET /api/series`

Returns the list of all configured series for sidebar filter chips.

```typescript
// Response
interface PreviewSeriesSummary {
  name: string;
  slug: string;
  topic: string;
  publication?: string;
  editorialPolicy: {
    tone: string;
    forbiddenTopics: string[];
    disclosureRequirements: string[];
    audienceRestrictions: string[];
    notes: string;
  };
  defaults: {
    style?: string;
    intent?: string;
    targetLength?: number;
    keywords?: string[];
    contentTargets?: Array<{
      contentType: string;
      role: 'primary' | 'secondary';
      count: number;
    }>;
    targetAudienceHint?: string;
    countryCodes?: string[];
    language?: string;
    maxImages?: number;
    maxLinks?: number;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}
```

#### `GET /api/articles/:slug` (modified response)

The existing endpoint already returns `metaJson`. The change is to type it properly (from `unknown` to `PreviewMetaJson`) and ensure the preview server validates/populates the new fields.

#### `POST /api/actions/copy-markdown` (optional server-side)

If server-side clipboard is not feasible, this can remain a client-only operation (copy from the `htmlBody` or from fetching the raw markdown via a new endpoint).

---

## 7. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | ≥1024px | Sidebar visible (340px). Main content fills remaining width. Metadata drawer slides from right (400px). |
| Tablet | 768px–1023px | Sidebar hidden behind hamburger. Main content full width. Metadata drawer slides from right (360px). |
| Mobile | <768px | Sidebar hidden behind hamburger. Main content full width. Metadata drawer becomes bottom sheet (~60vh). Bottom tab bar for view switching. |

### Sidebar

- **Desktop (≥1024px):** Fixed left column, 340px wide. Always visible.
- **Tablet/Mobile (<1024px):** Hidden. Triggered by hamburger icon in header. Renders as a left-sliding drawer overlay. Closes when a generation is selected or when clicking outside.

### Metadata Drawer

- **Desktop (≥1024px):** Slides in from the right. 400px wide. Overlays main content with a semi-transparent backdrop.
- **Tablet (768px–1023px):** Slides in from the right. 360px wide.
- **Mobile (<768px):** Slides up from the bottom. ~60% viewport height. Rounded top corners. Draggable handle at top for expand/collapse.

### View Tabs

- **Desktop/Tablet:** Horizontal tab bar below the generation header. All three tabs visible.
- **Mobile:** Fixed bottom tab bar (above the safe area). Icons + short labels. Tapping opens the corresponding view.

### Content Outline

- **Desktop (≥1200px):** Sticky left column within the Content view, 200px wide. Scrolls independently.
- **Tablet/Mobile (<1200px):** Hidden. The outline is accessible via a floating "TOC" button that opens a popover.

### Image Gallery

- **Desktop:** 3-column grid of image cards.
- **Tablet:** 2-column grid.
- **Mobile:** 1-column stack.

---

## 8. Visual Identity

### Design Tokens

The preview app should adopt the Telepat design system tokens from `@telepat-io/telepat-design-system/styles.css`. Key tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#000000` | Primary background |
| `--color-bg-deep` | `#14102B` | Sidebar, secondary surfaces |
| `--color-bg-elevated` | `#221949` | Cards, drawer |
| `--color-fg` | `#FFFFFF` | Primary text |
| `--color-fg-dim` | `rgba(255,255,255,0.88)` | Body text |
| `--color-fg-muted` | `rgba(255,255,255,0.56)` | Metadata, timestamps |
| `--color-brand-violet` | `#5A3ECC` | Primary CTA, active tabs |
| `--color-quote-violet` | `#AEA1FF` | Eyebrows, "View more" links, active outline |
| `--glow-blue` | `rgba(79,75,255,0.24)` | Top-right glow disk |
| `--glow-pink` | `rgba(219,75,255,0.16)` | Bottom-left glow disk |
| `--font-display` | `Poppins, system-ui, sans-serif` | Headings, UI labels |
| `--font-sans` | `Poppins, system-ui, sans-serif` | Body text |
| `--radius-card` | `16px` | Cards, drawer |
| `--radius-input` | `8px` | Search input, filter chips |
| `--radius-pill` | `500px` | Tag chips, filter pills |

### Glow Background

Every dark surface should carry the paired radial glow motif. Use the `.glow-bg` utility class or compose with:

```css
background:
  radial-gradient(circle at top right, var(--glow-blue) 0%, transparent 50%),
  radial-gradient(circle at bottom left, var(--glow-pink) 0%, transparent 50%),
  var(--color-bg);
```

### Typography

- Headings: Poppins 300, 32–64px, `0.020em` tracking
- Body: Poppins 300, 18px, `1.45` line-height, `0.020em` tracking
- Metadata labels: Poppins 400, 12–14px, `0.080–0.180em` tracking, uppercase
- Code/pre: `SF Mono`, Menlo, Consolas, monospace

### Output Container

All rendered markdown outputs use a uniform container:

```css
.preview-output-shell {
  border-radius: var(--radius-card);
  border: 1px solid var(--color-line);
  background: var(--color-bg-elevated);
  padding: 32px;
}
```

No channel-specific backgrounds, borders, or color overrides.

---

## 9. Out of Scope (Future Roadmap)

The following features are explicitly excluded from this redesign:

| Feature | Reason |
|---------|--------|
| In-app editing of publications/series | Requires write endpoints, conflict resolution, and UI for form validation. Separate project. |
| Compare generations side-by-side | Complex layout work. Useful but not critical for initial release. |
| Publishing workflow (approve → publish to CMS) | Requires integration with external publishing platforms. |
| Real-time collaboration/commenting | Requires WebSocket infrastructure and user presence system. |
| User authentication | The preview app is local-only. Auth is only needed for shared/cloud deployments. |
| Multi-workspace support | Current design assumes a single output directory. Multi-workspace requires navigation and state management changes. |
| Custom themes / theme builder | Current design follows the Telepat design system. Customization is a separate concern. |
| Export to PDF/DOCX | Useful but orthogonal to the layout redesign. |

---

## 10. Implementation Notes

### File Structure

```
src/preview-app/
├── App.tsx                    # Root component (modified)
├── api.ts                     # API client (extended)
├── main.tsx                   # Entry point (unchanged)
├── index.html                 # HTML shell (unchanged)
├── styles.css                 # Global styles (replaced with Telepat tokens)
├── theme.ts                   # Ant Design theme (replaced or adapted)
├── interactions.ts            # Interaction helpers (unchanged)
├── logo.svg                   # Ideon logo (unchanged)
├── components/                # NEW directory
│   ├── ViewTabs.tsx
│   ├── SidebarFilters.tsx
│   ├── SidebarSearch.tsx
│   ├── ContentOutline.tsx
│   ├── MetadataDrawer.tsx
│   ├── PublicationContext.tsx
│   ├── SeriesContext.tsx
│   ├── KeywordsPanel.tsx
│   ├── GenerationMetadataPanel.tsx
│   ├── ContentPlanSections.tsx
│   ├── ImageGallery.tsx
│   ├── ActionsDropdown.tsx
│   └── OutputCard.tsx         # Replaces inline OutputCard function
```

### API Changes Summary

| Endpoint | Change |
|----------|--------|
| `GET /api/articles` | Add `publication`, `series`, `keywords` to each list item |
| `GET /api/articles/:slug` | Type `metaJson` as `PreviewMetaJson` instead of `unknown` |
| `GET /api/publications` | **New** — returns all configured publications |
| `GET /api/series` | **New** — returns all configured series |

### Migration Path

1. Start by adding the new API endpoints and extending the data types.
2. Update the preview server to populate `publication`, `series`, `keywords` in the article list response.
3. Implement the three-view layout with `ViewTabs`.
4. Add the `SidebarFilters` and `SidebarSearch` components.
5. Implement the `MetadataDrawer` with its sub-sections.
6. Build the `ContentOutline` component.
7. Build the `ContentPlanSections` and `ImageGallery` components.
8. Replace channel-specific output shells with uniform containers.
9. Apply Telepat design tokens throughout.
10. Test responsive behavior at all breakpoints.
