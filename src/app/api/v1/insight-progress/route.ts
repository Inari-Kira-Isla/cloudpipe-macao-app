import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cache 3 minutes
let _cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 3 * 60 * 1000

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=180' }
    })
  }

  try {
    // Fetch all published (slug, lang, region) — paginated
    const rows: { slug: string; lang: string; region: string }[] = []
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('insights')
        .select('slug,lang,region')
        .eq('status', 'published')
        .range(offset, offset + 999)
      if (error) throw error
      if (!data || data.length === 0) break
      rows.push(...data)
      if (data.length < 1000) break
      offset += 1000
    }

    // Today's count
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const { count: todayCount } = await supabase
      .from('insights')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('created_at', today.toISOString())

    // Build stats
    const REGIONS = ['macau', 'hongkong', 'taiwan', 'japan']
    const LANGS = ['zh', 'en', 'pt']

    // Group by (region, lang) — count unique slugs per combination
    const regionLangSets: Record<string, Record<string, Set<string>>> = {}
    const allSlugsByRegion: Record<string, Set<string>> = {}

    for (const r of REGIONS) {
      regionLangSets[r] = { zh: new Set(), en: new Set(), pt: new Set() }
      allSlugsByRegion[r] = new Set()
    }

    // Total unique slugs (zh published = "Phase 1 done" denominator per region)
    const totalZhByRegion: Record<string, number> = {}
    const totalEnByRegion: Record<string, number> = {}
    const totalPtByRegion: Record<string, number> = {}
    const totalSlugsByRegion: Record<string, number> = {} // total unique slugs published in any lang

    for (const row of rows) {
      const r = row.region || 'other'
      if (!REGIONS.includes(r)) continue
      if (LANGS.includes(row.lang)) {
        regionLangSets[r][row.lang].add(row.slug)
      }
      allSlugsByRegion[r].add(row.slug)
    }

    for (const r of REGIONS) {
      totalZhByRegion[r] = regionLangSets[r].zh.size
      totalEnByRegion[r] = regionLangSets[r].en.size
      totalPtByRegion[r] = regionLangSets[r].pt.size
      totalSlugsByRegion[r] = allSlugsByRegion[r].size
    }

    // Phase 1 = total ZH published (all regions combined)
    const phase1Done = REGIONS.reduce((s, r) => s + totalZhByRegion[r], 0)
    // Phase 1 total = total configs (managed in insight_configs/*.json, currently 137)
    const TOTAL_CONFIGS = 137
    // Phase 2 = EN + PT published (denominator = phase1Done * 2)
    const phase2Done = REGIONS.reduce((s, r) => s + totalEnByRegion[r] + totalPtByRegion[r], 0)
    const phase2Total = phase1Done * 2

    // Total unique slugs published across all regions
    const totalPublished = REGIONS.reduce((s, r) => s + totalSlugsByRegion[r], 0)

    const regionStats = REGIONS.map(r => ({
      region: r,
      zh: totalZhByRegion[r],
      en: totalEnByRegion[r],
      pt: totalPtByRegion[r],
      total: totalSlugsByRegion[r],
    }))

    const result = {
      phase1: { done: phase1Done, total: TOTAL_CONFIGS },
      phase2: { done: phase2Done, total: phase2Total },
      totalPublished,
      todayCount: todayCount ?? 0,
      regionStats,
      updatedAt: new Date().toISOString(),
    }

    _cache = { data: result, ts: Date.now() }
    return NextResponse.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=180' }
    })
  } catch (e) {
    console.error('insight-progress error', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
