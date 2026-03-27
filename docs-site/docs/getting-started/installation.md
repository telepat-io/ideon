---
sidebar_position: 2
title: Installation
---

# Installation

## Prerequisites

- Node.js 20+
- npm 10+
- macOS/Linux/Windows terminal with access to GitHub repository checkout

## Clone and Install

```bash
git clone https://github.com/cozymantis/ideon.git
cd ideon
npm install
```

## Verify the CLI in Development

```bash
npm run dev -- --help
```

## Build and Validate

```bash
npm run typecheck
npm test
npm run build
```

## Optional: Start the Documentation Site Locally

```bash
npm run docs:start
```

## Common Setup Issues

- `keytar` build/runtime issues: ensure system keychain APIs are available and Node is supported
- Missing Node version: switch to Node 20+ (for ESM + tooling compatibility)
- Permission issues writing output: override output directories in settings or environment vars
