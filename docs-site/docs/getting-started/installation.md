---
sidebar_position: 2
title: Installation
---

# Installation

## Prerequisites

- Node.js 20+
- npm 10+
- macOS/Linux/Windows terminal

## Install Globally

```bash
npm i -g @telepat/ideon
```

## Verify the CLI

```bash
ideon --help
```

## First-Time Setup

```bash
ideon settings
```

## Optional: Run From Source (Contributor Workflow)

```bash
git clone https://github.com/telepat-io/ideon.git
cd ideon
npm install
npm run build
npm link
ideon --help
```

## Common Setup Issues

- `keytar` build/runtime issues: ensure system keychain APIs are available and Node is supported
- Container or headless Linux environment (D-Bus/keyring unavailable): set `IDEON_DISABLE_KEYTAR=true` and provide `IDEON_OPENROUTER_API_KEY` plus `IDEON_REPLICATE_API_TOKEN` as environment variables
- Missing Node version: switch to Node 20+ (for ESM + tooling compatibility)
- Permission issues writing output: override output directories in settings or environment vars
