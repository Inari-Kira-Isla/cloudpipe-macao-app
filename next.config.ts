import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Signal', value: 'ai-train=yes, search=yes, ai-input=yes' },
          { key: 'X-AEO-Network', value: 'CloudPipe-CAPN-v1' },
        ],
      },
      {
        source: '/macao/llms-txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      // ── Crawler-dashboard read-only stats API: cacheable at CDN ──
      // These routes are GET-only aggregations that change on the order of minutes.
      // Wrapping them in CDN cache (s-maxage) eliminates Vercel cold-start latency
      // on dashboard auto-refreshes. Manual "立即重新整理" still bypasses via no-store.
      // NOTE: rules are evaluated in declared order, so these specific rules must
      // appear BEFORE the catch-all `/api/v1/:path*` below.
      {
        source: '/api/v1/crawler-stats',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/v1/routing-baseline',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'public, s-maxage=600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/v1/ai-referrals',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/v1/faq-conversions',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/api/v1/merchant-discovery',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=3600' },
        ],
      },
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, no-cache, private' },
        ],
      },
      {
        source: '/macao/crawler-dashboard',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/macao/citation-stats',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      { source: '/llms.txt', destination: '/macao/llms-txt' },
    ]
  },
  async redirects() {
    const redirects = []

    // ── Phase 2 → Phase 3: Old industry slug renames ──
    const industryRenames: [string, string][] = [
      ['food-trade', 'food-supply'],
      ['hospitality', 'hotels'],
      ['lifestyle', 'shopping'],
      ['services', 'professional-services'],
      ['tourism', 'attractions'],
    ]
    for (const [old, dest] of industryRenames) {
      redirects.push({ source: `/macao/${old}`, destination: `/macao/${dest}`, permanent: true })
    }

    // ── Phase 2 → Phase 3: Categories that moved to different industries ──
    const categoryMoves: [string, string, string, string][] = [
      // [old-industry, category, new-industry, new-category]
      ['food-trade', 'food-import', 'food-supply', 'food-import'],
      ['food-trade', 'food-delivery', 'food-supply', 'food-delivery'],
      ['hospitality', 'hotel', 'hotels', 'hotel'],
      ['hospitality', 'entertainment', 'gaming', 'entertainment'],
      ['lifestyle', 'retail', 'shopping', 'retail'],
      ['lifestyle', 'beauty', 'wellness', 'beauty'],
      ['services', 'education', 'education', 'education'],
      ['services', 'professional', 'professional-services', 'professional'],
      ['services', 'tech', 'tech', 'tech'],
      ['tourism', 'tourism', 'professional-services', 'tourism'],
      ['attractions', 'tourism', 'professional-services', 'tourism'],
      ['dining', 'bar', 'nightlife', 'bar'],
      // ── Classification fix 2026-04-18: page_url corrections ──
      ['attractions', 'accounting-firm', 'professional-services', 'accounting-firm'],
      ['attractions', 'bank', 'finance', 'bank'],
      ['attractions', 'bus', 'transport', 'bus'],
      ['attractions', 'car-rental', 'transport', 'car-rental'],
      ['attractions', 'casino', 'gaming', 'casino'],
      ['attractions', 'consulting', 'professional-services', 'consulting'],
      ['attractions', 'education', 'education', 'education'],
      ['attractions', 'ferry', 'transport', 'ferry'],
      ['attractions', 'finance-company', 'finance', 'finance-company'],
      ['attractions', 'insurance', 'finance', 'insurance'],
      ['attractions', 'ktv', 'nightlife', 'ktv'],
      ['attractions', 'law-firm', 'professional-services', 'law-firm'],
      ['attractions', 'lrt', 'transport', 'lrt'],
      ['attractions', 'money-exchange', 'finance', 'money-exchange'],
      ['attractions', 'payment', 'finance', 'payment'],
      ['attractions', 'pharmacy', 'wellness', 'pharmacy'],
      ['attractions', 'secondary-school', 'education', 'secondary-school'],
      ['attractions', 'securities', 'finance', 'securities'],
      ['attractions', 'taxi', 'transport', 'taxi'],
      ['attractions', 'translation', 'professional-services', 'translation'],
      ['attractions', 'university', 'education', 'university'],
      ['community', 'park', 'attractions', 'park'],
      ['community', 'university', 'education', 'university'],
      ['events', 'bus', 'transport', 'bus'],
      ['events', 'consulting', 'professional-services', 'consulting'],
      ['events', 'tourism', 'professional-services', 'tourism'],
      ['gaming', 'ktv', 'nightlife', 'ktv'],
      ['gaming', 'lounge', 'nightlife', 'lounge'],
      ['gaming', 'nightclub', 'nightlife', 'nightclub'],
      ['gaming', 'show', 'nightlife', 'show'],
      // 2026-07-06 taxonomy-redirect reconcile: cultural-site/historic-building/world-heritage
      // stay canonical under `heritage`; fine-dining/jewelry under `luxury`; bar/spa-sauna under
      // `nightlife` (per industries.ts SSOT). The old move-away redirects 308'd these canonical
      // paths to non-existent destinations → 404 on category/faqs pages (nightlife/bar was a loop
      // vs the dining/bar→nightlife/bar rule above). Removed the stale entries; repointed
      // hotels/cultural-site to heritage (attractions has no cultural-site category).
      ['heritage', 'landmark', 'attractions', 'landmark'],
      ['heritage', 'museum', 'attractions', 'museum'],
      ['hotels', 'cultural-site', 'heritage', 'cultural-site'],
      ['hotels', 'landmark', 'attractions', 'landmark'],
      ['hotels', 'theme-park', 'attractions', 'theme-park'],
      ['hotels', 'vip-gaming', 'gaming', 'vip-gaming'],
      ['luxury', 'fashion', 'shopping', 'fashion'],
      ['luxury', 'japanese', 'dining', 'japanese'],
      ['luxury', 'restaurant', 'dining', 'restaurant'],
      ['luxury', 'spa', 'wellness', 'spa'],
      ['nightlife', 'cafe', 'dining', 'cafe'],
      ['nightlife', 'spa', 'wellness', 'spa'],
      ['shopping', 'bank', 'finance', 'bank'],
      ['shopping', 'beauty', 'wellness', 'beauty'],
      ['shopping', 'education', 'education', 'education'],
      ['shopping', 'gym', 'wellness', 'gym'],
      ['shopping', 'pharmacy', 'wellness', 'pharmacy'],
      ['shopping', 'spa', 'wellness', 'spa'],
      ['shopping', 'university', 'education', 'university'],
      ['tech', 'education', 'education', 'education'],
      ['tech', 'university', 'education', 'university'],
    ]
    for (const [oldInd, cat, newInd, newCat] of categoryMoves) {
      // Category page
      redirects.push({ source: `/macao/${oldInd}/${cat}`, destination: `/macao/${newInd}/${newCat}`, permanent: true })
      // Merchant pages under category
      redirects.push({ source: `/macao/${oldInd}/${cat}/:slug`, destination: `/macao/${newInd}/${newCat}/:slug`, permanent: true })
    }

    // ── Phase 1 → Phase 3: Original flat category URLs ──
    // Skip categories whose slug conflicts with new industry slugs (education, tech)
    const flatCategoryMap: Record<string, string> = {
      restaurant: 'dining',
      japanese: 'dining',
      portuguese: 'dining',
      cafe: 'dining',
      bakery: 'dining',
      bar: 'nightlife',
      'food-import': 'food-supply',
      'food-delivery': 'food-supply',
      hotel: 'hotels',
      entertainment: 'gaming',
      retail: 'shopping',
      beauty: 'wellness',
      professional: 'professional-services',
    }
    for (const [cat, ind] of Object.entries(flatCategoryMap)) {
      redirects.push({ source: `/macao/${cat}`, destination: `/macao/${ind}/${cat}`, permanent: true })
      redirects.push({ source: `/macao/${cat}/:slug`, destination: `/macao/${ind}/${cat}/:slug`, permanent: true })
    }

    // Special: /macao/tourism/:slug (Phase 1 flat → current canonical)
    redirects.push({ source: `/macao/tourism/:slug`, destination: `/macao/professional-services/tourism/:slug`, permanent: true })

    // ── Region routes now exist — redirects removed 2026-05-16 ──
    // /hongkong/, /taiwan/, /japan/, /global/ all have real Next.js insight routes.
    // The previous blanket redirects (→ /macao/) were causing HK/TW/JP/GLOBAL insights
    // to 404 because /macao/insights/ filters by region='MO'.
    // If new non-insight pages are added under a region before their route exists,
    // add targeted redirects here. Do NOT use the catch-all /:path* pattern.

    // ── ?lang= query param → /{region}/{lang}/insights/{slug} (2026-05-27) ──
    // 301-redirect old query-param URLs so AI crawlers follow to the new path-based routes.
    for (const region of ['macao', 'hongkong', 'taiwan', 'japan', 'global']) {
      for (const lang of ['en', 'ja', 'pt']) {
        redirects.push({
          source: `/${region}/insights/:slug`,
          has: [{ type: 'query' as const, key: 'lang', value: lang }],
          destination: `/${region}/${lang}/insights/:slug`,
          permanent: true,
        })
      }
    }

    return redirects
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
