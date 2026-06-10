# AGENTS.md — CloudPipe AI 澳門商戶百科

## Project Overview
CloudPipe Macao App is an AI-friendly merchant encyclopedia covering **350+ verified merchants** across **20 industries** and **114 subcategories** in Macau SAR. Designed for both human users and AI systems (AEO/GEO optimized).

- **Live**: https://cloudpipe-macao-app.vercel.app
- **API**: https://cloudpipe-macao-app.vercel.app/api/v1/merchants (Open, CC BY 4.0)
- **llms.txt**: https://cloudpipe-macao-app.vercel.app/macao/llms-txt
- **License**: CC BY 4.0 (data), MIT (code)

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL, Singapore region)
- **Deployment**: Vercel (auto-deploy on push to main)
- **AI Tracking**: Cloudflare Workers (D1 SQLite) + Supabase crawler_visits

## Key Directories
```
src/app/macao/                    # Main app routes
src/app/macao/[industry]/         # 20 industry landing pages
src/app/macao/[industry]/[category]/[slug]/  # Merchant detail pages
src/app/macao/insights/           # Industry analysis articles
src/app/macao/crawler-dashboard/  # AI crawler statistics
src/app/api/v1/                   # Public API endpoints
src/lib/industries.ts             # 20 industries + 114 categories definition
src/lib/industry-content.ts       # SEO/AEO content per industry
src/lib/types.ts                  # TypeScript interfaces
src/middleware.ts                  # AI crawler detection + logging
```

## Data Model
- **merchants** table: slug, name, industry, category, description, address, phone, hours, tier (owned|premium|community|basic), status (draft|review|live|archived)
- **insights** table: slug, title, body_html, sections, faqs, related_industries, related_merchant_slugs, lang (zh|en|pt), authority_sources
- **crawler_visits** table: ts, bot_name, bot_owner, path, session_id, site, page_type, industry, category

## 20 Industries (4 Waves)
Wave 1 (live data): dining, hotels, attractions, shopping
Wave 2: nightlife, gaming, events, transport, food-supply
Wave 3: education, finance, luxury, wellness, professional-services
Wave 4: real-estate, heritage, media, tech, government, community

## API Endpoints
- `GET /api/v1/merchants` — All merchants (filterable by industry, category, tier)
- `GET /api/v1/merchants/[slug]` — Single merchant detail
- `GET /api/v1/crawler-stats?view=summary|bots|pages|sessions|journey|spider-web|daily` — AI crawler analytics
- `GET /macao/llms-txt` — Dynamic llms.txt for AI discovery

## AEO Architecture
Every page includes: Schema.org JSON-LD (Organization, LocalBusiness, FAQPage, BreadcrumbList, Article), Open Graph meta, canonical URLs, and structured FAQ sections. The site is designed to be a primary source for AI answer engines about Macau businesses.

