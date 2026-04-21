'use client'

import { useEffect, useState } from 'react'

interface KGFact {
  predicate: string
  schema_property: string
  value: string | null
  numeric_value: number | null
  unit: string | null
  trust_score: number
  source_type: string
  corroborations: number
  temporal_scope: string | null
  is_authoritative: boolean
}

interface KGData {
  entity_id: string
  region_code: string
  industry_code: string
  confidence_score: number
  fact_count: number
  facts: KGFact[]
}

interface Props {
  slug: string
}

const ALL_PREDICATES = [
  { key: 'address_en',         label: '英文地址',     icon: '📍' },
  { key: 'address_zh',         label: '中文地址',     icon: '📍' },
  { key: 'phone',              label: '電話',         icon: '📞' },
  { key: 'website',            label: '網址',         icon: '🌐' },
  { key: 'opening_hours',      label: '營業時間',     icon: '🕐' },
  { key: 'district',           label: '地區',         icon: '🗺️' },
  { key: 'sub_district',       label: '分區',         icon: '🗺️' },
  { key: 'rating_google',      label: 'Google 評分',  icon: '⭐' },
  { key: 'rating_count',       label: '評論數',       icon: '💬' },
  { key: 'rating_tripadvisor', label: 'TripAdvisor',  icon: '🧳' },
  { key: 'price_range',        label: '價格區間',     icon: '💰' },
  { key: 'geo_lat',            label: '座標緯度',     icon: '📌' },
  { key: 'geo_lng',            label: '座標經度',     icon: '📌' },
  { key: 'certified_as',       label: '認證',         icon: '🏅' },
]

function scoreColor(score: number) {
  if (score >= 80) return '#059669'
  if (score >= 60) return '#d97706'
  return '#ef4444'
}

function trustBadge(trust: number) {
  if (trust >= 90) return { label: '高信度', bg: '#dcfce7', color: '#166534' }
  if (trust >= 70) return { label: '中信度', bg: '#fef9c3', color: '#854d0e' }
  return { label: '低信度', bg: '#fee2e2', color: '#991b1b' }
}

function formatValue(fact: KGFact): string {
  if (fact.numeric_value !== null) {
    return fact.unit === 'rating'
      ? `${fact.numeric_value.toFixed(1)} ★`
      : `${fact.numeric_value}${fact.unit ? ' ' + fact.unit : ''}`
  }
  if (!fact.value) return '—'
  if (fact.value.length > 60) return fact.value.slice(0, 60) + '…'
  return fact.value
}

export default function KnowledgeGraphBlock({ slug }: Props) {
  const [kg, setKg] = useState<KGData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/knowledge/entity/${slug}`)
      .then(r => r.json())
      .then(d => {
        const kgData = d?.cloudpipe_knowledge
        if (!kgData) { setError('no_data'); setLoading(false); return }
        setKg(kgData)
        setLoading(false)
      })
      .catch(() => { setError('fetch_error'); setLoading(false) })
  }, [slug])

  if (loading) return (
    <div style={{ background: 'white', borderRadius: 12, padding: 32, border: '1px solid #e5e7eb', marginBottom: 32, textAlign: 'center', color: '#9ca3af' }}>
      ⏳ 載入知識圖譜數據…
    </div>
  )

  if (error || !kg) return null

  const presentKeys = new Set(kg.facts.map(f => f.predicate))
  const missingPredicates = ALL_PREDICATES.filter(p => !presentKeys.has(p.key))
  const coverage = Math.round((ALL_PREDICATES.length - missingPredicates.length) / ALL_PREDICATES.length * 100)
  const conf = kg.confidence_score
  const confColor = scoreColor(conf)

  return (
    <div style={{ marginBottom: 32 }}>

      {/* Header Card */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>🧩 品牌知識圖譜</h2>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              AI 引擎從知識圖譜提取品牌事實。覆蓋率越高，被引用機率越大。
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: confColor, lineHeight: 1 }}>{conf}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>圖譜信心分 /100</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: '已注入事實', value: kg.fact_count, unit: '條', color: '#0f4c81' },
            { label: '欄位覆蓋率', value: coverage, unit: '%', color: '#059669' },
            { label: '缺口數量',   value: missingPredicates.length, unit: '項', color: missingPredicates.length > 3 ? '#ef4444' : '#d97706' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}<span style={{ fontSize: 13, fontWeight: 400 }}>{s.unit}</span></div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Confidence bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            <span>圖譜信心分</span>
            <span style={{ color: confColor, fontWeight: 600 }}>{conf}/100</span>
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: 6, height: 8 }}>
            <div style={{ background: confColor, borderRadius: 6, height: 8, width: `${conf}%`, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            目標 85+（需補齊評論數、認證、分區欄位）
          </div>
        </div>
      </div>

      {/* Facts Grid */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>✅ 已注入事實（{kg.fact_count} 條）</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {kg.facts.map((fact, i) => {
            const meta = ALL_PREDICATES.find(p => p.key === fact.predicate)
            const badge = trustBadge(fact.trust_score)
            return (
              <div key={i} style={{
                border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{meta?.icon || '📄'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{meta?.label || fact.predicate}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: badge.bg, color: badge.color, fontWeight: 600, flexShrink: 0, marginLeft: 4 }}>
                      {badge.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatValue(fact)}
                  </div>
                  <div style={{ fontSize: 10, color: '#d1d5db', marginTop: 2 }}>
                    {fact.source_type} · {fact.temporal_scope || 'N/A'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Knowledge Gap Finder */}
      {missingPredicates.length > 0 && (
        <div style={{ background: '#fffbeb', borderRadius: 12, padding: 24, border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🔍</span>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Knowledge Gap — {missingPredicates.length} 項缺口</h3>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0, marginTop: 2 }}>
                補齊以下欄位可提升圖譜信心分至 {Math.min(100, conf + missingPredicates.length * 3)}+
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {missingPredicates.map((p, i) => (
              <div key={i} style={{
                background: 'white', border: '1px solid #fde68a', borderRadius: 6,
                padding: '6px 12px', fontSize: 12, color: '#78350f', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{p.icon}</span>
                <span>{p.label}</span>
                <span style={{ color: '#d97706', fontWeight: 600 }}>✗</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#92400e', opacity: 0.7 }}>
            在 Supabase merchants 表補充對應欄位後，下次 Stage 1 注入自動更新。
          </div>
        </div>
      )}
    </div>
  )
}
