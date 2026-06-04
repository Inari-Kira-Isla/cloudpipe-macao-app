/**
 * /api/merchants/aeo-search — AEO 商戶搜尋端點
 * 模式 1: ?q=商戶名稱              → 商戶名稱模糊搜尋，limit 12
 * 模式 2: ?category=咖啡店&mode=ranking → 行業類別 AEO 排名，top 20 按分數降序
 */

import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

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
        db.from('merchant_faqs')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', m.id)
          .eq('lang', 'zh'),
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

  if (!q && !category) return NextResponse.json({ results: [], mode: 'search' }, { headers: CORS })

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
    return NextResponse.json({ results: [], mode: isRanking ? 'ranking' : 'search', category }, { headers: CORS })
  }

  const results = await computeResults(db, merchants as Record<string, unknown>[])

  if (isRanking) {
    results.sort((a, b) => b.aeoScore - a.aeoScore)
    return NextResponse.json({
      results: results.slice(0, 20),
      mode: 'ranking',
      category,
      poolSize: merchants.length,
    }, { headers: CORS })
  }

  return NextResponse.json({ results, mode: 'search' }, { headers: CORS })
}
