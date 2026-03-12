# CloudPipe Macao App

## Project
AI-friendly merchant encyclopedia for 350+ Macau businesses. Next.js 16 (App Router) + TypeScript + Tailwind CSS + Supabase.

## Conventions
- Use TypeScript strict mode
- Use Server Components by default; add 'use client' only when needed
- Use Tailwind CSS for styling (no CSS modules)
- Use ISR with revalidate=3600 for data pages
- Use Supabase service role key for API routes, anon key for client-side

## Naming
- Use URL-safe merchant slugs unique per industry (e.g., `grand-lisboa-hotel`)
- Name tables in snake_case: `merchants`, `insights`, `crawler_visits`
- Use PascalCase for TypeScript interfaces: `Merchant`, `Insight`, `CrawlerVisit`

## Architecture
- 20 industry landing pages: `src/app/macao/[industry]/`
- Merchant detail pages: `src/app/macao/[industry]/[category]/[slug]/`
- All pages must include Schema.org JSON-LD and llms-txt link
- AI crawler detection in middleware.ts — never bypass
- Public API at `/api/v1/merchants` (CC BY 4.0)

## Commands
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check
vercel --prod        # Deploy to production
```

## Do Not
- Never hardcode Supabase credentials in client-side code
- Never expose service role key to client
- Never skip Schema.org markup on any page
- Never use CSS modules; use Tailwind only
- Never add 'use client' unless interaction is required