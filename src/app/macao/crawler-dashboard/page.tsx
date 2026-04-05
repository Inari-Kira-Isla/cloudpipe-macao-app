'use client'

import { useEffect, useState, useCallback } from 'react'

interface BotInfo { count: number; owner: string }
interface Summary {
  period: { since: string; days: number }
  total_visits: number
  unique_bots: number
  unique_sessions: number
  bots: Record<string, BotInfo>
  top_pages: Record<string, number>
  industries: Record<string, number>
  page_types: Record<string, number>
  sites: Record<string, number>
}
interface Session {
  session_id: string; bot: string; owner: string
  pages: number; first_ts: string; last_ts: string; paths: string[]
}
interface PageStat {
  path: string; visits: number; bots: string[]; industry: string | null; page_type: string
}
interface JourneyStep {
  ts: string; path: string; referer: string | null; page_type: string
  industry: string | null; category: string | null; site?: string
}
interface SpiderFlow {
  flow: string; count: number; bots: string[]
}
interface SpiderSite {
  site: string; total: number; spider_web: number; bots: string[]
}
interface SpiderWebData {
  cross_site_sessions: number
  flows: SpiderFlow[]
  sites: SpiderSite[]
}

interface MerchantDiscoveryItem {
  slug: string; name_zh: string; name_en: string; industry: string; district: string; region: string
  visits: number; botCount: number; bots: string[]; lastTs: string
  insightCount: number; totalWords: number; sampleInsights: string[]
  score: number; readinessLabel: string; readinessColor: string
}
interface MerchantDiscovery {
  days: number
  regionStats: Record<string, { total: number; crawled: number; covered: number; ready: number; nearReady: number; gap: number }>
  summary: {
    totalTracked: number; crawledByAI: number; insightCovered: number
    aiReady: number; nearReady: number; coverageGap: number
    insightCoverageHist: Record<string, number>
  }
  today?: {
    date: string; totalVisits: number; uniqueMerchants: number; uniqueBots: number; bots: string[]
  }
  merchants: MerchantDiscoveryItem[]
}

interface TopMerchant {
  slug: string; name_zh: string; name_en: string
  industry: string; cat_slug: string; page_path: string; page_url: string
  score: number; reviews: number; rating: number; district: string; schema_type: string
}
interface RoutingBaseline {
  updatedAt: string
  tiers: { A: number; B: number; C: number; D: number; total: number }
  industryTiers: Record<string, { a: number; b: number; c: number; d: number }>
  topMerchants: TopMerchant[]
  merchantsByIndustry: Record<string, number>
  totalMerchants: number
  merchantsWithReviews: number
  merchantVisits: { total: number; uniqueSlugs: number; byBot: Record<string, number>; recentPaths: { path: string; bot: string; ts: string }[] }
  categoryVisits: { total: number; byIndustry: Record<string, number>; recentPaths: { path: string; bot: string; industry: string; ts: string }[] }
}

const API = '/api/v1/crawler-stats?token=cloudpipe2026'
const ROUTING_API = '/api/v1/routing-baseline'

const BOT_COLORS: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#d4a574',
  Google: '#4285f4',
  Microsoft: '#00a4ef',
  Perplexity: '#1a73e8',
  Meta: '#0668E1',
  Apple: '#555',
  ByteDance: '#ff0050',
  Amazon: '#ff9900',
  'You.com': '#8b5cf6',
}

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const DASHBOARD_PASSWORD = 'cloudpipe2026'

function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('dash_auth') === 'ok') {
      setAuthed(true)
    }
  }, [])

  if (authed) return <>{children}</>

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 2px 20px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 360 }}>
        <h2 style={{ marginBottom: 8, color: '#0f4c81' }}>🔒 Dashboard Access</h2>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>Internal use only</p>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (input === DASHBOARD_PASSWORD) {
                sessionStorage.setItem('dash_auth', 'ok')
                setAuthed(true)
              } else {
                setError(true)
              }
            }
          }}
          placeholder="Password"
          style={{ width: '100%', padding: '10px 14px', border: `1px solid ${error ? '#dc2626' : '#ddd'}`, borderRadius: 8, fontSize: 16, marginBottom: 12 }}
        />
        <button
          onClick={() => {
            if (input === DASHBOARD_PASSWORD) {
              sessionStorage.setItem('dash_auth', 'ok')
              setAuthed(true)
            } else {
              setError(true)
            }
          }}
          style={{ width: '100%', padding: '10px', background: '#0f4c81', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
        >Enter</button>
        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>Incorrect password</p>}
      </div>
    </div>
  )
}

