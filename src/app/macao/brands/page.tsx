'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const PASSWORD = 'cloudpipe2026'
const BASE = '/macao/brand'
const APP_URL = 'https://cloudpipe-macao-app.vercel.app'

// ── Design tokens (same as brand detail page) ─────────────────────────────────
const CP = {
  gold: '#F5C842',
  goldGlow: 'rgba(245,200,66,0.35)',
  goldDim: 'rgba(245,200,66,0.15)',
  navy: '#08111F',
  navyLight: '#0D1B2E',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassBorderHover: 'rgba(255,255,255,0.16)',
  muted: 'rgba(255,255,255,0.5)',
  faint: 'rgba(255,255,255,0.35)',
  green: '#4ADE80',
  greenBg: 'rgba(74,222,128,0.08)',
  greenBorder: 'rgba(74,222,128,0.2)',
  red: '#F87171',
  redBg: 'rgba(248,113,113,0.08)',
  redBorder: 'rgba(248,113,113,0.2)',
  blue: '#60A5FA',
  blueBg: 'rgba(96,165,250,0.08)',
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface QueryStatus { query: string; mentioned: boolean | null; competitor: string | null }
interface PlatformStatus { platform: string; cited: number; total: number }
interface LatestInsight { slug: string; title: string; published_at: string }
interface BrandSummary {
  slug: string
  displayName: string
  displayNameEn: string
  emoji: string
  tag: string
  industry: string
  brandUrl: string
  joinDate: string
  dayNumber: number
  totalDays: number
  mentionCount: number
  totalQueries: number
  trend: 'up' | 'down' | 'flat'
  competitors: string[]
  queryStatus: QueryStatus[]
  platformStatus: PlatformStatus[]
  encCited: number
  encTotal: number
  gapAngles: string[]
  latestDate: string | null
  latestInsight: LatestInsight | null
  hasData: boolean
}
interface OverallStats {
  totalBrands: number
  totalMentions: number
  totalQueries: number
  overallMentionRate: number
  updatedAt: string
}

// ── Optimization Types ────────────────────────────────────────────────────────
interface EngineActivity {
  engine: string
  visits_1d: number
  visits_7d: number
  visits_30d: number
  trend: string
  priority_score: number
}
interface ActionRec {
  action_type: string
  engine_driver: string
  reason: string
  score: number
  citation_gap: string | null
}
interface CrawlerAnalysis {
  engine_activities: EngineActivity[]
  engine_rules: Record<string, { label: string; tip: string; color: string; priority: number; actions: string[] }>
  brand_recommendations: Record<string, ActionRec[]>
  active_brand_count: number
}

// ── Sprint Types ──────────────────────────────────────────────────────────────
interface SprintAction {
  day: number
  date: string
  brand_slug: string
  action_type: string
  status: string
  insight_slug: string | null
  milestone: string | null
  trust_score: number | null
  faq_count: number | null
}
interface SprintTodayAction {
  day: number
  date: string
  brand_slug: string
  action_type: string
  title_zh: string
  title_en: string
  status: string
  milestone: string | null
  notes: string
}
interface SprintBrandInfo {
  mode: string
  weight_pct: number
  name_zh: string
}
interface SprintStatus {
  sprint_id: string
  current_day: number
  total_days: number
  today_action: SprintTodayAction | null
  actions: SprintAction[]
  brands: { [slug: string]: SprintBrandInfo }
  milestone_results: { [milestone: string]: boolean | null }
  stop_loss_triggered: boolean
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function trendIcon(trend: string) {
  if (trend === 'up') return { icon: '↑', color: CP.green }
  if (trend === 'down') return { icon: '↓', color: CP.red }
  return { icon: '→', color: CP.muted }
}

function dayColor(day: number, total: number) {
  const pct = day / total
  if (pct >= 0.85) return '#F5C842'
  if (pct >= 0.5) return '#60A5FA'
  return '#A78BFA'
}

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === PASSWORD) onAuth()
    else { setErr(true); setPw('') }
  }

  return (
    <main style={{ minHeight: '100vh', background: CP.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className="cp-aurora-blob cp-aurora-a" />
      <div className="cp-aurora-blob cp-aurora-b" />
      <div className="cp-aurora-blob cp-aurora-c" />
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 400, padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>CloudPipe 品牌管理中心</h1>
        <p style={{ color: CP.muted, fontSize: 14, marginBottom: 32 }}>5 個品牌 · 14 日 AI 能見度生命週期</p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="輸入密碼"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(false) }}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: `1px solid ${err ? CP.red : CP.glassBorder}`,
              background: CP.glass,
              color: '#fff',
              fontSize: 16,
              outline: 'none',
              backdropFilter: 'blur(12px)',
            }}
            autoFocus
          />
          {err && <p style={{ color: CP.red, fontSize: 13, margin: 0 }}>密碼錯誤，請重試</p>}
          <button type="submit" style={{
            padding: '12px 24px',
            borderRadius: 12,
            border: 'none',
            background: CP.gold,
            color: CP.navy,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}>
            進入儀表板
          </button>
        </form>
      </div>
    </main>
  )
}

