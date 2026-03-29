---
title: Releasing and Docs Deploy
---

# Releasing and Docs Deploy

## Package Build Readiness

Before tagging a release:

```bash
npm run typecheck
npm test
npm run build
```

Ensure `package.json` is set to the scoped public package:

- name: `@telepat/ideon`
- publish access: `public`

## npm Release Automation

Publishing to npm is automated through GitHub Actions for repository `telepat-io/ideon`.

Trigger rules:

- Push a tag in the format `vX.Y.Z` (example: `v1.2.3`)
- The tagged commit must be reachable from `main`
- The tag version must exactly match `package.json` version

Workflow behavior:

1. verifies tag format and commit ancestry
2. verifies package name is `@telepat/ideon`
3. runs release quality gates (`lint`, `test`, `build`, `docs:build`)
4. publishes to npm with provenance

### Trusted Publishing Prerequisite

This repository uses npm Trusted Publishing (OIDC), not `NPM_TOKEN`.

In npm package settings for `@telepat/ideon`, configure a trusted publisher for:

- provider: GitHub Actions
- repository: `telepat-io/ideon`
- workflow: `.github/workflows/npm-publish.yml`

## Docs Deployment Target

Docs are configured for GitHub Pages:

- repository: `telepat-io/ideon`
- url: `https://docs.telepat.io`
- baseUrl: `/ideon/`

## Deployment Workflow

The GitHub Actions workflow:

1. checks out repository
2. installs docs dependencies
3. builds Docusaurus static output
4. uploads Pages artifact
5. deploys to GitHub Pages

## Operational Notes

- Enable GitHub Pages source as “GitHub Actions” in repository settings
- Deploy runs on main branch changes to docs/content workflow paths
- Ensure Pages permissions are enabled for workflow token
