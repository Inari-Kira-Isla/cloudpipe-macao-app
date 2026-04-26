'use client'

import { useEffect, useState } from 'react'

interface QueryResult {
  query: string
  mentioned: boolean | null
  position: number | null
  competitor: string | null
}

interface TimelineEntry {
  date: string
  dayNumber: number
  queryResults: QueryResult[]
  mentionCount: number
  competitors: string[]
}

interface LifecycleData {
  brandSlug: string
  joinDate: string
  dayNumber: number
  totalDays: number
  queries: string[]
  gapAngles: string[]
  timeline: TimelineEntry[]
  todayEntry: TimelineEntry | null
  trend: 'up' | 'down' | 'flat'
  mentionSparkline: number[]
  recommendations: {
    priority: 'high' | 'medium'
    title: string
    description: string
    action: string
  }[]
}

const CP = {
  gold: '#F5C842',
  navy: '#08111F',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  muted: 'rgba(255,255,255,0.5)',
  faint: 'rgba(255,255,255,0.35)',
  green: '#4ADE80',
  red: '#F87171',
  amber: '#FBBF24',
}

function MiniSparkline({ data, color = CP.gold }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 60
  const h = 20
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h * 0.85 + 2).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) * step} cy={h - (data[data.length - 1] / max) * h * 0.85 + 2} r="2.5" fill={color} />
    </svg>
  )
}

function MentionCell({ mentioned, compact }: { mentioned: boolean | null; compact?: boolean }) {
  const size = compact ? 22 : 26
  if (mentioned === null) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: CP.faint,
      }}>–</div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: mentioned ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${mentioned ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.2)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12,
    }}>
      {mentioned ? '✓' : '✗'}
    </div>
  )
}

