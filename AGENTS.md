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
