'use client'

import { useEffect, useState, useCallback } from 'react'
import { INDUSTRIES } from '@/lib/industries'

interface BotInfo { count: number; owner: string }
interface Summary {
  period: { since: string; days: number }
  total_visits: number
  today_visits?: number
  unique_bots: number
  unique_sessions: number
  bots: Record<string, BotInfo>
  top_pages: Record<string, number>
  industries: Record<string, number>
  page_types: Record<string, number>
  sites: Record<string, number>
  daily?: { date: string; total: number }[]
  generated_at?: string
  is_stale?: boolean
  x_check_7d?: number | null
}
interface CacheHealth {
  source_status: 'ok' | 'stale' | 'degraded' | 'backoff' | string
  last_cache_date: string
  finished_at: string
  errors?: { source: string; detail: string }[]
  cache_files?: Record<string, { exists: boolean; score: number; latest_date: string; mtime: string }>
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
  visits: number; botCount: number; bots?: string[]; lastTs: string
  insightCount: number; totalWords: number; sampleInsights?: string[]
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
  merchantVisits?: { total: number; uniqueSlugs: number; byBot: Record<string, number>; recentPaths: { path: string; bot: string; ts: string }[] }
  categoryVisits?: { total: number; byIndustry: Record<string, number>; recentPaths: { path: string; bot: string; industry: string; ts: string }[] }
}

