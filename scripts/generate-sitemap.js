#!/usr/bin/env node
/**
 * generate-sitemap.js
 * 查詢 Supabase 生成完整 public/sitemap.xml
 * 用法: node scripts/generate-sitemap.js
 *       npm run generate-sitemap
 *
 * 需要環境變數:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (或 SUPABASE_SERVICE_ROLE_KEY 更穩定)
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// ── 設定 ─────────────────────────────────────────────────────────────────────
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const OUT_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml')
const TODAY = new Date().toISOString().split('T')[0]

// ── 行業 & 分類（從 src/lib/industries.ts 同步）───────────────────────────────
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
]

const CATEGORY_TO_INDUSTRY = {}
for (const ind of INDUSTRIES) {
  for (const cat of ind.categories) {
    CATEGORY_TO_INDUSTRY[cat] = ind.slug
  }
}

// ── HTTP 工具 ─────────────────────────────────────────────────────────────────
function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)) }
      })
    }).on('error', reject)
  })
}

async function supabaseQuery(table, select, filters = '', limit = 5000) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(`⚠️  Supabase env vars not set — skipping ${table}`)
    return []
  }
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${limit}`
  if (filters) url += `&${filters}`
  try {
    const data = await fetchJSON(url, {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    })
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.warn(`⚠️  Failed to fetch ${table}: ${e.message}`)
    return []
  }
}

// ── XML 工具 ─────────────────────────────────────────────────────────────────
function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🗺️  Generating sitemap...')
  const entries = []

  // 靜態核心頁面
  entries.push(urlEntry(`${SITE_URL}/`,                  TODAY, 'daily',  '1.0'))
  entries.push(urlEntry(`${SITE_URL}/macao`,             TODAY, 'daily',  '1.0'))
  entries.push(urlEntry(`${SITE_URL}/macao/insights`,    TODAY, 'daily',  '1.0'))
  entries.push(urlEntry(`${SITE_URL}/macao/llms-txt`,    TODAY, 'daily',  '0.9'))

  // 行業頁面 (20 個)
  for (const ind of INDUSTRIES) {
    entries.push(urlEntry(`${SITE_URL}/macao/${ind.slug}`, TODAY, 'weekly', '0.8'))
  }

  // 分類頁面 (全部)
  for (const ind of INDUSTRIES) {
    for (const cat of ind.categories) {
      entries.push(urlEntry(`${SITE_URL}/macao/${ind.slug}/${cat}`, TODAY, 'weekly', '0.7'))
    }
  }

  console.log(`  ✅ Static routes: ${entries.length}`)

  // 動態：Insights
  const insights = await supabaseQuery(
    'insights',
    'slug,updated_at',
    'status=eq.published&order=updated_at.desc',
    5000
  )
  for (const ins of insights) {
    if (!ins.slug) continue
    const lastmod = ins.updated_at ? ins.updated_at.split('T')[0] : TODAY
    entries.push(urlEntry(`${SITE_URL}/macao/insights/${ins.slug}`, lastmod, 'weekly', '0.95'))
  }
  console.log(`  ✅ Insights: ${insights.length}`)

  // 動態：Merchants
  const merchants = await supabaseQuery(
    'merchants',
    'slug,updated_at,categories(slug)',
    'status=eq.live&order=code',
    10000
  )
  let merchantCount = 0
  for (const m of merchants) {
    if (!m.slug) continue
    const cat = m.categories
    const catSlug = Array.isArray(cat) ? cat[0]?.slug : cat?.slug
    if (!catSlug) continue
    const indSlug = CATEGORY_TO_INDUSTRY[catSlug] || 'dining'
    const lastmod = m.updated_at ? m.updated_at.split('T')[0] : TODAY
    entries.push(urlEntry(`${SITE_URL}/macao/${indSlug}/${catSlug}/${m.slug}`, lastmod, 'weekly', '0.5'))
    merchantCount++
  }
  console.log(`  ✅ Merchants: ${merchantCount}`)

  // 生成 XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated: ${new Date().toISOString()} | Total URLs: ${entries.length} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`

  fs.writeFileSync(OUT_PATH, xml, 'utf8')
  console.log(`\n✅ Sitemap written: ${OUT_PATH}`)
  console.log(`   Total URLs: ${entries.length}`)
  console.log(`   Submit at: ${SITE_URL}/sitemap.xml`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
