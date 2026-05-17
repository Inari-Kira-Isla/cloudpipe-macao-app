import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { getBrandConfig, BRAND_PORTAL_CONFIGS, type BrandPortalConfig } from '@/lib/brandPortalConfig'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return BRAND_PORTAL_CONFIGS.map(b => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const config = getBrandConfig(slug)
  if (!config) return { title: '品牌不存在' }
  return {
    title: `${config.name} · AI 能見度報告 | CloudPipe`,
    description: `${config.name} 的 AI 引用狀態、趨勢分析與 AEO 行動進度報告。`,
    robots: 'noindex',
  }
}

interface TrendPoint { date: string; day: number; mentionCount: number; totalChecks: number }

async function fetchBrandData(config: BrandPortalConfig) {
  const supabase = createServiceClient()
  const joinDate = new Date(config.joinDate)
  const dayNumber = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / 86_400_000) + 1)

  const [searchRes, actionRes, crawlerRes] = await Promise.all([
    supabase.from('ai_search_results').select('timestamp,mentioned,competitor_name,query')
      .eq('brand_slug', config.slug).order('timestamp', { ascending: true }),
    supabase.from('brand_aeo_actions').select('title,status,priority,completed_at')
      .eq('brand_slug', config.slug).order('completed_at', { ascending: false }),
    supabase.from('crawler_visits').select('bot_name')
      .eq('site', config.slug).gte('ts', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  // Build trend
  const byDate = new Map<string, { m: number; t: number }>()
  for (const row of searchRes.data || []) {
    const d = (row.timestamp as string).slice(0, 10)
    const cur = byDate.get(d) ?? { m: 0, t: 0 }
    cur.t++
    if (row.mentioned) cur.m++
    byDate.set(d, cur)
  }
  const trend: TrendPoint[] = Array.from(byDate.entries())
    .map(([date, { m, t }]) => ({
      date, mentionCount: m, totalChecks: t,
      day: Math.max(1, Math.floor((new Date(date).getTime() - joinDate.getTime()) / 86_400_000) + 1),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // AEO
  const actions = actionRes.data || []
  const aeoActions = {
    done: actions.filter(a => a.status === 'done').length,
    total: actions.length,
    recent: actions.slice(0, 6).map(a => ({
      title: a.title as string,
      done: a.status === 'done',
      date: a.completed_at ? (a.completed_at as string).slice(5, 10) : null,
    })),
  }

  // Crawler
  const crawlerBreakdown: Record<string, number> = {}
  for (const r of crawlerRes.data || []) {
    const b = (r.bot_name as string) || 'Unknown'
    crawlerBreakdown[b] = (crawlerBreakdown[b] ?? 0) + 1
  }
  const crawlerTotal = (crawlerRes.data || []).length

  // Competitors from ai_search_results
  const compCounts: Record<string, number> = {}
  for (const row of searchRes.data || []) {
    const c = row.competitor_name as string | null
    if (c && c !== config.slug) compCounts[c] = (compCounts[c] ?? 0) + 1
  }
  const competitorRanking = Object.entries(compCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }))

  return { dayNumber, trend, aeoActions, crawlerBreakdown, crawlerTotal, competitorRanking }
}

// ── SVG trend chart (server-rendered) ─────────────────────────────
function TrendChart({ trend, dayNumber }: { trend: TrendPoint[]; dayNumber: number }) {
  if (trend.length < 2) {
    return (
      <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(220,230,244,0.3)' }}>數據收集中，請明日再查</span>
      </div>
    )
  }

  const W = 520, H = 150
  const P = { top: 16, right: 16, bottom: 26, left: 28 }
  const iW = W - P.left - P.right, iH = H - P.top - P.bottom
  const days = trend.length
  const maxM = Math.max(...trend.map(t => t.mentionCount), 1)

  const sx = (i: number) => P.left + (i / (days - 1)) * iW
  const sy = (v: number) => P.top + (1 - v / Math.max(maxM, 3)) * iH

  const pts = trend.map((t, i) => ({ x: sx(i), y: sy(t.mentionCount) }))

  let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2
    path += ` C ${mx.toFixed(1)} ${pts[i-1].y.toFixed(1)}, ${mx.toFixed(1)} ${pts[i].y.toFixed(1)}, ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
  }
  const area = `${path} L ${pts[pts.length-1].x} ${P.top + iH} L ${pts[0].x} ${P.top + iH} Z`
  const last = pts[pts.length - 1]

  const xLabels = [0, Math.floor(days * 0.33), Math.floor(days * 0.66), days - 1]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(i => ({ x: sx(i), label: `D${trend[i].day}` }))

  const yLabels = [0, 1, 2, 3].filter(v => v <= Math.max(maxM + 1, 3))
  const lastMention = trend[trend.length - 1].mentionCount

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5C842" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#F5C842" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F5C842" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#F5C842" stopOpacity="1" />
        </linearGradient>
      </defs>

      {yLabels.map(v => (
        <g key={v}>
          <line x1={P.left} y1={sy(v)} x2={W - P.right} y2={sy(v)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={P.left - 5} y={sy(v) + 4} fontSize="9" fill="rgba(220,230,244,0.3)"
            textAnchor="end" fontFamily="var(--font-geist-mono)">{v}</text>
        </g>
      ))}

      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={H - 6} fontSize="9" fill="rgba(220,230,244,0.3)"
          textAnchor="middle" fontFamily="var(--font-geist-mono)">{label}</text>
      ))}

      <path d={area} fill="url(#areaGrad)" />
      <path d={path} fill="none" stroke="url(#lineGrad)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      <circle cx={last.x} cy={last.y} r="8" fill="#F5C842" opacity="0.12" />
      <circle cx={last.x} cy={last.y} r="3.5" fill="#F5C842" />
      <text x={last.x + 10} y={last.y - 5} fontSize="10" fill="#F5C842"
        fontFamily="var(--font-geist-mono)" fontWeight="500">
        {lastMention} 次引用
      </text>
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default async function BrandDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = getBrandConfig(slug)
  if (!config) notFound()

  const { dayNumber, trend, aeoActions, crawlerBreakdown, crawlerTotal, competitorRanking } = await fetchBrandData(config)

  const mentionedEngines = config.engines.filter(e => e.mentioned).length
  const aeoPercent = aeoActions.total > 0 ? Math.round(aeoActions.done / aeoActions.total * 100) : 0
  const mentionColor = mentionedEngines >= 3 ? '#4ADE80' : mentionedEngines >= 2 ? '#FBBF24' : mentionedEngines >= 1 ? '#F5C842' : '#F87171'

  const otherBrands = BRAND_PORTAL_CONFIGS.filter(b => b.slug !== slug)

  const s: Record<string, React.CSSProperties> = {
    bg: { background: '#08111F', minHeight: '100vh', fontFamily: 'var(--font-geist-sans)' },
    surface: { background: '#0C1B32', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 13, padding: 22 },
    panelTitle: { fontSize: 11, fontWeight: 600, color: 'rgba(220,230,244,0.5)', letterSpacing: '0.09em', textTransform: 'uppercase' as const },
    sectionLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(220,230,244,0.45)', letterSpacing: '0.09em', textTransform: 'uppercase' as const, marginBottom: 10 },
  }

  return (
    <div style={s.bg}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,17,31,0.94)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 26, height: 26, background: '#F5C842', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7C2 4.23858 4.23858 2 7 2C9.76142 2 12 4.23858 12 7" stroke="#08111F" strokeWidth="2" strokeLinecap="round"/>
                <path d="M7 12V7" stroke="#08111F" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="7" cy="7" r="1.5" fill="#08111F"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>CloudPipe</span>
          </Link>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
          <Link href="/brands" style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)', textDecoration: 'none', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            AI 能見度報告
          </Link>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.5)' }} />
            <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)' }}>即時數據</span>
          </div>
        </div>
      </header>

      {/* Brand Nav */}
      <nav style={{ background: '#0C1B32', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 52, zIndex: 90 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'flex', overflowX: 'auto' }}>
          {BRAND_PORTAL_CONFIGS.map(b => (
            <Link
              key={b.slug}
              href={`/brands/${b.slug}`}
              style={{
                padding: '11px 16px',
                fontSize: 13, fontWeight: 500,
                color: b.slug === slug ? '#F5C842' : 'rgba(220,230,244,0.4)',
                textDecoration: 'none',
                borderBottom: b.slug === slug ? '2px solid #F5C842' : '2px solid transparent',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.7, flexShrink: 0 }} />
              {b.name}
              <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, opacity: 0.5 }}>
                D{Math.max(1, Math.floor((Date.now() - new Date(b.joinDate).getTime()) / 86_400_000) + 1)}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* HERO */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(220,230,244,0.4)', marginBottom: 3 }}>
                {config.industry}
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 600, color: '#DCE6F4', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.15 }}>
                {config.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7 }}>
                <span style={{
                  background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.12)',
                  color: '#F5C842', fontFamily: 'var(--font-geist-mono)',
                  fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
                }}>
                  D{dayNumber}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)' }}>加入 {config.joinDate}</span>
              </div>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { val: `${mentionedEngines}/4`, label: 'AI 引用中', color: mentionColor },
                { val: config.engines[0] ? String(config.engines.filter(e => e.mentioned).length) + '/4' : '—', label: 'AI 引擎', color: '#DCE6F4' },
                { val: String(crawlerTotal), label: '爬蟲 / 24h', color: '#DCE6F4' },
                { val: `${aeoPercent}%`, label: 'AEO 完成', color: '#DCE6F4' },
              ].map(({ val, label, color }) => (
                <div key={label} style={{ background: '#0C1B32', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '11px 15px', minWidth: 78 }}>
                  <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 20, fontWeight: 500, color, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(220,230,244,0.4)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Engine Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {config.engines.map(e => (
              <div key={e.key} style={{
                background: e.mentioned
                  ? 'linear-gradient(160deg, #0C1B32 60%, rgba(74,222,128,0.04) 100%)'
                  : '#0C1B32',
                border: `1px solid ${e.mentioned ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 11, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
                opacity: e.mentioned ? 1 : 0.72,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(220,230,244,0.65)' }}>{e.name}</span>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: e.mentioned ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.03)',
                    border: e.mentioned ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    color: e.mentioned ? '#4ADE80' : 'rgba(220,230,244,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {e.mentioned ? '✓' : '–'}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)', lineHeight: 1.4 }}>{e.query}</div>
                <div style={{ fontSize: 10, color: e.mentioned ? '#4ADE80' : 'rgba(220,230,244,0.28)' }}>{e.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CHARTS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Trend */}
          <div style={s.surface}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={s.panelTitle}>AI 能見度趨勢</span>
              <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.35)', fontFamily: 'var(--font-geist-mono)' }}>
                D1 → D{dayNumber}
              </span>
            </div>
            <TrendChart trend={trend} dayNumber={dayNumber} />
            <div style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)' }}>AI 爬蟲 24h：</span>
              {crawlerTotal > 0
                ? Object.entries(crawlerBreakdown).map(([bot, n]) => (
                    <span key={bot} style={{
                      background: '#102038', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 100, padding: '3px 9px',
                      fontSize: 10, fontFamily: 'var(--font-geist-mono)', color: 'rgba(220,230,244,0.65)',
                    }}>
                      {bot} ×{n}
                    </span>
                  ))
                : <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.25)' }}>暫無記錄</span>
              }
            </div>
          </div>

          {/* Competitor */}
          <div style={s.surface}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={s.panelTitle}>競品 AI 引用比較</span>
              <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.35)', fontFamily: 'var(--font-geist-mono)' }}>本週數據</span>
            </div>

            {/* Self + competitors */}
            {[
              { name: config.name, score: mentionedEngines, self: true },
              ...competitorRanking.slice(0, 3).map(c => ({ name: c.name, score: Math.min(3, Math.round(c.count / 5)), self: false })),
            ].map(c => (
              <div key={c.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: c.self ? '#F5C842' : 'rgba(220,230,244,0.65)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}{c.self ? ' ← 您' : ''}
                  </span>
                  <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, color: 'rgba(220,230,244,0.4)', flexShrink: 0, marginLeft: 8 }}>
                    {c.score}/4 AI
                  </span>
                </div>
                <div style={{ height: 5, background: '#102038', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${(c.score / 4) * 100}%`,
                    background: c.self ? '#F5C842' : 'rgba(96,165,250,0.65)',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 10, color: 'rgba(220,230,244,0.3)', lineHeight: 1.55 }}>
                分數 = 過去 7 天 AI 查詢中，品牌被提及的引擎數量（滿分 4 分）
              </div>
            </div>
          </div>
        </div>

        {/* GAP SUGGESTIONS */}
        <div style={{ marginBottom: 14 }}>
          <div style={s.sectionLabel}>本週缺口建議</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {config.gaps.map((g, i) => (
              <div key={i} style={{
                background: '#0C1B32',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${g.priority === 'p1' ? '#F5C842' : 'rgba(245,200,66,0.3)'}`,
                borderRadius: 11, padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{
                  flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                  background: g.priority === 'p1' ? 'rgba(245,200,66,0.07)' : 'rgba(255,255,255,0.04)',
                  color: g.priority === 'p1' ? '#F5C842' : 'rgba(220,230,244,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-geist-mono)',
                  marginTop: 1,
                }}>
                  {g.priority === 'p1' ? 'P1' : 'P2'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#DCE6F4', marginBottom: 3 }}>{g.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.45)', lineHeight: 1.55 }}>{g.desc}</div>
                </div>
                <div style={{
                  flexShrink: 0, alignSelf: 'center',
                  padding: '5px 11px',
                  background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.12)',
                  borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#F5C842',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  加入計劃
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AEO PROGRESS */}
        <div style={s.surface}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={s.sectionLabel}>AEO 行動進度</div>
              <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 26, fontWeight: 500, color: '#F5C842', lineHeight: 1 }}>
                {aeoActions.done}
                <span style={{ fontSize: 14, color: 'rgba(220,230,244,0.4)' }}>/{aeoActions.total || '—'} 完成</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 26, fontWeight: 500, color: '#DCE6F4', lineHeight: 1 }}>
                {aeoPercent}%
              </div>
              <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)', marginTop: 2 }}>完成率</div>
            </div>
          </div>

          <div style={{ height: 7, background: '#102038', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${aeoPercent}%`,
              background: 'linear-gradient(90deg, #F5C842 0%, #FFD96A 100%)',
            }} />
          </div>

          {aeoActions.recent.length > 0 ? (
            <div>
              {aeoActions.recent.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: i < aeoActions.recent.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{
                    width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
                    background: a.done ? 'rgba(74,222,128,0.07)' : 'transparent',
                    border: a.done ? 'none' : '1.5px solid rgba(255,255,255,0.08)',
                    color: a.done ? '#4ADE80' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9,
                  }}>
                    {a.done ? '✓' : ''}
                  </div>
                  <span style={{
                    fontSize: 12, flex: 1,
                    color: a.done ? 'rgba(220,230,244,0.65)' : 'rgba(220,230,244,0.4)',
                    textDecoration: a.done ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(220,230,244,0.2)',
                  }}>
                    {a.title}
                  </span>
                  <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, color: 'rgba(220,230,244,0.35)', flexShrink: 0 }}>
                    {a.date || '待執行'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.3)', textAlign: 'center', padding: '20px 0' }}>
              行動記錄載入中
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