export default function CrawlerDashboard() {
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [pages, setPages] = useState<PageStat[]>([])
  const [journey, setJourney] = useState<JourneyStep[] | null>(null)
  const [journeySession, setJourneySession] = useState('')
  const [spiderWeb, setSpiderWeb] = useState<SpiderWebData | null>(null)
  const [tab, setTab] = useState<'overview' | 'pages' | 'sessions' | 'spider-web' | 'routing' | 'merchant-discovery'>('overview')
  const [routing, setRouting] = useState<RoutingBaseline | null>(null)
  const [routingLoading, setRoutingLoading] = useState(false)
  const [discovery, setDiscovery] = useState<MerchantDiscovery | null>(null)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [discoveryRegion, setDiscoveryRegion] = useState('')
  const [discoveryIndustry, setDiscoveryIndustry] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [error, setError] = useState<string | null>(null)

  // Google Sheet 連結（從環境變量讀取，或使用預設值）
  const googleSheetUrl = process.env.NEXT_PUBLIC_INSIGHTS_GOOGLE_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1example/edit'

  const safeFetch = async <T,>(url: string, fallback: T): Promise<T> => {
    try {
      const res = await fetch(url, {
        cache: 'no-store',  // 強制不使用快取，每次都重新查詢
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
      if (!res.ok) return fallback
      const data = await res.json()
      if (data?.error) return fallback
      return data as T
    } catch { return fallback }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sum, ses, pg, sw] = await Promise.all([
        safeFetch<Summary | null>(`${API}&view=summary&days=${days}`, null),
        safeFetch<Session[]>(`${API}&view=sessions&days=${days}&limit=50`, []),
        safeFetch<PageStat[]>(`${API}&view=pages&days=${days}&limit=50`, []),
        safeFetch<SpiderWebData | null>(`${API}&view=spider-web&days=${days}`, null),
      ])
      setSummary(sum)
      setSessions(ses)
      setPages(pg)
      setSpiderWeb(sw)
      setLastUpdated(new Date())  // 記錄更新時間
      if (!sum) setError('無法載入數據，API 可能超時。請縮短時間範圍後重試。')
    } catch (e) {
      console.error(e)
      setError('載入失敗，請重試。')
    }
    setLoading(false)
  }, [days])

  // 初次載入 + 當 days 改變時重新整理
  useEffect(() => { fetchData() }, [fetchData])

  // 自動重新整理：每 30 秒查詢一次最新數據
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 30000)  // 30 秒
    return () => clearInterval(interval)
  }, [fetchData])

  const loadRouting = async () => {
    if (routing) return
    setRoutingLoading(true)
    const data = await safeFetch<RoutingBaseline | null>(ROUTING_API, null)
    setRouting(data)
    setRoutingLoading(false)
  }

  const loadDiscovery = async () => {
    if (discovery) return
    setDiscoveryLoading(true)
    const data = await safeFetch<MerchantDiscovery | null>(`/api/v1/merchant-discovery?days=${days}`, null)
    setDiscovery(data)
    setDiscoveryLoading(false)
  }

  const loadJourney = async (sessionId: string) => {
    setJourneySession(sessionId)
    const res = await fetch(`${API}&view=journey&session=${sessionId}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    })
    const data = await res.json()
    setJourney(data.journey || [])
  }

  const maxBot = summary ? Math.max(...Object.values(summary.bots).map(b => b.count), 1) : 1
  const maxPage = pages.length ? Math.max(...pages.map(p => p.visits), 1) : 1
  const maxInd = summary ? Math.max(...Object.values(summary.industries).map(Number), 1) : 1

  return (
    <PasswordGate>
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>AI 爬蟲追蹤 Dashboard</h1>
            <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>即時監控 AI 搜索引擎爬蟲訪問數據</p>
          </div>
          <a
            href={googleSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              textDecoration: 'none',
              color: '#333',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5'
              e.currentTarget.style.borderColor = '#999'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.borderColor = '#ddd'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
            Google Sheet 數據
          </a>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {[1, 7, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer',
              background: days === d ? '#111' : '#fff', color: days === d ? '#fff' : '#333',
              fontSize: 13, fontWeight: 500,
            }}>
            {d === 1 ? '今天' : `${d} 天`}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: '#999' }}>
              最後更新：{lastUpdated.toLocaleString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          )}
          <button onClick={fetchData} disabled={loading} style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd',
            cursor: loading ? 'wait' : 'pointer', background: loading ? '#f5f5f5' : '#fff',
            fontSize: 13, opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}>
            {loading ? '⟳ 重新整理中...' : '⟳ 立即重新整理'}
          </button>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#999' }}>載入中...</p>}
      {error && <p style={{ textAlign: 'center', color: '#e74c3c', background: '#fef0f0', padding: '12px 16px', borderRadius: 8 }}>{error}</p>}

      {summary && !loading && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: '總訪問', value: summary.total_visits, color: '#111' },
              { label: 'AI Bot 種類', value: summary.unique_bots, color: '#10a37f' },
              { label: 'Sessions', value: summary.unique_sessions, color: '#4285f4' },
              { label: '追蹤站點', value: Object.keys(summary.sites || {}).length, color: '#ff9900' },
            ].map(card => (
              <div key={card.label} style={{
                background: '#fafafa', borderRadius: 10, padding: '16px 14px',
                border: '1px solid #eee',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Traffic Analysis: LLM vs Organic */}
          {(() => {
            const llmBots = new Set(['OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Perplexity', 'Meta', 'You.com', 'Cohere', 'Apple', 'ByteDance', 'Amazon', 'Baidu'])
            // bot counts come from a sample; compute ratio within sample, then scale to total
            const botSampleTotal = Object.values(summary.bots || {}).reduce((s, info) => s + info.count, 0) || 1
            const llmSampleCount = Object.entries(summary.bots || {}).reduce((sum, [, info]) => {
              return sum + (llmBots.has(info.owner) ? info.count : 0)
            }, 0)
            const llmRatio = llmSampleCount / botSampleTotal
            const llmVisits = Math.round(llmRatio * (summary.total_visits || 0))
            const organicVisits = (summary.total_visits || 0) - llmVisits
            const llmPct = (llmRatio * 100).toFixed(1)
            const organicPct = ((1 - llmRatio) * 100).toFixed(1)
            return (
              <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#e3f2fd', borderRadius: 10, padding: '16px', border: '1px solid #90caf9' }}>
                  <div style={{ fontSize: 12, color: '#1565c0', fontWeight: 600, marginBottom: 4 }}>🤖 LLM Referral</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1976d2' }}>{llmPct}%</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{llmVisits} / {summary.total_visits} visits</div>
                </div>
                <div style={{ background: '#e8f5e9', borderRadius: 10, padding: '16px', border: '1px solid #81c784' }}>
                  <div style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600, marginBottom: 4 }}>🔍 Organic Traffic</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#388e3c' }}>{organicPct}%</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{organicVisits} / {summary.total_visits} visits</div>
                </div>
              </div>
            )
          })()}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #eee', flexWrap: 'wrap' }}>
            {(['overview', 'pages', 'sessions', 'spider-web', 'routing', 'merchant-discovery'] as const).map(t => (
              <button key={t} onClick={() => {
                setTab(t); setJourney(null)
                if (t === 'routing') loadRouting()
                if (t === 'merchant-discovery') loadDiscovery()
              }}
                style={{
                  padding: '8px 20px', border: 'none', cursor: 'pointer',
                  background: 'transparent', fontSize: 14, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? '#111' : '#888',
                  borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                }}>
                {{ overview: '總覽', pages: '頁面', sessions: '爬蟲路徑', 'spider-web': '蜘蛛網', routing: '🗺️ 路由基線', 'merchant-discovery': '🔍 商戶發現度' }[t]}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Bot breakdown */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>AI Bot 訪問量</h3>
                {Object.entries(summary.bots)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([name, info]) => (
                    <div key={name} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span><strong>{name}</strong> <span style={{ color: '#999', fontSize: 11 }}>{info.owner}</span></span>
                        <span style={{ fontWeight: 600 }}>{info.count}</span>
                      </div>
                      <div style={{ background: '#e5e5e5', borderRadius: 4, height: 6 }}>
                        <div style={{
                          width: `${(info.count / maxBot) * 100}%`, height: '100%', borderRadius: 4,
                          background: BOT_COLORS[info.owner] || '#999',
                        }} />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Industry breakdown */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>行業訪問分佈</h3>
                {Object.entries(summary.industries)
                  .sort((a, b) => b[1] - a[1])
                  .map(([ind, count]) => (
                    <div key={ind} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span>{ind}</span>
                        <span style={{ fontWeight: 600 }}>{count}</span>
                      </div>
                      <div style={{ background: '#e5e5e5', borderRadius: 4, height: 6 }}>
                        <div style={{
                          width: `${(count / maxInd) * 100}%`, height: '100%', borderRadius: 4,
                          background: '#4285f4',
                        }} />
                      </div>
                    </div>
                  ))}
                {Object.keys(summary.industries).length === 0 && (
                  <p style={{ color: '#999', fontSize: 13 }}>尚無行業數據</p>
                )}
              </div>

              {/* Page type breakdown */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee', gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>頁面類型分佈</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.entries(summary.page_types)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} style={{
                        background: '#fff', border: '1px solid #ddd', borderRadius: 8,
                        padding: '10px 16px', textAlign: 'center', minWidth: 80,
                      }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{count}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{type}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Pages Tab */}
          {tab === 'pages' && (
            <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>熱門頁面排名</h3>
              {pages.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>尚無數據</p>}
              {pages.map((p, i) => (
                <div key={p.path} style={{
                  padding: '10px 0', borderBottom: i < pages.length - 1 ? '1px solid #eee' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <code style={{ fontSize: 13, color: '#111', wordBreak: 'break-all' }}>{p.path}</code>
                    <span style={{ fontWeight: 700, fontSize: 15, marginLeft: 12, whiteSpace: 'nowrap' }}>{p.visits}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ background: '#e5e5e5', borderRadius: 4, height: 4, flex: 1 }}>
                      <div style={{
                        width: `${(p.visits / maxPage) * 100}%`, height: '100%', borderRadius: 4,
                        background: '#10a37f',
                      }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {p.bots.map(b => (
                        <span key={b} style={{
                          fontSize: 10, background: '#e8e8e8', borderRadius: 4,
                          padding: '1px 5px', color: '#555',
                        }}>{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Spider Web Tab */}
          {tab === 'spider-web' && spiderWeb && (
            <div>
              {/* Cross-site summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#f0f7ff', borderRadius: 10, padding: '16px 14px', border: '1px solid #c8ddf5' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#4285f4' }}>{spiderWeb.sites.length}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>追蹤站點</div>
                </div>
                <div style={{ background: '#f0fff4', borderRadius: 10, padding: '16px 14px', border: '1px solid #c8f5d5' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#10a37f' }}>{spiderWeb.cross_site_sessions}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>跨站 Sessions</div>
                </div>
                <div style={{ background: '#fff8f0', borderRadius: 10, padding: '16px 14px', border: '1px solid #f5dfc8' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#ff9900' }}>{spiderWeb.flows.length}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>跨站流向</div>
                </div>
              </div>

              {/* Site breakdown */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>各站 AI 爬蟲訪問量</h3>
                {spiderWeb.sites.map(s => {
                  const maxSite = Math.max(...spiderWeb.sites.map(x => x.total), 1)
                  return (
                    <div key={s.site} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span>
                          <strong>{s.site}</strong>
                          {s.spider_web > 0 && (
                            <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>
                              🕸 {s.spider_web} 跨站
                            </span>
                          )}
                        </span>
                        <span style={{ fontWeight: 600 }}>{s.total}</span>
                      </div>
                      <div style={{ background: '#e5e5e5', borderRadius: 4, height: 6 }}>
                        <div style={{
                          width: `${(s.total / maxSite) * 100}%`, height: '100%', borderRadius: 4,
                          background: s.site === 'cloudpipe-macao-app' ? '#10a37f' : '#4285f4',
                        }} />
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        {s.bots.map(b => (
                          <span key={b} style={{ fontSize: 10, background: '#e8e8e8', borderRadius: 4, padding: '1px 5px', color: '#555' }}>{b}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {spiderWeb.sites.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>尚無跨站數據（需等待 Cloudflare Worker 部署）</p>}
              </div>

              {/* Cross-site flows */}
              <div style={{ background: '#f0f7ff', borderRadius: 10, padding: 16, border: '1px solid #c8ddf5' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>跨站流量走向</h3>
                {spiderWeb.flows.length === 0 && (
                  <p style={{ color: '#999', fontSize: 13 }}>尚無跨站流向記錄。AI 爬蟲從一個站跟隨 llms.txt 連結到另一個站時會記錄在此。</p>
                )}
                {spiderWeb.flows.map((f, i) => (
                  <div key={i} style={{
                    padding: '10px 0', borderBottom: i < spiderWeb.flows.length - 1 ? '1px solid #dce8f5' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14 }}>
                        {f.flow.split(' → ').map((site, j) => (
                          <span key={j}>
                            {j > 0 && <span style={{ color: '#4285f4', margin: '0 6px', fontWeight: 700 }}> → </span>}
                            <code style={{
                              background: j === 0 ? '#e8f5e9' : '#fff3e0',
                              padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12,
                            }}>{site}</code>
                          </span>
                        ))}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#4285f4' }}>{f.count}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      {f.bots.map(b => (
                        <span key={b} style={{
                          fontSize: 10, background: '#e8e8e8', borderRadius: 4,
                          padding: '1px 5px', color: '#555',
                        }}>{b}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {tab === 'sessions' && (
            <div>
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>Crawl Sessions</h3>
                {sessions.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>尚無 session 數據</p>}
                {sessions.map(s => (
                  <div key={s.session_id} style={{
                    padding: '10px 0', borderBottom: '1px solid #eee', cursor: 'pointer',
                    background: journeySession === s.session_id ? '#f0f7ff' : 'transparent',
                  }} onClick={() => loadJourney(s.session_id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{
                          fontWeight: 600, fontSize: 13,
                          color: BOT_COLORS[s.owner] || '#333',
                        }}>{s.bot}</span>
                        <span style={{ color: '#999', fontSize: 11, marginLeft: 6 }}>{s.owner}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 600 }}>{s.pages} 頁</span>
                        <span style={{ color: '#999', fontSize: 11, marginLeft: 8 }}>{formatTime(s.first_ts)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {s.paths.slice(0, 5).map((p, i) => (
                        <span key={i}>
                          {i > 0 && <span style={{ color: '#ccc' }}> → </span>}
                          <code style={{ background: '#eee', padding: '1px 4px', borderRadius: 3 }}>{p.replace('/macao/', '')}</code>
                        </span>
                      ))}
                      {s.paths.length > 5 && <span style={{ color: '#aaa' }}>+{s.paths.length - 5} more</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Journey Detail */}
              {journey && (
                <div style={{ background: '#f0f7ff', borderRadius: 10, padding: 16, border: '1px solid #c8ddf5' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>
                    爬蟲路徑旅程 <span style={{ fontWeight: 400, color: '#888' }}>({journey.length} 步)</span>
                  </h3>
                  <div style={{ position: 'relative', paddingLeft: 20 }}>
                    {/* Vertical line */}
                    <div style={{
                      position: 'absolute', left: 6, top: 8, bottom: 8,
                      width: 2, background: '#c8ddf5',
                    }} />
                    {journey.map((step, i) => (
                      <div key={i} style={{ position: 'relative', paddingBottom: 16 }}>
                        {/* Dot */}
                        <div style={{
                          position: 'absolute', left: -17, top: 4,
                          width: 10, height: 10, borderRadius: '50%',
                          background: i === 0 ? '#10a37f' : i === journey.length - 1 ? '#e74c3c' : '#4285f4',
                          border: '2px solid #fff',
                        }} />
                        <div style={{ fontSize: 13 }}>
                          <code style={{ fontWeight: 600 }}>{step.path}</code>
                          <span style={{
                            fontSize: 10, marginLeft: 8, background: '#e8e8e8',
                            padding: '1px 5px', borderRadius: 4, color: '#666',
                          }}>{step.page_type}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          {formatTime(step.ts)}
                          {step.referer && (
                            <span> ← <code style={{ color: '#aaa' }}>{step.referer.replace('https://cloudpipe-macao-app.vercel.app', '')}</code></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        {/* ─── Routing Baseline Tab ─── */}
        {tab === 'routing' && (
          <div>
            {routingLoading && <p style={{ color: '#999', textAlign: 'center', padding: 32 }}>載入路由基線數據...</p>}
            {routing && !routingLoading && (() => {
              const { tiers, topMerchants, industryTiers, merchantsByIndustry,
                      totalMerchants, merchantsWithReviews,
                      merchantVisits, categoryVisits } = routing
              const TIER_COLORS: Record<string, string> = { A: '#10a37f', B: '#f39c12', C: '#e67e22', D: '#e74c3c' }
              const TIER_LABELS: Record<string, string> = {
                A: 'A — 有 Answer Hub', B: 'B — 有商戶連結', C: 'C — 弱連結', D: 'D — 無商戶'
              }
              const INDUSTRY_ZH: Record<string, string> = {
                dining: '餐飲美食', attractions: '景區觀光', hotels: '酒店住宿',
                shopping: '購物零售', nightlife: '夜生活', wellness: '健康養生',
                gaming: '博彩娛樂', 'food-supply': '食品供應', other: '其他',
              }
              const totalTier = tiers.A + tiers.B + tiers.C + tiers.D
              return (
                <>
                  {/* Tier Overview */}
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📊 Insight 路由等級分佈（{totalTier.toLocaleString()} 篇 ZH）</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                      {(['A','B','C','D'] as const).map(t => {
                        const cnt = tiers[t]
                        const pct = totalTier > 0 ? (cnt / totalTier * 100).toFixed(1) : '0.0'
                        return (
                          <div key={t} style={{ background: '#fafafa', border: `2px solid ${TIER_COLORS[t]}`, borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: TIER_COLORS[t] }}>{cnt.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{TIER_LABELS[t]}</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{pct}%</div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginTop: 12, height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: '#eee' }}>
                      {(['A','B','C','D'] as const).map(t => (
                        <div key={t} style={{ width: `${totalTier > 0 ? tiers[t]/totalTier*100 : 0}%`, background: TIER_COLORS[t], transition: 'width .4s' }} />
                      ))}
                    </div>
                  </div>

                  {/* Merchant Visit Baseline */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#333' }}>🤖 AI 爬蟲 → 商戶頁（基線）</h4>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{merchantVisits.total}</div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>累積商戶頁訪問 · {merchantVisits.uniqueSlugs} 個唯一商戶</div>
                      {Object.entries(merchantVisits.byBot).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {Object.entries(merchantVisits.byBot).sort((a,b) => b[1]-a[1]).slice(0,5).map(([bot, n]) => (
                            <div key={bot} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ fontSize: 11, width: 90, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bot}</div>
                              <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${merchantVisits.total > 0 ? n/merchantVisits.total*100 : 0}%`, height: '100%', background: '#4285f4' }} />
                              </div>
                              <div style={{ fontSize: 11, color: '#888', width: 24, textAlign: 'right' }}>{n}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#333' }}>🗂️ AI 爬蟲 → 分類頁（基線）</h4>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{categoryVisits.total}</div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>累積分類頁訪問</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {Object.entries(categoryVisits.byIndustry).sort((a,b) => b[1]-a[1]).slice(0,6).map(([ind, n]) => (
                          <div key={ind} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 11, width: 70, color: '#555' }}>{INDUSTRY_ZH[ind] || ind}</div>
                            <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${categoryVisits.total > 0 ? n/categoryVisits.total*100 : 0}%`, height: '100%', background: '#10a37f' }} />
                            </div>
                            <div style={{ fontSize: 11, color: '#888', width: 24, textAlign: 'right' }}>{n}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Industry breakdown of insights */}
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📂 行業 × 路由等級（注入優先順序）</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f5f5f5' }}>
                            {['行業','A','B','C','D','合計','進度'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(industryTiers)
                            .sort((x, y) => (y[1].a + y[1].b + y[1].c + y[1].d) - (x[1].a + x[1].b + x[1].c + x[1].d))
                            .map(([ind, t]) => {
                              const tot = t.a + t.b + t.c + t.d
                              const donePct = tot > 0 ? t.a / tot * 100 : 0
                              return (
                                <tr key={ind} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{INDUSTRY_ZH[ind] || ind}</td>
                                  <td style={{ padding: '8px 12px', color: TIER_COLORS.A, fontWeight: 600 }}>{t.a}</td>
                                  <td style={{ padding: '8px 12px', color: TIER_COLORS.B }}>{t.b}</td>
                                  <td style={{ padding: '8px 12px', color: TIER_COLORS.C }}>{t.c}</td>
                                  <td style={{ padding: '8px 12px', color: TIER_COLORS.D }}>{t.d}</td>
                                  <td style={{ padding: '8px 12px', color: '#555' }}>{tot}</td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div style={{ width: 80, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ width: `${donePct}%`, height: '100%', background: TIER_COLORS.A }} />
                                      </div>
                                      <span style={{ fontSize: 11, color: '#999' }}>{donePct.toFixed(1)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top 20 merchants */}
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>🏆 Top 20 高價值商戶（Answer Hub Layer 2 優先選）</h3>
                    <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                      評分 = (Google評價數 × 評分/5 + 類型分) × 行業權重 · 共 {totalMerchants} 家 · {merchantsWithReviews} 家有評價數據
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f5f5f5' }}>
                            {['排名','商戶名','行業','評分','Google評價','評分數','地區','頁面路徑'].map(h => (
                              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {topMerchants.map((m, i) => (
                            <tr key={m.slug} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '6px 10px', color: i < 3 ? '#f39c12' : '#888', fontWeight: i < 3 ? 700 : 400 }}>#{i+1}</td>
                              <td style={{ padding: '6px 10px', fontWeight: 500 }}>
                                <div>{m.name_zh || m.name_en}</div>
                                {m.name_zh && m.name_en && <div style={{ fontSize: 10, color: '#aaa' }}>{m.name_en}</div>}
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <span style={{ fontSize: 10, background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>{INDUSTRY_ZH[m.industry] || m.industry}</span>
                              </td>
                              <td style={{ padding: '6px 10px', fontWeight: 600, color: '#10a37f' }}>{m.score.toLocaleString()}</td>
                              <td style={{ padding: '6px 10px', color: '#555' }}>{m.reviews > 0 ? m.reviews.toLocaleString() : '—'}</td>
                              <td style={{ padding: '6px 10px', color: '#555' }}>{m.rating > 0 ? `⭐ ${m.rating}` : '—'}</td>
                              <td style={{ padding: '6px 10px', color: '#888', fontSize: 11 }}>{m.district}</td>
                              <td style={{ padding: '6px 10px' }}>
                                <a href={m.page_url} target="_blank" rel="noopener"
                                   style={{ fontSize: 10, color: '#4285f4', textDecoration: 'none', fontFamily: 'monospace' }}>
                                  {m.page_path.length > 40 ? m.page_path.slice(0, 40) + '…' : m.page_path}
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent merchant visits */}
                  {merchantVisits.recentPaths.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>最近商戶頁爬取記錄</h3>
                      <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11 }}>
                        {merchantVisits.recentPaths.map((r, i) => (
                          <div key={i} style={{ color: '#aaa', marginBottom: 3 }}>
                            <span style={{ color: '#666' }}>{formatTime(r.ts)}</span>
                            <span style={{ color: '#10a37f', marginLeft: 8 }}>{r.bot}</span>
                            <span style={{ color: '#ddd', marginLeft: 8 }}>{r.path}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
        {/* Merchant Discovery Tab */}
        {tab === 'merchant-discovery' && (
          <div>
            {discoveryLoading && <p style={{ textAlign: 'center', color: '#999' }}>載入商戶發現度數據...</p>}
            {!discoveryLoading && !discovery && <p style={{ color: '#e74c3c' }}>載入失敗，請重試</p>}
            {discovery && (() => {
              const s = discovery.summary
              const READINESS_ORDER = ['✅ 已就緒', '🟡 接近就緒', '🟠 覆蓋不足', '🔴 未被發現']
              const HIST_LABELS: Record<string, string> = {
                '0': '無 Insight', '1-2': '1-2 篇', '3-5': '3-5 篇', '6-10': '6-10 篇', '11+': '11+ 篇'
              }
              const maxHist = Math.max(...Object.values(s.insightCoverageHist).map(Number), 1)
              return (
                <>
                  {/* Today Stats Banner */}
                  {discovery?.today && (
                    <div style={{ background: 'linear-gradient(135deg, #0f4c81 0%, #1a6fb5 100%)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, color: 'white', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>📅 今日 ({discovery.today.date})</div>
                      <div style={{ display: 'flex', gap: 24 }}>
                        <div><span style={{ fontSize: 22, fontWeight: 700 }}>{discovery.today.totalVisits}</span><span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>次爬取</span></div>
                        <div><span style={{ fontSize: 22, fontWeight: 700 }}>{discovery.today.uniqueMerchants}</span><span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>商戶被訪</span></div>
                        <div><span style={{ fontSize: 22, fontWeight: 700 }}>{discovery.today.uniqueBots}</span><span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>AI Bots</span></div>
                      </div>
                      {discovery.today.bots.length > 0 && (
                        <div style={{ fontSize: 11, opacity: 0.6 }}>{discovery.today.bots.join(' · ')}</div>
                      )}
                    </div>
                  )}

                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {[
                      { label: '追蹤商戶', value: s.totalTracked, color: '#111' },
                      { label: 'AI 已爬取', value: s.crawledByAI, color: '#10a37f' },
                      { label: 'Insight 覆蓋', value: s.insightCovered, color: '#4285f4' },
                      { label: '✅ AI 就緒', value: s.aiReady, color: '#16a34a' },
                      { label: '🟡 接近就緒', value: s.nearReady, color: '#d97706' },
                      { label: '覆蓋缺口', value: s.coverageGap, color: '#dc2626' },
                    ].map(card => (
                      <div key={card.label} style={{ background: '#fafafa', borderRadius: 10, padding: '14px 12px', border: '1px solid #eee' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{card.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Insight Coverage Histogram */}
                  <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>📊 商戶 Insight 覆蓋分佈（每個商戶被多少篇 Insight 連結）</h3>
                    {Object.entries(s.insightCoverageHist).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <span style={{ color: k === '0' ? '#dc2626' : '#333' }}>{HIST_LABELS[k] || k}</span>
                          <span style={{ fontWeight: 600 }}>{v} 個商戶</span>
                        </div>
                        <div style={{ background: '#e5e5e5', borderRadius: 4, height: 8 }}>
                          <div style={{
                            width: `${(v / maxHist) * 100}%`, height: '100%', borderRadius: 4,
                            background: k === '0' ? '#fca5a5' : k === '1-2' ? '#fcd34d' : k === '3-5' ? '#86efac' : '#4ade80',
                          }} />
                        </div>
                      </div>
                    ))}
                    <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                      AI 引用閾值：≥3 篇 Insight + ≥1000 總字數 = 足夠讓 AI 發現並引用此商戶
                    </p>
                  </div>

                  {/* 4-Region Stats */}
                  {(() => {
                    const REGION_LABELS: Record<string, string> = { macao: '🇲🇴 澳門', hongkong: '🇭🇰 香港', taiwan: '🇹🇼 台灣', japan: '🇯🇵 日本' }
                    const rs = discovery.regionStats || {}
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                        {['macao','hongkong','taiwan','japan'].map(r => {
                          const d = rs[r] || { total: 0, crawled: 0, covered: 0, ready: 0, nearReady: 0, gap: 0 }
                          const pct = d.total > 0 ? Math.round(d.ready / d.total * 100) : 0
                          const isActive = discoveryRegion === r
                          return (
                            <div key={r}
                              onClick={() => setDiscoveryRegion(isActive ? '' : r)}
                              style={{ background: isActive ? '#eff6ff' : '#fafafa', border: `2px solid ${isActive ? '#3b82f6' : '#eee'}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{REGION_LABELS[r]}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 }}>
                                <div><span style={{ color: '#888' }}>商戶 </span><b>{d.total}</b></div>
                                <div><span style={{ color: '#888' }}>AI爬 </span><b style={{ color: d.crawled > 0 ? '#10a37f' : '#999' }}>{d.crawled}</b></div>
                                <div><span style={{ color: '#888' }}>已就緒 </span><b style={{ color: '#16a34a' }}>{d.ready}</b></div>
                                <div><span style={{ color: '#888' }}>接近 </span><b style={{ color: '#d97706' }}>{d.nearReady}</b></div>
                              </div>
                              <div style={{ marginTop: 8, background: '#e5e5e5', borderRadius: 4, height: 6 }}>
                                <div style={{ width: `${pct}%`, background: pct >= 50 ? '#16a34a' : pct >= 20 ? '#d97706' : '#fca5a5', height: '100%', borderRadius: 4 }} />
                              </div>
                              <div style={{ fontSize: 10, color: '#888', marginTop: 3 }}>就緒率 {pct}%</div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Merchant Table */}
                  {(() => {
                    const allIndustries = [...new Set(discovery.merchants.map(m => m.industry).filter(Boolean))].sort()
                    const filtered = discovery.merchants.filter(m =>
                      (!discoveryRegion || m.region === discoveryRegion) &&
                      (!discoveryIndustry || m.industry === discoveryIndustry)
                    )
                    const DISTRICT_ZH: Record<string, string> = {
                      peninsula: '澳門半島', taipa: '氹仔', cotai: '路氹城', coloane: '路環',
                    }
                    const INDUSTRY_ZH: Record<string, string> = {
                      dining: '餐飲', hotels: '住宿', shopping: '購物', attractions: '景點',
                      wellness: '健康', gaming: '博彩', nightlife: '夜生活', entertainment: '娛樂',
                      transport: '交通', services: '服務', other: '其他',
                    }
                    const REGION_ZH: Record<string, string> = { macao: '🇲🇴 澳門', hongkong: '🇭🇰 香港', taiwan: '🇹🇼 台灣', japan: '🇯🇵 日本' }
                    return (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                            🏪 商戶發現度排行（{filtered.length} 個）
                          </h3>
                          <select
                            value={discoveryRegion}
                            onChange={e => setDiscoveryRegion(e.target.value)}
                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}
                          >
                            <option value=''>全部地區</option>
                            <option value='macao'>🇲🇴 澳門</option>
                            <option value='hongkong'>🇭🇰 香港</option>
                            <option value='taiwan'>🇹🇼 台灣</option>
                            <option value='japan'>🇯🇵 日本</option>
                          </select>
                          <select
                            value={discoveryIndustry}
                            onChange={e => setDiscoveryIndustry(e.target.value)}
                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}
                          >
                            <option value=''>全部行業</option>
                            {allIndustries.map(ind => (
                              <option key={ind} value={ind}>{INDUSTRY_ZH[ind] || ind}</option>
                            ))}
                          </select>
                          {(discoveryRegion || discoveryIndustry) && (
                            <button
                              onClick={() => { setDiscoveryRegion(''); setDiscoveryIndustry('') }}
                              style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
                            >清除篩選</button>
                          )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f5f5f5' }}>
                                {['商戶', '地區/區域', '行業', 'AI 爬取', 'Bot 數', 'Insight 數', '總字數', 'AI 就緒度', '分數', '最近爬取'].map(h => (
                                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.slice(0, 80).map((m, i) => (
                                <tr key={m.slug} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                  <td style={{ padding: '7px 10px' }}>
                                    <div style={{ fontWeight: 500 }}>{m.name_zh || m.slug}</div>
                                    {m.name_en && <div style={{ fontSize: 10, color: '#999' }}>{m.name_en}</div>}
                                    {m.sampleInsights.length > 0 && (
                                      <div style={{ fontSize: 10, color: '#4285f4', marginTop: 2 }}>
                                        → {m.sampleInsights[0].slice(0, 30)}{m.sampleInsights[0].length > 30 ? '…' : ''}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '7px 10px' }}>
                                    <div style={{ fontSize: 10, marginBottom: 2 }}>
                                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 3 }}>
                                        {REGION_ZH[m.region] || m.region}
                                      </span>
                                    </div>
                                    {m.district && (
                                      <span style={{ fontSize: 10, color: '#888' }}>{DISTRICT_ZH[m.district] || m.district}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '7px 10px' }}>
                                    <span style={{ fontSize: 10, background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>{INDUSTRY_ZH[m.industry] || m.industry}</span>
                                  </td>
                                  <td style={{ padding: '7px 10px', fontWeight: 600, color: m.visits > 0 ? '#10a37f' : '#ccc' }}>
                                    {m.visits > 0 ? m.visits : '—'}
                                  </td>
                                  <td style={{ padding: '7px 10px', color: '#555' }}>
                                    {m.botCount > 0 ? (
                                      <span title={m.bots.join(', ')}>{m.botCount}</span>
                                    ) : '—'}
                                  </td>
                                  <td style={{ padding: '7px 10px', fontWeight: 600, color: m.insightCount >= 3 ? '#16a34a' : m.insightCount > 0 ? '#d97706' : '#dc2626' }}>
                                    {m.insightCount}
                                  </td>
                                  <td style={{ padding: '7px 10px', color: '#555' }}>
                                    {m.totalWords > 0 ? `${(m.totalWords / 1000).toFixed(1)}k` : '—'}
                                  </td>
                                  <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                                    <span style={{ color: m.readinessColor, fontWeight: 600, fontSize: 11 }}>{m.readinessLabel}</span>
                                  </td>
                                  <td style={{ padding: '7px 10px', fontWeight: 700 }}>{m.score}</td>
                                  <td style={{ padding: '7px 10px', color: '#999', fontSize: 10 }}>
                                    {m.lastTs ? formatTime(m.lastTs) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                          分數 = AI爬取×2 + 不同Bot×5 + Insight數×10 + 總字數/200 ｜ 閾值 ≥100分 + ≥5篇 Insight = ✅ 已就緒
                        </p>
                      </div>
                    )
                  })()}
                </>
              )
            })()}
          </div>
        )}

        </>
      )}

      <div style={{ marginTop: 32, padding: '12px 0', borderTop: '1px solid #eee', fontSize: 11, color: '#bbb', textAlign: 'center' }}>
        CloudPipe AI 爬蟲追蹤 — 偵測 25+ AI Bot · 即時記錄 · Session 重建 · 蜘蛛網跨站追蹤
        <br />API: <code>/api/v1/crawler-stats?view=summary|bots|pages|sessions|journey|spider-web</code>
        {' '}｜ <code>/api/v1/merchant-discovery</code>
      </div>
    </div>
    </PasswordGate>
  )
}