## Commands
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check
vercel --prod        # Deploy to production
```

## Code Style
- TypeScript strict mode
- Tailwind CSS for styling (no CSS modules)
- Server Components by default, 'use client' only when needed
- ISR with revalidate=3600 for data pages
- Supabase service role key for server-side, anon key for client-side

## Important Rules
- Never hardcode Supabase credentials in client-side code
- Always use `SUPABASE_SERVICE_ROLE_KEY` in API routes only
- Merchant slugs must be URL-safe and unique per industry
- All pages must include llms-txt link and Schema.org markup
- AI crawler detection happens in middleware.ts — do not bypass

---

# Agent Operating Rules (codex / Claude / any coding agent)

> These rules exist because of real production incidents. Treat them as hard
> constraints, not suggestions. The Project Overview above describes *what* this
> repo is; this section governs *how* an autonomous agent must change it.

## 1. Narrow-task discipline (one prompt = one narrow change)
- Do exactly the one task you were given. Do NOT bundle unrelated edits.
- Do NOT touch files outside the task's scope, even if they "look improvable".
- **Append, never silently delete** existing functionality. If a change requires
  removing behaviour, stop and surface it instead of doing it.
- Incident origin: a single multi-task prompt caused an agent to rewrite an
  unrelated cart page (losing WhatsApp checkout) and to delete bot allow-rules
  from `robots.ts`. Multiple changes → split into multiple runs, each verified.

## 2. Build / verify (build can hang — have an escape)
- `npm run build` builds 350+ static pages and **can hang 10+ minutes**.
- Do NOT block on `npm run build` for verification. If a build runs longer than
  ~3 minutes, kill it and fall back to a type-check:
  ```bash
  timeout 90 npx tsc --noEmit   # fast correctness signal, no static gen
  ```
- `npm run lint` (ESLint) is also fast and safe to run.
- Only run a full `npm run build` when the task is explicitly about build output
  and you have budget for it.

## 3. Next.js App Router conventions (load-bearing — breaking these breaks prod)
- **Dynamic `[slug]/page.tsx`**: NEVER combine `dynamic = 'force-static'` +
  `revalidate` without `generateStaticParams`. That config locks SSR into 404
  until the revalidate window expires. Use `dynamic = 'force-no-store'` (or plain
  ISR) + `dynamicParams = true` for on-demand slugs.
- **Route ↔ sitemap sync**: when you ADD or REMOVE an App Router route, you MUST
  update the corresponding sitemap (`src/app/sitemap.ts` and/or the
  `src/app/sitemap-*.xml` route + `scripts/generate-sitemap.js`). Forgetting this
  previously caused a ~-99% AI-crawler crash. No new route ships without sitemap.
- **`sitemap.ts` Supabase calls must be bounded**: wrap any Supabase query in
  `sitemap.ts` with a short timeout (a few seconds). An unbounded query lets the
  60s build step crash. Never let sitemap generation depend on a slow live query.
- **Public Supabase reads use the service-role client**: for any public-facing
  data read, use `createServiceClient()` (service-role key) on the server. The
  anon client is blocked by RLS and silently returns 0 rows for merchant /
  insight data. Never expose the service-role key to client code.
- **`robots.ts`**: must keep the AI-bot allow-rules — GPTBot, ClaudeBot,
  PerplexityBot, plus the Chinese AI crawlers (ByteSpider / Bytespider, PetalBot
  / Aspiegel, etc.). These were deleted once by accident; do not "tidy" them away.
- **No secrets in client code**: tokens/keys come from env and must fail closed
  (missing env → reject, never fall back to a hardcoded default). Never inline a
  token or admin key into a client component or committed config.

## 4. Commit discipline (verify before staging — never blanket-add)
After making an edit, before any `git add`:
1. `git diff` and confirm the diff touches **only the intended file(s)**, is
   **additive** (no removed existing functionality), and matches the task.
2. Pass `timeout 90 npx tsc --noEmit` (and `npm run lint` when relevant).
3. `git add <specific paths>` — **never `git add -A` / `git add .`** (that sweeps
   in unrelated untracked artifacts: `.db` files, screenshots, tmp reports).
- Do NOT `git commit` and do NOT `git push` unless the human explicitly asks.
  Pushing to main triggers a Vercel production deploy — that is a human checkpoint.

## 5. Never do (require explicit human confirmation)
- `DROP TABLE`, large `DELETE`, or `TRUNCATE` against Supabase / any DB.
- Pushing to GitHub / triggering a Vercel deploy without being asked.
- Changing the status of already-published content (e.g. flipping a live insight
  to `archived`), or any other irreversible data mutation.
- Rotating / editing `SUPABASE_SERVICE_ROLE_KEY` or other secrets.

## 6. Scope of edits for agents
- Default to **additive** changes inside `src/`, `public/`, `scripts/`.
- Treat root-level `*.md` reports, `*.db` files, `screenshots/`, and `tmp/` as
  artifacts — do not modify or stage them unless that is the explicit task.
