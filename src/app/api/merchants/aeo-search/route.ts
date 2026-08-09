/**
 * /api/merchants/aeo-search — AEO 商戶搜尋端點
 * 模式 1: ?q=商戶名稱              → 商戶名稱模糊搜尋，limit 12
 * 模式 2: ?category=咖啡店&mode=ranking → 行業類別 AEO 排名，top 20 按分數降序
 */

import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// NOTE (2026-08-09): deliberately NO `export const revalidate` here.
// CLAUDE.md §3「force-dynamic + revalidate 不得共存」— force-dynamic 覆蓋
// revalidate，兩者同時存在等同每次重渲，2026-05 已因此造成 Vercel CPU 過載。
// 而且 ?q= 係自由文字搜尋，cache key 無上限，用 ISR (`revalidate`) 會為每條
// 唯一 query string 寫一個 ISR cache entry → 磁碟/cache 無限膨脹。
// 正解：保留 force-dynamic（避免 build 時 SSG 預渲染），改用**明確 CDN
// Cache-Control header** 做快取 —— CDN 只係按 URL 存，cache key 爆炸只會令
// hit rate 低，唔會爆存儲；而重複被打嘅熱門 query（AI 爬蟲/前端 ranking widget
// 反覆打同一批 category）就真係命中 edge cache，唔會再打 N+1。
export const dynamic = 'force-dynamic'
export const maxDuration = 20

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

// ranking 模式：?category= 詞彙有限（INDUSTRY_SCHEMA 映射 + 有限行業名），
// 重複率高、每次 miss 要打最多 60×2 = 120 條 query，值得長 TTL。
// 對齊同 repo 其他 AEO endpoint（aeo-detail / knowledge/index / aeo/entities = 3600）。
const CACHE_RANKING = 'public, s-maxage=3600, stale-while-revalidate=7200'
// search 模式：?q= 自由文字，cache key 長尾；短 TTL 只為食「同一 query 短時間
// 被連打」呢種情況，唔會令商戶資料長時間過期。
const CACHE_SEARCH = 'public, s-maxage=300, stale-while-revalidate=600'
// 空 query：固定 empty payload，可以放心較長。
const CACHE_EMPTY = 'public, s-maxage=1800'

function headersWith(cacheControl: string) {
  return { ...CORS, 'Cache-Control': cacheControl }
}

/** 行業關鍵字 → schema_type 映射（優先 schema_type，比 category name 更可靠） */
const INDUSTRY_SCHEMA: Record<string, string[]> = {
  '咖啡': ['CafeOrCoffeeShop', 'Bakery'],
  '咖啡廳': ['CafeOrCoffeeShop', 'Bakery'],
  '咖啡店': ['CafeOrCoffeeShop', 'Bakery'],
  '餐廳': ['Restaurant'],
  '食肆': ['Restaurant', 'CafeOrCoffeeShop', 'BarOrPub'],
  '餐飲': ['Restaurant', 'CafeOrCoffeeShop', 'Bakery', 'BarOrPub'],
  '酒店': ['Hotel', 'LodgingBusiness', 'Resort'],
  '住宿': ['Hotel', 'LodgingBusiness', 'Resort'],
  '景點': ['TouristAttraction', 'Museum', 'EntertainmentBusiness'],
  '購物': ['ShoppingCenter'],
  '博彩': ['Casino'],
  '賭場': ['Casino'],
  '酒吧': ['BarOrPub'],
  '美容': ['HealthAndBeautyBusiness'],
  '醫療': ['MedicalClinic'],
}

function resolveSchemaTypes(term: string): string[] | null {
  for (const [key, types] of Object.entries(INDUSTRY_SCHEMA)) {
    if (term.includes(key) || key.includes(term)) return types
  }
  return null
}

function schemaScore(schemaType: string | null): number {
  if (!schemaType) return 12
  const advanced = [
    'Restaurant', 'Hotel', 'LodgingBusiness', 'Resort', 'CafeOrCoffeeShop',
    'Bakery', 'BarOrPub', 'ShoppingCenter', 'Casino', 'TouristAttraction',
    'Museum', 'HealthAndBeautyBusiness', 'MedicalClinic', 'EntertainmentBusiness',
  ]
  if (advanced.includes(schemaType)) return 55
  if (schemaType === 'LocalBusiness') return 28
  return 40
}

function calcAeo(sSchema: number, sFaq: number, sKg: number, sTrust: number): number {
  return Math.min(100, Math.round(sSchema * 0.25 + sFaq * 0.35 + sKg * 0.15 + sTrust * 0.25))
}

function citationHeuristic(trustScore: number): { chatgpt: boolean; perplexity: boolean; claude: boolean } {
  return {
    chatgpt: trustScore >= 55,
    perplexity: trustScore >= 72,
    claude: trustScore >= 45,
  }
}

