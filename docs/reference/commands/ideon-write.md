---
title: ideon write [idea]
description: Generate one primary content output and optional secondary outputs from an idea or job file.
keywords: [ideon, cli, write, generation, markdown, openrouter, replicate]
image: /img/logo.svg
---

# ideon write [idea]

## What This Command Does

`ideon write [idea]` runs the full Ideon pipeline to generate one required primary output plus optional secondary outputs, with optional image rendering when article output is selected.

## Usage

```bash
ideon write [idea] [--idea <idea>] [--audience <description>] [--job <path>] [--primary <type=1>] [--secondary <type=count> ...] [--style <style>] [--intent <intent>] [--length <size-or-words>] [--no-interactive] [--dry-run] [--enrich-links] [--link <expression->url>] [--unlink <expression>] [--max-links <n>]
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `[idea]` | None | No | string | n/a | Any natural-language text | Positional idea prompt when `--idea` is not provided. |
| `--idea <idea>` | `-i` | No | string | n/a | Any natural-language text | Explicit idea prompt. Takes precedence over positional idea. |
| `--audience <description>` | None | No | string | general non-specific audience | Any natural-language text | Audience hint used by shared-brief planning. |
| `--job <path>` | `-j` | No | string (path) | n/a | Valid JSON file path | Loads job definition from file. |
| `--primary <type=1>` | None | Yes in non-interactive mode | string | TTY prompt in interactive mode | `article`, `blog-post`, `linkedin-post`, `newsletter`, `press-release`, `reddit-post`, `science-paper`, `x-post`, `x-thread` with count `1` | Required primary target. Primary count must be exactly `1`. |
| `--secondary <type=count>` | None | No | repeatable string | none | Same target types as primary, count >= `1` | Optional repeatable secondary targets. |
| `--style <style>` | None | No | enum | `professional` | `academic`, `analytical`, `authoritative`, `conversational`, `empathetic`, `friendly`, `journalistic`, `minimalist`, `persuasive`, `playful`, `professional`, `storytelling`, `technical` | Writing style applied across generated content. |
| `--intent <intent>` | None | Yes in non-interactive mode | enum | TTY prompt in interactive mode | `announcement`, `case-study`, `cornerstone`, `counterargument`, `critique-review`, `deep-dive-analysis`, `how-to-guide`, `interview-q-and-a`, `listicle`, `opinion-piece`, `personal-essay`, `roundup-curation`, `tutorial` | Content intent that steers structure and argument shape across all generated outputs. |
| `--length <size-or-words>` | None | No | enum or integer | `medium` alias (`900` words) | `small`, `medium`, `large`, or positive integer | Target content length in words. Aliases map to `small=500`, `medium=900`, `large=1400`. |
| `--no-interactive` | None | No | boolean | `false` | `true` or omitted | Disables all prompts and fails fast when required inputs are missing. |
| `--dry-run` | None | No | boolean | `false` | `true` or omitted | Runs orchestration without provider API calls. |
| `--enrich-links` | None | No | boolean | `false` | `true` or omitted | Runs link enrichment stage after markdown generation. |
| `--link <expression->url>` | None | No | repeatable string | none | `"text->https://..."` | Adds or updates a custom link in the sidecar. Format: `expression->url`. Requires `--enrich-links`. Repeatable. Custom links take precedence over generated ones. |
| `--unlink <expression>` | None | No | repeatable string | none | Any expression string | Removes a custom link by expression. Repeatable. Requires `--enrich-links`. |
| `--max-links <n>` | None | No | positive integer | Derived from `--length` | Any positive integer | Caps the number of generated links. Does not apply to custom links. Requires `--enrich-links`. |

## Examples

```bash title="Minimal happy path"
ideon write "How AI changes technical publishing"
```

```bash title="Common real-world path"
ideon write "How small editorial teams scale content" --primary article=1 --secondary x-thread=2 --style technical --intent how-to-guide --length large
```

```bash title="Safety and debugging path"
ideon write --dry-run "How to test Ideon pipeline changes" --primary article=1
```

```bash title="One-shot agent-safe path"
ideon write --no-interactive --idea "How to productionize docs operations" --primary article=1 --style technical --intent tutorial --length 1200
```

## Non-Interactive Behavior

When `--no-interactive` is set, Ideon does not prompt for missing values, even in TTY environments.

- Missing idea input fails immediately.
- Missing `--primary`, `--style`, `--intent`, or `--length` in no-interactive mode fails immediately with actionable errors.
- `--length` accepts either aliases (`small`, `medium`, `large`) or a positive integer word count.
- This is the recommended mode for one-shot agent and CI workflows.

## Link Enrichment

- Link enrichment is a post-generation link-suggestion pass for eligible long-form markdown outputs.
- Ideon selects linkable phrases, resolves relevant source URLs with model + web search, and writes results to `*.links.json` sidecar files.
- The original markdown files are not rewritten by this step.
- During `ideon write`, enrichment runs only when `--enrich-links` is provided.
- Short-form channels such as `x-post` and `x-thread` are skipped.
- Use `--link "expression->url"` to add custom links that are saved separately and always included (see [ideon links](./ideon-links.md) for full custom link semantics).
- Use `--max-links <n>` to cap the number of generated links; defaults to 5 / 8 / 12 based on `--length`.

## Output and Exit Codes

On success, Ideon writes generation outputs under `output/<timestamp>-<slug>/` and prints pipeline completion details.

| Exit code | Meaning |
| --- | --- |
| `0` | Write completed successfully. |
| `1` | Validation or runtime failure occurred. |
| `130` | Command interrupted by `Ctrl+C`. |

## Related Commands

- [ideon write resume](./ideon-write-resume.md)
- [ideon config](./ideon-config.md)
- [ideon preview [markdownPath]](./ideon-preview.md)
- [ideon settings](./ideon-settings.md)
- [Configuration Guide](../../guides/configuration.md)

## Versioning and Deprecation Notes

- Current behavior applies to Ideon `0.1.6`.
- Deprecated `--target` syntax was replaced by `--primary` and repeatable `--secondary`.