// ── Brand Card ────────────────────────────────────────────────────────────────
function BrandCard({ brand, expanded, onToggle }: {
  brand: BrandSummary
  expanded: boolean
  onToggle: () => void
}) {
  const { icon: tIcon, color: tColor } = trendIcon(brand.trend)
  const progressPct = Math.round((brand.dayNumber / brand.totalDays) * 100)
  const dColor = dayColor(brand.dayNumber, brand.totalDays)
  const mentionRate = brand.totalQueries > 0
    ? Math.round((brand.mentionCount / brand.totalQueries) * 100)
    : 0

  return (
    <div
      style={{
        background: CP.glass,
        border: `1px solid ${CP.glassBorder}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 20,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = CP.glassBorderHover
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 32px ${CP.goldGlow}`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = CP.glassBorder
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
      onClick={onToggle}
    >
      {/* Top shine */}
      <div style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, fontSize: 22,
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${CP.glassBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {brand.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{brand.displayName}</span>
            <span style={{ fontSize: 11, color: CP.muted, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 8 }}>
              {brand.tag}
            </span>
          </div>
          <div style={{ color: CP.faint, fontSize: 13, marginTop: 2 }}>{brand.displayNameEn}</div>
        </div>
        {/* Trend badge */}
        <div style={{ fontSize: 18, color: tColor, fontWeight: 700, flexShrink: 0 }}>{tIcon}</div>
      </div>

      {/* Day progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: CP.muted, fontSize: 12 }}>14 日計劃進度</span>
          <span style={{ color: dColor, fontSize: 12, fontWeight: 600 }}>Day {brand.dayNumber}/{brand.totalDays}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${dColor}, ${dColor}cc)`,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Key metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Mention rate */}
        <div style={{
          padding: '10px 12px', borderRadius: 12,
          background: mentionRate > 0 ? CP.greenBg : CP.glass,
          border: `1px solid ${mentionRate > 0 ? CP.greenBorder : CP.glassBorder}`,
        }}>
          <div style={{ color: CP.muted, fontSize: 11, marginBottom: 2 }}>今日提及率</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ color: mentionRate > 0 ? CP.green : CP.red, fontWeight: 700, fontSize: 20 }}>
              {brand.mentionCount}
            </span>
            <span style={{ color: CP.muted, fontSize: 13 }}>/ {brand.totalQueries}</span>
          </div>
          <div style={{ color: CP.muted, fontSize: 11, marginTop: 1 }}>
            {mentionRate > 0 ? `${mentionRate}% 查詢被提及` : '尚未出現在搜尋結果'}
          </div>
        </div>

        {/* Latest insight */}
        <div style={{
          padding: '10px 12px', borderRadius: 12,
          background: brand.latestInsight ? CP.blueBg : CP.glass,
          border: `1px solid ${brand.latestInsight ? 'rgba(96,165,250,0.2)' : CP.glassBorder}`,
        }}>
          <div style={{ color: CP.muted, fontSize: 11, marginBottom: 2 }}>最新旗艦文章</div>
          {brand.latestInsight ? (
            <>
              <div style={{ color: CP.blue, fontWeight: 600, fontSize: 13, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {brand.latestInsight.title}
              </div>
              <div style={{ color: CP.muted, fontSize: 11, marginTop: 2 }}>
                {brand.latestInsight.published_at.slice(0, 10)}
              </div>
            </>
          ) : (
            <div style={{ color: CP.muted, fontSize: 13 }}>今日待生成</div>
          )}
        </div>
      </div>

      {/* Query status dots */}
      {brand.hasData && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {brand.queryStatus.map((q, i) => (
            <div key={i} title={q.mentioned === null ? q.query : `${q.query} ${q.mentioned ? '✓' : `✗ ${q.competitor || ''}`}`}
              style={{
                flex: 1, minWidth: 0, padding: '4px 8px', borderRadius: 8, fontSize: 11,
                background: q.mentioned === true ? CP.greenBg : q.mentioned === false ? CP.redBg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${q.mentioned === true ? CP.greenBorder : q.mentioned === false ? CP.redBorder : CP.glassBorder}`,
                color: q.mentioned === true ? CP.green : q.mentioned === false ? CP.red : CP.muted,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
              {q.mentioned === true ? '✓' : q.mentioned === false ? '✗' : '—'} {q.query.slice(0, 8)}…
            </div>
          ))}
        </div>
      )}

      {/* Expanded section: platform breakdown + gap angles */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${CP.glassBorder}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Per-platform breakdown */}
          {brand.platformStatus && brand.platformStatus.length > 0 && (
            <div>
              <div style={{ color: CP.gold, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>各平台引用率</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {brand.platformStatus.map(p => {
                  const rate = p.total > 0 ? Math.round((p.cited / p.total) * 100) : 0
                  const color = rate > 0 ? CP.green : CP.muted
                  return (
                    <div key={p.platform} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', borderRadius: 8, background: rate > 0 ? CP.greenBg : 'rgba(255,255,255,0.03)', border: `1px solid ${rate > 0 ? CP.greenBorder : CP.glassBorder}` }}>
                      <span style={{ color: CP.muted, fontSize: 11, textTransform: 'capitalize' }}>{p.platform}</span>
                      <span style={{ color, fontSize: 12, fontWeight: 700 }}>{rate > 0 ? `${p.cited}/${p.total}` : '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* Encyclopedia citation */}
          {brand.encTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: brand.encCited > 0 ? CP.blueBg : 'rgba(255,255,255,0.03)', border: `1px solid ${brand.encCited > 0 ? 'rgba(96,165,250,0.2)' : CP.glassBorder}` }}>
              <span style={{ color: CP.muted, fontSize: 12 }}>百科引用率</span>
              <span style={{ color: brand.encCited > 0 ? CP.blue : CP.muted, fontSize: 12, fontWeight: 700 }}>
                {brand.encCited > 0 ? `${brand.encCited}/${brand.encTotal}` : '尚未引用'}
              </span>
            </div>
          )}
          {/* Gap angles */}
          <div>
            <div style={{ color: CP.faint, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>今日攻佔角度</div>
            {brand.gapAngles.slice(0, 2).map((angle, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                <span style={{ color: CP.gold, fontSize: 11, flexShrink: 0, marginTop: 1 }}>#{i + 1}</span>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 1.4 }}>{angle}</span>
              </div>
            ))}
          </div>
          {brand.latestDate && (
            <div style={{ color: CP.muted, fontSize: 11 }}>最後巡檢：{brand.latestDate}</div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }} onClick={e => e.stopPropagation()}>
        <Link href={`${BASE}/${brand.slug}`} style={{
          flex: 1, textAlign: 'center',
          padding: '9px 0',
          borderRadius: 10,
          background: CP.goldDim,
          border: `1px solid ${CP.gold}44`,
          color: CP.gold,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,200,66,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = CP.goldDim)}
        >
          詳細資料 →
        </Link>
        <a href={brand.brandUrl} target="_blank" rel="noopener noreferrer" style={{
          padding: '9px 14px',
          borderRadius: 10,
          background: CP.glass,
          border: `1px solid ${CP.glassBorder}`,
          color: CP.muted,
          fontSize: 13,
          textDecoration: 'none',
          transition: 'border-color 0.2s',
          whiteSpace: 'nowrap',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = CP.glassBorderHover)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = CP.glassBorder)}
        >
          品牌站 ↗
        </a>
      </div>
    </div>
  )
}

// ── Overall Stats Bar ─────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: OverallStats }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12,
      marginBottom: 32,
    }}>
      {[
        { label: '管理品牌數', value: stats.totalBrands, unit: '個', color: CP.gold },
        { label: '今日搜尋提及', value: stats.totalMentions, unit: '次', color: CP.green },
        { label: '監測查詢詞', value: stats.totalQueries, unit: '個', color: CP.blue },
        { label: '整體提及率', value: `${stats.overallMentionRate}%`, unit: '', color: stats.overallMentionRate > 30 ? CP.green : stats.overallMentionRate > 0 ? CP.gold : CP.muted },
      ].map((s, i) => (
        <div key={i} style={{
          background: CP.glass,
          border: `1px solid ${CP.glassBorder}`,
          backdropFilter: 'blur(12px)',
          borderRadius: 14,
          padding: '14px 16px',
          textAlign: 'center',
        }}>
          <div style={{ color: s.color, fontWeight: 700, fontSize: 24 }}>{s.value}{s.unit}</div>
          <div style={{ color: CP.muted, fontSize: 12, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Sprint Tracker ────────────────────────────────────────────────────────────
function SprintTracker() {
  const [data, setData] = useState<SprintStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/sprint-status', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: CP.muted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        載入 Sprint 數據中…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 20, background: CP.redBg, border: `1px solid ${CP.redBorder}`, borderRadius: 12, color: CP.red }}>
        載入失敗：{error}
      </div>
    )
  }

  if (!data) return null

  const { current_day, total_days, today_action, actions, brands, milestone_results, stop_loss_triggered } = data

  // Build day-dot array
  const dayDots: Array<{ day: number; status: string; milestone: string | null }> = []
  for (let d = 1; d <= total_days; d++) {
    const action = actions.find(a => a.day === d)
    const status = action ? action.status : d < current_day ? 'completed' : d === current_day ? 'in_progress' : 'pending'
    const milestone = action ? action.milestone : null
    dayDots.push({ day: d, status, milestone })
  }

  function dotEmoji(status: string) {
    if (status === 'completed') return '✅'
    if (status === 'in_progress') return '🟡'
    return '⬜'
  }

  function milestoneColor(result: boolean | null) {
    if (result === true) return CP.green
    if (result === false) return CP.red
    return CP.muted
  }

  function milestoneLabel(result: boolean | null) {
    if (result === true) return '✅ Pass'
    if (result === false) return '❌ Fail'
    return '⬜ Not Yet'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stop-loss warning */}
      {stop_loss_triggered && (
        <div style={{
          padding: '14px 18px',
          background: CP.redBg,
          border: `1px solid ${CP.redBorder}`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ color: CP.red, fontWeight: 700, fontSize: 15 }}>Stop-Loss 已觸發</div>
            <div style={{ color: CP.red, fontSize: 13, opacity: 0.8, marginTop: 2 }}>Sprint 提前終止，請檢查各品牌 AEO 表現</div>
          </div>
        </div>
      )}

      {/* Day progress header */}
      <div style={{
        background: CP.glass,
        border: `1px solid ${CP.glassBorder}`,
        borderRadius: 16,
        padding: 20,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>21 日 Sprint 進度</div>
            <div style={{ color: CP.muted, fontSize: 13, marginTop: 2 }}>Day {current_day} / {total_days}</div>
          </div>
          <div style={{
            background: CP.goldDim,
            border: `1px solid ${CP.gold}44`,
            borderRadius: 10,
            padding: '8px 16px',
            color: CP.gold,
            fontWeight: 700,
            fontSize: 20,
          }}>
            {Math.round((current_day / total_days) * 100)}%
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{
            height: '100%',
            width: `${Math.round((current_day / total_days) * 100)}%`,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${CP.gold}, ${CP.gold}cc)`,
            transition: 'width 0.6s ease',
          }} />
        </div>

        {/* Day dots */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {dayDots.map(dot => (
            <div
              key={dot.day}
              title={`Day ${dot.day}${dot.milestone ? ` · ${dot.milestone}` : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                cursor: 'default',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{dotEmoji(dot.status)}</span>
              {dot.milestone && (
                <span style={{ fontSize: 8, color: CP.gold, fontWeight: 700, lineHeight: 1 }}>{dot.milestone}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Today's action card */}
      {today_action && (
        <div style={{
          background: CP.glass,
          border: `1px solid ${CP.gold}44`,
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ color: CP.gold, fontWeight: 700, fontSize: 14 }}>今日任務</span>
            {today_action.milestone && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: CP.navy,
                background: CP.gold,
                padding: '2px 8px',
                borderRadius: 6,
              }}>
                {today_action.milestone}
              </span>
            )}
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 6, lineHeight: 1.3 }}>
            {today_action.title_zh}
          </div>
          <div style={{ color: CP.muted, fontSize: 13, marginBottom: 12 }}>{today_action.title_en}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${CP.glassBorder}`,
              color: CP.muted,
            }}>
              {today_action.brand_slug}
            </span>
            <span style={{
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 8,
              background: CP.blueBg,
              border: `1px solid rgba(96,165,250,0.2)`,
              color: CP.blue,
            }}>
              {today_action.action_type}
            </span>
            <span style={{
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 8,
              background: today_action.status === 'completed' ? CP.greenBg : today_action.status === 'in_progress' ? CP.blueBg : 'rgba(255,255,255,0.04)',
              border: `1px solid ${today_action.status === 'completed' ? CP.greenBorder : today_action.status === 'in_progress' ? 'rgba(96,165,250,0.2)' : CP.glassBorder}`,
              color: today_action.status === 'completed' ? CP.green : today_action.status === 'in_progress' ? CP.blue : CP.muted,
            }}>
              {today_action.status}
            </span>
          </div>
          {today_action.notes && (
            <div style={{ marginTop: 12, color: CP.faint, fontSize: 12, lineHeight: 1.5, borderTop: `1px solid ${CP.glassBorder}`, paddingTop: 12 }}>
              {today_action.notes}
            </div>
          )}
        </div>
      )}

      {/* Two-column: brand table + milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* 5-brand allocation table */}
        <div style={{
          background: CP.glass,
          border: `1px solid ${CP.glassBorder}`,
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ color: CP.gold, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>品牌分配</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(brands).map(([slug, info]) => (
              <div key={slug} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${CP.glassBorder}`,
              }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{info.name_zh}</div>
                  <div style={{ color: CP.muted, fontSize: 11, marginTop: 1 }}>{slug}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: info.mode === 'active' ? CP.greenBg : CP.blueBg,
                    border: `1px solid ${info.mode === 'active' ? CP.greenBorder : 'rgba(96,165,250,0.2)'}`,
                    color: info.mode === 'active' ? CP.green : CP.blue,
                  }}>
                    {info.mode === 'active' ? '🟢 active' : '🔵 maintenance'}
                  </span>
                  <span style={{ color: CP.gold, fontWeight: 700, fontSize: 13 }}>{info.weight_pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone status */}
        <div style={{
          background: CP.glass,
          border: `1px solid ${CP.glassBorder}`,
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ color: CP.gold, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>里程碑狀態</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['D7', 'D14', 'D21'].map(ms => {
              const result = milestone_results[ms] ?? null
              return (
                <div key={ms} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: result === true ? CP.greenBg : result === false ? CP.redBg : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${result === true ? CP.greenBorder : result === false ? CP.redBorder : CP.glassBorder}`,
                }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{ms}</div>
                    <div style={{ color: CP.muted, fontSize: 11, marginTop: 1 }}>
                      {ms === 'D7' ? 'Day 7 評估' : ms === 'D14' ? 'Day 14 中期' : 'Day 21 終評'}
                    </div>
                  </div>
                  <span style={{ color: milestoneColor(result), fontWeight: 700, fontSize: 13 }}>
                    {milestoneLabel(result)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Engine color map ─────────────────────────────────────────────────────────
const ENGINE_COLORS: Record<string, string> = {
  anthropic: '#F5A623',
  perplexity: '#4ADE80',
  openai: '#60A5FA',
  google: '#F87171',
  yandex: '#A78BFA',
}

const ENGINE_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  perplexity: 'Perplexity',
  openai: 'OpenAI',
  google: 'Google',
  yandex: 'Yandex',
}

const ACTION_LABELS: Record<string, string> = {
  insight_flagship: '旗艦文章',
  insight_en: '英文 Insight',
  insight_comparison: '比較文章',
  insight_seasonal: '季節性文章',
  insight_restaurant: '餐廳 Insight',
  insight_logistics: '物流 Insight',
  schema_faqpage: 'FAQPage Schema',
  faq_deepened: 'FAQ 深化',
  faq_brand: '品牌 FAQ',
  llms_txt: 'llms.txt 更新',
}

// ── Optimization Panel ────────────────────────────────────────────────────────
function OptimizationPanel() {
  const [data, setData] = useState<CrawlerAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/crawler-analysis', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: CP.muted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        載入引擎分析中…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 20, background: CP.redBg, border: `1px solid ${CP.redBorder}`, borderRadius: 12, color: CP.red }}>
        載入失敗：{error}
      </div>
    )
  }

  if (!data) return null

  const { engine_activities, brand_recommendations } = data

  // Compute max for bar scaling
  const maxVisits7d = Math.max(...engine_activities.map(e => e.visits_7d), 1)

  function trendArrow(trend: string) {
    if (trend === 'rising') return { arrow: '↑', color: CP.green }
    if (trend === 'declining') return { arrow: '↓', color: CP.red }
    return { arrow: '→', color: CP.muted }
  }

  const brandSlugs = Object.keys(brand_recommendations)

  const BRAND_DISPLAY: Record<string, { emoji: string; name: string }> = {
    'inari-global-foods': { emoji: '🦔', name: '稻荷全球食品' },
    'sea-urchin-delivery': { emoji: '🌊', name: '海膽速遞' },
    'cloudpipe': { emoji: '⚡', name: 'CloudPipe' },
    'mind-cafe': { emoji: '☕', name: 'Mind Cafe' },
    'after-school-coffee': { emoji: '🎓', name: 'After School Coffee' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Section A: Engine Activity */}
      <div style={{
        background: CP.glass,
        border: `1px solid ${CP.glassBorder}`,
        borderRadius: 20,
        padding: 24,
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>AI 引擎活躍度</div>
            <div style={{ color: CP.muted, fontSize: 12, marginTop: 2 }}>基於 7 日爬蟲訪問量排序 · 越高優先度越高</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {engine_activities.map((eng, idx) => {
            const color = ENGINE_COLORS[eng.engine] || '#fff'
            const label = ENGINE_LABELS[eng.engine] || eng.engine
            const { arrow, color: arrowColor } = trendArrow(eng.trend)
            const barPct = Math.round((eng.visits_7d / maxVisits7d) * 100)
            const isTop = idx === 0

            return (
              <div key={eng.engine} style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: isTop ? `rgba(${color === '#F5A623' ? '245,166,35' : '255,255,255'},0.06)` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isTop ? color + '44' : CP.glassBorder}`,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Rank badge */}
                <div style={{
                  position: 'absolute', top: 10, right: 12,
                  fontSize: 11, fontWeight: 700,
                  color: isTop ? color : CP.muted,
                  background: isTop ? color + '22' : 'rgba(255,255,255,0.05)',
                  padding: '2px 8px', borderRadius: 8,
                  border: `1px solid ${isTop ? color + '33' : CP.glassBorder}`,
                }}>
                  #{idx + 1}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}88` }} />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{label}</span>
                  <span style={{ color: arrowColor, fontWeight: 700, fontSize: 16 }}>{arrow}</span>
                </div>

                {/* Bar chart */}
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{
                    height: '100%',
                    width: `${barPct}%`,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${color}, ${color}88)`,
                    transition: 'width 0.8s ease',
                  }} />
                </div>

                {/* Metrics row */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: '1日', value: eng.visits_1d.toLocaleString() },
                    { label: '7日', value: eng.visits_7d.toLocaleString() },
                    { label: '30日', value: eng.visits_30d.toLocaleString() },
                    { label: '優先分', value: eng.priority_score.toLocaleString() },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ color: CP.muted, fontSize: 11 }}>{m.label}</div>
                      <div style={{ color: color, fontWeight: 700, fontSize: 14 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section B: Brand Recommendations */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>🎯</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>品牌行動建議</div>
            <div style={{ color: CP.muted, fontSize: 12, marginTop: 2 }}>根據引擎爬蟲活躍度計算的最優行動組合</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {brandSlugs.map(slug => {
            const recs = brand_recommendations[slug] || []
            const display = BRAND_DISPLAY[slug] || { emoji: '🏷️', name: slug }

            return (
              <div key={slug} style={{
                background: CP.glass,
                border: `1px solid ${CP.glassBorder}`,
                borderRadius: 18,
                padding: 20,
                backdropFilter: 'blur(16px)',
              }}>
                {/* Brand header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, fontSize: 18,
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${CP.glassBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {display.emoji}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{display.name}</div>
                    <div style={{ color: CP.muted, fontSize: 11, marginTop: 1 }}>{slug}</div>
                  </div>
                </div>

                {/* Action recommendations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recs.length === 0 ? (
                    <div style={{ color: CP.muted, fontSize: 13, textAlign: 'center', padding: '12px 0' }}>無建議資料</div>
                  ) : recs.map((rec, i) => {
                    const engColor = ENGINE_COLORS[rec.engine_driver] || CP.muted
                    const actionLabel = ACTION_LABELS[rec.action_type] || rec.action_type

                    return (
                      <div key={rec.action_type} style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: i === 0 ? 'rgba(245,200,66,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${i === 0 ? CP.gold + '33' : CP.glassBorder}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: i === 0 ? CP.gold : CP.muted,
                            background: i === 0 ? CP.goldDim : 'rgba(255,255,255,0.05)',
                            padding: '1px 6px', borderRadius: 6,
                            border: `1px solid ${i === 0 ? CP.gold + '33' : CP.glassBorder}`,
                            flexShrink: 0,
                          }}>
                            P{i + 1}
                          </span>
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{actionLabel}</span>
                          {/* Engine badge */}
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: 10,
                            fontWeight: 700,
                            color: engColor,
                            background: engColor + '18',
                            padding: '1px 7px',
                            borderRadius: 6,
                            border: `1px solid ${engColor}33`,
                            flexShrink: 0,
                          }}>
                            {ENGINE_LABELS[rec.engine_driver] || rec.engine_driver}
                          </span>
                        </div>
                        <div style={{ color: CP.muted, fontSize: 11, lineHeight: 1.4 }}>{rec.reason}</div>
                        {rec.citation_gap && (
                          <div style={{ marginTop: 4, color: CP.red, fontSize: 11 }}>⚠ {rec.citation_gap}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer note */}
      <div style={{
        padding: '14px 18px',
        background: CP.glass,
        border: `1px solid ${CP.glassBorder}`,
        borderRadius: 12,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <div style={{ color: CP.muted, fontSize: 12, lineHeight: 1.5 }}>
          建議基於 256,354 條真實爬蟲訪問數據（2026-05-16）+ AI_ENGINE_STANDARDS。每 5 分鐘自動刷新。
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function Dashboard() {
  const [brands, setBrands] = useState<BrandSummary[]>([])
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'brands' | 'sprint' | 'optimize'>('brands')

  useEffect(() => {
    fetch('/api/v1/brands-summary')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setBrands(d.brands)
        setStats(d.stats)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const updatedAt = stats ? new Date(stats.updatedAt).toLocaleString('zh-HK', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : ''

  return (
    <main style={{ minHeight: '100vh', background: CP.navy, color: '#fff', position: 'relative', overflow: 'hidden' }}>
      {/* Aurora background */}
      <div className="cp-aurora-blob cp-aurora-a" />
      <div className="cp-aurora-blob cp-aurora-b" />
      <div className="cp-aurora-blob cp-aurora-c" />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1100, margin: '0 auto', padding: '32px 20px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 28 }}>⚡</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>CloudPipe 品牌管理中心</h1>
            <span style={{ fontSize: 12, color: CP.muted, background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 20, border: `1px solid ${CP.glassBorder}` }}>
              BETA
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ color: CP.muted, fontSize: 14, margin: 0 }}>
              5 個品牌 · 14 日 AI 能見度生命週期 · 每日自動巡檢
            </p>
            {updatedAt && (
              <span style={{ color: CP.faint, fontSize: 12 }}>更新於 {updatedAt}</span>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {stats && <StatsBar stats={stats} />}

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          gap: 0,
          borderBottom: `1px solid ${CP.glassBorder}`,
          marginBottom: 28,
        }}>
          {([
            { key: 'brands', label: '品牌 AEO' },
            { key: 'sprint', label: 'Sprint 進度' },
            { key: 'optimize', label: '⚡ 優化建議' },
          ] as const).map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${CP.gold}` : '2px solid transparent',
                  color: isActive ? CP.gold : CP.muted,
                  fontWeight: isActive ? 700 : 400,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Sprint tab */}
        {activeTab === 'sprint' && <SprintTracker />}

        {/* Optimize tab */}
        {activeTab === 'optimize' && <OptimizationPanel />}

        {/* Brands tab */}
        {activeTab === 'brands' && (
          <>
            {/* Loading / Error */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: CP.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                載入品牌數據中…
              </div>
            )}
            {error && (
              <div style={{ padding: '20px', background: CP.redBg, border: `1px solid ${CP.redBorder}`, borderRadius: 12, color: CP.red, marginBottom: 24 }}>
                載入失敗：{error}
              </div>
            )}

            {/* Brand grid */}
            {!loading && brands.length > 0 && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 16,
                }}>
                  {brands.map(brand => (
                    <BrandCard
                      key={brand.slug}
                      brand={brand}
                      expanded={expandedSlug === brand.slug}
                      onToggle={() => setExpandedSlug(prev => prev === brand.slug ? null : brand.slug)}
                    />
                  ))}
                </div>

                {/* Footer links */}
                <div style={{ marginTop: 40, padding: '20px', background: CP.glass, border: `1px solid ${CP.glassBorder}`, borderRadius: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: CP.muted, fontSize: 13, flex: 1 }}>
                    點擊任意品牌卡片展開詳情 · 點擊「詳細資料」進入完整品牌頁
                  </span>
                  <a href={`${APP_URL}/macao/report`} target="_blank" rel="noopener noreferrer"
                    style={{ color: CP.gold, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    爬蟲監控報告 →
                  </a>
                  <a href="/macao/crawler-dashboard" style={{ color: CP.blue, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Crawler Dashboard →
                  </a>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}

// ── Root Page with Auth ───────────────────────────────────────────────────────
export default function BrandsPage() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('cp_brand_auth') === 'ok') setAuthed(true)
  }, [])

  function handleAuth() {
    sessionStorage.setItem('cp_brand_auth', 'ok')
    setAuthed(true)
  }

  if (!authed) return <PasswordGate onAuth={handleAuth} />
  return <Dashboard />
}
