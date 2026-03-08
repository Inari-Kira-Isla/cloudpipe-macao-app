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

const API = '/api/v1/crawler-stats'

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

export default function CrawlerDashboard() {
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [pages, setPages] = useState<PageStat[]>([])
  const [journey, setJourney] = useState<JourneyStep[] | null>(null)
  const [journeySession, setJourneySession] = useState('')
  const [spiderWeb, setSpiderWeb] = useState<SpiderWebData | null>(null)
  const [tab, setTab] = useState<'overview' | 'pages' | 'sessions' | 'spider-web'>('overview')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, sesRes, pgRes, swRes] = await Promise.all([
        fetch(`${API}?view=summary&days=${days}`),
        fetch(`${API}?view=sessions&days=${days}&limit=50`),
        fetch(`${API}?view=pages&days=${days}&limit=50`),
        fetch(`${API}?view=spider-web&days=${days}`),
      ])
      setSummary(await sumRes.json())
      setSessions(await sesRes.json())
      setPages(await pgRes.json())
      setSpiderWeb(await swRes.json())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [days])

  useEffect(() => { fetchData() }, [fetchData])

  const loadJourney = async (sessionId: string) => {
    setJourneySession(sessionId)
    const res = await fetch(`${API}?view=journey&session=${sessionId}`)
    const data = await res.json()
    setJourney(data.journey || [])
  }

  const maxBot = summary ? Math.max(...Object.values(summary.bots).map(b => b.count), 1) : 1
  const maxPage = pages.length ? Math.max(...pages.map(p => p.visits), 1) : 1
  const maxInd = summary ? Math.max(...Object.values(summary.industries).map(Number), 1) : 1

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>AI 爬蟲追蹤 Dashboard</h1>
        <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>即時監控 AI 搜索引擎爬蟲訪問數據</p>
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
        <button onClick={fetchData} style={{
          padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd',
          cursor: 'pointer', background: '#fff', fontSize: 13, marginLeft: 'auto',
        }}>
          刷新
        </button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#999' }}>載入中...</p>}

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

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #eee' }}>
            {(['overview', 'pages', 'sessions', 'spider-web'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setJourney(null) }}
                style={{
                  padding: '8px 20px', border: 'none', cursor: 'pointer',
                  background: 'transparent', fontSize: 14, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? '#111' : '#888',
                  borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                }}>
                {{ overview: '總覽', pages: '頁面', sessions: '爬蟲路徑', 'spider-web': '蜘蛛網' }[t]}
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
        </>
      )}

      <div style={{ marginTop: 32, padding: '12px 0', borderTop: '1px solid #eee', fontSize: 11, color: '#bbb', textAlign: 'center' }}>
        CloudPipe AI 爬蟲追蹤 — 偵測 25+ AI Bot · 即時記錄 · Session 重建 · 蜘蛛網跨站追蹤
        <br />API: <code>/api/v1/crawler-stats?view=summary|bots|pages|sessions|journey|spider-web</code>
      </div>
    </div>
  )
}
