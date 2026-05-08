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

// ── Main Dashboard ────────────────────────────────────────────────────────────
function Dashboard() {
  const [brands, setBrands] = useState<BrandSummary[]>([])
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)

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
