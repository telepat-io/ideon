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
ideon write [idea] [--idea <idea>] [--audience <description>] [--job <path>] [--primary <type=1>] [--secondary <type=count> ...] [--style <style>] [--length <size>] [--no-interactive] [--dry-run] [--no-enrich-links]
```

## Arguments and Options

| Flag/Argument | Shorthand | Required | Type | Default | Allowed Values | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `[idea]` | None | No | string | n/a | Any natural-language text | Positional idea prompt when `--idea` is not provided. |
| `--idea <idea>` | `-i` | No | string | n/a | Any natural-language text | Explicit idea prompt. Takes precedence over positional idea. |
| `--audience <description>` | None | No | string | general non-specific audience | Any natural-language text | Audience hint used by shared-brief planning. |
| `--job <path>` | `-j` | No | string (path) | n/a | Valid JSON file path | Loads job definition from file. |
| `--primary <type=1>` | None | Yes in non-interactive mode | string | TTY prompt in interactive mode | `article`, `blog-post`, `x-thread`, `x-post`, `reddit-post`, `linkedin-post`, `newsletter`, `landing-page-copy` with count `1` | Required primary target. Primary count must be exactly `1`. |
| `--secondary <type=count>` | None | No | repeatable string | none | Same target types as primary, count >= `1` | Optional repeatable secondary targets. |
| `--style <style>` | None | No | enum | `professional` | `professional`, `friendly`, `technical`, `academic`, `opinionated`, `storytelling` | Writing style applied across generated content. |
| `--length <size>` | None | No | enum | `medium` | `small`, `medium`, `large` | Target content length. |
| `--no-interactive` | None | No | boolean | `false` | `true` or omitted | Disables all prompts and fails fast when required inputs are missing. |
| `--dry-run` | None | No | boolean | `false` | `true` or omitted | Runs orchestration without provider API calls. |
| `--no-enrich-links` | None | No | boolean | `false` | `true` or omitted | Skips link enrichment stage after markdown generation. |

## Examples

```bash title="Minimal happy path"
ideon write "How AI changes technical publishing"
```

```bash title="Common real-world path"
ideon write "How small editorial teams scale content" --primary article=1 --secondary x-thread=2 --style technical --length large
```

```bash title="Safety and debugging path"
ideon write --dry-run "How to test Ideon pipeline changes" --primary article=1
```

```bash title="One-shot agent-safe path"
ideon write --no-interactive --idea "How to productionize docs operations" --primary article=1 --style technical --length medium
```

## Non-Interactive Behavior

When `--no-interactive` is set, Ideon does not prompt for missing values, even in TTY environments.

- Missing idea input fails immediately.
- Missing `--primary`, `--style`, or `--length` in no-interactive mode fails immediately with actionable errors.
- This is the recommended mode for one-shot agent and CI workflows.

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
