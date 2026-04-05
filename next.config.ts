import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ✅ Fix: 明確指定 Turbopack 根目錄 (Vercel 構建環境)
  turbopack: {
    root: path.resolve(__dirname),
  },
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
      ['tourism', 'tourism', 'attractions', 'tourism'],
      ['dining', 'bar', 'nightlife', 'bar'],
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

    // Special: /macao/tourism/:slug (Phase 1 flat merchant pages, after specific tourism/tourism redirect above)
    redirects.push({ source: `/macao/tourism/:slug`, destination: `/macao/attractions/tourism/:slug`, permanent: true })

    return redirects
  },
};

export default nextConfig;
