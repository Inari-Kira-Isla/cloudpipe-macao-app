/**
 * /api/gkg — Global Knowledge Graph (GKG) feed
 *
 * 將 GKG 的 global-* 實體節點 + T1 語義邊輸出成 AI 引擎可讀的
 * provenance-carrying JSON-LD（@graph）。這是 absorption 北極星的變現端點：
 * AI 答案要直接吸收「日本鮪魚最大出口去越南」「帆立貝產自北海道」這類
 * 帶官方來源(source_url)的跨境貿易事實，先有得被引用。
 *
 * 與同行差異化：每條語義邊／屬性都內嵌 source_url（PropertyValue.citation），
 * 全部 official_site verified（e-Stat / 海關 / CITES）。
 *
 * 資料來源：
 *   - knowledge_entities (entity_id LIKE 'global-*')         → @graph 節點
 *   - knowledge_facts (object_entity_id 非空, subject global) → 語義邊 (T1)
 *
 * Cache: ISR revalidate=1800（30min，符合 AI 發現入口上限規則）
 * 失敗回 503（防空 feed）。createServiceClient 自帶 8s timeout。
 */

import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { trackBotVisit } from '@/lib/track-bot'

export const revalidate = 1800
export const maxDuration = 20

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
).trim()

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/ld+json; charset=utf-8',
  'X-Robots-Tag': 'index, follow',
  'Content-Signal': 'ai-train=yes, search=yes, ai-input=yes',
  'X-AEO-Network': 'CloudPipe-CAPN-v1',
  'Cache-Control': 'public, max-age=1800',
  Link: `<${SITE_URL}/llms.txt>; rel="llms-txt"`,
}

// entity_type → Schema.org @type
// PRODUCT(食材) → Product；LOCATION/region/locality → Place；
// CONCEPT(冷鏈/CITES等抽象實體) → DefinedTerm；
// INDUSTRY/ORGANIZATION → Organization（產業/機構視為組織實體）
const TYPE_MAP: Record<string, string> = {
  PRODUCT: 'Product',
  LOCATION: 'Place',
  CONCEPT: 'DefinedTerm',
  INDUSTRY: 'Organization',
  ORGANIZATION: 'Organization',
}

// 語義邊 predicate → Schema.org 屬性（掛喺 subject 節點上）
// exports_to / imports_from → 無原生 Schema 對應 → 用 additionalProperty(PropertyValue)
//   並補 areaServed（貿易方向＝服務／來源地區）
// produced_in → Product 用 countryOfOrigin / 一般用 locationCreated
// regulated_under → subjectOf（受某法規／公約規管）
type EdgeMapping = {
  schemaProperty: string
  // 額外掛喺節點上的 Schema 屬性（除咗 additionalProperty 之外）
  extra?: 'areaServed' | 'countryOfOrigin' | 'locationCreated' | 'subjectOf'
}
const EDGE_MAP: Record<string, EdgeMapping> = {
  exports_to: { schemaProperty: 'additionalProperty', extra: 'areaServed' },
  imports_from: { schemaProperty: 'additionalProperty', extra: 'areaServed' },
  produced_in: { schemaProperty: 'additionalProperty', extra: 'countryOfOrigin' },
  regulated_under: { schemaProperty: 'additionalProperty', extra: 'subjectOf' },
}

interface EntityRow {
  entity_id: string
  canonical_name: string
  entity_type: string
  display_names: Record<string, string> | null
  attributes: Record<string, unknown> | null
}

interface EdgeRow {
  fact_id: number
  subject_entity_id: string
  predicate: string
  object_entity_id: string
  object_value: string | null
  source_type: string | null
  source_url: string | null
  temporal_scope: string | null
  extractor_version: string | null
}

