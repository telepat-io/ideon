# Ideon MCP Tool Catalog

Complete parameter reference for all 39 Ideon MCP tools.

## Tool index

1. [ideon_write](#ideon_write)
2. [ideon_write_resume](#ideon_write_resume)
3. [ideon_delete](#ideon_delete)
4. [ideon_links](#ideon_links)
5. [ideon_export](#ideon_export)
6. [ideon_article_list](#ideon_article_list)
7. [ideon_preview](#ideon_preview)
8. [ideon_config_list](#ideon_config_list)
9. [ideon_config_get](#ideon_config_get)
10. [ideon_config_set](#ideon_config_set)
11. [ideon_config_unset](#ideon_config_unset)
12. [ideon_publication_add](#ideon_publication_add)
13. [ideon_publication_list](#ideon_publication_list)
14. [ideon_publication_edit](#ideon_publication_edit)
15. [ideon_publication_remove](#ideon_publication_remove)
16. [ideon_series_add](#ideon_series_add)
17. [ideon_series_list](#ideon_series_list)
18. [ideon_series_edit](#ideon_series_edit)
19. [ideon_series_remove](#ideon_series_remove)
20. [ideon_author_add](#ideon_author_add)
21. [ideon_author_list](#ideon_author_list)
22. [ideon_author_edit](#ideon_author_edit)
23. [ideon_author_remove](#ideon_author_remove)
24. [ideon_queue_add](#ideon_queue_add)
25. [ideon_queue_list](#ideon_queue_list)
26. [ideon_queue_peek](#ideon_queue_peek)
27. [ideon_queue_remove](#ideon_queue_remove)
28. [ideon_queue_clear](#ideon_queue_clear)
29. [ideon_queue_write](#ideon_queue_write)
30. [ideon_plan_explore](#ideon_plan_explore)
31. [ideon_plan_expand](#ideon_plan_expand)
32. [gkp_generate_ideas](#gkp_generate_ideas)
33. [gkp_get_historical_data](#gkp_get_historical_data)
34. [gkp_get_forecast_data](#gkp_get_forecast_data)
35. [gkp_list](#gkp_list)
36. [gads_login](#gads_login)
37. [gads_login_status](#gads_login_status)
38. [gads_test](#gads_test)
39. [gads_logout](#gads_logout)

---

## Content generation tools

### `ideon_write`

Generate content from an idea using the Ideon pipeline.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `idea` | string | Yes | — | The content idea or prompt. |
| `audience` | string | No | — | Target audience description. |
| `author` | string | No | — | Author slug (overrides publication/series defaults). |
| `experienceNotes` | string | No | — | Per-run anecdotes or first-hand experience. |
| `jobPath` | string | No | — | Path to a job JSON file. |
| `publication` | string | No | — | Publication slug for defaults and editorial policy. |
| `series` | string | No | — | Series slug for defaults and thematic context. |
| `keywords` | string | No | — | Comma-separated SEO keywords (e.g. `"organic marketing, seo"`). |
| `faqSection` | boolean | No | Intent default | Force FAQ block on (`true`) or off (`false`) after conclusion. |
| `primary` | string | No | — | Primary target spec: `<content-type=1>`. |
| `secondary` | string[] | No | — | Secondary target specs: `["<type=count>", ...]`. |
| `style` | enum | No | From config | Writing style. See allowed values below. |
| `intent` | enum | No | From config | Content intent. See allowed values below. |
| `length` | enum\|int | No | From config | `small`/`medium`/`large` or positive integer. |
| `dryRun` | boolean | No | `false` | Validate without generating. |
| `noSeoCheck` | boolean | No | `false` | Skip SEO lint and editor pass after section writing. |
| `seoCheckMode` | enum | No | From config | `errors-only` or `strict`. |
| `seoCheckMaxTurns` | int | No | From config | Max editor-agent turns (1–20, default 10). |
| `enrichLinks` | boolean | No | `false` | Enable link enrichment for long-form outputs. |
| `link` | string[] | No | — | Custom link mappings: `"expression->url"`. |
| `unlink` | string[] | No | — | Remove custom links by expression. |
| `maxLinks` | int | No | Auto | Cap generated links. Defaults: ≤700w→5, ≤1150w→8, >1150w→12. |
| `maxImages` | int | No | Auto | Cap total images (1=cover only). |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `slug` | string | Generated article slug. |
| `title` | string | Generated title. |
| `outputCount` | number | Number of outputs generated. |
| `markdownPath` | string | Path to primary markdown file. |
| `markdownPaths` | string[] | Paths to all markdown files. |
| `generationDir` | string | Path to generation directory. |
| `analyticsPath` | string | Path to analytics sidecar. |

---

### `ideon_write_resume`

Resume the last failed or interrupted Ideon write session.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `dryRun` | boolean | No | `false` | Validate without generating. |
| `seoCheck` | boolean | No | `false` | Force re-run of SEO lint and editor pass before continuing. |
| `seoCheckMode` | enum | No | From config | `errors-only` or `strict`. |
| `seoCheckMaxTurns` | int | No | From config | Max editor-agent turns (1–20, default 10). |
| `enrichLinks` | boolean | No | `false` | Enable link enrichment. |
| `link` | string[] | No | — | Custom link mappings. |
| `unlink` | string[] | No | — | Remove custom links. |
| `maxLinks` | int | No | Auto | Cap generated links. |
| `maxImages` | int | No | Auto | Cap total images. |
| `exportPath` | string | No | — | Export the generated article to this directory after writing. |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `slug` | string | Resumed article slug. |
| `title` | string | Generated title. |
| `outputCount` | number | Outputs generated. |
| `markdownPath` | string | Primary markdown path. |
| `markdownPaths` | string[] | All markdown paths. |
| `generationDir` | string | Generation directory. |
| `exportPath` | string | Export destination when provided. |

---

### `ideon_delete`

Delete generated output and assets by slug.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `slug` | string | Yes | — | The slug of the output to delete. |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `slug` | string | The deleted slug. |
| `deleted` | boolean | Always `true`. |

---

### `ideon_links`

Run link enrichment for a previously generated article by slug.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `slug` | string | Yes | — | Article slug to enrich. |
| `mode` | enum | No | `"fresh"` | `fresh` replaces generated links; `append` merges. |
| `link` | string[] | No | — | Custom link mappings: `"expression->url"`. |
| `unlink` | string[] | No | — | Remove custom links by expression. |
| `maxLinks` | int | No | Auto | Cap generated links. |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `slug` | string | The enriched slug. |
| `mode` | string | The mode used (`fresh` or `append`). |

---

### `ideon_export`

Export a generated article as a standalone markdown file with inline links and copied images.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `generationId` | string | Yes | — | Generation ID or slug. |
| `destinationPath` | string | Yes | — | Destination directory. |
| `index` | int | No | `1` | Which primary variant to export (1-based). |
| `overwrite` | boolean | No | `false` | Replace existing file at destination. |

**Export behavior:**

- Primary markdown is written as `<slug>.md` with inline links from `.links.json` sidecars.
- All non-internal files from the generation directory are copied to destination.
- Internal files never exported: `job.json`, `model.interactions.json`, `generation.analytics.json`.
- `meta.json` and all secondary outputs are always included.

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `generationId` | string | The generation that was exported. |
| `destinationPath` | string | Export destination. |
| `index` | number | Variant index used. |
| `overwrite` | boolean | Whether overwrite was enabled. |
| `messages` | string[] | Log messages from the export process. |

---

### `ideon_article_list`

List generated articles in the current workspace.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `search` | string | No | — | Search by title, keywords, description, or body. |
| `publication` | string | No | — | Filter by publication slug. |
| `series` | string | No | — | Filter by series slug. |
| `contentType` | string | No | — | Filter by content type (e.g. `article`, `x-post`). |
| `limit` | int | No | `50` | Maximum number of results. |
| `verbose` | boolean | No | `false` | Include detailed article metadata. |

Returns a JSON array of article objects with slug, title, and metadata.

---

### `ideon_preview`

Start, stop, or check status of the local preview server for generated Ideon content.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `action` | enum | Yes | — | `start`, `stop`, or `status` |
| `port` | integer | No | `4173` | TCP port for the preview server (start only) |
| `markdownPath` | string | No | Newest generated markdown | Specific markdown file to preview (start only) |

**Response `structuredContent`:**

| action | Fields |
| --- | --- |
| `start` | `status`, `url`, `port`, `markdownPath` |
| `stop` | `status` |
| `status` | `status`, and when running: `url`, `port`, `markdownPath`, `startedAt` |

Status reflects preview servers started by the current MCP process only.

---

## Configuration tools

### `ideon_config_list`

List current settings and secret availability flags.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| — | — | — | — | No parameters. |

Returns JSON with `settings` (actual values) and `secrets` (boolean availability flags).

---

### `ideon_config_get`

Read a configuration value or secret availability flag.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `key` | enum | Yes | — | Config key. See allowed keys below. |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `key` | string | The config key. |
| `value` | any | The value (for settings) or boolean (for secrets). |
| `isSecret` | boolean | Whether this is a secret key. |

---

### `ideon_config_set`

Set a configuration value or secret token.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `key` | enum | Yes | — | Config key. See allowed keys below. |
| `value` | string | Yes | — | Value to set. |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `key` | string | The key that was set. |
| `updated` | boolean | Always `true`. |

---

### `ideon_config_unset`

Reset a setting to its default or delete a stored secret.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `key` | enum | Yes | — | Config key. See allowed keys below. |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `key` | string | The key that was unset. |
| `updated` | boolean | Always `true`. |

---

### Config keys

**Setting keys:**

| Key | Type | Description |
| --- | --- | --- |
| `model` | string | LLM model ID. |
| `modelSettings.temperature` | number | Temperature (0–2). |
| `modelSettings.maxTokens` | int | Max tokens. |
| `modelSettings.topP` | number | Top-P (0–1). |
| `modelRequestTimeoutMs` | int | Request timeout in ms. |
| `notifications.enabled` | boolean | Enable notifications. |
| `t2i.replicateModelId` | string | Text-to-image model ID. |
| `style` | enum | Default writing style. |
| `intent` | enum | Default content intent. |
| `targetLength` | enum | Default target length. |
| `defaultPublication` | string | Default publication slug. |

**Secret keys:**

| Key | Description |
| --- | --- |
| `openRouterApiKey` | OpenRouter API key. |
| `replicateApiToken` | Replicate API token. |
| `googleAdsDeveloperToken` | Google Ads developer token. |
| `googleAdsClientId` | Google Ads OAuth2 client ID. |
| `googleAdsClientSecret` | Google Ads OAuth2 client secret. |
| `googleAdsRefreshToken` | Google Ads OAuth2 refresh token. |
| `googleAdsCustomerId` | Google Ads customer ID. |
| `googleAdsLoginCustomerId` | Google Ads login customer ID (optional). |

---

## Publication tools

### `ideon_publication_add`

Create a new publication with editorial policy and defaults.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | string | Yes | — | Publication name. |
| `style` | enum | No | — | Default writing style. |
| `intent` | enum | No | — | Default content intent. |
| `length` | enum\|int | No | — | Default target length. |
| `type` | enum | No | — | Default content type. |
| `audience` | string | No | — | Default target audience hint. |
| `country` | string | No | — | Comma-separated ISO country codes. |
| `language` | string | No | — | ISO 639-1 language code. |
| `tone` | string | No | — | Editorial tone. |
| `forbiddenTopics` | string[] | No | — | Topics to avoid. |
| `disclosureRequirements` | string[] | No | — | Required disclosures. |
| `audienceRestrictions` | string[] | No | — | Audience constraints. |
| `editorialPolicy` | string | No | — | Free-text editorial notes. |

Returns the created publication object.

---

### `ideon_publication_list`

List all publications.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| — | — | — | — | No parameters. |

Returns a JSON array of publication objects.

---

### `ideon_publication_edit`

Update fields on an existing publication (patch semantics).

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `slug` | string | Yes | — | Publication slug. |
| `name` | string | No | — | New name. |
| `style` | enum | No | — | Writing style. |
| `intent` | enum | No | — | Content intent. |
| `length` | enum\|int | No | — | Target length. |
| `type` | enum | No | — | Content type. |
| `audience` | string | No | — | Target audience. |
| `country` | string | No | — | ISO country codes. |
| `language` | string | No | — | ISO language code. |
| `tone` | string | No | — | Editorial tone. |
| `forbiddenTopics` | string[] | No | — | Topics to avoid. |
| `disclosureRequirements` | string[] | No | — | Required disclosures. |
| `audienceRestrictions` | string[] | No | — | Audience constraints. |
| `editorialPolicy` | string | No | — | Editorial notes. |

Returns the updated publication object.

---

### `ideon_publication_remove`

Delete a publication by slug.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `slug` | string | Yes | — | Publication slug. |

Returns `{ deleted: true, slug: "..." }`.

---

## Author tools

### `ideon_author_add`

Create an author profile with experience, voice, and credentials.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | string | Yes | — | Author display name. |
| `profile` | string | No | — | Freeform author profile text. |

### `ideon_author_list`

List all author profiles. No parameters.

### `ideon_author_edit`

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `slug` | string | Yes | — | Author slug. |
| `name` | string | No | — | Updated name. |
| `profile` | string | No | — | Updated profile. |

### `ideon_author_remove`

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `slug` | string | Yes | — | Author slug to delete. |

---

## Series tools

### `ideon_series_add`

Create a new content series with editorial policy and defaults.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | string | Yes | — | Series name. |
| `topic` | string | No | — | Series topic description. |
| `publication` | string | No | — | Publication slug to associate. |
| `style` | enum | No | — | Default writing style. |
| `intent` | enum | No | — | Default content intent. |
| `length` | enum\|int | No | — | Default target length. |
| `type` | enum | No | — | Default content type. |
| `audience` | string | No | — | Default audience hint. |
| `country` | string | No | — | ISO country codes. |
| `language` | string | No | — | ISO language code. |
| `keywords` | string[] | No | — | Series-level SEO keywords. |
| `tone` | string | No | — | Editorial tone. |
| `forbiddenTopics` | string[] | No | — | Topics to avoid. |
| `disclosureRequirements` | string[] | No | — | Required disclosures. |
| `audienceRestrictions` | string[] | No | — | Audience constraints. |
| `editorialPolicy` | string | No | — | Editorial notes. |

Returns the created series object.

---

### `ideon_series_list`

List all content series, optionally filtered by publication.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `publication` | string | No | — | Filter by publication slug. |

Returns a JSON array of series objects.

---

### `ideon_series_edit`

Update fields on an existing series (patch semantics).

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `slug` | string | Yes | — | Series slug. |
| `name` | string | No | — | New name. |
| `topic` | string | No | — | New topic. |
| `publication` | string | No | — | Publication slug. |
| `unsetPublication` | boolean | No | `false` | Remove publication association. |
| `style` | enum | No | — | Writing style. |
| `intent` | enum | No | — | Content intent. |
| `length` | enum\|int | No | — | Target length. |
| `type` | enum | No | — | Content type. |
| `audience` | string | No | — | Audience hint. |
| `country` | string | No | — | ISO country codes. |
| `language` | string | No | — | ISO language code. |
| `keywords` | string[] | No | — | SEO keywords. |
| `tone` | string | No | — | Editorial tone. |
| `forbiddenTopics` | string[] | No | — | Topics to avoid. |
| `disclosureRequirements` | string[] | No | — | Required disclosures. |
| `audienceRestrictions` | string[] | No | — | Audience constraints. |
| `editorialPolicy` | string | No | — | Editorial notes. |

Returns the updated series object.

---

### `ideon_series_remove`

Delete a series by slug.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `slug` | string | Yes | — | Series slug. |

Returns `{ deleted: true, slug: "..." }`.

---

## Queue tools

### `ideon_queue_add`

Add an article idea to the content queue.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `idea` | string | Yes | — | Article idea. |
| `publication` | string | No | — | Publication slug. |
| `series` | string | No | — | Series slug. |
| `style` | enum | No | — | Writing style. |
| `intent` | enum | No | — | Content intent. |
| `length` | enum\|int | No | — | Target length. |
| `type` | enum | No | — | Content type. |
| `audience` | string | No | — | Target audience. |
| `country` | string | No | — | ISO country codes. |
| `language` | string | No | — | ISO language code. |
| `exportPath` | string | No | — | Auto-export path for when article is written. |

Returns the created queue entry object.

---

### `ideon_queue_list`

List queued articles, optionally filtered by status and publication.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `status` | enum | No | — | Filter by status: `pending`, `in-progress`. |
| `publication` | string | No | — | Filter by publication slug. |

Returns a JSON array of queue entry objects.

---

### `ideon_queue_peek`

Show the next pending queue entry without claiming it.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `publication` | string | No | — | Filter by publication slug. |

Returns the next pending entry object, or `null` if the queue is empty.

---

### `ideon_queue_remove`

Delete a queue entry by ID.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | string | Yes | — | Queue entry ID. |

Returns `{ deleted: true, id: "..." }`.

---

### `ideon_queue_clear`

Delete all queue entries.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| — | — | — | — | No parameters. |

Returns `{ cleared: <count> }`.

---

### `ideon_queue_write`

Claim the next pending queue entry and write it. Deletes the entry on success, reverts to pending on failure.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `publication` | string | No | — | Filter by publication slug. |
| `dryRun` | boolean | No | `false` | Validate without generating. |
| `noSeoCheck` | boolean | No | `false` | Skip SEO lint and editor pass. |
| `seoCheckMode` | enum | No | From config | `errors-only` or `strict`. |
| `seoCheckMaxTurns` | int | No | From config | Max editor-agent turns (1–20). |
| `enrichLinks` | boolean | No | `false` | Enable link enrichment. |
| `link` | string[] | No | — | Custom link mappings. |
| `unlink` | string[] | No | — | Remove custom links. |
| `maxLinks` | int | No | Auto | Cap generated links. |
| `maxImages` | int | No | Auto | Cap total images. |

If the queue entry has `exportPath` (set via `ideon_queue_add`), the article is exported after a successful write.

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `queueEntryId` | string | The claimed queue entry ID. |
| `slug` | string | Generated article slug. |
| `markdownPath` | string | Primary markdown path. |
| `exportPath` | string | Export destination from the queue entry, if any. |

---

## Planning tools

### `ideon_plan_explore`

Research a content idea using keyword planner and generate series/article plans.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `idea` | string | Yes | — | Content idea to research. |
| `publication` | string | Yes | — | Publication slug. Must exist. |
| `context` | string | No | — | Business context or ICP description. |
| `country` | string | No | Publication default | Comma-separated ISO country codes. |
| `language` | string | No | Publication default | ISO 639-1 language code. |
| `seriesCount` | int | No | `3` | Target number of series. |
| `articlesPerSeries` | int | No | `5` | Target articles per series. |
| `seedKeywords` | string[] | No | — | Keywords to always include. |
| `excludeSeries` | string[] | No | — | Series slugs to avoid. |
| `contentType` | enum | No | `"article"` | Content type for queue entries. |
| `model` | string | No | `deepseek/deepseek-v4-pro` | LLM model for reasoning. |
| `intentModel` | string | No | `deepseek/deepseek-v4-flash` | LLM model for intent classification. |
| `autoSave` | boolean | No | `false` | Persist without human confirmation. |
| `dryRun` | boolean | No | `false` | Research without persisting. |
| `timeout` | int | No | `600` | Timeout in seconds. |

Returns a structured plan with series details, article plans, research stats, and queue commands.

---

### `ideon_plan_expand`

Expand an existing series with new article ideas using keyword research.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `seriesSlug` | string | Yes | — | Existing series slug. |
| `publication` | string | No | Series default | Publication slug. |
| `country` | string | No | Publication default | Comma-separated ISO country codes. |
| `language` | string | No | Publication default | ISO 639-1 language code. |
| `articleCount` | int | No | `5` | New articles to plan. |
| `seedKeywords` | string[] | No | — | Additional seed keywords. |
| `contentType` | enum | No | `"article"` | Content type for queue entries. |
| `model` | string | No | `deepseek/deepseek-v4-pro` | LLM model for reasoning. |
| `intentModel` | string | No | `deepseek/deepseek-v4-flash` | LLM model for intent classification. |
| `autoSave` | boolean | No | `false` | Persist without human confirmation. |
| `dryRun` | boolean | No | `false` | Research without persisting. |
| `timeout` | int | No | `600` | Timeout in seconds. |

Returns a structured plan with article details, research stats, and queue commands.

---

## Google Keyword Planner tools

### `gkp_generate_ideas`

Generate keyword ideas from seed keywords, a URL, or a site using Google Ads Keyword Planner.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `seedKeywords` | string[] | No | — | Seed keywords. |
| `url` | string | No | — | URL to generate ideas from. |
| `site` | string | No | — | Site domain to generate ideas from. |
| `countryCodes` | string[] | No | All countries | ISO 3166-1 alpha-2 codes (e.g., `["US", "GB"]`). |
| `language` | string | No | `"en"` | ISO 639-1 code. |
| `pageSize` | int | No | — | Max results to return. |
| `publication` | string | No | — | Attach cache context to a publication slug. |
| `series` | string | No | — | Attach cache context to a series slug. |
| `refresh` | boolean | No | `false` | Bypass cache and fetch fresh data. |

At least one of `seedKeywords`, `url`, or `site` must be provided. `site` cannot be combined with `seedKeywords` or `url`.

Returns a JSON array of keyword idea objects.

---

### `gkp_get_historical_data`

Get historical search volume and competition metrics for a list of keywords.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `keywords` | string[] | Yes | — | Keywords to query. |
| `countryCodes` | string[] | No | All countries | ISO 3166-1 alpha-2 codes. |
| `language` | string | No | `"en"` | ISO 639-1 code. |
| `includeAverageCpc` | boolean | No | `true` | Include CPC data. |
| `publication` | string | No | — | Attach cache context to a publication slug. |
| `series` | string | No | — | Attach cache context to a series slug. |
| `refresh` | boolean | No | `false` | Bypass cache and fetch fresh data. |

Returns a JSON array of historical metric objects.

---

### `gkp_get_forecast_data`

Get projected impressions, clicks, and cost for a set of keywords.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `keywords` | string[] | Yes | — | Keywords to query. |
| `keywordMatchType` | enum | No | `"BROAD"` | `BROAD`, `EXACT`, or `PHRASE`. |
| `maxCpcBidMicros` | int | No | — | Max CPC bid in micros (1,000,000 = $1.00). |
| `countryCodes` | string[] | No | `["US"]` | ISO 3166-1 alpha-2 codes. |
| `language` | string | No | `"en"` | ISO 639-1 code. |
| `startDate` | string | No | Today | Forecast start date (`yyyy-MM-dd`). |
| `endDate` | string | No | 30 days from today | Forecast end date (`yyyy-MM-dd`). |
| `publication` | string | No | — | Attach cache context to a publication slug. |
| `series` | string | No | — | Attach cache context to a series slug. |
| `refresh` | boolean | No | `false` | Bypass cache and fetch fresh data. |

Returns a forecast object with projected impressions, clicks, and cost.

---

### `gkp_list`

List cached GKP query history with optional filters.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `publication` | string | No | — | Filter by publication slug. |
| `series` | string | No | — | Filter by series slug. |
| `search` | string | No | — | Filter by keyword, URL, site, publication, or series text. |
| `fresh` | boolean | No | `false` | Show only fresh cache entries. |
| `stale` | boolean | No | `false` | Show only stale cache entries. |
| `verbose` | boolean | No | `false` | Include full cache entry details. |

Returns a JSON array of cached query summaries.

---

## Google Ads authentication tools

### `gads_login`

Start the Google Ads OAuth2 authorization flow. Saves credentials and returns an auth URL for the user to open in their browser. The OAuth callback runs in the background.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `developerToken` | string | Yes | — | Google Ads developer token. |
| `clientId` | string | Yes | — | OAuth2 client ID. |
| `clientSecret` | string | Yes | — | OAuth2 client secret. |
| `customerId` | string | Yes | — | Google Ads customer ID (10 digits). |
| `loginCustomerId` | string | No | — | Manager account ID (optional). |
| `force` | boolean | No | `false` | Re-authorize even if refresh token exists. |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `authUrl` | string | The Google OAuth consent URL the user should open. |
| `port` | number | The local port the temporary server is listening on. |
| `status` | string | Always `"pending"` on success. |

The background server listens on `localhost` (ports 9876–9879), handles the `/callback` redirect from Google, exchanges the auth code for a refresh token, saves it via `ideon_config_set`, and shuts down automatically. Timeout is 120 seconds.

---

### `gads_login_status`

Check the status of the Google Ads OAuth flow started by `gads_login`.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| — | — | — | — | No parameters. |

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `status` | string | `not_started`, `pending`, `completed`, or `timed_out`. |
| `authUrl` | string | The auth URL (only present when `pending`). |
| `elapsed` | number | Seconds since flow started (only present when `pending`). |
| `message` | string | Error details (only present when `timed_out`). |

---

### `gads_test`

Verify Google Ads credentials by making a test Keyword Planner API call.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| — | — | — | — | No parameters. |

Checks that all 5 required credentials are set (developerToken, clientId, clientSecret, refreshToken, customerId), then calls `gkp_generate_ideas` with `seedKeywords: ["test"]` and `pageSize: 1`.

**Response `structuredContent` (on success):**

| Field | Type | Description |
| --- | --- | --- |
| `verified` | boolean | Always `true`. |
| `customerId` | string | The customer ID used. |
| `keywordsReturned` | number | Number of keywords returned by the test call. |

Returns `isError: true` with a diagnostic message if credentials are missing or the API call fails.

---

### `gads_logout`

Clear stored Google Ads credentials.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `all` | boolean | No | `false` | When `true`, clear all six Google Ads secrets; otherwise clear only the refresh token. |

Also resets any in-flight MCP OAuth flow state from `gads_login`.

**Response `structuredContent`:**

| Field | Type | Description |
| --- | --- | --- |
| `all` | boolean | Whether all credentials were cleared. |
| `cleared` | boolean | Always `true` on success. |

---

## Allowed enum values

### Content types (`type`)

`article`, `blog-post`, `linkedin-post`, `newsletter`, `press-release`, `reddit-post`, `science-paper`, `x-post`, `x-thread`

### Writing styles (`style`)

`academic`, `analytical`, `authoritative`, `conversational`, `empathetic`, `friendly`, `journalistic`, `minimalist`, `persuasive`, `playful`, `professional`, `storytelling`, `technical`

### Content intents (`intent`)

`announcement`, `case-study`, `cornerstone`, `counterargument`, `critique-review`, `deep-dive-analysis`, `how-to-guide`, `interview-q-and-a`, `listicle`, `opinion-piece`, `personal-essay`, `roundup-curation`, `tutorial`

### Target lengths (`length`)

`small` (500 words), `medium` (900 words), `large` (1400 words), or a positive integer.

### Link modes (`mode`)

`fresh` (replace generated links), `append` (merge into existing)

### Keyword match types (`keywordMatchType`)

`BROAD`, `EXACT`, `PHRASE`

### Queue entry statuses (`status`)

`pending`, `in-progress`
