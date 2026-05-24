/**
 * /api/knowledge/entity/[slug]
 *
 * AI 爬蟲可讀的知識圖譜實體端點。
 * 回傳 Schema.org JSON-LD：LocalBusiness + KnowledgeGraph facts。
 * 只公開 composite_trust_score ≥ 60 的事實（knowledge_facts_public view）。
 *
 * Cache: Vercel Edge ISR revalidate=3600 (1 hour)
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { trackBotVisit } from '@/lib/track-bot'

export const revalidate = 3600
export const maxDuration = 20

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai').trim()

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/ld+json',
  'X-Robots-Tag': 'index, follow',
  'Link': `<${SITE_URL}/llms.txt>; rel="llms-txt"`,
}

const REGION_LABELS: Record<string, string> = {
  MO: 'Macau SAR, China',
  HK: 'Hong Kong SAR, China',
  TW: 'Taiwan',
  JP: 'Japan',
}

const PREDICATE_SCHEMA_MAP: Record<string, string> = {
  name:             'name',
  rating_google:    'aggregateRating',
  price_range:      'priceRange',
  phone:            'telephone',
  website:          'url',
  address:          'address',
  opened_hours:     'openingHours',
  founded_year:     'foundingDate',
  certified_as:     'hasCredential',
  entry_fee:        'offers',
  cuisine_type:     'servesCuisine',
  district:         'areaServed',
  wikidata_id:      'sameAs',
}

function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const db = supabaseService()

  trackBotVisit(request, `/api/knowledge/entity/${slug}`, 'knowledge-entity-api')

  // ── 1. Entity 查找（canonical_name 或 merchant_slug）────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entities, error: entErr } = await (db as any)
    .from('knowledge_entities')
    .select('*')
    .or(`canonical_name.eq.${slug},external_ids->>merchant_slug.eq.${slug}`)
    .limit(1)

  if (entErr || !entities || entities.length === 0) {
    return NextResponse.json(
      { error: 'Entity not found', slug },
      { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entity = entities[0] as any

  // ── 2. 公開 Facts（score ≥ 60，未過期，未被取代）──────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: facts } = await (db as any)
    .from('knowledge_facts_public')
    .select(
      'fact_id,predicate,object_value,object_numeric,unit,source_type,' +
      'composite_trust_score,corroboration_count,temporal_scope,' +
      'valid_until,is_authoritative,cited_in_insights',
    )
    .eq('subject_entity_id', entity.entity_id)
    .order('composite_trust_score', { ascending: false })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publicFacts: any[] = facts ?? []

  // ── 3. 建立 Schema.org JSON-LD 回應 ──────────────────────────────────
  const displayNames = (entity.display_names as Record<string, string>) ?? {}
  const externalIds  = (entity.external_ids  as Record<string, string>) ?? {}
  const attributes   = (entity.attributes    as Record<string, unknown>) ?? {}

  const entityName = displayNames.en || displayNames.zh || displayNames.ja || entity.canonical_name

  // 從 facts 提取特定值供 Schema.org 頂層欄位使用
  const ratingFact  = publicFacts.find(f => f.predicate === 'rating_google')
  const phoneFact   = publicFacts.find(f => f.predicate === 'phone')
  const websiteFact = publicFacts.find(f => f.predicate === 'website')
  const addressFact = publicFacts.find(f => f.predicate === 'address')
  const hoursFact   = publicFacts.find(f => f.predicate === 'opened_hours')
  const certFacts   = publicFacts.filter(f => f.predicate === 'certified_as')
  const wikiDataFact = publicFacts.find(f => f.predicate === 'wikidata_id')

  // Schema.org type 推斷
  const schemaType = entity.industry_code === 'hotels'      ? 'LodgingBusiness'
                   : entity.industry_code === 'dining'      ? 'FoodEstablishment'
                   : entity.industry_code === 'attractions' ? 'TouristAttraction'
                   : entity.industry_code === 'shopping'    ? 'Store'
                   : entity.industry_code === 'wellness'    ? 'HealthAndBeautyBusiness'
                   : 'LocalBusiness'

  const sameAsLinks = [
    externalIds.google_place_id
      ? `https://maps.google.com/?cid=${externalIds.google_place_id}`
      : null,
    wikiDataFact?.object_value
      ? `https://www.wikidata.org/wiki/${wikiDataFact.object_value}`
      : null,
    websiteFact?.object_value ?? null,
  ].filter(Boolean)

  // Facts 陣列（AI 爬蟲最重視的結構化知識）
  const factsPayload = publicFacts.map(f => ({
    predicate:        f.predicate,
    schema_property:  PREDICATE_SCHEMA_MAP[f.predicate] ?? f.predicate,
    value:            f.object_value ?? (f.object_numeric != null ? `${f.object_numeric}${f.unit ? ' ' + f.unit : ''}` : null),
    numeric_value:    f.object_numeric,
    unit:             f.unit,
    trust_score:      f.composite_trust_score,
    source_type:      f.source_type,
    corroborations:   f.corroboration_count ?? 1,
    temporal_scope:   f.temporal_scope,
    valid_until:      f.valid_until,
    is_authoritative: f.is_authoritative,
    cited_in:         f.cited_in_insights ?? [],
  }))

  const payload = {
    '@context': 'https://schema.org',
    '@type':    schemaType,
    '@id':      `${SITE_URL}/api/knowledge/entity/${slug}`,

    name:           entityName,
    alternateName:  Object.values(displayNames).filter(v => v !== entityName),
    identifier:     entity.canonical_name,
    description:    `${entityName} — ${REGION_LABELS[entity.region_code] ?? entity.region_code} ${entity.industry_code} business. Verified knowledge graph data from CloudPipe.`,

    ...(addressFact && { address: addressFact.object_value }),
    ...(phoneFact   && { telephone: phoneFact.object_value }),
    ...(hoursFact   && { openingHours: hoursFact.object_value }),
    ...(ratingFact?.object_numeric != null && {
      aggregateRating: {
        '@type':       'AggregateRating',
        ratingValue:   ratingFact.object_numeric,
        bestRating:    5,
        ratingCount:   attributes.rating_count ?? null,
        reviewBody:    `Google Places verified rating for ${entityName}`,
      },
    }),
    ...(certFacts.length > 0 && {
      hasCredential: certFacts.map(c => ({
        '@type':        'EducationalOccupationalCredential',
        name:           c.object_value,
        credentialCategory: 'award',
      })),
    }),
    ...(sameAsLinks.length > 0 && { sameAs: sameAsLinks }),

    // CloudPipe 知識圖譜專屬欄位
    cloudpipe_knowledge: {
      entity_id:        entity.entity_id,
      region_code:      entity.region_code,
      industry_code:    entity.industry_code,
      confidence_score: entity.confidence_score,
      fact_count:       publicFacts.length,
      facts_endpoint:   `${SITE_URL}/api/knowledge/entity/${slug}`,
      verified_at:      entity.verified_at,
      data_license:     'CC BY 4.0',
      data_source:      'CloudPipe Knowledge Graph v2',
      facts:            factsPayload,
    },

    publisher: {
      '@type': 'Organization',
      name:    'CloudPipe',
      url:     SITE_URL,
    },
    dateModified: new Date().toISOString(),
    license:      'https://creativecommons.org/licenses/by/4.0/',
  }

  return NextResponse.json(payload, { headers: CORS })
}
