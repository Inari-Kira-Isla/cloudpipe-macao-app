/**
 * POST /api/cron/refresh-sitemap
 * 每天 UTC 06:00 自動運行，刷新 sitemap.xml
 * 響應爬蟲對新內容的需求
 */

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120; // 120s timeout

// ── 產業和分類映射 ────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { slug: 'dining',                categories: ['restaurant','japanese','portuguese','cafe','bakery','chinese','western','tea-restaurant','hotpot','michelin','street-food','dessert','fast-food'] },
  { slug: 'hotels',                categories: ['hotel','resort','budget-hotel','serviced-apartment','hostel'] },
  { slug: 'attractions',           categories: ['tourism','museum','temple','park','theme-park','landmark'] },
  { slug: 'shopping',              categories: ['retail','shopping-mall','duty-free','souvenir','fashion','electronics','supermarket','drugstore'] },
  { slug: 'nightlife',             categories: ['bar','ktv','nightclub','show','lounge','spa-sauna'] },
  { slug: 'gaming',                categories: ['entertainment','casino','vip-gaming','non-gaming'] },
  { slug: 'events',                categories: ['convention-center','annual-event','trade-show','festival','sports-event'] },
  { slug: 'transport',             categories: ['ferry','airport','lrt','border-gate','bus','taxi','shuttle','car-rental'] },
  { slug: 'food-supply',           categories: ['food-import','food-delivery','seafood-import','meat-supply','produce','beverage','cold-chain','food-processing'] },
  { slug: 'education',             categories: ['education','university','secondary-school','primary-school','kindergarten','language-school','vocational','international-school'] },
  { slug: 'finance',               categories: ['bank','insurance','securities','finance-company','payment','money-exchange','accounting-service'] },
  { slug: 'luxury',                categories: ['jewelry','luxury-fashion','fine-dining','luxury-spa','luxury-auto','art-auction'] },
  { slug: 'wellness',              categories: ['beauty','hospital','tcm','dental','spa','gym','pharmacy','clinic'] },
  { slug: 'professional-services', categories: ['professional','law-firm','accounting-firm','translation','notary','consulting','hr','it-service','design-agency'] },
  { slug: 'real-estate',           categories: ['real-estate-agent','commercial-property','property-management','renovation','building-materials'] },
  { slug: 'heritage',              categories: ['world-heritage','historic-building','cultural-site'] },
  { slug: 'media',                 categories: ['newspaper','tv-radio','online-media','advertising','printing','photography'] },
  { slug: 'tech',                  categories: ['tech','tech-company','incubator','university-lab','ecommerce','fintech'] },
  { slug: 'government',            categories: ['government-dept','public-service','border-immigration','emergency'] },
  { slug: 'community',             categories: ['religious','association','library','sports-venue','park-leisure','market','post-office'] },
];

const CATEGORY_TO_INDUSTRY = Object.fromEntries(
  INDUSTRIES.flatMap(ind => ind.categories.map(cat => [cat, ind.slug]))
);

async function generateSitemapContent() {
  const SITE_URL = 'https://cloudpipe-macao-app.vercel.app';
  const TODAY = new Date().toISOString().split('T')[0];
  const entries: string[] = [];

  // 靜態頁面
  const staticPages = [
    { loc: '/', freq: 'daily', priority: '1.0' },
    { loc: '/macao', freq: 'daily', priority: '1.0' },
    { loc: '/macao/insights', freq: 'daily', priority: '1.0' },
    { loc: '/macao/llms-txt', freq: 'daily', priority: '0.9' },
  ];

  for (const page of staticPages) {
    entries.push(`  <url>\n    <loc>${SITE_URL}${page.loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${page.freq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`);
  }

  // 行業頁面
  for (const ind of INDUSTRIES) {
    entries.push(`  <url>\n    <loc>${SITE_URL}/macao/${ind.slug}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  }

  // 分類頁面
  for (const ind of INDUSTRIES) {
    for (const cat of ind.categories) {
      entries.push(`  <url>\n    <loc>${SITE_URL}/macao/${ind.slug}/${cat}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }
  }

  // 獲取最新的 insights 和 merchants（動態內容）
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (baseUrl && apiKey) {
    try {
      // Insights
      const insightsRes = await fetch(
        `${baseUrl}/rest/v1/insights?status=eq.published&select=slug,updated_at&limit=5000`,
        { headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } }
      );
      if (insightsRes.ok) {
        const insights = await insightsRes.json();
        for (const ins of insights) {
          if (ins.slug) {
            const lastmod = ins.updated_at ? ins.updated_at.split('T')[0] : TODAY;
            entries.push(`  <url>\n    <loc>${SITE_URL}/macao/insights/${ins.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.95</priority>\n  </url>`);
          }
        }
      }

      // Merchants
      const merchantRes = await fetch(
        `${baseUrl}/rest/v1/merchants?status=eq.live&select=slug,updated_at,categories(slug)&limit=10000`,
        { headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } }
      );
      if (merchantRes.ok) {
        const merchants = await merchantRes.json();
        for (const m of merchants) {
          if (m.slug && m.categories) {
            const catSlug = Array.isArray(m.categories) ? m.categories[0]?.slug : m.categories?.slug;
            if (catSlug) {
              const indSlug = CATEGORY_TO_INDUSTRY[catSlug] || 'dining';
              const lastmod = m.updated_at ? m.updated_at.split('T')[0] : TODAY;
              entries.push(`  <url>\n    <loc>${SITE_URL}/macao/${indSlug}/${catSlug}/${m.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>`);
            }
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch dynamic content:', err);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated: ${new Date().toISOString()} | Total URLs: ${entries.length} -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;

  return { xml, entryCount: entries.length };
}

export async function POST(req: NextRequest) {
  // 驗證 Vercel Cron 秘鑰
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 [CRON] Starting sitemap refresh...');

    // 生成 sitemap 內容
    const { xml, entryCount } = await generateSitemapContent();

    console.log(`✅ [CRON] Sitemap generated: ${entryCount} URLs`);

    // Revalidate 靜態資源
    revalidatePath('/sitemap.xml');

    // 記錄日誌到 Telegram
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT) {
      try {
        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `✅ CloudPipe AEO: Sitemap refreshed at ${new Date().toISOString()}\n📊 Total URLs: ${entryCount}\n\nSitemap: https://cloudpipe-macao-app.vercel.app/sitemap.xml`,
            chat_id: process.env.TELEGRAM_CHAT_ID,
          }),
        });
      } catch (err) {
        console.warn('⚠️ Telegram notify failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Sitemap refreshed successfully',
      entryCount,
    });
  } catch (error) {
    console.error('❌ [CRON] Sitemap refresh failed:', error);

    // 錯誤通知
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT) {
      try {
        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `❌ CloudPipe AEO: Sitemap refresh FAILED\n${String(error).slice(0, 200)}`,
            chat_id: process.env.TELEGRAM_CHAT_ID,
          }),
        });
      } catch (err) {
        console.warn('⚠️ Telegram error notify failed:', err);
      }
    }

    return NextResponse.json({
      error: String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
