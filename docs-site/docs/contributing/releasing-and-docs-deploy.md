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

## Docs Deployment Target

Docs are configured for GitHub Pages:

- repository: `cozymantis/ideon`
- url: `https://cozymantis.github.io`
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
