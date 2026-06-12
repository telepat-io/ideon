# Output Structure Reference

Agent-oriented guide to Ideon generation artifacts on disk. Canonical user docs: [docs/guides/output-structure.md](../../../docs/guides/output-structure.md).

---

## Default paths

| Setting / env | Default | Purpose |
| --- | --- | --- |
| `markdownOutputDir` | `~/.ideon/output` (via `IDEON_HOME`, default `~`) | Root for generation directories |
| `assetOutputDir` | `~/.ideon/output/assets` | Shared asset directory (configurable) |
| Resume session | `~/.ideon/sessions/<project-hash>/state.json` | Write-session state for `ideon_write_resume` |

Configured paths beginning with `/output` resolve relative to the current working directory.

Each successful run creates **one flat generation directory**:

```text
~/.ideon/output/<YYYYMMDD-HHmmss-slug>/
  article-1.md
  article-1.links.json       # beside markdown, when link enrichment ran
  x-post-1.md                # secondary outputs (if requested)
  meta.json
  job.json
  plan.md                    # article-primary runs
  generation.analytics.json
  model.interactions.json
  cover-1.png                # images use relative paths from markdown
  inline-1-2.png
```

Markdown filenames use `<content-type>-<n>.md` (e.g. `article-1.md`, `blog-1.md`, `x-thread-1.md`, `linkedin-1.md`).

---

## Post-write playbook (MCP)

After `ideon_write` or `ideon_write_resume` succeeds, read `structuredContent`:

| Field | Use |
| --- | --- |
| `generationDir` | Root directory for this run — open `meta.json` here first |
| `markdownPath` | Primary markdown file path |
| `markdownPaths` | All generated markdown paths |
| `slug`, `title`, `outputCount` | Quick summary |
| `analyticsPath` | Run-level analytics (`ideon_write` only) |

Then:

1. Read `<generationDir>/meta.json` for full metadata (`outputs[]`, `images[]`, `editorialChecklist`, `seoCheck`).
2. Read primary markdown at `markdownPath` (or path from `meta.json` `outputs[0]`).
3. **Export (optional)** — `ideon_export` with `generationId` = slug and `destinationPath`; no auto-export on `ideon_write` unless you used `exportPath` on resume/queue.
4. **Discover older runs** — `ideon_article_list` (JSON array in response `content` text).

Full `meta.json` schema is below.

---

## `meta.json` (authoritative metadata)

Location: `<generationDir>/meta.json`. Single machine-readable index for a run.

| Field | Type | Description |
| --- | --- | --- |
| `version` | `1` | Schema version |
| `title`, `slug`, `idea`, `description` | string | Core content metadata |
| `subtitle`, `keywords`, `angle` | string / string[] / string | Long-form metadata (nullable when absent) |
| `primaryKeyword` | string | Main SEO keyword when assigned |
| `contentType`, `style`, `intent`, `targetLength` | string | Generation parameters |
| `cover` | object \| null | Cover image: `path`, `relativePath`, `description` |
| `sections` | array | `{ title, description, targetKeywords? }` per H2 |
| `images` | array | All images: `id`, `kind` (`cover` \| `inline`), paths, `anchorAfterSection` |
| `outputs` | array | All markdown files: `fileId`, `contentType`, `path`, `relativePath` |
| `seoCheck` | object | When present: `passed`, `seoCheckMode`, `warningsRemaining`, `issues[]`, editor cost |
| `author` | string | Resolved author slug (optional) |
| `publication`, `series` | string | Active slugs when set |
| `editorialChecklist` | array | Pre-publish items: `id`, `severity` (`required` \| `recommended`), `message` |
| `generatedAt` | ISO string | Completion timestamp |
| `generationDir` | string | Absolute path to this directory |

Example (truncated):

```json
{
  "version": 1,
  "title": "How teams operationalize content systems",
  "slug": "operationalize-content-systems",
  "outputs": [
    { "fileId": "article-1", "contentType": "article", "relativePath": "article-1.md" }
  ],
  "editorialChecklist": [
    { "id": "add-byline", "severity": "required", "message": "Add a human author byline before publish." }
  ],
  "generationDir": "/Users/you/.ideon/output/20260327-operationalize-content-systems"
}
```

---

## Link sidecar (`<name>.links.json`)

Location: same directory as the markdown file (e.g. `article-1.links.json` beside `article-1.md`). Written when link enrichment runs (`enrichLinks: true` on write, or `ideon_links`).

**v2 format:**

```json
{
  "version": 2,
  "customLinks": [
    { "expression": "React Suspense API", "url": "https://react.dev/...", "title": "React Suspense", "isCustom": true }
  ],
  "links": [
    { "expression": "async data fetching", "url": "https://example.com/...", "title": "Patterns", "isCustom": false }
  ]
}
```

- `customLinks` — user-provided (`link: ["expr->url"]`); inserted first, take precedence.
- `links` — auto-discovered; deduplicated against custom URLs.
- Legacy v1: `{ version: 1, links: [...] }` only — treat `customLinks` as `[]`.

Raw generation dirs keep sidecars separate. **`ideon_export`** inlines links into `<slug>.md` from the primary variant's sidecar.

---

## Markdown files

YAML frontmatter includes: `title`, `subtitle`, `slug`, `description`, `keywords`, plus body with H1, sections (H2), cover/inline image embeds, conclusion, and optional `## FAQ`.

Image embeds use **relative paths** from the markdown file to image files in the generation directory (or shared asset dir).

---

## Internal vs exportable files

| File | In raw gen dir | Copied by `ideon_export` |
| --- | --- | --- |
| `*.md` | Yes | Primary → `<slug>.md` with inlined links; secondaries copied as-is |
| `meta.json`, images, secondary `.md` | Yes | Yes |
| `*.links.json` | Yes | Yes (also inlined into exported primary) |
| `job.json` | Yes | **No** (internal) |
| `model.interactions.json` | Yes | **No** (internal) |
| `generation.analytics.json` | Yes | **No** (internal) |

---

## Analytics and debug artifacts

- **`generation.analytics.json`** — per-stage duration, cost, image/SEO metrics (run-level).
- **`model.interactions.json`** — raw LLM/T2I request/response payloads for debugging.
- **`job.json`** — resolved run definition (idea, settings, content targets).

Agents doing editorial work can ignore these; use them for cost/debug analysis only.

---

## `ideon_article_list` response

Returns a JSON array as the tool response `content` text (always JSON, regardless of `verbose`).

Each element:

| Field | Type | Description |
| --- | --- | --- |
| `slug` | string | Article slug (from frontmatter or filename) |
| `title` | string | From H1 or `meta.json` |
| `description` | string | From `meta.json` |
| `keywords` | string[] | From `meta.json` |
| `contentType` | string | Primary content type |
| `publication` | string | Publication slug (optional) |
| `series` | string | Series slug (optional) |
| `idea` | string | Original idea |
| `generationDir` | string | Absolute path to generation directory |
| `mtime` | ISO string | Primary markdown modification time |

The `verbose` parameter affects CLI table output only; MCP always returns this JSON shape. Use `generationDir` + `meta.json` for full artifact detail.