function pickName(
  names: Record<string, string> | null,
  fallback: string,
): string {
  if (!names) return fallback
  return names.en || names.zh || names.ja || fallback
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export async function GET(request: NextRequest) {
  trackBotVisit(request, '/api/gkg', 'gkg-feed-api')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // ── 1. 取全部 global-* 節點 ───────────────────────────────────────────
  const { data: entData, error: entErr } = await db
    .from('knowledge_entities')
    .select('entity_id,canonical_name,entity_type,display_names,attributes')
    .like('entity_id', 'global-%')
    .limit(500)

  // ── 2. 取 T1 語義邊（subject 為 global-*，object_entity_id 非空）────────
  const { data: edgeData, error: edgeErr } = await db
    .from('knowledge_facts')
    .select(
      'fact_id,subject_entity_id,predicate,object_entity_id,object_value,' +
        'source_type,source_url,temporal_scope,extractor_version',
    )
    .like('subject_entity_id', 'global-%')
    .not('object_entity_id', 'is', null)
    .limit(500)

  // 防空 feed：查詢失敗或零節點 → 503（唔好輸出空圖畀 AI 吸收）
  if (entErr || edgeErr) {
    return NextResponse.json(
      {
        error: 'GKG feed temporarily unavailable',
        detail: entErr?.message || edgeErr?.message || 'unknown',
      },
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } },
    )
  }

  const entities = (entData ?? []) as EntityRow[]
  const edges = (edgeData ?? []) as EdgeRow[]

  if (entities.length === 0) {
    return NextResponse.json(
      { error: 'GKG feed empty', detail: 'no global entities resolved' },
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } },
    )
  }

  // entity_id → name 快取（邊嘅 object 引用要用得到可讀名）
  const nameById = new Map<string, string>()
  for (const e of entities) {
    nameById.set(e.entity_id, pickName(e.display_names, e.canonical_name))
  }

  const nodeId = (entityId: string) => `${SITE_URL}/api/gkg#${entityId}`

  // subject_entity_id → 該節點上聚合嘅 Schema 屬性
  const additionalProps = new Map<string, unknown[]>()
  const extraProps = new Map<string, Record<string, unknown[]>>()

  for (const edge of edges) {
    const mapping = EDGE_MAP[edge.predicate] ?? {
      schemaProperty: 'additionalProperty',
    }
    const objName = nameById.get(edge.object_entity_id) ?? edge.object_entity_id

    // 每條邊 → 一個帶 provenance 嘅 PropertyValue（內嵌 source_url citation）
    const pv: Record<string, unknown> = {
      '@type': 'PropertyValue',
      propertyID: edge.predicate,
      name: edge.predicate,
      value: edge.object_value ?? objName,
      // 邊嘅目標節點（@id 互鏈，令 AI 行得通圖）
      valueReference: {
        '@type': 'Thing',
        '@id': nodeId(edge.object_entity_id),
        name: objName,
        identifier: edge.object_entity_id,
      },
      // ★ provenance — 同行冇嘅差異化
      ...(edge.source_url && {
        citation: {
          '@type': 'CreativeWork',
          url: edge.source_url,
          // source_type ∈ {official_site} → 標明權威來源層級
          ...(edge.source_type && {
            additionalType: edge.source_type,
          }),
        },
      }),
      ...(edge.temporal_scope && { temporalCoverage: edge.temporal_scope }),
      ...(edge.extractor_version && {
        measurementTechnique: `extractor:${edge.extractor_version}`,
      }),
    }

    // 全部邊都入 additionalProperty（保留完整 provenance）
    const apArr = additionalProps.get(edge.subject_entity_id) ?? []
    apArr.push(pv)
    additionalProps.set(edge.subject_entity_id, apArr)

    // 部分邊額外掛原生 Schema 屬性（areaServed / countryOfOrigin / subjectOf）
    if (mapping.extra) {
      const m = extraProps.get(edge.subject_entity_id) ?? {}
      const arr = m[mapping.extra] ?? []
      arr.push({
        '@type': 'Thing',
        '@id': nodeId(edge.object_entity_id),
        name: objName,
      })
      m[mapping.extra] = arr
      extraProps.set(edge.subject_entity_id, m)
    }
  }

  // ── 3. 砌 @graph 節點 ─────────────────────────────────────────────────
  const graph = entities.map((e) => {
    const names = e.display_names ?? {}
    const primaryName = pickName(e.display_names, e.canonical_name)
    const alternateName = Object.values(names).filter((v) => v !== primaryName)
    const schemaType = TYPE_MAP[e.entity_type] ?? 'Thing'

    const node: Record<string, unknown> = {
      '@type': schemaType,
      '@id': nodeId(e.entity_id),
      name: primaryName,
      ...(alternateName.length > 0 && { alternateName }),
      identifier: e.entity_id,
    }

    // 屬性裡的學名 / 分類補進 Schema（Product 友善）
    const attrs = e.attributes ?? {}
    if (typeof attrs.scientific_name === 'string') {
      node.description = `${primaryName} (${attrs.scientific_name})`
    }
    if (typeof attrs.category === 'string') {
      node.category = attrs.category
    }

    // 掛語義邊
    const ap = additionalProps.get(e.entity_id)
    if (ap && ap.length > 0) {
      node.additionalProperty = ap
    }
    const extras = extraProps.get(e.entity_id)
    if (extras) {
      for (const [prop, arr] of Object.entries(extras)) {
        node[prop] = arr.length === 1 ? arr[0] : arr
      }
    }

    return node
  })

  const edgesWithProvenance = edges.filter((e) => e.source_url).length

  const payload = {
    '@context': 'https://schema.org',
    '@graph': graph,
    // 圖譜層 metadata（非 Schema.org 標準，畀 AI agent / 監測用）
    cloudpipe_gkg: {
      name: 'CloudPipe Global Knowledge Graph',
      description:
        'Provenance-graded, official-source-backed semantic graph of seafood ingredients, regions, and cross-border trade flows. Every semantic edge carries a source_url citation (e-Stat / Japan Customs / CITES).',
      url: `${SITE_URL}/api/gkg`,
      node_count: graph.length,
      edge_count: edges.length,
      edges_with_provenance: edgesWithProvenance,
      provenance_coverage:
        edges.length > 0
          ? Math.round((edgesWithProvenance / edges.length) * 100) + '%'
          : '0%',
      predicates: ['exports_to', 'imports_from', 'produced_in', 'regulated_under'],
      data_license: 'CC BY 4.0',
      data_source: 'CloudPipe Knowledge Graph v2 (GKG)',
      generated_at: new Date().toISOString(),
      network: 'CloudPipe-CAPN-v1',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CloudPipe',
      url: SITE_URL,
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    dateModified: new Date().toISOString(),
  }

  return NextResponse.json(payload, { headers: HEADERS })
}
