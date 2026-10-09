# Sitemap Actions recovery — 2026-10-09

## Verified current state

- Reviewed main `139009aa00ada45d9f18e63d3f17f1b9316ca32b`, unchanged since 2026-09-27.
- Original failure remains intact: https://github.com/Inari-Kira-Isla/cloudpipe-macao-app/actions/runs/37442942454 (2026-10-06 17:26 Macau time). Job `112200822657`: DB probe 401 `No API key found in request`; token Contents read; generation 2,174 URLs; push denied 403; all downstream stages skipped.
- Latest observed run: https://github.com/Inari-Kira-Isla/cloudpipe-macao-app/actions/runs/37850420304 (2026-10-09 05:58 Macau time). Job `113561658231`: still Contents read and DB probe 401. Its green result means it skipped generation/push/deployment/submissions, not that the defect was repaired.
- Read-only production probes on 2026-10-09 confirmed both the Vercel hostname and custom domain serve sitemap XML with canonical URLs under **https://cloudpipemo.com**. Root sitemap contains 226 URLs; sitemap index lists 12 children; merchants 6,303 URLs; insights 37,099 URLs. An initial 15-second probe of `/sitemap-priority.xml` timed out; a follow-up with a 60-second budget returned HTTP 200 and 25,263 URLs. This was a slow response, not evidence of an outage. Live verification uses a bounded 60-second sitemap request budget to accommodate cold ISR. These are observations of existing production, not results of this PR or proof of freshness/indexing.

## Dependency contract

Authenticated data access → strict local generation → successful Git push receipt → exact-SHA READY production deployment **and** canonical alias → cache revalidation → live XML validation of index and all children → independent Google/Bing/IndexNow submissions.

No later success is inferred from an earlier stage. Auth/config/HTTP/network errors fail the job. Missing optional search/email integrations are explicitly skipped. IndexNow HTTP 202 is `accepted_pending_validation`, not key validation/indexing success. Configured submission HTTP failures fail the job while other independent providers still run. Email and Actions summary include actual stage states, including failures and skips. Receipts and generator logs are retained as per-run artifacts for 30 days; existing Actions logs are neither deleted nor re-run.

The app's `src/app/sitemap.ts` and `sitemap-*.xml` routes are authoritative. `public/sitemap.xml` is a legacy local artifact, not a byte-for-byte representation of live `/sitemap.xml`. This PR keeps the legacy generator available and, in workflow strict mode, scopes its snapshot to MO zh published insights and MO live merchants (matching existing merchant route exclusions). It paginates beyond PostgREST's 1,000-row response cap, rejects incomplete/error results and >50,000 URLs/50 MB, and atomically replaces the snapshot. Other regions/languages remain covered by the canonical online index/sub-sitemaps. **Local counts are never presented as live counts.** Strict queries have a 10-second per-page timeout and a 40,000-row per-table guard; exceeding it fails closed and requires a split-sitemap change, not a partial push.

## GitHub permissions

Workflow default remains `contents: read`. Only the production push job grants `contents: write`; all other scopes remain unset. No PAT or administration permission is needed. Production steps only execute on `refs/heads/main`; pushes target `HEAD:main` explicitly and are never forced. Concurrent runs are serialized. `force_regenerate` remains accepted for compatibility but cannot bypass authentication or any failed stage.

An organization policy or protected-branch rule can still forbid direct bot pushes; YAML cannot override those controls. If the next reviewed run fails with 403 despite Contents write, inspect repository/organization Actions policy and applicable main rules. Do not relax protection automatically; use a reviewed PR-based update path if required.

## Configuration before enabling the reviewed change

Secrets were not listed, read, changed, or rotated during this repair. The original generation success suggests the service key was accessible then; it does not prove its current validity.

