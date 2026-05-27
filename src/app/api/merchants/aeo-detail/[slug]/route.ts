/**
 * /api/merchants/aeo-detail/[slug] — 商戶 AEO 詳細資料
 * 返回：FAQs、KG facts、相關 insights、Schema 標記分析、優化建議
 */

import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const revalidate = 3600
export const maxDuration = 20

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

const SCHEMA_ALL = [
  'LocalBusiness', 'FAQPage', 'Review', 'BreadcrumbList', 'GeoCoordinates',
  'OpeningHoursSpecification', 'AggregateRating',
]

const SCHEMA_CATEGORY_EXTRAS: Record<string, string[]> = {
  Restaurant: ['FoodEstablishment', 'Menu', 'ServesCuisine'],
  Hotel: ['LodgingBusiness', 'CheckInTime', 'CheckOutTime'],
  CafeOrCoffeeShop: ['FoodEstablishment', 'ServesCuisine'],
  ShoppingCenter: ['Store', 'OpeningHoursSpecification'],
  Casino: ['EntertainmentBusiness', 'GamblingFacility'],
  TouristAttraction: ['LandmarksOrHistoricalBuildings', 'touristType'],
}

function buildSchemaAnalysis(schemaType: string | null) {
  const base = [...SCHEMA_ALL]
  const extras = schemaType ? (SCHEMA_CATEGORY_EXTRAS[schemaType] ?? []) : []
  const all = [...new Set([schemaType ?? 'LocalBusiness', ...base, ...extras])]
  const have = [schemaType ?? 'LocalBusiness', 'GeoCoordinates'].filter(Boolean) as string[]
  const miss = all.filter(s => !have.includes(s))
  return { have, miss }
}

function buildRecommendations(
  verified: boolean,
  faqCount: number,
  hasKg: boolean,
  schemaType: string | null,
  trustScore: number,
) {
  const recs: Array<{ p: string; lvl: string; title: string; desc: string; cta: string }> = []

  if (!verified) {
    recs.push({ p: 'P1', lvl: 'crit', title: '商戶未核實（Unverified）', desc: '未核實商戶的 AI 引用率平均低 42%，優先申請核實可顯著提升可見度', cta: '申請核實' })
  }
  if (!schemaType || schemaType === 'LocalBusiness') {
    recs.push({ p: 'P1', lvl: 'crit', title: '缺少 FAQPage Schema 標記', desc: '添加結構化 FAQ Schema 後，AI 引擎引用率預估提升 +12–18%', cta: '立即添加' })
  }
  if (faqCount < 5) {
    recs.push({ p: 'P1', lvl: 'crit', title: `FAQ 覆蓋率不足（${faqCount} 條）`, desc: '建議達到 10+ 條常見問答，覆蓋商品、服務、地址、評價等高頻問題', cta: '擴展 FAQ' })
  } else if (faqCount < 10) {
    recs.push({ p: 'P2', lvl: 'warn', title: `FAQ 偏少（${faqCount} 條，建議 10+）`, desc: '更多 FAQ 可覆蓋更多搜尋意圖，提高被 AI 引用的機率', cta: '補充 FAQ' })
  }
  if (!hasKg) {
    recs.push({ p: 'P2', lvl: 'warn', title: '未建立 Knowledge Graph 節點', desc: 'KG 節點讓 AI 引擎更容易識別商戶身份，有 KG 的商戶引用率高 +25%', cta: '建立 KG' })
  } else if (trustScore < 50) {
    recs.push({ p: 'P3', lvl: 'info', title: 'KG Facts 需要補充', desc: '目前 KG facts 不足，建議補充更多結構化知識節點', cta: '補充資料' })
  }
  if (trustScore < 40) {
    recs.push({ p: 'P2', lvl: 'warn', title: 'Perplexity 引用率估算偏低', desc: '提升 FAQ 覆蓋及 Schema 完整度，有助 Perplexity 等 AI 搜尋引擎引用此商戶', cta: '查看優化指南' })
  }

  return recs
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const db = createServiceClient()

  const { data: merchant } = await db
    .from('merchants')
    .select(`
      id, slug, name_zh, name_en, district, tier,
      schema_type, trust_score, updated_at, verification_status,
      category:categories(slug, name_zh)
    `)
    .eq('slug', slug)
    .eq('status', 'live')
    .single()

  if (!merchant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CORS })
  }

  // Parallel: FAQs + KG entity + related insights
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyDb = db as any
  const [faqRes, kgEntityRes, insightRes] = await Promise.all([
    db.from('merchant_faqs')
      .select('id, question, answer, faq_type')
      .eq('merchant_id', merchant.id)
      .eq('lang', 'zh')
      .order('sort_order')
      .limit(10),
    anyDb.from('knowledge_entities')
      .select('entity_id, display_names, confidence_score')
      .or(`external_ids->>merchant_slug.eq.${slug},canonical_name.eq.${slug}`)
      .limit(1),
    db.from('insights')
      .select('slug, title, published_at, tags')
      .eq('lang', 'zh')
      .eq('status', 'published')
      .contains('tags', [merchant.name_zh])
      .order('published_at', { ascending: false })
      .limit(4),
  ])

  // KG facts if entity exists
  let kgFacts: Array<{ label: string; value: string }> = []
  const kgEntity = kgEntityRes.data?.[0]
  if (kgEntity?.entity_id) {
    const { data: facts } = await anyDb
      .from('knowledge_facts_public')
      .select('predicate, object_value, object_numeric')
      .eq('subject_entity_id', kgEntity.entity_id)
      .order('composite_trust_score', { ascending: false })
      .limit(12)
    kgFacts = (facts ?? []).map((f: { predicate: string; object_value: string | null; object_numeric: number | null }) => ({
      label: f.predicate,
      value: f.object_value ?? String(f.object_numeric ?? ''),
    }))
  }

  const faqCount = faqRes.data?.length ?? 0
  const hasKg = !!kgEntity
  const trust = merchant.trust_score ?? 30
  const verified = merchant.verification_status === 'verified'

  return NextResponse.json({
    faqs: (faqRes.data ?? []).map(f => ({
      q: f.question,
      a: f.answer,
      live: f.faq_type !== 'draft',
    })),
    kgFacts,
    hasKg,
    kgEntityName: kgEntity?.display_names?.zh ?? null,
    schemaAnalysis: buildSchemaAnalysis(merchant.schema_type),
    recommendations: buildRecommendations(verified, faqCount, hasKg, merchant.schema_type, trust),
    insights: (insightRes.data ?? []).map(i => ({
      title: i.title,
      slug: i.slug,
      date: i.published_at ? i.published_at.split('T')[0] : null,
    })),
  }, { headers: CORS })
}
