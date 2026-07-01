import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Tier labels & colours ──────────────────────────────────────────────────
const TIER_META: Record<string, { label: string; color: string; bg: string }> = {
  layer0: { label: 'Layer 0  Public',   color: '#64748b', bg: '#f1f5f9' },
  layer1: { label: 'Layer 1  Beta Key', color: '#0284c7', bg: '#e0f2fe' },
  layer2: { label: 'Layer 2  Premium',  color: '#7c3aed', bg: '#ede9fe' },
}

const INTENT_META: Record<string, { label: string; color: string }> = {
  'for-rag':      { label: 'RAG / Grounding', color: '#0891b2' },
  'for-training': { label: 'AI Training',      color: '#7c3aed' },
  'for-research': { label: 'Research',          color: '#059669' },
}

// ── Types ──────────────────────────────────────────────────────────────────
interface EventRow {
  tier: string | null
  intent_route: string | null
  bot_name: string | null
  path: string
  response_ms: number | null
  status_code: number | null
  created_at: string
}

interface HourBucket {
  hour: string
  count: number
}

// ── Helpers ────────────────────────────────────────────────────────────────
function pct(n: number, total: number) {
  if (total === 0) return '—'
  return ((n / total) * 100).toFixed(1) + '%'
}

function avg(nums: (number | null)[]) {
  const valid = nums.filter((n): n is number => n !== null)
  if (!valid.length) return '—'
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) + ' ms'
}

