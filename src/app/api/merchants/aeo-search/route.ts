/**
 * /api/merchants/aeo-search — AEO 商戶搜尋端點
 * 供澳門商戶 AEO 儀表板使用，返回搜尋結果及各商戶的計算 AEO 分數
 */

import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

/** Schema 完整度估算（基於 schema_type 字段） */
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

/** AEO 總分計算（加權） */
function calcAeo(sSchema: number, sFaq: number, sKg: number, sTrust: number): number {
  return Math.min(100, Math.round(sSchema * 0.25 + sFaq * 0.35 + sKg * 0.15 + sTrust * 0.25))
}

/** 引用狀態估算（基於 trust_score，無實際 per-merchant citation 數據） */
function citationHeuristic(trustScore: number): { chatgpt: boolean; perplexity: boolean; claude: boolean } {
  return {
    chatgpt: trustScore >= 55,
    perplexity: trustScore >= 72,
    claude: trustScore >= 45,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 1) return NextResponse.json({ results: [] }, { headers: CORS })

  const db = createServiceClient()

  const { data: merchants, error } = await db
    .from('merchants')
    .select(`
      id, slug, name_zh, name_en, district, tier, status,
      schema_type, trust_score, updated_at, verification_status,
      category:categories(slug, name_zh)
    `)
    .or(`name_zh.ilike.%${q}%,name_en.ilike.%${q}%,slug.ilike.%${q}%`)
    .not('status', 'eq', 'archived')
    .limit(12)

  if (error || !merchants?.length) {
    return NextResponse.json({ results: [] }, { headers: CORS })
  }

  const results = await Promise.all(
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
      const trust = m.trust_score ?? 30

      const sSchema = schemaScore(m.schema_type)
      const sFaq = Math.min(100, Math.round((faqCount / 12) * 100))
      const sKg = hasKg ? Math.min(100, Math.round(faqCount * 4 + 35)) : Math.min(60, Math.round(faqCount * 2))
      const sCite = Math.round(trust * 0.55 + calcAeo(sSchema, sFaq, sKg, trust) * 0.45)
      const aeoTotal = calcAeo(sSchema, sFaq, sKg, trust)

      return {
        id: m.id,
        slug: m.slug,
        name: m.name_zh,
        nameEn: m.name_en ?? null,
        category: (m.category as { name_zh?: string } | null)?.name_zh ?? null,
        district: m.district ?? null,
        tier: m.tier,
        verified: m.verification_status === 'verified',
        updated: m.updated_at ? m.updated_at.split('T')[0] : null,
        aeoScore: aeoTotal,
        trustScore: trust,
        subScores: { schema: sSchema, faq: sFaq, kg: sKg, cite: sCite },
        faqCount,
        schemaType: m.schema_type ?? null,
        hasKg,
        citations: citationHeuristic(trust),
      }
    })
  )

  return NextResponse.json({ results }, { headers: CORS })
}
