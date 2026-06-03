
### ❌ Missing: SERP intent validation

This is the most significant gap. The plan covers **inferring** intent from keyword phrasing and CPC, but there's no step where the agent checks what Google is **actually ranking** for a shortlisted keyword before locking in the content format and angle.

The practical problem: a keyword like "content strategy for SaaS" might sound commercial/middle-of-funnel based on phrasing, but if the SERP is dominated by Reddit threads and forum discussions, a polished pillar article won't rank regardless of how well it's written. Conversely, a keyword that looks purely informational might have product pages in the top 3, signalling Google treats it as commercial.

**What to add:** After scoring and before cluster finalisation (between Phase 3 and Phase 4 in the agent prompt), add a SERP-check step. For the top 5–10 candidates per cluster, the agent should note: _"I cannot verify live SERP composition — user should manually check the top 3 results for [keyword] to confirm format match before committing to this article type."_ If you ever add a search API to the CLI, this is where it slots in. For now, at minimum add it as an explicit **confidence caveat** in the article plan output — flag articles where intent was inferred vs. verified.

----------

### ❌ Missing: content freshness / update strategy

The plan covers planning _new_ articles well, but says nothing about **refreshing existing content**. This matters because:

-   Google actively rewards recently updated content for time-sensitive keywords
-   Your `ideon article list` integration means you can already see what exists — but the plan never asks _"should this keyword go to a new article or an update to an existing one?"_
-   Practically, a planning run 6 months from now will find keywords already covered by articles in the output directory. The current dedup logic avoids creating duplicates, but it doesn't surface "this article exists but is 8 months old and could be refreshed and re-queued"

**What to add:** In the inventory/dedup phase, add a branch: if an existing article covers the target keyword and is older than a configurable threshold (e.g. 6 months), the agent should surface it as a **refresh candidate** rather than silently skipping it. This maps to a `ideon queue add --type refresh` or similar. Doesn't need to be complex — even a simple flag in the plan output ("existing article found, consider refresh") is significantly better than nothing.

----------

### ❌ Missing: publishing cadence / capacity constraint

The plan produces article lists sorted by priority, which is good. But there's no concept of **how many articles the team can actually publish per week/month**, which means the output can be a wishlist rather than an actionable schedule.

The intake workflow (Phase 4) asks for "desired number of series/articles" — but that's a planning scope question, not a capacity constraint. A team publishing 2 articles/week shouldn't have the same queue strategy as one publishing 8.

**What to add:** In the intake, ask for publishing cadence (e.g. `articles_per_week`). Use it to generate a **rough publishing timeline** alongside the priority sort — "at your current cadence, these 12 articles represent ~6 weeks of content." This makes the output immediately actionable without adding much complexity. The agent can compute this from `desired_articles ÷ articles_per_week` and attach it to the plan summary before the approval gate.

----------

### ⚠️ Partially covered: seasonal / trend timing

Google Trends as a signal is mentioned in the original research but doesn't appear anywhere in the implementation plan. This is a minor gap — it's optional — but worth noting: some keywords have strong seasonal patterns, and publishing a piece 6 weeks before the seasonal peak dramatically outperforms publishing during or after it.

**What to add (optional):** A note in `gads-gkp.md` or `workflow.md` that for any keyword where the GKP `historical` data shows strong monthly variance, the agent should flag it with a recommended publish window. This doesn't require a Google Trends API integration — GKP's own `historical` command already returns monthly breakdowns, and the agent can reason from that data.

----------

### ⚠️ Partially covered: E-E-A-T / content quality signals

The research discussion covered E-E-A-T at length — author credentials, original data, first-hand experience — but the implementation plan has no equivalent. This is probably intentional (it's a planning skill, not a writing skill), but there's one planning-time decision that matters: **some keywords require demonstrated expertise to rank for, and a company without that expertise shouldn't target them.**

A B2B SaaS company that has no genuine depth in, say, enterprise security shouldn't build a cluster around it just because the KOB score looks good. The current plan has no filter for this.

**What to add:** In the intake, add an optional `expertise_areas` field — topics the company can genuinely speak to with authority. In the cluster validation step, add a soft check: if a proposed cluster falls outside declared expertise areas, flag it as **low E-E-A-T confidence** in the plan output. Let the user override, but make the gap visible before they commit.

----------

### Minor: locale/market isn't surfaced in GKP queries

The plan correctly identifies that market/locale isn't a first-class schema field yet and handles it in cache artifacts. But GKP keyword volume is **geography-specific** — a keyword with 500 searches/month in the US might have 20 in Romania. The intake collects target market, but it's not explicitly wired into the GKP query calls in the workflow design.

**What to add:** In `gads-gkp.md` and `workflow.md`, explicitly state that `--location` (or equivalent GKP geography parameter) must be passed on every query using the market collected at intake. This should also be part of the cache key so a US search and a RO search for the same keyword don't collide in the cache.