// ── Server Component ───────────────────────────────────────────────────────
export default async function RouteScope() {
  const db = createServiceClient()

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: rows } = await db
    .from('api_events')
    .select('tier, intent_route, bot_name, path, response_ms, status_code, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000)

  const events: EventRow[] = rows ?? []
  const total = events.length

  // Tier distribution
  const tierCounts: Record<string, number> = {}
  for (const e of events) {
    const k = e.tier ?? 'unknown'
    tierCounts[k] = (tierCounts[k] ?? 0) + 1
  }

  // Intent route breakdown
  const intentCounts: Record<string, number> = {}
  for (const e of events) {
    const k = e.intent_route ?? 'direct'
    intentCounts[k] = (intentCounts[k] ?? 0) + 1
  }

  // Top paths
  const pathCounts: Record<string, number> = {}
  for (const e of events) {
    pathCounts[e.path] = (pathCounts[e.path] ?? 0) + 1
  }
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Bot vs human
  const botCount = events.filter(e => e.bot_name).length
  const humanCount = total - botCount

  // Top bots
  const botCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.bot_name) botCounts[e.bot_name] = (botCounts[e.bot_name] ?? 0) + 1
  }
  const topBots = Object.entries(botCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Avg response time
  const avgMs = avg(events.map(e => e.response_ms))

  // Error rate
  const errorCount = events.filter(e => e.status_code && e.status_code >= 400).length

  // Hourly buckets (last 24h)
  const hourMap: Record<string, number> = {}
  for (const e of events) {
    const h = e.created_at.slice(0, 13) // 'YYYY-MM-DDTHH'
    hourMap[h] = (hourMap[h] ?? 0) + 1
  }
  const now = new Date()
  const hourBuckets: HourBucket[] = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getTime() - (23 - i) * 3600 * 1000)
    const h = d.toISOString().slice(0, 13)
    return { hour: h.slice(11) + ':00', count: hourMap[h] ?? 0 }
  })
  const maxHourCount = Math.max(...hourBuckets.map(b => b.count), 1)

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    page:    { background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#0f172a' },
    header:  { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 12 },
    logo:    { width: 28, height: 28, background: '#0f172a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D4FF', fontSize: 14, fontWeight: 700 },
    title:   { fontSize: 18, fontWeight: 700, color: '#0f172a' },
    sub:     { fontSize: 12, color: '#64748b', marginTop: 2 },
    body:    { padding: '28px 32px', maxWidth: 1200 },
    grid4:   { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 },
    grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
    grid3:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 },
    card:    { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px' },
    kpi:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' },
    kpiVal:  { fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 },
    kpiLbl:  { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' as const, fontWeight: 600, marginTop: 6, letterSpacing: '0.05em' },
    section: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, color: '#64748b', letterSpacing: '0.06em', marginBottom: 14 },
    badge:   (color: string, bg: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color, background: bg }),
    bar:     (pctVal: number, color: string) => ({
      height: 6, borderRadius: 3,
      background: `linear-gradient(to right, ${color} ${pctVal}%, #f1f5f9 ${pctVal}%)`,
      marginTop: 6,
    }),
    row:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' },
    rowLast: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' },
    mono:    { fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 12 },
    hBar:    (h: number) => ({
      display: 'inline-block', width: 20, background: '#0ea5e9', borderRadius: '2px 2px 0 0',
      height: `${Math.max(h, 2)}px`, verticalAlign: 'bottom',
    }),
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logo}>RS</div>
        <div>
          <div style={S.title}>RouteScope</div>
          <div style={S.sub}>API 分流監測 · 最近 24 小時 · {total} 次請求</div>
        </div>
      </div>

      <div style={S.body}>
        {/* KPI row */}
        <div style={S.grid4}>
          <div style={S.kpi}>
            <div style={S.kpiVal}>{total.toLocaleString()}</div>
            <div style={S.kpiLbl}>Total Calls (24h)</div>
          </div>
          <div style={S.kpi}>
            <div style={S.kpiVal}>{avgMs}</div>
            <div style={S.kpiLbl}>Avg Response</div>
          </div>
          <div style={S.kpi}>
            <div style={S.kpiVal}>{total > 0 ? pct(errorCount, total) : '—'}</div>
            <div style={S.kpiLbl}>Error Rate (4xx/5xx)</div>
          </div>
          <div style={S.kpi}>
            <div style={S.kpiVal}>{pct(botCount, total)}</div>
            <div style={S.kpiLbl}>Bot Traffic</div>
          </div>
        </div>

        {/* Tier + Intent */}
        <div style={S.grid2}>
          {/* Tier distribution */}
          <div style={S.card}>
            <div style={S.section}>Tier 分流</div>
            {['layer0', 'layer1', 'layer2'].map((tier, i, arr) => {
              const count = tierCounts[tier] ?? 0
              const m = TIER_META[tier]
              const p = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={tier} style={i === arr.length - 1 ? S.rowLast : S.row}>
                  <div>
                    <span style={S.badge(m.color, m.bg)}>{m.label}</span>
                    <div style={{ ...S.bar(p, m.color) }} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{count.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{pct(count, total)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Intent route breakdown */}
          <div style={S.card}>
            <div style={S.section}>Intent 路由</div>
            {(['for-rag', 'for-training', 'for-research', 'direct'] as const).map((key, i, arr) => {
              const count = intentCounts[key] ?? 0
              const m = INTENT_META[key] ?? { label: 'Direct (no referer)', color: '#94a3b8' }
              const p = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={key} style={i === arr.length - 1 ? S.rowLast : S.row}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: m.color }}>{m.label}</span>
                    <div style={{ ...S.bar(p, m.color) }} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{count.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{pct(count, total)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hourly trend */}
        <div style={{ ...S.card, marginBottom: 24 }}>
          <div style={S.section}>Hourly Trend (last 24h)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, overflowX: 'auto' }}>
            {hourBuckets.map(b => (
              <div key={b.hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                <span style={{ fontSize: 9, color: '#94a3b8' }}>{b.count || ''}</span>
                <div style={S.hBar(Math.round((b.count / maxHourCount) * 60))} />
                <span style={{ fontSize: 9, color: '#94a3b8', transform: 'rotate(-45deg)', display: 'block', width: 20 }}>{b.hour.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={S.grid2}>
          {/* Top paths */}
          <div style={S.card}>
            <div style={S.section}>Top Endpoints</div>
            {topPaths.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No data yet</div>
            )}
            {topPaths.map(([path, count], i) => (
              <div key={path} style={i === topPaths.length - 1 ? S.rowLast : S.row}>
                <div style={{ ...S.mono, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>{path}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', flexShrink: 0, marginLeft: 8 }}>{count.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Top bots */}
          <div style={S.card}>
            <div style={S.section}>Bot 來源</div>
            <div style={{ ...S.row }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Human</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{humanCount.toLocaleString()} <span style={{ fontSize: 11, color: '#94a3b8' }}>({pct(humanCount, total)})</span></span>
            </div>
            {topBots.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>No bot traffic yet</div>
            )}
            {topBots.map(([name, count], i) => (
              <div key={name} style={i === topBots.length - 1 ? S.rowLast : S.row}>
                <span style={{ fontSize: 13, color: '#334155' }}>{name}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{count.toLocaleString()} <span style={{ fontSize: 11, color: '#94a3b8' }}>({pct(count, total)})</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent events table */}
        <div style={S.card}>
          <div style={S.section}>Recent Events</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Time', 'Path', 'Tier', 'Intent', 'Bot', 'Status', 'ms'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 50).map((e, i) => {
                  const tier = e.tier ?? 'unknown'
                  const m = TIER_META[tier] ?? { color: '#94a3b8', bg: '#f8fafc', label: tier }
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '5px 10px', color: '#94a3b8', ...S.mono }}>{e.created_at.slice(11, 19)}</td>
                      <td style={{ padding: '5px 10px', ...S.mono, color: '#334155', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.path}</td>
                      <td style={{ padding: '5px 10px' }}><span style={S.badge(m.color, m.bg)}>{tier}</span></td>
                      <td style={{ padding: '5px 10px', color: '#64748b' }}>{e.intent_route ?? '—'}</td>
                      <td style={{ padding: '5px 10px', color: '#64748b' }}>{e.bot_name ?? '—'}</td>
                      <td style={{ padding: '5px 10px', color: e.status_code && e.status_code >= 400 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{e.status_code}</td>
                      <td style={{ padding: '5px 10px', ...S.mono, color: '#64748b' }}>{e.response_ms ?? '—'}</td>
                    </tr>
                  )
                })}
                {events.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '24px 10px', color: '#94a3b8', textAlign: 'center' }}>No events in the last 24 hours yet. Make some API calls to see data here.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          RouteScope · CloudPipe · Refresh to update · Data window: last 24h · Max 5,000 rows
        </div>
      </div>
    </div>
  )
}