| GitHub Secret | Requirement |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Required; valid server-only service role JWT or secret key for the configured project. The probe and generator use the same key. No anon key dependency. |
| `VERCEL_TOKEN` | Required to read project deployments and aliases; use the appropriate account/team scope. |
| `VERCEL_PROJECT_ID` | Required project ID (`prj_…`), not the display name. Must own the canonical domain. |
| `VERCEL_ORG_ID` | Team ID if the project belongs to a Vercel team; omit for personal projects. |
| `VERCEL_DEPLOY_HOOK` | Optional deployment hook configured specifically for main. Use if bot pushes do not start builds; hooks are invoked only after a changed snapshot has been pushed. If neither Git integration nor hook creates the exact-SHA deployment, verification times out and fails. |
| `VERCEL_REVALIDATE_TOKEN` | Required; must match production **`REVALIDATE_TOKEN`**, used in JSON body for `/api/revalidate`. It is not a Vercel API token. |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_SEARCH_CONSOLE_SITE_URL` | Optional as a complete set. Refresh token needs Search Console `webmasters` scope and access to the verified property. Property URL must exactly match Search Console, e.g. `sc-domain:cloudpipemo.com` or `https://cloudpipemo.com/`. Entirely missing means skipped; partial config fails. |
| `BING_WEBMASTER_API_KEY` | Optional; Bing Webmaster Tools API credential for the verified canonical site. |
| `BING_INDEXNOW_KEY` | Optional; must exactly match the public canonical `/indexnow.txt` file. |
| `SENDGRID_API_KEY` | Optional, existing notification integration retained. Sender must be verified in SendGrid. HTTP 202 means accepted, not delivered. |

Vercel production must have its existing Supabase environment and `REVALIDATE_TOKEN` configured correctly. This PR does not alter them. The workflow canonical origin is now `https://cloudpipemo.com`, matching the observed XML and existing app defaults.

A GitHub-token push does not launch another GitHub push workflow; do not infer a Vercel build merely from `git push`. The optional hook plus deployment/alias polling makes this visible without granting extra GitHub scopes. The misleading `/api/submit-sitemap` call was replaced in this workflow with the actual `/api/revalidate` endpoint and checked JSON response. Existing manual submission API callers are outside this workflow repair and are not used here.

## Validation and review gate

- `python3 -m unittest discover -s scripts/tests -p 'test_sitemap*.py' -v`: 31 tests passed (mocked network, no secrets).
- `node --test scripts/tests/generate-sitemap.test.cjs`: 9 tests passed against the real generator via an isolated VM and mock Supabase/filesystem.
- actionlint 1.7.7: both workflows passed. Node syntax check and targeted new-test ESLint passed.
- Full TypeScript check: fails on two unchanged Stripe API-version mismatches in checkout/webhooks (`2025-04-30.basil` vs installed `2026-07-29.dahlia`). The same two errors were reproduced on an isolated main checkout. No TypeScript app files changed.
- Full repository lint: existing main and the repair branch both have 454 errors / 110 warnings. New tests use an explicit Node CommonJS ESLint exception; no app-lint fixes were bundled.
- Regression CI is read-only, runs on PR changes, uses no Secrets, and cannot deploy production.

Before merging: review the diff and configure/confirm required Secrets and Vercel Git/hook integration. After approval and merge, run the main workflow once and inspect its uploaded receipts: pushed SHA, READY deployment ID, alias, revalidated paths, per-sitemap live counts, and each provider's actual status. Do not mark online deployment repaired until that run verifies successfully. No production deployment or original-run rerun was performed while preparing the PR.

## Official protocol references

- GitHub token permissions/events: https://docs.github.com/en/actions/concepts/security/github_token
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Google ping was retired; use Search Console API: https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping
- Search Console sitemap resources: https://developers.google.com/webmaster-tools/v1/sitemaps
- Vercel deployments: https://vercel.com/docs/rest-api/deployments/list-deployments
- Vercel alias ownership: https://vercel.com/docs/rest-api/aliases/get-an-alias
- IndexNow status semantics: https://www.indexnow.org/documentation
