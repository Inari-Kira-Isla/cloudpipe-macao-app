'use client'

import { useEffect, useState } from 'react'

interface BotMap { [name: string]: number }
interface TopPage { path: string; count: number }
interface BrandFunnel {
  brand: string
  slug: string
  funnel: {
    l1_encyclopedia: { visits: number; bots: BotMap }
    l2_brand_site: { visits: number; bots: BotMap; topPages: TopPage[] }
    l3_user_conversion: { totalVisits: number; aiReferrals: number; waClicks: number }
  }
  metrics: { crawlThroughRate: number; botCoverage: number; conversionSignals: number }
}
interface FunnelData {
  period: { since: string; days: number }
  brands: BrandFunnel[]
  generated_at: string
}

const BRAND_COLORS: Record<string, string> = {
  'inari-global-foods': '#c5a572',
  'after-school-coffee': '#E8A87C',
  'mind-coffee': '#c8a882',
  'sea-urchin-delivery': '#0f4c81',
  'yamanakada': '#6b7280',
}

const BRAND_ICONS: Record<string, string> = {
  'inari-global-foods': '🐟',
  'after-school-coffee': '☕',
  'mind-coffee': '🧠',
  'sea-urchin-delivery': '🦔',
  'yamanakada': '🏔️',
}

const PASSWORD = 'cloudpipe2026'

