'use client'

import { useEffect, useState } from 'react'

interface TopQuery {
  query: string
  count: number
  platforms: string[]
  latest: string
}

interface StatsData {
  topQueries: TopQuery[]
  byPlatform: Record<string, number>
  total: number
  hasData: boolean
  since: string
}

const PLATFORM_META: Record<string, { label: string; color: string; bg: string }> = {
  perplexity: { label: 'Perplexity', color: '#0f4c81', bg: '#dbeafe' },
  chatgpt:    { label: 'ChatGPT',    color: '#065f46', bg: '#d1fae5' },
  claude:     { label: 'Claude',     color: '#7c2d12', bg: '#fef3c7' },
  gemini:     { label: 'Gemini',     color: '#1e3a8a', bg: '#dbeafe' },
  copilot:    { label: 'Copilot',    color: '#1d4ed8', bg: '#eff6ff' },
  grok:       { label: 'Grok',       color: '#374151', bg: '#f3f4f6' },
  other_ai:   { label: 'Other AI',   color: '#6b7280', bg: '#f3f4f6' },
}

function PlatformTag({ name }: { name: string }) {
  const meta = PLATFORM_META[name] ?? { label: name, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      background: meta.bg,
      color: meta.color,
    }}>
      {meta.label}
    </span>
  )
}

function EmptyState() {
  return (
    <div style={{
      background: '#f9fafb',
      borderRadius: 12,
      padding: '40px 24px',
      textAlign: 'center',
      border: '2px dashed #e5e7eb',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>AI 搜尋詞追蹤已就緒</h3>
      <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
        當用戶從 Perplexity、ChatGPT 等 AI 平台搜尋後點擊進入，搜尋詞將自動出現在此
      </p>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {['Perplexity', 'ChatGPT', 'Claude', 'Gemini'].map(p => (
          <span key={p} style={{
            padding: '4px 12px',
            background: 'white',
            borderRadius: 20,
            fontSize: 12,
            color: '#6b7280',
            border: '1px solid #e5e7eb',
          }}>
            {p}
          </span>
        ))}
      </div>
      <p style={{ marginTop: 16, fontSize: 11, color: '#9ca3af' }}>
        Beacon 已部署至品牌站，下次 AI 平台引流後自動顯示
      </p>
    </div>
  )
}

export default function AiReferralSection() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/ai-referrals/stats')
      .then(r => r.json())
      .then((d: StatsData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        載入搜尋詞數據中...
      </div>
    )
  }

  if (!data || !data.hasData) {
    return <EmptyState />
  }

  const maxCount = data.topQueries[0]?.count ?? 1

  // 平台分佈排序
  const platformList = Object.entries(data.byPlatform)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <div>
      {/* Top 10 搜尋詞 */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>#</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>搜尋詞</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>來源平台</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>點擊次數</th>
            </tr>
          </thead>
          <tbody>
            {data.topQueries.map((q, i) => {
              const barWidth = Math.max((q.count / maxCount) * 100, 4)
              return (
                <tr key={q.query} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', color: '#9ca3af', fontWeight: 600, fontSize: 12 }}>{i + 1}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
                      &ldquo;{q.query}&rdquo;
                    </div>
                    {/* 相對熱度 bar */}
                    <div style={{ background: '#f3f4f6', borderRadius: 3, height: 4, width: '100%', maxWidth: 200 }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: 3, background: '#0f4c81' }} />
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {q.platforms.map(p => <PlatformTag key={p} name={p} />)}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#0f4c81' }}>
                    {q.count}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 平台分佈 */}
      {platformList.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>AI 平台引流分佈（過去 30 天，共 {data.total} 次）</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {platformList.map(([platform, count]) => {
              const meta = PLATFORM_META[platform] ?? { label: platform, color: '#6b7280', bg: '#f3f4f6' }
              const pct = data.total > 0 ? ((count / data.total) * 100).toFixed(1) : '0'
              return (
                <div key={platform} style={{
                  background: meta.bg,
                  border: `1px solid ${meta.color}22`,
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 13,
                }}>
                  <span style={{ fontWeight: 700, color: meta.color }}>{meta.label}</span>
                  <span style={{ color: '#6b7280', marginLeft: 8 }}>{count} 次</span>
                  <span style={{ color: '#9ca3af', marginLeft: 4, fontSize: 11 }}>({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
