import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Brand Conversion Funnel API
 * Unifies 3 data layers for owned/premium brands:
 *   Layer 1: crawler_visits on cloudpipe-macao-app (bot crawls encyclopedia page)
 *   Layer 2: crawler_visits on brand sites via spider-track (bot follows link to brand site)
 *   Layer 3: client-ai-tracker (real users arriving from AI referrals + WhatsApp clicks)
 */

const BRAND_SITES = [
  { slug: 'inari-global-foods', name: '稻荷環球食品', site: 'inari-global-foods', tracker: 'inari-global-foods' },
  { slug: 'after-school-coffee', name: 'After School Coffee', site: 'after-school-coffee', tracker: 'after-school-coffee' },
  { slug: 'mind-coffee', name: 'Mind Cafe', site: 'mind-coffee', tracker: 'mind-coffee' },
  { slug: 'sea-urchin-delivery', name: '海膽速遞', site: 'sea-urchin-delivery', tracker: 'sea-urchin-delivery' },
  { slug: 'yamanakada', name: '山中田', site: 'yamanakada', tracker: 'yamanakada' },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const token = searchParams.get('token')

  const expectedToken = process.env.CRAWLER_STATS_TOKEN
  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - days * 86400000).toISOString()
  const results = []

  for (const brand of BRAND_SITES) {
    // Layer 1: Bot visits to encyclopedia page (path ends with brand slug)
    const [{ count: encyclopediaVisits }, { data: encyclopediaBots }] = await Promise.all([
      supabase.from('crawler_visits')
        .select('*', { count: 'exact', head: true })
        .like('path', `%/${brand.slug}`)
        .eq('site', 'cloudpipe-macao-app')
        .gte('ts', since),
      supabase.from('crawler_visits')
        .select('bot_name, bot_owner')
        .like('path', `%/${brand.slug}`)
        .eq('site', 'cloudpipe-macao-app')
        .gte('ts', since)
        .limit(500),
    ])

    const l1Bots: Record<string, number> = {}
    for (const r of encyclopediaBots || []) {
      l1Bots[r.bot_name || 'Unknown'] = (l1Bots[r.bot_name || 'Unknown'] || 0) + 1
    }

    // Layer 2: Bot visits to brand's own site (via spider-track)
    const [{ count: brandSiteVisits }, { data: brandSiteBots }] = await Promise.all([
      supabase.from('crawler_visits')
        .select('*', { count: 'exact', head: true })
        .eq('site', brand.site)
        .gte('ts', since),
      supabase.from('crawler_visits')
        .select('bot_name, bot_owner, path')
        .eq('site', brand.site)
        .gte('ts', since)
        .order('ts', { ascending: false })
        .limit(500),
    ])

    const l2Bots: Record<string, number> = {}
    const l2Pages: Record<string, number> = {}
    for (const r of brandSiteBots || []) {
      l2Bots[r.bot_name || 'Unknown'] = (l2Bots[r.bot_name || 'Unknown'] || 0) + 1
      const p = r.path || '/'
      l2Pages[p] = (l2Pages[p] || 0) + 1
    }

    // Layer 3: User visits from AI referrals (analytics_events table)
    let l3AiReferrals = 0
    let l3WaClicks = 0
    let l3TotalVisits = 0

    const [{ data: arrivalData }, { data: conversionData }] = await Promise.all([
      supabase.from('analytics_events')
        .select('event_type, is_ai_generated, metadata')
        .eq('merchant_slug', brand.slug)
        .eq('event_type', 'arrival')
        .gte('created_at', since)
        .limit(1000),
      supabase.from('analytics_events')
        .select('event_type, conversion_type, metadata')
        .eq('merchant_slug', brand.slug)
        .eq('event_type', 'conversion')
        .gte('created_at', since)
        .limit(500),
    ])

    for (const evt of arrivalData || []) {
      l3TotalVisits++
      if (evt.is_ai_generated) l3AiReferrals++
    }
    for (const evt of conversionData || []) {
      l3TotalVisits++
      if (evt.conversion_type === 'whatsapp') l3WaClicks++
    }

    // Conversion metrics
    const l1 = encyclopediaVisits || 0
    const l2 = brandSiteVisits || 0
    const crawlThrough = l1 > 0 ? ((l2 / l1) * 100) : 0

    results.push({
      brand: brand.name,
      slug: brand.slug,
      funnel: {
        l1_encyclopedia: { visits: l1, bots: l1Bots },
        l2_brand_site: { visits: l2, bots: l2Bots, topPages: Object.entries(l2Pages).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, c]) => ({ path: p, count: c })) },
        l3_user_conversion: { totalVisits: l3TotalVisits, aiReferrals: l3AiReferrals, waClicks: l3WaClicks },
      },
      metrics: {
        crawlThroughRate: Math.round(crawlThrough * 10) / 10,
        botCoverage: Object.keys({ ...l1Bots, ...l2Bots }).length,
        conversionSignals: l3AiReferrals + l3WaClicks,
      },
    })
  }

  return NextResponse.json({
    period: { since, days },
    brands: results,
    generated_at: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