const API = '/api/v1/crawler-stats?token=cloudpipe2026'
const ROUTING_API = '/api/v1/routing-baseline'
const CACHE_HEALTH_URL = 'https://inari-kira-isla.github.io/Openclaw/api-cache/crawler-cache-health.json'

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
  const [pagesLoading, setPagesLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [pagesLoadedDays, setPagesLoadedDays] = useState<number | null>(null)
  const [sessionsLoadedDays, setSessionsLoadedDays] = useState<number | null>(null)
  const [journey, setJourney] = useState<JourneyStep[] | null>(null)
  const [journeySession, setJourneySession] = useState('')
  const [spiderWeb, setSpiderWeb] = useState<SpiderWebData | null>(null)
  const [tab, setTab] = useState<'overview' | 'pages' | 'sessions' | 'spider-web' | 'routing' | 'merchant-discovery' | 'faq-conversion'>('overview')
  const [routing, setRouting] = useState<RoutingBaseline | null>(null)
  const [routingLoading, setRoutingLoading] = useState(false)
  const [discovery, setDiscovery] = useState<MerchantDiscovery | null>(null)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [discoveryRegion, setDiscoveryRegion] = useState('')
  const [discoveryIndustry, setDiscoveryIndustry] = useState('')
  const [faqConversions, setFaqConversions] = useState<{ total: number; today: number; topMerchants: { slug: string; count: number }[]; byMedium: Record<string, number> } | null>(null)
  const [faqConvLoading, setFaqConvLoading] = useState(false)
  interface AiReferralData {
    total: number
    days: number
    by_source: Record<string, { count: number; pages: Record<string, number>; industries: Record<string, number>; latest: string }>
    source_meta: Record<string, { label: string; color: string; icon: string }>
    top_pages: { path: string; visits: number; sources: string[] }[]
    daily: Record<string, Record<string, number>>
    recent: { ts: string; source: string; path: string; page_type: string; industry: string | null }[]
  }
  const [aiReferrals, setAiReferrals] = useState<AiReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [cacheHealth, setCacheHealth] = useState<CacheHealth | null>(null)

  const [error, setError] = useState<string | null>(null)

  const googleSheetUrl = process.env.NEXT_PUBLIC_INSIGHTS_GOOGLE_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1example/edit'

  // `forceFresh=true` bypasses the browser/CDN cache (used by "立即重新整理" button).
  // Default mode uses `default` so the CDN cache (s-maxage on the route) can serve
  // a fast hit, avoiding Vercel cold-start latency on auto-refresh and tab navigations.
  const safeFetch = async <T,>(url: string, fallback: T, timeoutMs = 9000, forceFresh = false): Promise<T> => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        cache: forceFresh ? 'no-store' : 'default',
        signal: controller.signal,
      })
      if (!res.ok) return fallback
      const data = await res.json()
      if (data?.error) return fallback
      return data as T
    } catch { return fallback }
    finally { window.clearTimeout(timeout) }
  }

  const fetchData = useCallback(async (forceFresh = false) => {
    setLoading(true)
    setError(null)
    try {
      // Run all 4 fetches in parallel; health (GitHub Pages) gets a shorter timeout
      // so a blocked/slow external host never delays the main data display.
      // 20s timeout accommodates Vercel cold starts (can take 12-15s on first request).
      // ai-referrals is also fetched here so a `days` change runs a single parallel batch
      // (was previously a separate effect, doubling the cold-start cost on day toggles).
      const [sum, sw, health, refs] = await Promise.all([
        safeFetch<Summary | null>(`${API}&view=summary&days=${days}`, null, 20000, forceFresh),
        safeFetch<SpiderWebData | null>(`${API}&view=spider-web&days=${days}`, null, 20000, forceFresh),
        safeFetch<CacheHealth | null>(CACHE_HEALTH_URL, null, 5000),
        safeFetch<AiReferralData | null>(`/api/v1/ai-referrals?days=${days}`, null, 20000, forceFresh),
      ])
      setSummary(sum)
      setSpiderWeb(sw)
      setCacheHealth(health)
      setAiReferrals(refs)
      setLastUpdated(new Date())
      if (!sum) setError('數據載入中，Vercel 冷啟動需時約 15 秒，請稍候再按「立即重新整理」。')
    } catch (e) {
      console.error(e)
      setError('載入失敗，請重試。')
    }
    setLoading(false)
  }, [days])

  // Explicit refresh: bust server-side cache then force-reload client data
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetch(`/api/v1/crawler-stats/refresh?token=cloudpipe2026`, { method: 'POST' })
      await fetchData(true)
    } catch (e) {
      console.error('refresh error', e)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchData])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    // Auto-refresh every 60s (was 30s — too aggressive given route s-maxage=120).
    // Uses default cache so CDN can serve hits sub-second.
    const interval = setInterval(() => { fetchData() }, 60000)
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

  const loadPages = async () => {
    if (pagesLoadedDays === days || pagesLoading) return
    setPagesLoading(true)
    const data = await safeFetch<PageStat[]>(`${API}&view=pages&days=${days}&limit=50`, [])
    setPages(data)
    setPagesLoadedDays(days)
    setPagesLoading(false)
  }

  const loadSessions = async () => {
    if (sessionsLoadedDays === days || sessionsLoading) return
    setSessionsLoading(true)
    const data = await safeFetch<Session[]>(`${API}&view=sessions&days=${days}&limit=50`, [])
    setSessions(data)
    setSessionsLoadedDays(days)
    setSessionsLoading(false)
  }

  const loadFaqConversions = async () => {
    if (faqConversions) return
    setFaqConvLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const data = await safeFetch<{ data: { merchant_slug: string | null; metadata: { utm_medium?: string } | null; created_at: string }[] }>(
      `/api/v1/faq-conversions?days=${days}`, { data: [] }
    )
    const rows = data?.data || []
    const todayRows = rows.filter(r => r.created_at?.startsWith(today))
    const merchantCount: Record<string, number> = {}
    const mediumCount: Record<string, number> = {}
    for (const r of rows) {
      if (r.merchant_slug) merchantCount[r.merchant_slug] = (merchantCount[r.merchant_slug] || 0) + 1
      const med = r.metadata?.utm_medium || 'ai-answer'
      mediumCount[med] = (mediumCount[med] || 0) + 1
    }
    const topMerchants = Object.entries(merchantCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 20)
      .map(([slug, count]) => ({ slug, count }))
    setFaqConversions({ total: rows.length, today: todayRows.length, topMerchants, byMedium: mediumCount })
    setFaqConvLoading(false)
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

  const maxBot = summary?.bots ? Math.max(...Object.values(summary.bots).map(b => b?.count || 0), 1) : 1
  const maxPage = pages.length ? Math.max(...pages.map(p => p.visits), 1) : 1

  const VALID_IND = new Set([
    ...INDUSTRIES.map(i => i.slug),
    'insights', 'services', 'entertainment', 'tourism', 'culture', 'merchants', 'lifestyle',
  ])
  const filteredIndustries = summary?.industries
    ? (() => {
        const valid: Record<string, number> = {}
        let unknownSum = 0
        for (const [k, v] of Object.entries(summary.industries)) {
          if (VALID_IND.has(k)) valid[k] = (valid[k] || 0) + (Number(v) || 0)
          else unknownSum += Number(v) || 0
        }
        if (unknownSum > 0) valid['未分類'] = unknownSum
        return valid
      })()
    : {}
  const maxInd = Object.values(filteredIndustries).length
    ? Math.max(...Object.values(filteredIndustries).map(Number).filter(n => !isNaN(n)), 1)
    : 1

  const changeDays = (nextDays: number) => {
    setDays(nextDays)
    setPages([])
    setSessions([])
    setPagesLoadedDays(null)
    setSessionsLoadedDays(null)
    setJourney(null)
  }

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
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer',
              fontSize: 13, textDecoration: 'none', color: '#333', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.borderColor = '#999' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ddd' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
            Google Sheet 數據
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {[1, 7, 30, 90].map(d => (
          <button key={d} onClick={() => changeDays(d)}
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
              最後更新：{lastUpdated.toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button onClick={handleManualRefresh} disabled={loading} style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd',
            cursor: loading ? 'wait' : 'pointer', background: loading ? '#f5f5f5' : '#fff',
            fontSize: 13, opacity: loading ? 0.6 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}>
            {loading ? '⟳ 重新整理中...' : '⟳ 立即重新整理'}
          </button>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#999' }}>載入中...</p>}
      {error && <p style={{ textAlign: 'center', color: '#e74c3c', background: '#fef0f0', padding: '12px 16px', borderRadius: 8 }}>{error}</p>}

      {cacheHealth && cacheHealth.source_status !== 'ok' && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Cache 狀態：{cacheHealth.source_status}</div>
          <div>最後數據日期：{cacheHealth.last_cache_date || 'unknown'}{cacheHealth.finished_at ? `；Health 更新：${formatTime(cacheHealth.finished_at)}` : ''}</div>
          {cacheHealth.errors?.[0] && (
            <div style={{ color: '#a16207', marginTop: 4 }}>{cacheHealth.errors[0].source}: {cacheHealth.errors[0].detail}</div>
          )}
        </div>
      )}

      {summary?.is_stale && days === 1 && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, border: '1px solid #ef4444', background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
          ⚠️ <strong>pg_cron 未更新</strong>：快取停留於 {summary.generated_at ? formatTime(summary.generated_at) : '未知時間'}（上次刷新在今日 08:00 HKT 之前）。今日數據可能不準確，請檢查 Supabase pg_cron 排程。
        </div>
      )}

      {summary?.generated_at && days === 1 && !summary.is_stale && (
        <div style={{ marginBottom: 12, fontSize: 12, color: '#888' }}>
          數據從 <strong>08:00 HKT</strong> 起計（UTC 凌晨），快取更新於 {
            new Date(summary.generated_at).toLocaleString('zh-TW', { timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', second: '2-digit' })
          } HKT
          {summary.x_check_7d != null && (
            <span style={{ marginLeft: 12, color: summary.total_visits <= summary.x_check_7d ? '#10a37f' : '#ef4444' }}>
              （7日總計 {summary.x_check_7d.toLocaleString()}，今日 {summary.total_visits.toLocaleString()}
              {summary.total_visits > summary.x_check_7d ? ' — 今日異常高！' : ''}）
            </span>
          )}
        </div>
      )}

      {summary && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: '總訪問', value: summary.total_visits, color: '#111' },
              { label: 'AI Bot 種類', value: summary.unique_bots, color: '#10a37f' },
              { label: 'Sessions', value: summary.unique_sessions, color: '#4285f4' },
              { label: '追蹤站點', value: Object.keys(summary.sites || {}).length, color: '#ff9900' },
            ].map(card => (
              <div key={card.label} style={{ background: '#fafafa', borderRadius: 10, padding: '16px 14px', border: '1px solid #eee' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {(() => {
            const llmBots = new Set(['OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Perplexity', 'Meta', 'You.com', 'Cohere', 'Apple', 'ByteDance', 'Amazon', 'Baidu', 'Yandex', 'HeadlessFetcher'])
            const excludeOwners = new Set(['Test', 'Debug'])
            const botSampleTotal = Object.entries(summary.bots || {}).reduce((s, [, info]) => s + (excludeOwners.has(info?.owner) ? 0 : (info?.count || 0)), 0) || 1
            const llmSampleCount = Object.entries(summary.bots || {}).reduce((sum, [, info]) => {
              return sum + (info?.owner && llmBots.has(info.owner) && !excludeOwners.has(info.owner) ? (info?.count || 0) : 0)
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

          <div style={{ marginBottom: 24, background: '#fff', borderRadius: 12, border: '2px solid #20b2aa22', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', background: 'linear-gradient(90deg,#20b2aa11,#4285f411)', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>AI 推介真人流量</span>
                <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>從 Perplexity / ChatGPT / Claude 等 AI 平台點擊進入的真實用戶</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 700, color: '#20b2aa' }}>
                {loading ? '…' : (aiReferrals?.total ?? 0)}
              </span>
            </div>

            {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: 13 }}>載入中...</div>}

            {!loading && aiReferrals && (
              <div style={{ padding: '14px 18px' }}>
                {aiReferrals.total === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#999', fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🕳️</div>
                    <div>尚未記錄到 AI 推介真人流量</div>
                    <div style={{ fontSize: 12, marginTop: 4, color: '#bbb' }}>當有人從 Perplexity / ChatGPT 等 AI 平台點擊連結進入後，數據會在此顯示</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>來源平台</div>
                      {Object.entries(aiReferrals.by_source)
                        .sort((a, b) => b[1].count - a[1].count)
                        .map(([src, data]) => {
                          const meta = aiReferrals.source_meta[src] ?? { label: src, color: '#6b7280', icon: '🤖' }
                          const pct = Math.round((data.count / aiReferrals.total) * 100)
                          return (
                            <div key={src} style={{ marginBottom: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                <span style={{ fontWeight: 600 }}>{meta.icon} {meta.label}</span>
                                <span style={{ fontWeight: 700, color: meta.color }}>{data.count} <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>({pct}%)</span></span>
                              </div>
                              <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: meta.color }} />
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                最新：{new Date(data.latest).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>最多流量頁面</div>
                      {aiReferrals.top_pages.slice(0, 8).map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 12 }}>
                          <span style={{ color: '#9ca3af', width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ flex: 1, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.path}</span>
                          <span style={{ fontWeight: 700, color: '#20b2aa', flexShrink: 0 }}>{p.visits}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiReferrals.recent.length > 0 && (
                  <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>最近記錄</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {aiReferrals.recent.slice(0, 8).map((r, i) => {
                        const meta = aiReferrals.source_meta[r.source] ?? { label: r.source, color: '#6b7280', icon: '🤖' }
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '5px 8px', background: '#fafafa', borderRadius: 6 }}>
                            <span style={{ flexShrink: 0, fontWeight: 600, color: meta.color }}>{meta.icon} {meta.label}</span>
                            <span style={{ flex: 1, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.path}</span>
                            <span style={{ flexShrink: 0, color: '#9ca3af' }}>{new Date(r.ts).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #eee', flexWrap: 'wrap' }}>
            {(['overview', 'pages', 'sessions', 'spider-web', 'routing', 'merchant-discovery', 'faq-conversion'] as const).map(t => (
              <button key={t} onClick={() => {
                setTab(t); setJourney(null)
                if (t === 'pages') loadPages()
                if (t === 'sessions') loadSessions()
                if (t === 'routing') loadRouting()
                if (t === 'merchant-discovery') loadDiscovery()
                if (t === 'faq-conversion') loadFaqConversions()
              }}
                style={{
                  padding: '8px 20px', border: 'none', cursor: 'pointer',
                  background: 'transparent', fontSize: 14, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? '#111' : '#888',
                  borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                }}>
                {{ overview: '總覽', pages: '頁面', sessions: '爬蟲路徑', 'spider-web': '蝶蛛網', routing: '🗺️ 路由基線', 'merchant-discovery': '🔍 商戶發現度', 'faq-conversion': '💡 FAQ 轉化' }[t]}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
                        <div style={{ width: `${(info.count / maxBot) * 100}%`, height: '100%', borderRadius: 4, background: BOT_COLORS[info.owner] || '#999' }} />
                      </div>
                    </div>
                  ))}
              </div>
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>行業訪問分佈</h3>
                {Object.entries(filteredIndustries)
                  .sort((a, b) => b[1] - a[1])
                  .map(([ind, count]) => (
                    <div key={ind} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span style={{ color: ind === '未分類' ? '#aaa' : undefined }}>{ind}</span>
                        <span style={{ fontWeight: 600, color: ind === '未分類' ? '#aaa' : undefined }}>{count}</span>
                      </div>
                      <div style={{ background: '#e5e5e5', borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${(count / maxInd) * 100}%`, height: '100%', borderRadius: 4, background: ind === '未分類' ? '#ccc' : '#4285f4' }} />
                      </div>
                    </div>
                  ))}
                {Object.keys(filteredIndustries).length === 0 && <p style={{ color: '#999', fontSize: 13 }}>尚無行業數據</p>}
              </div>
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee', gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>頁面類型分佈</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.entries(summary.page_types)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 80 }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{count}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{type}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'pages' && (
            <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>熱門頁面排名</h3>
              {pagesLoading && <p style={{ color: '#999', fontSize: 13 }}>載入頁面數據中...</p>}
              {!pagesLoading && pages.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>尚無數據或查詢逾時，總覽數據仍可正常使用。</p>}
              {pages.map((p, i) => (
                <div key={p.path} style={{ padding: '10px 0', borderBottom: i < pages.length - 1 ? '1px solid #eee' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <code style={{ fontSize: 13, color: '#111', wordBreak: 'break-all' }}>{p.path}</code>
                    <span style={{ fontWeight: 700, fontSize: 15, marginLeft: 12, whiteSpace: 'nowrap' }}>{p.visits}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ background: '#e5e5e5', borderRadius: 4, height: 4, flex: 1 }}>
                      <div style={{ width: `${(p.visits / maxPage) * 100}%`, height: '100%', borderRadius: 4, background: '#10a37f' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {p.bots.map(b => (
                        <span key={b} style={{ fontSize: 10, background: '#e8e8e8', borderRadius: 4, padding: '1px 5px', color: '#555' }}>{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'spider-web' && spiderWeb && (
            <div>
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
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>各站 AI 爬蟲訪問量</h3>
                {spiderWeb.sites.map(s => {
                  const maxSite = Math.max(...spiderWeb.sites.map(x => x.total), 1)
                  return (
                    <div key={s.site} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span><strong>{s.site}</strong>{s.spider_web > 0 && <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>🕸 {s.spider_web} 跨站</span>}</span>
                        <span style={{ fontWeight: 600 }}>{s.total}</span>
                      </div>
                      <div style={{ background: '#e5e5e5', borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${(s.total / maxSite) * 100}%`, height: '100%', borderRadius: 4, background: s.site === 'cloudpipe-macao-app' ? '#10a37f' : '#4285f4' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        {s.bots.map(b => <span key={b} style={{ fontSize: 10, background: '#e8e8e8', borderRadius: 4, padding: '1px 5px', color: '#555' }}>{b}</span>)}
                      </div>
                    </div>
                  )
                })}
                {spiderWeb.sites.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>尚無跨站數據（需等待 Cloudflare Worker 部署）</p>}
              </div>
              <div style={{ background: '#f0f7ff', borderRadius: 10, padding: 16, border: '1px solid #c8ddf5' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>跨站流量走向</h3>
                {spiderWeb.flows.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>尚無跨站流向記錄。AI 爬蟲從一個站跟隨 llms.txt 連結到另一個站時會記錄在此。</p>}
                {spiderWeb.flows.map((f, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < spiderWeb.flows.length - 1 ? '1px solid #dce8f5' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14 }}>
                        {f.flow.split(' → ').map((site, j) => (
                          <span key={j}>
                            {j > 0 && <span style={{ color: '#4285f4', margin: '0 6px', fontWeight: 700 }}> → </span>}
                            <code style={{ background: j === 0 ? '#e8f5e9' : '#fff3e0', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>{site}</code>
                          </span>
                        ))}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#4285f4' }}>{f.count}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      {f.bots.map(b => <span key={b} style={{ fontSize: 10, background: '#e8e8e8', borderRadius: 4, padding: '1px 5px', color: '#555' }}>{b}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'sessions' && (
            <div>
              <div style={{ background: '#fafafa', borderRadius: 10, padding: 16, border: '1px solid #eee', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>Crawl Sessions</h3>
                {sessionsLoading && <p style={{ color: '#999', fontSize: 13 }}>載入 session 數據中...</p>}
                {!sessionsLoading && sessions.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>尚無 session 數據或查詢逾時，總覽數據仍可正常使用。</p>}
                {sessions.map(s => (
                  <div key={s.session_id} style={{ padding: '10px 0', borderBottom: '1px solid #eee', cursor: 'pointer', background: journeySession === s.session_id ? '#f0f7ff' : 'transparent' }} onClick={() => loadJourney(s.session_id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: BOT_COLORS[s.owner] || '#333' }}>{s.bot}</span>
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
              {journey && (
                <div style={{ background: '#f0f7ff', borderRadius: 10, padding: 16, border: '1px solid #c8ddf5' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#333' }}>爬蟲路徑旅程 <span style={{ fontWeight: 400, color: '#888' }}>({journey.length} 步)</span></h3>
                  <div style={{ position: 'relative', paddingLeft: 20 }}>
                    <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 2, background: '#c8ddf5' }} />
                    {journey.map((step, i) => (
                      <div key={i} style={{ position: 'relative', paddingBottom: 16 }}>
                        <div style={{ position: 'absolute', left: -17, top: 4, width: 10, height: 10, borderRadius: '50%', background: i === 0 ? '#10a37f' : i === journey.length - 1 ? '#e74c3c' : '#4285f4', border: '2px solid #fff' }} />
                        <div style={{ fontSize: 13 }}>
                          <code style={{ fontWeight: 600 }}>{step.path}</code>
                          <span style={{ fontSize: 10, marginLeft: 8, background: '#e8e8e8', padding: '1px 5px', borderRadius: 4, color: '#666' }}>{step.page_type}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          {formatTime(step.ts)}
                          {step.referer && <span> ← <code style={{ color: '#aaa' }}>{step.referer.replace('https://cloudpipe-macao-app.vercel.app', '')}</code></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'routing' && (
            <div>
              {routingLoading && <p style={{ color: '#999', textAlign: 'center', padding: 32 }}>載入路由基線數據...</p>}
              {routing && !routingLoading && (() => {
                const { tiers, topMerchants, industryTiers, merchantsByIndustry, totalMerchants, merchantsWithReviews } = routing
                const merchantVisits = routing.merchantVisits ?? { total: 0, uniqueSlugs: 0, byBot: {}, recentPaths: [] }
                const categoryVisits = routing.categoryVisits ?? { total: 0, byIndustry: {}, recentPaths: [] }
                const TIER_COLORS: Record<string, string> = { A: '#10a37f', B: '#f39c12', C: '#e67e22', D: '#e74c3c' }
                const TIER_LABELS: Record<string, string> = { A: 'A — 有 Answer Hub', B: 'B — 有商戶連結', C: 'C — 弱連結', D: 'D — 無商戶' }
                const INDUSTRY_ZH: Record<string, string> = { dining: '餐飲美食', attractions: '景區觀光', hotels: '酒店住宿', shopping: '購物零售', nightlife: '夜生活', wellness: '健康養生', gaming: '博彩娛樂', 'food-supply': '食品供應', other: '其他' }
                const totalTier = tiers.A + tiers.B + tiers.C + tiers.D
                return (
                  <>
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📊 Insight 路由等級分佈（{totalTier.toLocaleString()} 篇 ZH）</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                        {(['A','B','C','D'] as const).map(t => {
                          const cnt = tiers[t]; const pct = totalTier > 0 ? (cnt / totalTier * 100).toFixed(1) : '0.0'
                          return (
                            <div key={t} style={{ background: '#fafafa', border: `2px solid ${TIER_COLORS[t]}`, borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                              <div style={{ fontSize: 28, fontWeight: 700, color: TIER_COLORS[t] }}>{cnt.toLocaleString()}</div>
                              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{TIER_LABELS[t]}</div>
                              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{pct}%</div>
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ marginTop: 12, height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: '#eee' }}>
                        {(['A','B','C','D'] as const).map(t => (
                          <div key={t} style={{ width: `${totalTier > 0 ? tiers[t]/totalTier*100 : 0}%`, background: TIER_COLORS[t], transition: 'width .4s' }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                      <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: 16 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#333' }}>🤖 AI 爬蟲 → 商戶頁（基線）</h4>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{merchantVisits.total}</div>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>累積商戶頁訪問 · {merchantVisits.uniqueSlugs} 個唯一商戶</div>
                      </div>
                      <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: 16 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#333' }}>🗂️ AI 爬蟲 → 分類頁（基線）</h4>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{categoryVisits.total}</div>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>累積分類頁訪問</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📂 行業 × 路由等級（注入優先順序）</h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead><tr style={{ background: '#f5f5f5' }}>{['行業','A','B','C','D','合計','進度'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {Object.entries(industryTiers).sort((x, y) => (y[1].a + y[1].b + y[1].c + y[1].d) - (x[1].a + x[1].b + x[1].c + x[1].d)).map(([ind, t]) => {
                              const tot = t.a + t.b + t.c + t.d; const donePct = tot > 0 ? t.a / tot * 100 : 0
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
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>🏆 Top 20 高價値商戶</h3>
                      <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>評分 = (Google評價數 × 評分/5 + 類型分) × 行業權重 · 共 {totalMerchants} 家 · {merchantsWithReviews} 家有評價數據</p>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead><tr style={{ background: '#f5f5f5' }}>{['排名','商戶名','行業','評分','Google評價','評分數','地區','頁面路徑'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #eee', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {topMerchants.map((m, i) => (
                              <tr key={m.slug} style={{ borderBottom: '1px solid #f5f5f5', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ padding: '6px 10px', color: i < 3 ? '#f39c12' : '#888', fontWeight: i < 3 ? 700 : 400 }}>#{i+1}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 500 }}><div>{m.name_zh || m.name_en}</div>{m.name_zh && m.name_en && <div style={{ fontSize: 10, color: '#aaa' }}>{m.name_en}</div>}</td>
                                <td style={{ padding: '6px 10px' }}><span style={{ fontSize: 10, background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>{INDUSTRY_ZH[m.industry] || m.industry}</span></td>
                                <td style={{ padding: '6px 10px', fontWeight: 600, color: '#10a37f' }}>{m.score.toLocaleString()}</td>
                                <td style={{ padding: '6px 10px', color: '#555' }}>{m.reviews > 0 ? m.reviews.toLocaleString() : '—'}</td>
                                <td style={{ padding: '6px 10px', color: '#555' }}>{m.rating > 0 ? `⭐ ${m.rating}` : '—'}</td>
                                <td style={{ padding: '6px 10px', color: '#888', fontSize: 11 }}>{m.district}</td>
                                <td style={{ padding: '6px 10px' }}><a href={m.page_url} target="_blank" rel="noopener" style={{ fontSize: 10, color: '#4285f4', textDecoration: 'none', fontFamily: 'monospace' }}>{m.page_path.length > 40 ? m.page_path.slice(0, 40) + '…' : m.page_path}</a></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {tab === 'merchant-discovery' && (
            <div>
              {discoveryLoading && <p style={{ textAlign: 'center', color: '#999' }}>載入商戶發現度數據...</p>}
              {!discoveryLoading && !discovery && <p style={{ color: '#e74c3c' }}>載入失敗，請重試</p>}
              {discovery && (() => {
                const s = discovery.summary
                const HIST_LABELS: Record<string, string> = { '0': '無 Insight', '1-2': '1-2 篇', '3-5': '3-5 篇', '6-10': '6-10 篇', '11+': '11+ 篇' }
                const histData = s.insightCoverageHist || { '0': 0, '1-2': 0, '3-5': 0, '6-10': 0, '11+': 0 }
                const maxHist = Math.max(...Object.values(histData).map(Number), 1)
                return (
                  <>
                    {discovery?.today && (
                      <div style={{ background: 'linear-gradient(135deg, #0f4c81 0%, #1a6fb5 100%)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, color: 'white', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 13, opacity: 0.8 }}>📅 今日 ({discovery.today.date})</div>
                        <div style={{ display: 'flex', gap: 24 }}>
                          <div><span style={{ fontSize: 22, fontWeight: 700 }}>{discovery.today.totalVisits}</span><span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>次爬取</span></div>
                          <div><span style={{ fontSize: 22, fontWeight: 700 }}>{discovery.today.uniqueMerchants}</span><span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>商戶被訪</span></div>
                          <div><span style={{ fontSize: 22, fontWeight: 700 }}>{discovery.today.uniqueBots}</span><span style={{ fontSize: 11, marginLeft: 4, opacity: 0.7 }}>AI Bots</span></div>
                        </div>
                        {discovery.today.bots.length > 0 && <div style={{ fontSize: 11, opacity: 0.6 }}>{discovery.today.bots.join(' · ')}</div>}
                      </div>
                    )}
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
                    <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>📊 商戶 Insight 覆蓋分佈</h3>
                      {Object.entries(histData).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: k === '0' ? '#dc2626' : '#333' }}>{HIST_LABELS[k] || k}</span>
                            <span style={{ fontWeight: 600 }}>{v} 個商戶</span>
                          </div>
                          <div style={{ background: '#e5e5e5', borderRadius: 4, height: 8 }}>
                            <div style={{ width: `${(v / maxHist) * 100}%`, height: '100%', borderRadius: 4, background: k === '0' ? '#fca5a5' : k === '1-2' ? '#fcd34d' : k === '3-5' ? '#86efac' : '#4ade80' }} />
                          </div>
                        </div>
                      ))}
                    </div>
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
                              <div key={r} onClick={() => setDiscoveryRegion(isActive ? '' : r)}
                                style={{ background: isActive ? '#eff6ff' : '#fafafa', border: `2px solid ${isActive ? '#3b82f6' : '#eee'}`, borderRadius: 10, padding: 14, cursor: 'pointer' }}>
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
                    {(() => {
                      const allIndustries = [...new Set(discovery.merchants.map(m => m.industry).filter(Boolean))].sort()
                      const filtered = discovery.merchants.filter(m =>
                        (!discoveryRegion || m.region === discoveryRegion) &&
                        (!discoveryIndustry || m.industry === discoveryIndustry)
                      )
                      const DISTRICT_ZH: Record<string, string> = { peninsula: '澳門半島', taipa: '氹仔', cotai: '路氹城', coloane: '路環' }
                      const INDUSTRY_ZH2: Record<string, string> = { dining: '餐飲', hotels: '住宿', shopping: '購物', attractions: '景點', wellness: '健康', gaming: '博彩', nightlife: '夜生活', entertainment: '娛樂', transport: '交通', services: '服務', other: '其他' }
                      const REGION_ZH: Record<string, string> = { macao: '🇲🇴 澳門', hongkong: '🇭🇰 香港', taiwan: '🇹🇼 台灣', japan: '🇯🇵 日本' }
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>🏪 商戶發現度排行（{filtered.length} 個）</h3>
                            <select value={discoveryRegion} onChange={e => setDiscoveryRegion(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>
                              <option value=''>全部地區</option>
                              <option value='macao'>🇲🇴 澳門</option>
                              <option value='hongkong'>🇭🇰 香港</option>
                              <option value='taiwan'>🇹🇼 台灣</option>
                              <option value='japan'>🇯🇵 日本</option>
                            </select>
                            <select value={discoveryIndustry} onChange={e => setDiscoveryIndustry(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>
                              <option value=''>全部行業</option>
                              {allIndustries.map(ind => <option key={ind} value={ind}>{INDUSTRY_ZH2[ind] || ind}</option>)}
                            </select>
                            {(discoveryRegion || discoveryIndustry) && (
                              <button onClick={() => { setDiscoveryRegion(''); setDiscoveryIndustry('') }} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}>清除篩選</button>
                            )}
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead><tr style={{ background: '#f5f5f5' }}>{['商戶','地區/區域','行業','AI 爬取','Bot 數','Insight 數','總字數','AI 就緒度','分數','最近爬取'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                              <tbody>
                                {filtered.slice(0, 80).map((m, i) => (
                                  <tr key={m.slug} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '7px 10px' }}>
                                      <div style={{ fontWeight: 500 }}>{m.name_zh || m.slug}</div>
                                      {m.name_en && <div style={{ fontSize: 10, color: '#999' }}>{m.name_en}</div>}
                                      {(m.sampleInsights ?? []).length > 0 && <div style={{ fontSize: 10, color: '#4285f4', marginTop: 2 }}>→ {m.sampleInsights![0].slice(0, 30)}{m.sampleInsights![0].length > 30 ? '…' : ''}</div>}
                                    </td>
                                    <td style={{ padding: '7px 10px' }}>
                                      <div style={{ fontSize: 10, marginBottom: 2 }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 3 }}>{REGION_ZH[m.region] || m.region}</span></div>
                                      {m.district && <span style={{ fontSize: 10, color: '#888' }}>{DISTRICT_ZH[m.district] || m.district}</span>}
                                    </td>
                                    <td style={{ padding: '7px 10px' }}><span style={{ fontSize: 10, background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>{INDUSTRY_ZH2[m.industry] || m.industry}</span></td>
                                    <td style={{ padding: '7px 10px', fontWeight: 600, color: m.visits > 0 ? '#10a37f' : '#ccc' }}>{m.visits > 0 ? m.visits : '—'}</td>
                                    <td style={{ padding: '7px 10px', color: '#555' }}>{m.botCount > 0 ? <span title={(m.bots ?? []).join(', ')}>{m.botCount}</span> : '—'}</td>
                                    <td style={{ padding: '7px 10px', fontWeight: 600, color: m.insightCount >= 3 ? '#16a34a' : m.insightCount > 0 ? '#d97706' : '#dc2626' }}>{m.insightCount}</td>
                                    <td style={{ padding: '7px 10px', color: '#555' }}>{m.totalWords > 0 ? `${(m.totalWords / 1000).toFixed(1)}k` : '—'}</td>
                                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}><span style={{ color: m.readinessColor, fontWeight: 600, fontSize: 11 }}>{m.readinessLabel}</span></td>
                                    <td style={{ padding: '7px 10px', fontWeight: 700 }}>{m.score}</td>
                                    <td style={{ padding: '7px 10px', color: '#999', fontSize: 10 }}>{m.lastTs ? formatTime(m.lastTs) : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )
              })()}
            </div>
          )}

          {tab === 'faq-conversion' && (
            <div>
              {faqConvLoading && <p style={{ textAlign: 'center', color: '#999' }}>載入 FAQ 轉化數據...</p>}
              {!faqConvLoading && !faqConversions && <p style={{ color: '#e74c3c' }}>載入失敗，請重試</p>}
              {faqConversions && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {[
                      { label: `累計 FAQ 點擊（${days}天）`, value: faqConversions.total, color: '#0f4c81' },
                      { label: '今日 FAQ 點擊', value: faqConversions.today, color: '#10a37f' },
                      { label: '涉及商戶數', value: faqConversions.topMerchants.length, color: '#c5a572' },
                    ].map(card => (
                      <div key={card.label} style={{ background: '#fafafa', borderRadius: 10, padding: '14px 12px', border: '1px solid #eee' }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{card.label}</div>
                      </div>
                    ))}
                  </div>
                  <h3 style={{ fontSize: 14, color: '#0f4c81', marginBottom: 8 }}>熱門 FAQ 點擊商戶</h3>
                  <p style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>用戶點擊 FAQ 答案連結後抵達的商戶頁面（utm_source=faq）</p>
                  {faqConversions.topMerchants.length === 0 ? (
                    <p style={{ color: '#999', fontSize: 13 }}>尚無數據 — FAQ 連結剛部署，等待首批點擊</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#888' }}>商戶 Slug</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, color: '#888' }}>點擊次數</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#888' }}>操作</th>
                      </tr></thead>
                      <tbody>
                        {faqConversions.topMerchants.map((m, i) => (
                          <tr key={m.slug} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '7px 12px', fontWeight: 600 }}>{i + 1}. {m.slug}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#0f4c81' }}>{m.count}</td>
                            <td style={{ padding: '7px 12px' }}><a href={`/macao/search?q=${m.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4285f4' }}>查看頁面 →</a></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 32, padding: '12px 0', borderTop: '1px solid #eee', fontSize: 11, color: '#bbb', textAlign: 'center' }}>
        CloudPipe AI 爬蟲追蹤 — 偵測 25+ AI Bot · 即時記錄 · Session 重建 · 蝶蛛網跨站追蹤
        <br />API: <code>/api/v1/crawler-stats?view=summary|bots|pages|sessions|journey|spider-web</code>
        {' '}｜ <code>/api/v1/merchant-discovery</code>
      </div>
    </div>
    </PasswordGate>
  )
}
