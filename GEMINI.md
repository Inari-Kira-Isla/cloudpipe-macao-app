# CloudPipe Macao App

## Overview
AI-friendly merchant encyclopedia covering **350+ verified merchants** across **20 industries** in Macau SAR. Designed for AEO/GEO optimization with an open API (CC BY 4.0).

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Architecture
- `src/app/macao/`: Main app routes
- `src/app/macao/[industry]/[category]/[slug]/`: Merchant detail pages
- `src/app/api/v1/`: Public API endpoints (`/merchants`, `/crawler-stats`)
- `src/lib/industries.ts`: Industry and category definitions
- `src/middleware.ts`: AI crawler detection and logging logic

## Commands
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check
vercel --prod        # Deploy to production
```

## Coding Style
- TypeScript strict mode enabled
- Tailwind CSS for styling (no CSS modules)
- Server Components by default; use `'use client'` only when interactivity is needed
- Use ISR with `revalidate=3600` for dynamic data pages

## Important Rules
- **Credentials**: Never hardcode Supabase credentials in client-side code. Use `SUPABASE_SERVICE_ROLE_KEY` only in API routes.
- **SEO/AEO**: Every page must include Schema.org JSON-LD, Open Graph meta tags, and the `llms-txt` link.
- **Slugs**: Merchant slugs must be URL-safe and unique per industry.
- **Middleware**: Do not bypass AI crawler detection logic in `middleware.ts`.