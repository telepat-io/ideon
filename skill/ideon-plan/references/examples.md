# Examples

## Example 1: Net-new cluster planning

User request:

> Plan a new content series around keyword marketing for SaaS companies.

Expected skill behavior:

1. ask which publication should own the plan
2. ask for target market if publication does not imply it
3. inspect prior coverage with `ideon article list`
4. run GKP discovery and historical checks
5. cluster keywords into series
6. propose 5 to 10 article ideas with angles and confidence
7. wait for approval before creating a series or queue entries

## Example 2: Expand an existing series

User request:

> Add more ideas to our onboarding-guides series for the docs publication.

Expected skill behavior:

1. read the existing series and its keywords
2. read prior article coverage for the series
3. reuse cached keyword history for the same publication and series
4. run fresh GKP research only where the cache is missing or stale
5. propose distinct new articles instead of close rewrites
6. queue only the approved ideas

## Example 3: Sparse niche data

User request:

> Plan content for compliance automation in a tiny B2B niche.

Expected skill behavior:

1. start with niche terms
2. if data is sparse, broaden into adjacent terms and practitioner phrasing
3. only after adjacent exploration fails, surface a low-confidence plan
4. explain why confidence is limited instead of pretending the numbers are stronger than they are
# Examples

## Net-new cluster planning

Prompt:

```text
Use ideon-plan to research content strategy for SaaS onboarding. Plan net-new series for our publication tech-blog and queue the best article ideas after I approve them.
```

Expected planner behavior:

1. confirm publication, market, and scope
2. inspect `tech-blog` series, queue, and prior articles
3. research keywords with GKP and cache reuse
4. propose topic clusters and series
5. present queue-ready article ideas
6. save only after approval

## Expand an existing series

Prompt:

```text
Use ideon-plan to expand the series onboarding-playbooks for publication tech-blog. Focus on bottom-of-funnel SaaS onboarding keywords.
```

Expected planner behavior:

1. inspect the series and prior article coverage
2. reuse series keywords where appropriate
3. research adjacent and long-tail terms
4. propose new articles with distinct angles
5. update series keywords only if explicitly approved

## Cache-aware refresh

Prompt:

```text
Use ideon-plan to revisit our keyword plan for programmatic SEO. Prefer cached research unless it is stale, but refresh high-intent terms if needed.
```

Expected planner behavior:

1. inspect cached query and keyword records
2. reuse fresh records
3. force refresh only for stale or strategically important terms

## Thin-data niche topic

Prompt:

```text
Use ideon-plan to research compliance automation for niche biotech startups. If keyword data is sparse, broaden intelligently before giving up.
```

Expected planner behavior:

1. start with niche seeds
2. expand into adjacent terms and synonyms
3. only surface a low-confidence plan if the broader loop is still thin