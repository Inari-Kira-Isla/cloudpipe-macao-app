'use client'

import { useState, useEffect } from 'react'

interface BrandMention {
  brand_slug: string
  mention_type: 'news' | 'social' | 'forum' | 'general'
  title: string
  url: string
  snippet: string
  source: string
  detected_at: string
}

interface MentionsSummary {
  total: number
  byType: Record<string, number>
  brands: string[]
  lastUpdated: string | null
}

const TYPE_COLORS: Record<string, string> = {
  news: '#ef4444',
  social: '#3b82f6',
  forum: '#8b5cf6',
  general: '#6b7280'
}

const TYPE_LABELS: Record<string, string> = {
  news: '新聞',
  social: '社交媒體',
  forum: '論壇',
  general: '一般網頁'
}

export default function BrandMentionsPage() {
  const [mentions, setMentions] = useState<BrandMention[]>([])
  const [summary, setSummary] = useState<MentionsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')

  useEffect(() => {
    fetchMentions()
  }, [])

  const fetchMentions = async () => {
    try {
      const res = await fetch('/api/brand-mentions')
      const data = await res.json()
      setMentions(data.mentions || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Failed to fetch mentions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMentions = mentions.filter(m => {
    if (selectedBrand && m.brand_slug !== selectedBrand) return false
    if (selectedType && m.mention_type !== selectedType) return false
    return true
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-TW', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        載入中...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0 }}>
        站外提及監控
      </h1>
      <p style={{ color: '#64748b', marginTop: 8, marginBottom: 24 }}>
        監控品牌在社交媒體、新聞、論壇的提及情況
      </p>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>總提及數</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#0f172a' }}>{summary.total}</div>
          </div>
          {Object.entries(summary.byType).map(([type, count]) => (
            <div key={type} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>{TYPE_LABELS[type] || type}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: TYPE_COLORS[type] || '#6b7280' }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <select 
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', fontSize: 14 }}
        >
          <option value="">全部品牌</option>
          {summary?.brands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
        
        <select 
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', fontSize: 14 }}
        >
          <option value="">全部類型</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <button 
          onClick={fetchMentions}
          style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontSize: 14, cursor: 'pointer' }}
        >
          重新整理
        </button>
      </div>

      {/* Mentions List */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>類型</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>品牌</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>標題</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>來源</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569' }}>偵測時間</th>
            </tr>
          </thead>
          <tbody>
            {filteredMentions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  沒有找到提及記錄
                </td>
              </tr>
            ) : filteredMentions.slice(0, 50).map((mention, idx) => (
              <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '4px 10px', 
                    borderRadius: 12, 
                    fontSize: 12, 
                    fontWeight: 500,
                    background: `${TYPE_COLORS[mention.mention_type]}20`,
                    color: TYPE_COLORS[mention.mention_type]
                  }}>
                    {TYPE_LABELS[mention.mention_type] || mention.mention_type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>{mention.brand_slug}</td>
                <td style={{ padding: '12px 16px', maxWidth: 300 }}>
                  <a 
                    href={mention.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ fontSize: 14, color: '#3b82f6', textDecoration: 'none' }}
                  >
                    {mention.title.length > 60 ? mention.title.slice(0, 60) + '...' : mention.title}
                  </a>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{mention.source}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{formatDate(mention.detected_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredMentions.length > 50 && (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 16 }}>
          顯示前 50 條結果（總共 {filteredMentions.length} 條）
        </p>
      )}

      {summary?.lastUpdated && (
        <p style={{ textAlign: 'center', color: '#64748b', marginTop: 24, fontSize: 13 }}>
          最後更新：{formatDate(summary.lastUpdated)}
        </p>
      )}
    </div>
  )
}
