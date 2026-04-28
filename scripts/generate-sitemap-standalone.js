#!/usr/bin/env node
/**
 * generate-sitemap-standalone.js
 * Same as generate-sitemap.js but uses native fetch (no npm deps).
 * Usage: node scripts/generate-sitemap-standalone.js
 */

const fs = require('fs')
const path = require('path')

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yitmabzsxfgbchhhjjef.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
const OUT_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml')
const TODAY = new Date().toISOString().split('T')[0]

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

async function supabaseFetch(table, select, filters = {}, limit = 5000) {
  try {
    const params = new URLSearchParams({ select, limit: String(limit) })
    for (const [k, v] of Object.entries(filters)) params.set(k, `eq.${v}`)
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      console.warn(`⚠️  ${table}: HTTP ${res.status} ${await res.text()}`)
      return []
    }
    return await res.json()
  } catch (e) {
    console.warn(`⚠️  ${table}: ${e.message}`)
    return []
  }
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

async function main() {
  console.log('🗺️  Generating sitemap...')
  const entries = []

  // Static core pages
  entries.push(urlEntry(`${SITE_URL}/`,                                        TODAY, 'daily',  '1.0'))
  entries.push(urlEntry(`${SITE_URL}/macao`,                                   TODAY, 'daily',  '1.0'))
  entries.push(urlEntry(`${SITE_URL}/macao/insights`,                          TODAY, 'daily',  '1.0'))
  entries.push(urlEntry(`${SITE_URL}/llms.txt`,                                TODAY, 'daily',  '1.0'))
  entries.push(urlEntry(`${SITE_URL}/macao/llms-txt`,                          TODAY, 'daily',  '0.9'))
  entries.push(urlEntry(`${SITE_URL}/macao/certified-shops`,                   TODAY, 'weekly', '0.9'))
  entries.push(urlEntry(`${SITE_URL}/macao/report`,                            TODAY, 'daily',  '0.9'))
  entries.push(urlEntry(`${SITE_URL}/macao/brands`,                            TODAY, 'weekly', '0.9'))
  entries.push(urlEntry(`${SITE_URL}/macao/case-studies`,                      TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs`,                              TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs/best-restaurants`,             TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs/casino-hotels`,                TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs/inari-expertise`,              TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs/macau-attractions`,            TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs/macau-food-guide`,             TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs/macau-transport`,              TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs/premium-restaurants-quality`,  TODAY, 'weekly', '0.8'))
  entries.push(urlEntry(`${SITE_URL}/macao/faqs/sea-urchin-supplier-comparison`, TODAY, 'weekly', '0.8'))

  // Industry pages (20)
  for (const ind of INDUSTRIES) {
    entries.push(urlEntry(`${SITE_URL}/macao/${ind.slug}`, TODAY, 'weekly', '0.8'))
  }

  // Category pages (all)
  for (const ind of INDUSTRIES) {
    for (const cat of ind.categories) {
      entries.push(urlEntry(`${SITE_URL}/macao/${ind.slug}/${cat}`, TODAY, 'weekly', '0.7'))
    }
  }

  const staticCount = entries.length
  console.log(`  ✅ Static routes: ${staticCount}`)

  // Dynamic: Insights
  const insights = await supabaseFetch('insights', 'slug,updated_at', { status: 'published' }, 5000)
  for (const ins of insights) {
    if (!ins.slug) continue
    const lastmod = ins.updated_at ? ins.updated_at.split('T')[0] : TODAY
    entries.push(urlEntry(`${SITE_URL}/macao/insights/${ins.slug}`, lastmod, 'weekly', '0.95'))
  }
  console.log(`  ✅ Insights: ${insights.length}`)

  // Dynamic: Merchants
  const merchants = await supabaseFetch('merchants', 'slug,updated_at,categories(slug)', { status: 'live' }, 10000)
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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated: ${new Date().toISOString()} | Total URLs: ${entries.length} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`

  fs.writeFileSync(OUT_PATH, xml, 'utf8')
  console.log(`\n✅ Sitemap written: ${OUT_PATH}`)
  console.log(`   Total URLs: ${entries.length} (static: ${staticCount}, insights: ${insights.length}, merchants: ${merchantCount})`)
  console.log(`   Submit at: ${SITE_URL}/sitemap.xml`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
