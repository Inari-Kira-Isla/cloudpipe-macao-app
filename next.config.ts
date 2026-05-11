import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/macao/llms-txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=3600' },
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
      ['gaming', 'non-gaming', 'attractions', 'non-gaming'],
      ['gaming', 'show', 'nightlife', 'show'],
      ['heritage', 'cultural-site', 'attractions', 'cultural-site'],
      ['heritage', 'historic-building', 'attractions', 'historic-building'],
      ['heritage', 'landmark', 'attractions', 'landmark'],
      ['heritage', 'museum', 'attractions', 'museum'],
      ['heritage', 'world-heritage', 'attractions', 'world-heritage'],
      ['hotels', 'cultural-site', 'attractions', 'cultural-site'],
      ['hotels', 'landmark', 'attractions', 'landmark'],
      ['hotels', 'theme-park', 'attractions', 'theme-park'],
      ['hotels', 'vip-gaming', 'gaming', 'vip-gaming'],
      ['luxury', 'fashion', 'shopping', 'fashion'],
      ['luxury', 'fine-dining', 'dining', 'fine-dining'],
      ['luxury', 'japanese', 'dining', 'japanese'],
      ['luxury', 'jewelry', 'shopping', 'jewelry'],
      ['luxury', 'restaurant', 'dining', 'restaurant'],
      ['luxury', 'spa', 'wellness', 'spa'],
      ['nightlife', 'bar', 'dining', 'bar'],
      ['nightlife', 'cafe', 'dining', 'cafe'],
      ['nightlife', 'spa', 'wellness', 'spa'],
      ['nightlife', 'spa-sauna', 'wellness', 'spa-sauna'],
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

    // ── B+C migration 2026-05-11: /macao/insights/<slug> → region-specific routes ──
    // Region detection by slug prefix (DB rows already classified into TW/HK/JP/GLOBAL).
    // Brand articles (region=MO; slugs like upgrade-/inari-/mind-/asc-/after-school-) stay on /macao/.
    redirects.push(
      { source: '/macao/insights/:slug(tw-.*)', destination: '/taiwan/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(taiwan-.*)', destination: '/taiwan/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(jp-.*)', destination: '/japan/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(japan-.*)', destination: '/japan/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(hk-.*)', destination: '/hongkong/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(hongkong-.*)', destination: '/hongkong/insights/:slug', permanent: true },
      // GLOBAL article slug patterns (~7-8 fixed prefixes)
      { source: '/macao/insights/:slug(faq-schema-ai-citation.*)', destination: '/global/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(llms-txt-5x-ai-traffic.*)', destination: '/global/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(nerdwallet-traffic-down.*)', destination: '/global/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(toggl-geo-7m-impressions.*)', destination: '/global/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(zicy-74-percent.*)', destination: '/global/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(apollo-io-reddit-ai.*)', destination: '/global/insights/:slug', permanent: true },
      { source: '/macao/insights/:slug(ai-referral-3x-conversion.*)', destination: '/global/insights/:slug', permanent: true },
    )

    return redirects
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