export default function BrandLifecycleTracker({ slug }: { slug: string }) {
  const [data, setData] = useState<LifecycleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/brand-lifecycle?slug=${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div style={{
        background: CP.glass, border: `1px solid ${CP.glassBorder}`,
        borderRadius: 18, padding: 20, color: CP.muted, fontSize: 13,
      }}>
        正在載入 AI 排名追蹤…
      </div>
    )
  }

  if (!data) return null

  const { dayNumber, totalDays, queries, timeline, todayEntry, trend, mentionSparkline, recommendations, gapAngles } = data
  const progressPct = (dayNumber / totalDays) * 100
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  const trendColor = trend === 'up' ? CP.green : trend === 'down' ? CP.red : CP.amber
  const todayMentionCount = todayEntry?.mentionCount ?? 0
  const displayedTimeline = expanded ? timeline : timeline.slice(-7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Header row: Day progress + trend + today stats ── */}
      <div style={{
        background: CP.glass,
        border: `1px solid ${CP.glassBorder}`,
        borderRadius: 18, padding: 20,
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 20, alignItems: 'center',
      }}>
        {/* Day progress */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              background: 'rgba(245,200,66,0.12)', border: `1px solid rgba(245,200,66,0.25)`,
              borderRadius: 8, padding: '3px 10px',
              fontSize: 12, fontWeight: 700, color: CP.gold,
            }}>
              Day {dayNumber}/{totalDays}
            </div>
            <div style={{ fontSize: 12, color: CP.muted }}>
              加入：{data.joinDate} · 目標 D14: {new Date(new Date(data.joinDate).getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${progressPct}%`,
              background: progressPct >= 100
                ? 'linear-gradient(90deg, #4ADE80, #22C55E)'
                : 'linear-gradient(90deg, #F5C842, #FFD866)',
              boxShadow: `0 0 8px ${progressPct >= 100 ? 'rgba(74,222,128,0.4)' : 'rgba(245,200,66,0.4)'}`,
              transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: CP.faint }}>D0 開始</span>
            <span style={{ fontSize: 10, color: CP.faint }}>D7 驗收</span>
            <span style={{ fontSize: 10, color: CP.faint }}>D14 結案</span>
          </div>
        </div>

        {/* Today mention rate */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: CP.muted, marginBottom: 4 }}>今日提及率</div>
          <div style={{
            fontSize: 28, fontWeight: 800, letterSpacing: -1,
            color: todayMentionCount > 0 ? CP.green : CP.red,
          }}>
            {todayMentionCount}/{queries.length}
          </div>
          <div style={{ fontSize: 10, color: CP.faint }}>查詢被提及</div>
        </div>

        {/* Trend */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: CP.muted, marginBottom: 6 }}>趨勢</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <MiniSparkline data={mentionSparkline.length > 1 ? mentionSparkline : [0, todayMentionCount]} />
            <div style={{ fontSize: 18, fontWeight: 700, color: trendColor }}>{trendIcon}</div>
          </div>
        </div>
      </div>

      {/* ── Daily timeline grid ── */}
      <div style={{
        background: CP.glass, border: `1px solid ${CP.glassBorder}`,
        borderRadius: 18, padding: 20, overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>每日搜尋記錄</div>
          {timeline.length > 7 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                fontSize: 12, color: CP.gold, background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', padding: 0,
              }}
            >
              {expanded ? '收起 ↑' : `顯示全部 ${timeline.length} 天 ↓`}
            </button>
          )}
        </div>

        {/* Query label column + date columns */}
        <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${displayedTimeline.length}, minmax(52px, 1fr))`, gap: 6, alignItems: 'center' }}>
          {/* Header row */}
          <div style={{ fontSize: 11, color: CP.faint, fontWeight: 600 }}>查詢 / 日期</div>
          {displayedTimeline.map(t => (
            <div key={t.date} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: CP.faint }}>{t.date.slice(5)}</div>
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: t.date === new Date().toISOString().slice(0, 10) ? CP.gold : CP.faint,
              }}>D{t.dayNumber}</div>
            </div>
          ))}

          {/* One row per query */}
          {queries.map((q, qi) => (
            <>
              <div key={`label-${qi}`} style={{
                fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                paddingRight: 8,
              }} title={q}>{q}</div>
              {displayedTimeline.map(t => (
                <div key={`${t.date}-${qi}`} style={{ display: 'flex', justifyContent: 'center' }}>
                  <MentionCell mentioned={t.queryResults[qi]?.mentioned ?? null} compact />
                </div>
              ))}
            </>
          ))}

          {/* Summary row */}
          <div style={{ fontSize: 11, color: CP.muted, fontWeight: 600, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>提及率</div>
          {displayedTimeline.map(t => (
            <div key={`sum-${t.date}`} style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: t.mentionCount > 0 ? CP.green : CP.red,
              }}>{t.mentionCount}/{queries.length}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: CP.faint }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MentionCell mentioned={true} compact /> 被 AI 提及
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MentionCell mentioned={false} compact /> 未提及
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MentionCell mentioned={null} compact /> 未測試
          </span>
        </div>
      </div>

      {/* ── Today's competitor intel ── */}
      {todayEntry && todayEntry.competitors.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 14, padding: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 10 }}>
            🔍 今日競品情報
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {todayEntry.queryResults.map((qr, i) => (
              qr.competitor && !qr.mentioned ? (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '8px 12px', fontSize: 12,
                }}>
                  <div style={{ color: CP.muted, marginBottom: 3 }}>{qr.query}</div>
                  <div style={{ color: '#F87171', fontWeight: 600 }}>→ {qr.competitor}</div>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* ── Gap angles to attack ── */}
      <div style={{
        background: 'rgba(245,200,66,0.04)', border: '1px solid rgba(245,200,66,0.15)',
        borderRadius: 14, padding: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: CP.gold, marginBottom: 10 }}>
          🎯 未佔領定位（今日旗艦文章攻擊目標）
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gapAngles.map((angle, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                background: 'rgba(245,200,66,0.15)', border: '1px solid rgba(245,200,66,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: CP.gold,
              }}>{i + 1}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{angle}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', padding: '0 2px' }}>
            💡 本週改善行動
          </div>
          {recommendations.map((rec, i) => (
            <div key={i} style={{
              background: CP.glass, border: `1px solid ${CP.glassBorder}`,
              borderLeft: `3px solid ${rec.priority === 'high' ? CP.gold : '#6366F1'}`,
              borderRadius: '0 12px 12px 0', padding: '12px 14px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{
                flexShrink: 0, width: 20, height: 20, borderRadius: 6,
                background: rec.priority === 'high' ? 'rgba(245,200,66,0.12)' : 'rgba(99,102,241,0.12)',
                border: `1px solid ${rec.priority === 'high' ? 'rgba(245,200,66,0.25)' : 'rgba(99,102,241,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                color: rec.priority === 'high' ? CP.gold : '#818CF8',
              }}>{rec.priority === 'high' ? 'P1' : 'P2'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{rec.title}</div>
                <div style={{ fontSize: 12, color: CP.muted, marginBottom: 4 }}>{rec.description}</div>
                <div style={{ fontSize: 11, color: CP.green }}>→ {rec.action}</div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