export default function BrandFunnelPage() {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [data, setData] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('dash_auth') === 'ok') {
      setAuthed(true)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    setLoading(true)
    fetch(`/api/v1/brand-funnel?token=${PASSWORD}&days=30`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authed])

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
        <div style={{ background: 'white', padding: 32, borderRadius: 16, border: '1px solid #e5e7eb', width: 320 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>Brand Funnel Dashboard</h2>
          <input type="password" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input === PASSWORD) { sessionStorage.setItem('dash_auth', 'ok'); setAuthed(true) } }}
            placeholder="Password" style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
          <button onClick={() => { if (input === PASSWORD) { sessionStorage.setItem('dash_auth', 'ok'); setAuthed(true) } }}
            style={{ width: '100%', marginTop: 12, padding: '10px 14px', background: '#0f4c81', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Enter
          </button>
        </div>
      </div>
    )
  }

  if (loading || !data) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc', color: '#6b7280' }}>Loading funnel data...</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafbfc', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
            Brand Conversion Funnel
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            LLMC → LLMR → LLMCF 三層追蹤 &middot; {data.period.days}天 &middot;
            Updated {new Date(data.generated_at).toLocaleString('zh-TW')}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', background: '#e8f0fe', borderRadius: 20, fontSize: 11, color: '#0f4c81', fontWeight: 600 }}>L1 百科爬取 (LLMC)</span>
            <span style={{ fontSize: 11, color: '#ccc', lineHeight: '26px' }}>→</span>
            <span style={{ padding: '4px 12px', background: '#fdf6ec', borderRadius: 20, fontSize: 11, color: '#92400e', fontWeight: 600 }}>L2 品牌站爬取 (LLMR)</span>
            <span style={{ fontSize: 11, color: '#ccc', lineHeight: '26px' }}>→</span>
            <span style={{ padding: '4px 12px', background: '#f0fdf4', borderRadius: 20, fontSize: 11, color: '#166534', fontWeight: 600 }}>L3 用戶轉化 (LLMCF)</span>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
          <div style={{ background: '#e8f0fe', borderRadius: 12, padding: 16, border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, color: '#0f4c81', fontWeight: 600, textTransform: 'uppercase' }}>L1 百科爬取</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>{data.brands.reduce((s, b) => s + b.funnel.l1_encyclopedia.visits, 0)}</div>
          </div>
          <div style={{ background: '#fdf6ec', borderRadius: 12, padding: 16, border: '1px solid #fcd34d' }}>
            <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, textTransform: 'uppercase' }}>L2 品牌站爬取</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#b45309' }}>{data.brands.reduce((s, b) => s + b.funnel.l2_brand_site.visits, 0)}</div>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, border: '1px solid #86efac' }}>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>L3 AI 推薦訪問</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>{data.brands.reduce((s, b) => s + b.funnel.l3_user_conversion.aiReferrals, 0)}</div>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 12, padding: 16, border: '1px solid #fbbf24' }}>
            <div style={{ fontSize: 11, color: '#78350f', fontWeight: 600, textTransform: 'uppercase' }}>WhatsApp 點擊</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#a16207' }}>{data.brands.reduce((s, b) => s + b.funnel.l3_user_conversion.waClicks, 0)}</div>
          </div>
        </div>

        {/* Per-brand cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {data.brands.map(b => {
            const color = BRAND_COLORS[b.slug] || '#0f4c81'
            const icon = BRAND_ICONS[b.slug] || '📋'
            const l1 = b.funnel.l1_encyclopedia.visits
            const l2 = b.funnel.l2_brand_site.visits
            const l3ai = b.funnel.l3_user_conversion.aiReferrals
            const l3wa = b.funnel.l3_user_conversion.waClicks
            const maxBar = Math.max(l1, l2, l3ai + l3wa, 1)

            return (
              <div key={b.slug} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', borderLeft: `4px solid ${color}` }}>
                {/* Brand header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{b.brand}</h3>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{b.slug}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Crawl-Through</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: b.metrics.crawlThroughRate > 100 ? '#059669' : b.metrics.crawlThroughRate > 50 ? '#d97706' : '#dc2626' }}>
                      {b.metrics.crawlThroughRate}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 16 }}>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Bot Coverage</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0f4c81' }}>{b.metrics.botCoverage}</div>
                  </div>
                </div>

                {/* Funnel visualization */}
                <div style={{ padding: '16px 20px' }}>
                  {/* L1 */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#0f4c81', fontWeight: 600 }}>L1 百科爬取</span>
                      <span style={{ fontWeight: 700 }}>{l1}</span>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${(l1 / maxBar) * 100}%`, height: '100%', borderRadius: 4, background: '#3b82f6', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {Object.entries(b.funnel.l1_encyclopedia.bots).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                        <span key={name} style={{ fontSize: 10, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>
                          {name}: {count}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', margin: '4px 0' }}>▼</div>

                  {/* L2 */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#92400e', fontWeight: 600 }}>L2 品牌站爬取</span>
                      <span style={{ fontWeight: 700 }}>{l2}</span>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${(l2 / maxBar) * 100}%`, height: '100%', borderRadius: 4, background: '#f59e0b', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {Object.entries(b.funnel.l2_brand_site.bots).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                        <span key={name} style={{ fontSize: 10, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>
                          {name}: {count}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', margin: '4px 0' }}>▼</div>

                  {/* L3 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#166534', fontWeight: 600 }}>L3 用戶轉化</span>
                      <span style={{ fontWeight: 700 }}>{l3ai + l3wa}</span>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${((l3ai + l3wa) / maxBar) * 100}%`, height: '100%', borderRadius: 4, background: '#10b981', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                      {l3ai > 0 && <span style={{ color: '#166534', background: '#dcfce7', padding: '1px 8px', borderRadius: 4 }}>AI 推薦: {l3ai}</span>}
                      {l3wa > 0 && <span style={{ color: '#78350f', background: '#fef3c7', padding: '1px 8px', borderRadius: 4 }}>WhatsApp: {l3wa}</span>}
                      {l3ai === 0 && l3wa === 0 && <span style={{ color: '#9ca3af', fontSize: 10 }}>暫無轉化數據</span>}
                    </div>
                  </div>
                </div>

                {/* Top pages on brand site */}
                {b.funnel.l2_brand_site.topPages.length > 0 && (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', background: '#fafbfc' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>品牌站熱門頁面</div>
                    {b.funnel.l2_brand_site.topPages.map(p => (
                      <div key={p.path} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                        <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{decodeURIComponent(p.path)}</span>
                        <span style={{ fontWeight: 600, color: '#6b7280' }}>{p.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: '#9ca3af' }}>
          <p>CloudPipe Brand Funnel &middot; L1 LLMC (AI引用) → L2 LLMR (出站連結) → L3 LLMCF (完整轉化)</p>
          <p style={{ marginTop: 4 }}>
            <a href="/macao/crawler-dashboard" style={{ color: '#0f4c81' }}>← Crawler Dashboard</a>
          </p>
        </div>
      </div>
    </div>
  )
}