async function computeResults(db: ReturnType<typeof createServiceClient>, merchants: Record<string, unknown>[]) {
  return Promise.all(
    merchants.map(async (m) => {
      const [faqRes, kgRes] = await Promise.all([
        // 2026-07-27: 排除 insight_derived（96.7% 廣播式污染）— 呢個 count
        // 直接餵 sFaq/aeoScore 公式，唔過濾會令幾乎所有商戶因為掛咗廣播 FAQ
        // 而被誤判高分，反而遮蔽真正冇 FAQ 嘅商戶。
        db.from('merchant_faqs')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', m.id)
          .eq('lang', 'zh')
          .neq('faq_type', 'insight_derived'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db as any).from('knowledge_entities')
          .select('entity_id')
          .or(`external_ids->>merchant_slug.eq.${m.slug},canonical_name.eq.${m.slug}`)
          .limit(1),
      ])

      const faqCount = faqRes.count ?? 0
      const hasKg = (kgRes.data?.length ?? 0) > 0
      const trust = (m.trust_score as number) ?? 30

      const sSchema = schemaScore(m.schema_type as string | null)
      const sFaq = Math.min(100, Math.round((faqCount / 12) * 100))
      const sKg = hasKg ? Math.min(100, Math.round(faqCount * 4 + 35)) : Math.min(60, Math.round(faqCount * 2))
      const sCite = Math.round(trust * 0.55 + calcAeo(sSchema, sFaq, sKg, trust) * 0.45)
      const aeoTotal = calcAeo(sSchema, sFaq, sKg, trust)

      return {
        id: m.id,
        slug: m.slug,
        name: m.name_zh,
        nameEn: (m.name_en as string) ?? null,
        category: ((m.category as { name_zh?: string } | null))?.name_zh ?? null,
        district: (m.district as string) ?? null,
        tier: m.tier,
        verified: m.verification_status === 'verified',
        updated: m.updated_at ? (m.updated_at as string).split('T')[0] : null,
        aeoScore: aeoTotal,
        trustScore: trust,
        subScores: { schema: sSchema, faq: sFaq, kg: sKg, cite: sCite },
        faqCount,
        schemaType: (m.schema_type as string) ?? null,
        hasKg,
        citations: citationHeuristic(trust),
      }
    })
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const category = searchParams.get('category')?.trim() ?? ''
  const mode = searchParams.get('mode') ?? 'search'
  const isRanking = mode === 'ranking' || !!category

  if (!q && !category) {
    return NextResponse.json({ results: [], mode: 'search' }, { headers: headersWith(CACHE_EMPTY) })
  }

  const db = createServiceClient()
  const base = db
    .from('merchants')
    .select(`
      id, slug, name_zh, name_en, district, tier, status,
      schema_type, trust_score, updated_at, verification_status,
      category:categories(slug, name_zh)
    `)
    .not('status', 'eq', 'archived')

  let query
  if (category) {
    const schemaTypes = resolveSchemaTypes(category)
    if (schemaTypes) {
      query = base.in('schema_type', schemaTypes).limit(60)
    } else {
      // Two-step: find category IDs → filter merchants
      const { data: cats } = await db.from('categories').select('id').ilike('name_zh', `%${category}%`).limit(10)
      if (cats?.length) {
        query = base.in('category_id', cats.map((c: { id: unknown }) => c.id)).limit(60)
      } else {
        query = base.or(`name_zh.ilike.%${category}%,name_en.ilike.%${category}%`).limit(30)
      }
    }
  } else {
    query = base.or(`name_zh.ilike.%${q}%,name_en.ilike.%${q}%,slug.ilike.%${q}%`).limit(12)
  }

  const { data: merchants, error } = await query
  if (error || !merchants?.length) {
    // 唔可以快取一個 DB error —— 否則一次 transient 失敗會被 CDN 釘住一個鐘。
    // 只有「真係搵唔到」嘅空結果先照正常 TTL 快取。
    const cache = error
      ? 'no-store'
      : isRanking ? CACHE_RANKING : CACHE_SEARCH
    return NextResponse.json(
      { results: [], mode: isRanking ? 'ranking' : 'search', category },
      { headers: headersWith(cache) }
    )
  }

  const results = await computeResults(db, merchants as Record<string, unknown>[])

  if (isRanking) {
    results.sort((a, b) => b.aeoScore - a.aeoScore)
    return NextResponse.json({
      results: results.slice(0, 20),
      mode: 'ranking',
      category,
      poolSize: merchants.length,
    }, { headers: headersWith(CACHE_RANKING) })
  }

  return NextResponse.json({ results, mode: 'search' }, { headers: headersWith(CACHE_SEARCH) })
}
