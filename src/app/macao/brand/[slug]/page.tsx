'use client'

import { useEffect, useState, useRef } from 'react'
import { BRAND_CONFIGS } from '@/lib/brand-visibility'
import type { BrandVisibilityData } from '@/lib/brand-visibility'
import BrandOpsTab from '@/components/BrandOpsTab'
import KnowledgeGraphBlock from '@/components/KnowledgeGraphBlock'
import BrandLifecycleTracker from '@/components/BrandLifecycleTracker'
import AeoRoadmapTab from './AeoRoadmapTab'

const PASSWORD = 'cloudpipe2026'

// ─── Types ───────────────────────────────────────────────────────────────────
interface CompetitorEntry {
  slug: string; name: string; visits: number; percentage: number
  rank: number; isBrand: boolean; label: string; rating?: number; reviews?: number
  aiSearchRanking?: {
    avgRank: number
    mentioned: boolean
    totalCitations: number
    platforms: Record<string, any>
    keywords?: string[]
  } | null
}
interface PlatformRank { position: number; mentioned: boolean; keywords?: string[]; snapshotLabel?: string }
interface CitationData {
  brand: string; brandRank: number; totalCompetitors: number
  competitors: CompetitorEntry[]
  brandPlatformRanking?: {
    W0: Record<string, PlatformRank>
    W0Label: string | null
    current: Record<string, PlatformRank>
    currentLabel?: string
  } | null
  allCompetitorPlatformRanks?: Record<string, Record<string, { position: number; mentioned: boolean }>> | null
  competitorW0Ranks?: Record<string, Record<string, { position: number; mentioned: boolean }>> | null
  faqOccupation?: {
    total: number
    byType: Record<string, number>
    byLang: Record<string, number>
    totalCitations: number
    highPriorityCount: number
  } | null
  searchTerms?: string[]
  aiSearchData?: {
    lastUpdated: string
    platforms: string[]
    queries: string[]
    keywordAnalysis: Record<string, Record<string, string[]>>
  }
}

const RANK_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

// ─── Design tokens ───────────────────────────────────────────────────────────
const CP = {
  gold: '#F5C842',
  goldGlow: 'rgba(245,200,66,0.35)',
  navy: '#08111F',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  muted: 'rgba(255,255,255,0.5)',
  faint: 'rgba(255,255,255,0.35)',
  green: '#4ADE80',
  greenBg: 'rgba(74,222,128,0.1)',
  greenBorder: 'rgba(74,222,128,0.22)',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlassCard({ children, style = {}, padding = 16 }: {
  children: React.ReactNode; style?: React.CSSProperties; padding?: number
}) {
  return (
    <div style={{
      background: CP.glass,
      border: `1px solid ${CP.glassBorder}`,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 18,
      padding,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {/* top shine */}
      <div style={{
        position: 'absolute', top: 0, left: 12, right: 12, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  )
}

function SectionHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '4px 2px 12px',
    }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.4 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: CP.muted, marginTop: 3, fontWeight: 500 }}>{subtitle}</div>}
      </div>
      {action && <div style={{ fontSize: 12, fontWeight: 600, color: CP.gold }}>{action}</div>}
    </div>
  )
}

function Sparkline({ data, color = CP.gold, width = 80, height = 24 }: {
  data: number[]; color?: string; width?: number; height?: number
}) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * height * 0.9 - 2] as [number, number])
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L${width},${height} L0,${height} Z`
  const gid = `sg${Math.random().toString(36).slice(2, 8)}`
  const last = pts[pts.length - 1]
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
      <circle cx={last[0]} cy={last[1]} r="5" fill={color} opacity="0.25" />
    </svg>
  )
}

function ScoreRing({ score }: { score: number }) {
  const [drawn, setDrawn] = useState(false)
  const [animScore, setAnimScore] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setDrawn(true), 150)
    let start: number | null = null
    const duration = 1600
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setAnimScore(Math.round(score * eased))
      if (p < 1) requestAnimationFrame(step)
    }
    const t2 = setTimeout(() => requestAnimationFrame(step), 200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [score])

  const size = 168
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference * (1 - score / 100)
  const ringColor = score >= 70 ? CP.gold : score >= 50 ? '#F59E0B' : '#EF4444'
  const glowColor = score >= 70 ? CP.goldGlow : score >= 50 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      {/* glow */}
      <div style={{
        position: 'absolute', inset: -24, borderRadius: '50%',
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 65%)`,
        filter: 'blur(16px)',
        opacity: drawn ? 1 : 0,
        transition: 'opacity 1.2s ease-out',
        pointerEvents: 'none',
      }} />
      <svg width={size} height={size} style={{ position: 'relative', transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5C842" />
            <stop offset="50%" stopColor="#FFD866" />
            <stop offset="100%" stopColor="#E8A838" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={score >= 70 ? 'url(#ringGrad)' : ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={drawn ? targetOffset : circumference}
          style={{
            transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22, 1, 0.36, 1)',
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
          color: CP.muted, textTransform: 'uppercase', marginBottom: 2,
        }}>AI 能見度</div>
        <div style={{
          fontSize: 56, fontWeight: 800, lineHeight: 1,
          background: `linear-gradient(180deg, #FFE082 0%, ${ringColor} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', letterSpacing: -2,
        }}>{animScore}</div>
        <div style={{ fontSize: 10, fontWeight: 500, color: CP.faint, marginTop: 4, letterSpacing: 0.3 }}>
          out of 100
        </div>
      </div>
    </div>
  )
}

function CompetitorBar({ name, score, me, color }: {
  name: string; score: number; me?: boolean; color?: string
}) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(score), 300); return () => clearTimeout(t) }, [score])
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {me && (
            <div style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
              background: 'rgba(245,200,66,0.15)', color: CP.gold, letterSpacing: 0.5,
            }}>YOU</div>
          )}
          <div style={{ fontSize: 13, fontWeight: me ? 700 : 500, color: me ? '#fff' : 'rgba(255,255,255,0.7)' }}>
            {name}
          </div>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: me ? CP.gold : 'rgba(255,255,255,0.6)',
          letterSpacing: -0.3, fontFeatureSettings: '"tnum"',
        }}>{score}</div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${w}%`,
          background: me
            ? 'linear-gradient(90deg, #F5C842 0%, #FFD866 100%)'
            : (color || 'rgba(255,255,255,0.25)'),
          borderRadius: 3,
          transition: 'width 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: me ? '0 0 8px rgba(245,200,66,0.4)' : 'none',
        }} />
      </div>
    </div>
  )
}

function MetricDimCard({ label, score: s, max, detail, color }: {
  label: string; score: number; max: number; detail: string; color: string
}) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW((s / max) * 100), 400); return () => clearTimeout(t) }, [s, max])
  return (
    <GlassCard padding={16}>
      <div style={{ fontSize: 12, color: CP.muted, marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 10 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: -0.8, fontFeatureSettings: '"tnum"' }}>{s}</div>
        <div style={{ fontSize: 13, color: CP.faint, fontWeight: 500 }}>/{max}</div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${w}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: `0 0 6px ${color}60`,
        }} />
      </div>
      <div style={{ fontSize: 11, color: CP.faint, marginTop: 6 }}>{detail}</div>
    </GlassCard>
  )
}

// ─── Password screen ──────────────────────────────────────────────────────────
function PasswordScreen({
  displayName, onAuth
}: { displayName: string; onAuth: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  const attempt = () => {
    if (pw === PASSWORD) { onAuth() }
    else setErr(true)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: CP.navy,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', 'Noto Sans TC', -apple-system, system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Aurora blobs */}
      <div className="cp-aurora-blob cp-aurora-a" />
      <div className="cp-aurora-blob cp-aurora-b" />
      <div className="cp-aurora-blob cp-aurora-c" />

      <div style={{
        position: 'relative', zIndex: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 24, padding: '40px 36px',
        maxWidth: 380, width: '100%', margin: '0 16px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      }}>
        {/* logo mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #F5C842 0%, #E8A838 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(245,200,66,0.3)',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 13C4 9.5 6.5 7 10 7C12.7 7 14.9 8.9 15.4 11.5C17.3 11.5 19 12.9 19 15C19 17.1 17.3 18.5 15.4 18.5H5.5C3.5 18.5 2 17 2 15C2 13.8 2.8 13 4 13Z" fill="#08111F"/>
            </svg>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: CP.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            CloudPipe
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.6, marginBottom: 6 }}>
            {displayName}
          </div>
          <div style={{ fontSize: 13, color: CP.muted }}>AI Visibility Dashboard</div>
        </div>

        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false) }}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="密碼"
          style={{
            width: '100%', padding: '13px 16px',
            borderRadius: 12,
            border: `1px solid ${err ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
            background: 'rgba(0,0,0,0.3)',
            color: '#fff', fontSize: 15,
            outline: 'none',
            marginBottom: err ? 6 : 14,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        {err && (
          <p style={{ color: '#F87171', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
            密碼錯誤，請重試
          </p>
        )}
        <button
          onClick={attempt}
          style={{
            width: '100%', padding: '13px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #F5C842, #E8A838)',
            color: '#08111F', border: 'none',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(245,200,66,0.3)',
            fontFamily: 'inherit',
            transition: 'opacity 0.2s',
          }}
        >
          進入 Dashboard
        </button>
      </div>
    </main>
  )
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen({ name }: { name: string }) {
  return (
    <main style={{
      minHeight: '100vh', background: CP.navy,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', 'Noto Sans TC', -apple-system, system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="cp-aurora-blob cp-aurora-a" />
      <div className="cp-aurora-blob cp-aurora-b" />
      <div className="cp-aurora-blob cp-aurora-c" />
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: `3px solid rgba(255,255,255,0.08)`,
          borderTop: `3px solid ${CP.gold}`,
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 20px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 15, color: CP.muted }}>正在分析 {name} 的 AI 能見度…</div>
      </div>
    </main>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const [authed, setAuthed] = useState(false)
  const [data, setData] = useState<BrandVisibilityData | null>(null)
  const [citation, setCitation] = useState<CitationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slug, setSlug] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'aeo' | 'ops' | 'roadmap'>('aeo')
  const [prevTab, setPrevTab] = useState<'aeo' | 'ops' | 'roadmap'>('aeo')

  useEffect(() => {
    params.then(p => {
      const s = p.slug
      setSlug(s)
      if (typeof window !== 'undefined' && sessionStorage.getItem(`brand_auth_${s}`) === '1') {
        setAuthed(true)
      }
    })
  }, [params])

  const brandConfig = slug ? BRAND_CONFIGS[slug] : null

  useEffect(() => {
    if (!authed || !slug || !brandConfig) return
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/brand-visibility?slug=${slug}&days=30`).then(r => r.json()),
      fetch(`/api/v1/brand-citation?slug=${slug}&days=30&includeAISearch=true`).then(r => r.json()).catch(() => null),
    ]).then(([vis, cit]) => {
      setData(vis)
      if (cit && !cit.error) {
        const citationData: CitationData = {
          brand: cit.brand,
          brandRank: cit.brandRank,
          totalCompetitors: cit.totalCompetitors,
          competitors: cit.competitors.map((comp: any) => ({
            slug: comp.slug,
            name: comp.name,
            visits: comp.visits,
            percentage: comp.percentage,
            rank: comp.rank,
            isBrand: comp.isBrand,
            label: comp.label,
            rating: comp.rating,
            reviews: comp.reviews,
          })),
          aiSearchData: cit.aiSearchData,
          brandPlatformRanking: cit.brandPlatformRanking || null,
          allCompetitorPlatformRanks: cit.allCompetitorPlatformRanks || null,
          competitorW0Ranks: cit.competitorW0Ranks || null,
          faqOccupation: cit.faqOccupation || null,
          searchTerms: cit.searchTerms || [],
        }
        setCitation(citationData)
      }
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [authed, slug, brandConfig])

  const changeTab = (t: 'aeo' | 'ops' | 'roadmap') => {
    if (t === activeTab) return
    setPrevTab(activeTab)
    setActiveTab(t)
  }

  // ── Guard states ─────────────────────────────────────────────────────────
  if (!brandConfig) {
    return (
      <main style={{
        minHeight: '100vh', background: CP.navy, color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', 'Noto Sans TC', system-ui, sans-serif",
        padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, marginBottom: 12 }}>品牌未找到</div>
        <div style={{ color: CP.muted, fontSize: 14 }}>可用品牌: {Object.keys(BRAND_CONFIGS).join(', ')}</div>
      </main>
    )
  }

  if (!authed) {
    return (
      <PasswordScreen
        displayName={brandConfig.displayName}
        onAuth={() => {
          if (slug) sessionStorage.setItem(`brand_auth_${slug}`, '1')
          setAuthed(true)
        }}
      />
    )
  }

  if (loading) return <LoadingScreen name={brandConfig.displayName} />

  if (error || !data) {
    return (
      <main style={{ minHeight: '100vh', background: CP.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#F87171' }}>載入失敗: {error || '未知錯誤'}</div>
      </main>
    )
  }

  const { score, intelligenceDensity, bots, milestones, insights, ecosystem, suggestions, graphHealth } = data

  const tabDirection = (activeTab === 'ops' && prevTab === 'aeo') ? 'right' : 'left'

  return (
    <main style={{
      background: CP.navy,
      minHeight: '100vh',
      color: '#fff',
      fontFamily: "'Inter', 'Noto Sans TC', -apple-system, system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── Aurora background ───────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="cp-aurora-blob cp-aurora-a" />
        <div className="cp-aurora-blob cp-aurora-b" />
        <div className="cp-aurora-blob cp-aurora-c" />
      </div>

      {/* ── Content wrapper ──────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 28px 40px' }}>
          {/* top row: logo + brand avatar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'linear-gradient(135deg, #F5C842 0%, #E8A838 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(245,200,66,0.3)',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 8C2.5 5.5 4.5 3.5 7 3.5C9 3.5 10.5 4.8 10.8 6.7C12.2 6.7 13.5 7.8 13.5 9.5C13.5 11.2 12.2 12.5 10.8 12.5H3.2C1.7 12.5 0.5 11.3 0.5 9.8C0.5 8.8 1.3 8 2.5 8Z" fill="#08111F"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: -0.2 }}>CloudPipe</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: CP.gold,
                padding: '2px 7px', borderRadius: 5,
                background: 'rgba(245,200,66,0.1)', border: `1px solid rgba(245,200,66,0.2)`,
              }}>PRO</span>
              <a href="/macao/brands" style={{
                fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
                padding: '3px 9px', borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.08)',
                marginLeft: 4,
              }}>← 品牌中心</a>
            </div>
            {/* brand avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.15)',
            }}>
              {brandConfig.displayName.slice(0, 1)}
            </div>
          </div>

          {/* hero content: left text + right ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              {/* status pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 12px', borderRadius: 999,
                background: CP.greenBg, border: `1px solid ${CP.greenBorder}`,
                marginBottom: 16,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', background: CP.green,
                  boxShadow: `0 0 8px ${CP.green}`,
                  animation: 'cp-pulse 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#86EFAC', letterSpacing: 0.2 }}>
                  監測中 · 實時更新
                </span>
              </div>

              <h1 style={{
                margin: 0, marginBottom: 8,
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5,
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F5C842 140%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{brandConfig.displayName}</h1>

              <p style={{ fontSize: 15, color: CP.muted, marginBottom: 6, fontWeight: 400, lineHeight: 1.5 }}>
                {brandConfig.description}
              </p>
              <p style={{ fontSize: 13, color: CP.faint }}>
                🕸️ {brandConfig.ecosystem}
              </p>

              {milestones[0] && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 16, padding: '6px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${CP.glassBorder}`,
                  borderRadius: 8, fontSize: 12, color: CP.muted,
                }}>
                  🤖 首次被 {milestones[0].bot} 發現於 {milestones[0].date.slice(0, 10)}
                </div>
              )}
            </div>

            {/* Score ring area */}
            <div style={{ textAlign: 'center' }}>
              <ScoreRing score={score.total} />

              {/* sub-stats */}
              <div style={{
                display: 'flex', gap: 0, justifyContent: 'space-between',
                marginTop: 24, padding: '0 4px',
              }}>
                {[
                  { label: '等級', value: score.grade, color: score.gradeColor || CP.gold },
                  { label: '評分', value: score.gradeLabel, color: '#fff' },
                  { label: '目標', value: '85', color: CP.muted },
                ].map((s, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center',
                    borderRight: i < 2 ? `1px solid rgba(255,255,255,0.06)` : 'none',
                  }}>
                    <div style={{ fontSize: 10, color: CP.faint, marginBottom: 4, fontWeight: 500, letterSpacing: 0.3 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: s.color, letterSpacing: -0.3 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky tab bar ───────────────────────────────────────────────── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          padding: '10px 28px 12px',
          background: 'rgba(8,17,31,0.75)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{
              display: 'flex', gap: 4, maxWidth: 640,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: 4,
            }}>
              {([
                { id: 'aeo', icon: '📊', label: 'AI 分析報告' },
                { id: 'ops', icon: '⚙️', label: '品牌操作台' },
                { id: 'roadmap', icon: '🎯', label: 'AEO 路線圖' },
              ] as { id: 'aeo' | 'ops' | 'roadmap'; icon: string; label: string }[]).map(t => {
                const isActive = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => changeTab(t.id)}
                    style={{
                      flex: 1, position: 'relative',
                      padding: '10px 12px', borderRadius: 9,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))'
                        : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)' : 'none',
                      color: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{t.icon}</span>
                    <span style={{
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#fff' : CP.muted,
                      letterSpacing: -0.2, whiteSpace: 'nowrap',
                    }}>{t.label}</span>
                    {isActive && (
                      <div style={{
                        position: 'absolute', bottom: -5, left: '50%',
                        transform: 'translateX(-50%)',
                        width: 24, height: 2, borderRadius: 2,
                        background: `linear-gradient(90deg, transparent, ${CP.gold}, transparent)`,
                        boxShadow: `0 0 6px ${CP.gold}`,
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        <div
          key={activeTab}
          className={tabDirection === 'right' ? 'cp-tab-in-right' : 'cp-tab-in-left'}
          style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px 80px' }}
        >

          {/* ════════════ OPS TAB ════════════ */}
          {activeTab === 'ops' && slug && (
            <BrandOpsTab slug={slug} brandName={brandConfig.displayName} />
          )}

          {/* ════════════ ROADMAP TAB ════════════ */}
          {activeTab === 'roadmap' && slug && (
            <AeoRoadmapTab brandSlug={slug} />
          )}

          {/* ════════════ AEO TAB ════════════ */}
          {activeTab === 'aeo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* 4 Score Dimension Cards */}
              <div>
                <SectionHeader title="四維度評分" subtitle="AI 能見度構成分析" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <MetricDimCard label="🤖 Bot 觸及" score={score.botReach.score} max={score.botReach.max} detail={score.botReach.detail} color="#6366F1" />
                  <MetricDimCard label="📝 Insight 覆蓋" score={score.insightCoverage.score} max={score.insightCoverage.max} detail={score.insightCoverage.detail} color="#10B981" />
                  <MetricDimCard label="❓ FAQ 密度" score={score.faqDensity.score} max={score.faqDensity.max} detail={score.faqDensity.detail} color="#F59E0B" />
                  <MetricDimCard label="🔗 交叉連結" score={score.crossLinks.score} max={score.crossLinks.max} detail={score.crossLinks.detail} color="#8B5CF6" />
                </div>
              </div>

              {/* Lifecycle AI Search Tracker */}
              {['inari-global-foods', 'sea-urchin-delivery', 'after-school-coffee', 'mind-coffee', 'cloudpipe-landing'].includes(slug || '') && (
                <div>
                  <SectionHeader
                    title="📈 AI 搜尋排名日誌"
                    subtitle="14 天生命週期 · 每日自動更新 · Perplexity 實測"
                  />
                  <BrandLifecycleTracker slug={slug!} />
                </div>
              )}

              {/* Intelligence Density */}
              {intelligenceDensity && (
                <div>
                  <SectionHeader title="🧠 品牌智力密度" subtitle="知識深度與圖譜連結品質" />
                  <GlassCard>
                    {/* score badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ fontSize: 14, color: CP.muted }}>衡量品牌大腦的知識深度與圖譜連結品質</div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        width: 72, height: 72, borderRadius: '50%',
                        border: `3px solid ${intelligenceDensity.gradeColor || CP.gold}`,
                        background: `${intelligenceDensity.gradeColor || CP.gold}12`,
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: intelligenceDensity.gradeColor || CP.gold }}>
                          {intelligenceDensity.total}
                        </div>
                        <div style={{ fontSize: 9, color: CP.faint }}>/ 100</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      {[
                        { label: '📖 知識深度', ...intelligenceDensity.knowledgeDepth, color: '#7c3aed' },
                        { label: '❓ FAQ 品質', ...intelligenceDensity.faqQuality, color: '#059669' },
                        { label: '🕸️ 圖譜連結', ...intelligenceDensity.graphConnectivity, color: '#0f4c81' },
                        { label: '🌐 語言覆蓋', ...intelligenceDensity.languageCoverage, color: '#d97706' },
                      ].map((dim, i) => (
                        <div key={i} style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 12, padding: 14,
                        }}>
                          <div style={{ fontSize: 12, color: CP.muted, marginBottom: 6 }}>{dim.label}</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: dim.color }}>
                            {dim.score}<span style={{ fontSize: 11, fontWeight: 400, color: CP.faint }}>/{dim.max}</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 3, height: 3, marginTop: 8 }}>
                            <div style={{ background: dim.color, borderRadius: 3, height: 3, width: `${(dim.score / dim.max) * 100}%`, transition: 'width 0.8s' }} />
                          </div>
                          <div style={{ fontSize: 11, color: CP.faint, marginTop: 5 }}>{dim.detail}</div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* Pilot AEO Progress */}
              {['inari-global-foods', 'sea-urchin-delivery', 'after-school-coffee'].includes(slug || '') && (
                <div>
                  <SectionHeader title="🎯 市場搶佔試點進度" subtitle="2026-04-13 啟動 · T+7 監控中" />
                  <GlassCard style={{ border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ fontSize: 13, color: CP.muted }}>Phase 2 觸發條件: 主要 AI 爬蟲首次爬取品牌 FAQ 端點</div>
                      <div style={{ background: '#7c3aed', color: 'white', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        PILOT ACTIVE
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                      {[
                        { label: '🎯 Query 意圖切割', status: '✅ 完成', detail: '專屬長尾查詢已定義', color: '#059669', done: true },
                        { label: '❓ 高分 FAQ 注入', status: '✅ +10 條', detail: 'priority_score 9.0-9.5', color: '#059669', done: true },
                        { label: '📝 旗艦 Insight', status: '✅ +2 篇', detail: '含數據表+明確結論', color: '#059669', done: true },
                        { label: '🤖 AI 爬蟲引用', status: '⏳ 監控中', detail: 'T+7 通報 (2026-04-20)', color: '#d97706', done: false },
                      ].map((item, i) => (
                        <div key={i} style={{
                          background: item.done ? 'rgba(5,150,105,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${item.done ? 'rgba(5,150,105,0.25)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: 12, padding: 14,
                        }}>
                          <div style={{ fontSize: 12, color: CP.muted, marginBottom: 6 }}>{item.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.status}</div>
                          <div style={{ fontSize: 11, color: CP.faint, marginTop: 4 }}>{item.detail}</div>
                        </div>
                      ))}
                    </div>
                    {/* brand-specific queries */}
                    {{
                      'inari-global-foods': <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 10 }}>🎯 稻荷搶佔目標查詢</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {['澳門日本海膽供應商是誰', '北海道海膽在哪買', '澳門餐廳海膽批發', '海膽品種比較 澳門'].map(q => (
                            <span key={q} style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>{q}</span>
                          ))}
                        </div>
                      </div>,
                      'sea-urchin-delivery': <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 10 }}>🎯 海膽速遞搶佔目標查詢</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {['澳門海膽外送到家', '海膽宅配澳門多少錢', '澳門買海膽哪裡最便宜', '海膽速遞 vs 超市'].map(q => (
                            <span key={q} style={{ background: 'rgba(15,76,129,0.15)', color: '#93c5fd', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>{q}</span>
                          ))}
                        </div>
                      </div>,
                      'after-school-coffee': <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 10 }}>🎯 課後咖啡搶佔目標查詢</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {['澳門氹仔嬰兒車友善咖啡廳', '澳門放學後帶小孩去哪', '氹仔親子咖啡廳', '澳門可帶嬰兒入內咖啡廳'].map(q => (
                            <span key={q} style={{ background: 'rgba(217,116,6,0.12)', color: '#fcd34d', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>{q}</span>
                          ))}
                        </div>
                      </div>,
                    }[slug || ''] || null}
                    <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(245,200,66,0.06)', borderRadius: 10, fontSize: 12, color: '#fde68a', border: '1px solid rgba(245,200,66,0.15)' }}>
                      Phase 2 啟動信號：當 Perplexity / GPTBot / ClaudeBot 首次訪問 /api/faq/merchant/{slug} 端點，T+7 Telegram 通報確認。
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* W0 AI Query Baseline */}
              {slug === 'inari-global-foods' && (
                <div>
                  <SectionHeader title="🔍 W0 AI 查詢基線" subtitle="2026-04-18 · 實際查詢主流 AI 平台結果" />
                  <GlassCard>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
                      <div style={{ borderRadius: 12, padding: 18, border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 16 }}>✅</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Grok + Perplexity</span>
                          <span style={{ marginLeft: 'auto', background: 'rgba(74,222,128,0.15)', color: CP.green, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>#1 首選</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                          Grok：「澳門絕對龍頭，市佔約70%」，CloudPipe 為引用來源之一。Perplexity：首位，含詳細聯絡資訊（10個來源）。
                        </div>
                      </div>
                      <div style={{ borderRadius: 12, padding: 18, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 16 }}>❌</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>ChatGPT / Gemini</span>
                          <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#F87171', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>未提及</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                          ChatGPT 推薦 Worldwide Seafood、Kinwa Seafood，未提及稻荷。Gemini 推薦力生控股集團，兩大平台仍有知識空白。
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                      {[
                        { platform: 'Grok', status: '✅ #1 龍頭 70%', color: CP.green },
                        { platform: 'Perplexity', status: '✅ #1 首選', color: CP.green },
                        { platform: 'ChatGPT', status: '❌ 未提及', color: '#F87171' },
                        { platform: 'Gemini', status: '❌ 未提及', color: '#F87171' },
                        { platform: 'Claude AI', status: '⏳ 待測試', color: '#FBBF24' },
                      ].map((p, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{p.platform}</div>
                          <div style={{ fontSize: 12, color: p.color, fontWeight: 500 }}>{p.status}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, fontSize: 12, color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <strong>策略判斷（2/5 平台已建立優勢）：</strong>下一步透過 FAQ Schema + Answer Hub 填補 ChatGPT + Gemini，目標 T+30 達到 4/5 平台 Top 3。
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* Bot breakdown */}
              <div>
                <SectionHeader title="🤖 AI Bot 訪問分佈" subtitle={`共 ${data.totalVisits} 次訪問 · ${data.uniqueBots} 個 AI 平台`} />
                <GlassCard>
                  {bots.map((b, i) => (
                    <div key={i} style={{ marginBottom: i < bots.length - 1 ? 16 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{b.name} <span style={{ fontWeight: 400, color: CP.muted }}>{b.owner}</span></span>
                        <span style={{ fontWeight: 700, color: CP.gold }}>{b.count}</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 6 }}>
                        <div style={{
                          background: b.color, borderRadius: 4, height: 6,
                          width: `${Math.min(100, (b.count / Math.max(bots[0]?.count || 1, 1)) * 100)}%`,
                          transition: 'width 0.8s',
                        }} />
                      </div>
                    </div>
                  ))}
                </GlassCard>
              </div>

              {/* Competitor comparison */}
              {citation && citation.competitors && (
                <>
                  <div>
                    <SectionHeader title="📊 同業競品比較" subtitle="AI 爬蟲訪問次數對比（真實追蹤數據）" />
                    <GlassCard>
                      {citation.competitors.map((comp, i) => {
                        const maxPct = citation.competitors[0]?.percentage || 1
                        return (
                          <div key={i} style={{ marginBottom: i < citation.competitors.length - 1 ? 14 : 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: comp.isBrand ? 700 : 500, color: comp.isBrand ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                                {comp.isBrand && '★ '}{comp.name}
                                {comp.rating && <span style={{ fontSize: 11, color: CP.faint, marginLeft: 6 }}>⭐ {comp.rating} ({comp.reviews})</span>}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: comp.isBrand ? CP.gold : 'rgba(255,255,255,0.6)' }}>{comp.percentage}%</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                              <div style={{
                                background: comp.isBrand ? 'linear-gradient(90deg, #F5C842, #FFD866)' : (RANK_COLORS[i] || '#6b7280'),
                                borderRadius: 4, height: 6,
                                width: `${(comp.percentage / maxPct) * 100}%`,
                                transition: 'width 1s',
                                boxShadow: comp.isBrand ? '0 0 8px rgba(245,200,66,0.4)' : 'none',
                              }} />
                            </div>
                          </div>
                        )
                      })}
                    </GlassCard>
                  </div>

                  {/* AI Platform Ranking */}
                  <div>
                    <SectionHeader title="🏆 AI 平台排名對比" subtitle={`查詢：「${brandConfig?.searchTerms?.[0] || citation.aiSearchData?.queries?.[0] || '品牌相關查詢'}」`} />
                    <GlassCard>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                        {[
                          { key: 'gpt', label: 'ChatGPT', icon: '🧠' },
                          { key: 'perplexity', label: 'Perplexity', icon: '🔎' },
                          { key: 'gemini', label: 'Gemini', icon: '🤖' },
                          { key: 'claude', label: 'Claude', icon: '✨' },
                          { key: 'grok', label: 'Grok', icon: '⚡' },
                        ].map(({ key, label, icon }) => {
                          const w0 = citation.brandPlatformRanking?.W0?.[key]
                          const cur = citation.brandPlatformRanking?.current?.[key]
                          const w0Rank = w0?.mentioned ? `#${w0.position}` : '未提及'
                          const curRank = cur?.mentioned ? `#${cur.position}` : (cur ? '未提及' : '待測試')
                          const improved = w0?.mentioned && cur?.mentioned && cur.position < w0.position
                          const maintained = w0?.mentioned && cur?.mentioned && cur.position === w0.position
                          return (
                            <div key={key} style={{
                              borderRadius: 12, padding: 14,
                              background: w0?.mentioned ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${w0?.mentioned ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)'}`,
                            }}>
                              <div style={{ fontSize: 11, color: CP.muted, marginBottom: 8 }}>{icon} {label}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: CP.faint, minWidth: 30 }}>基線</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: w0?.mentioned ? '#93c5fd' : '#F87171' }}>
                                  {w0 ? w0Rank : '—'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, color: CP.faint, minWidth: 30 }}>當前</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: !cur ? 'rgba(255,255,255,0.2)' : cur?.mentioned ? CP.green : '#F87171' }}>
                                  {curRank}
                                </span>
                                {improved && <span style={{ fontSize: 10, color: CP.green }}>↑</span>}
                                {maintained && <span style={{ fontSize: 10, color: CP.muted }}>→</span>}
                              </div>
                              {w0?.keywords && w0.keywords.length > 0 && (
                                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {w0.keywords.slice(0, 2).map((k, i) => (
                                    <span key={i} style={{ fontSize: 9, background: 'rgba(147,197,253,0.1)', color: '#93c5fd', padding: '2px 5px', borderRadius: 4 }}>{k}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, fontSize: 12, color: CP.muted, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <strong style={{ color: '#fff' }}>基線說明：</strong>W0 ({citation.aiSearchData?.lastUpdated ? new Date(citation.aiSearchData.lastUpdated).toLocaleDateString('zh-HK') : '2026-04-18'}) 為優化起點。T+30 重測全平台對比。
                      </div>
                    </GlassCard>
                  </div>

                  {/* Competitor ranking table */}
                  <div>
                    <SectionHeader title="🔢 競爭態勢排名" subtitle={`爬蟲訪問量 + AI 平台實測 · 你的排名：第 ${citation.brandRank} / ${citation.totalCompetitors}`} />
                    <GlassCard padding={0}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              {['#', '品牌', '爬蟲佔比', 'ChatGPT', 'Perplexity', 'Gemini', 'Claude', 'Grok'].map((h, i) => (
                                <th key={i} style={{ textAlign: i <= 1 ? 'left' : 'center', padding: '12px 14px', color: CP.muted, fontWeight: 600 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {citation.competitors.map((comp, i) => {
                              const isOwnBrand = comp.isBrand
                              return (
                                <tr key={i} style={{
                                  borderBottom: i < citation.competitors.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                  background: isOwnBrand ? 'rgba(245,200,66,0.04)' : 'transparent',
                                }}>
                                  <td style={{ padding: '10px 14px', fontWeight: 600, color: CP.faint }}>#{comp.rank}</td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <span style={{ fontWeight: isOwnBrand ? 700 : 500, color: isOwnBrand ? CP.gold : '#fff' }}>
                                      {isOwnBrand && '★ '}{comp.name}
                                    </span>
                                    {!isOwnBrand && comp.label && (
                                      <div style={{ fontSize: 10, color: CP.faint, marginTop: 1 }}>{comp.label}</div>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 3, height: 4, marginBottom: 3, maxWidth: 70, margin: '0 auto 3px' }}>
                                      <div style={{ background: RANK_COLORS[i] || '#6b7280', borderRadius: 3, height: 4, width: `${comp.percentage}%` }} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: '#fff' }}>{comp.percentage}%</span>
                                  </td>
                                  {[
                                    { key: 'gpt', platformKeys: ['gpt', 'chatgpt'] },
                                    { key: 'perplexity', platformKeys: ['perplexity'] },
                                    { key: 'gemini', platformKeys: ['gemini'] },
                                    { key: 'claude', platformKeys: ['claude'] },
                                    { key: 'grok', platformKeys: ['grok'] },
                                  ].map(({ key, platformKeys }) => {
                                    let rankData: { position: number; mentioned: boolean } | undefined
                                    if (isOwnBrand) {
                                      const curData = citation.brandPlatformRanking?.current
                                      rankData = platformKeys.map(pk => curData?.[pk]).find(Boolean) as any
                                      if (!rankData) {
                                        const w0Data = citation.brandPlatformRanking?.W0
                                        rankData = platformKeys.map(pk => w0Data?.[pk]).find(Boolean) as any
                                      }
                                    } else {
                                      const allRanks = citation.allCompetitorPlatformRanks
                                      if (allRanks) {
                                        const exactMatch = allRanks[comp.name]
                                        const partialKey = !exactMatch ? Object.keys(allRanks).find(k =>
                                          k.toLowerCase().includes(comp.name.toLowerCase().split(' ')[0]) ||
                                          comp.name.toLowerCase().includes(k.toLowerCase().split(' ')[0])
                                        ) : null
                                        const matchedRanks = exactMatch || (partialKey ? allRanks[partialKey] : null)
                                        if (matchedRanks) {
                                          rankData = platformKeys.map(pk => matchedRanks[pk]).find(Boolean) as any
                                        }
                                      }
                                    }
                                    return (
                                      <td key={key} style={{ padding: '10px 14px', textAlign: 'center' }}>
                                        {rankData ? (
                                          rankData.mentioned ? (
                                            <span style={{
                                              background: isOwnBrand ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.08)',
                                              color: isOwnBrand ? CP.green : '#F87171',
                                              padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontSize: 11,
                                            }}>#{rankData.position}</span>
                                          ) : (
                                            <span style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>未提及</span>
                                          )
                                        ) : (
                                          <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>—</span>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ fontSize: 11, color: CP.faint, margin: '12px 14px 0', paddingBottom: 14 }}>
                        * 綠色=你的品牌被引用，紅色=競品被引用 · 數據來自最新 AI 平台實測快照 ({citation.brandPlatformRanking?.currentLabel || 'current'})
                      </p>
                    </GlassCard>
                  </div>

                  {/* Keywords + FAQ Occupation */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                    {/* Target Keywords */}
                    {(citation.searchTerms?.length || brandConfig?.searchTerms?.length) ? (
                      <div>
                        <SectionHeader title="🔑 目標關鍵字" subtitle="AI 平台搶佔的搜尋意圖" />
                        <GlassCard>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                            {(citation.searchTerms?.length ? citation.searchTerms : brandConfig?.searchTerms || []).map((term, i) => (
                              <span key={i} style={{
                                background: i === 0 ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.05)',
                                color: i === 0 ? CP.gold : 'rgba(255,255,255,0.75)',
                                border: `1px solid ${i === 0 ? 'rgba(245,200,66,0.25)' : 'rgba(255,255,255,0.08)'}`,
                                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: i === 0 ? 600 : 400,
                              }}>
                                {i === 0 && '🎯 '}{term}
                              </span>
                            ))}
                          </div>
                          {citation.aiSearchData?.queries?.length ? (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                              <div style={{ fontSize: 11, color: CP.muted, marginBottom: 6 }}>已實測查詢</div>
                              {citation.aiSearchData.queries.slice(0, 4).map((q, i) => (
                                <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', padding: '3px 0' }}>
                                  <span style={{ color: CP.faint, marginRight: 6 }}>›</span>{q}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </GlassCard>
                      </div>
                    ) : null}

                    {/* FAQ Occupation Analysis */}
                    {citation.faqOccupation && (
                      <div>
                        <SectionHeader title="📊 FAQ 搶佔分析" subtitle={`${citation.faqOccupation.total} 條 FAQ · 覆蓋多維搜尋意圖`} />
                        <GlassCard>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                            {[
                              { label: '總 FAQ', value: citation.faqOccupation.total, color: CP.gold },
                              { label: '高優先級 (≥9分)', value: citation.faqOccupation.highPriorityCount, color: '#4ADE80' },
                              { label: 'AI 被引用次數', value: citation.faqOccupation.totalCitations, color: '#93c5fd' },
                              { label: '語言版本', value: Object.keys(citation.faqOccupation.byLang).length, color: '#f59e0b' },
                            ].map((stat, i) => (
                              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                                <div style={{ fontSize: 10, color: CP.muted, marginBottom: 4 }}>{stat.label}</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                            <div style={{ fontSize: 11, color: CP.muted, marginBottom: 8 }}>按意圖類型分佈</div>
                            {Object.entries(citation.faqOccupation.byType)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 6)
                              .map(([type, count], i) => {
                                const pct = Math.round((count / citation.faqOccupation!.total) * 100)
                                const typeLabels: Record<string, string> = {
                                  insight_derived: '📖 Insight 提取', pilot_aeo: '🎯 AEO 試點',
                                  market_research: '📊 市場研究', b2b_procurement: '🏢 B2B 採購',
                                  flagship_derived: '⭐ 旗艦文章', flagship_lifecycle: '📅 生命週期',
                                  manual: '✍️ 人工輸入', general: '💬 通用問答',
                                  specific: '🔍 品牌專屬', price: '💰 定價',
                                  delivery: '🚚 配送', location: '📍 地址',
                                }
                                return (
                                  <div key={i} style={{ marginBottom: 7 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>{typeLabels[type] || type}</span>
                                      <span style={{ color: CP.gold, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>{count} ({pct}%)</span>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 3, height: 3 }}>
                                      <div style={{ background: `rgba(245,200,66,${0.3 + (i === 0 ? 0.5 : 0.1)})`, borderRadius: 3, height: 3, width: `${pct}%` }} />
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        </GlassCard>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Milestones + Ecosystem side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {/* Milestones */}
                <div>
                  <SectionHeader title="📅 AI 發現里程碑" />
                  <GlassCard>
                    {milestones.map((m, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < milestones.length - 1 ? 16 : 0, position: 'relative', paddingLeft: 20 }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 4,
                          width: 10, height: 10, borderRadius: '50%', background: m.color,
                          boxShadow: `0 0 6px ${m.color}`,
                        }} />
                        {i < milestones.length - 1 && (
                          <div style={{ position: 'absolute', left: 4, top: 16, width: 2, height: 'calc(100% + 4px)', background: 'rgba(255,255,255,0.08)' }} />
                        )}
                        <div>
                          <div style={{ fontSize: 11, color: CP.faint, marginBottom: 2 }}>{m.date.slice(0, 10)}</div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{m.event}</div>
                        </div>
                      </div>
                    ))}
                  </GlassCard>
                </div>

                {/* Ecosystem */}
                <div>
                  <SectionHeader title="🕸️ 知識圖譜生態系" />
                  <GlassCard>
                    <p style={{ fontSize: 12, color: CP.faint, marginBottom: 16, marginTop: 0 }}>
                      你的品牌與生態系成員互相連結，共同提升 AI 能見度
                    </p>
                    {ecosystem.map((node, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: i < ecosystem.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{node.name}</div>
                          <div style={{ fontSize: 11, color: CP.faint }}>{node.role}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: CP.gold }}>{node.visits} 次</div>
                          <div style={{ fontSize: 11, color: node.connected ? CP.green : CP.faint }}>
                            {node.connected ? '✓ 已連結' : '◯ 未連結'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </GlassCard>
                </div>
              </div>

              {/* Knowledge Graph Health */}
              <div>
                <SectionHeader title="📊 CloudPipe 知識圖譜即時狀態" />
                <GlassCard style={{ background: 'linear-gradient(135deg, rgba(15,76,129,0.15) 0%, rgba(22,33,62,0.15) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 13, color: CP.muted, marginBottom: 20, marginTop: 0 }}>
                    你的品牌是這個持續擴展的知識網絡的一部分。每天新增的文章和連結都在強化你的 AI 能見度。
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                    {[
                      { label: '總 Insights', value: graphHealth.totalInsights.toLocaleString(), sub: '篇深度文章' },
                      { label: '商戶數據', value: graphHealth.totalMerchants.toLocaleString(), sub: '個商戶檔案' },
                      { label: 'FAQ 覆蓋', value: `${graphHealth.faqCoverage}%`, sub: '持續深化中' },
                      { label: 'Sections', value: `${graphHealth.sectionsCoverage}%`, sub: '結構化覆蓋' },
                      { label: '每日新增', value: `${graphHealth.dailyNewArticles}+`, sub: '篇/天' },
                      { label: '圖譜分數', value: `${graphHealth.graphScore}`, sub: '/100 目標80' },
                    ].map((stat, i) => (
                      <div key={i} style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12, padding: 16,
                      }}>
                        <div style={{ fontSize: 11, color: CP.faint, marginBottom: 6 }}>{stat.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: CP.gold, margin: '0 0 4px', letterSpacing: -0.5 }}>{stat.value}</div>
                        <div style={{ fontSize: 11, color: CP.faint }}>{stat.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 20, fontSize: 12, color: CP.muted, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                    <strong style={{ color: 'rgba(255,255,255,0.7)' }}>生態系運作機制:</strong> 每日 03:00 UTC 自動生成旗艦 Insight → 03:30 圖譜深化（Sections + FAQ + Answer Hub）→ 每週一雙向連結重建 → AI Bot 自然爬取 → 引用率提升
                  </div>
                </GlassCard>
              </div>

              {/* Knowledge Graph Block */}
              {slug && (
                <div>
                  <SectionHeader title="🔗 品牌知識圖譜" />
                  <GlassCard>
                    <KnowledgeGraphBlock slug={slug} />
                  </GlassCard>
                </div>
              )}

              {/* Insight Coverage table */}
              <div>
                <SectionHeader title="📝 Insight 覆蓋詳情" subtitle={`共 ${insights.length} 篇，顯示最新 20 篇`} />
                <GlassCard padding={0}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          {['標題', '字數', 'FAQ', 'Sections', '連結', '語言'].map((h, i) => (
                            <th key={i} style={{
                              textAlign: i === 0 ? 'left' : 'right',
                              padding: '12px 14px', color: CP.muted, fontWeight: 600,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...insights].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')).slice(0, 20).map((ins, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '10px 14px', maxWidth: 360 }}>
                              <a href={`/macao/insights/${ins.slug}`} style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 500 }}>
                                {ins.title?.slice(0, 55) || ins.slug.slice(0, 55)}
                              </a>
                              {ins.publishedAt && new Date(ins.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                                <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(74,222,128,0.15)', color: CP.green, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>NEW</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', padding: '10px 14px', color: ins.wordCount >= 2000 ? CP.green : '#FBBF24' }}>
                              {ins.wordCount.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', padding: '10px 14px', color: ins.faqCount > 0 ? CP.green : '#F87171' }}>
                              {ins.faqCount > 0 ? `✓ ${ins.faqCount}` : '✗'}
                            </td>
                            <td style={{ textAlign: 'right', padding: '10px 14px', color: ins.sectionCount > 0 ? CP.green : '#F87171' }}>
                              {ins.sectionCount > 0 ? `✓ ${ins.sectionCount}` : '✗'}
                            </td>
                            <td style={{ textAlign: 'right', padding: '10px 14px', color: 'rgba(255,255,255,0.7)' }}>{ins.crossLinks}</td>
                            <td style={{ textAlign: 'right', padding: '10px 14px', color: CP.faint }}>{ins.lang}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>

              {/* AI Suggestions */}
              <div>
                <SectionHeader title="💡 AI 能見度改善建議" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {suggestions.map((s, i) => (
                    <GlassCard key={i} padding={16} style={{
                      borderLeft: `3px solid ${s.priority === 'high' ? CP.gold : s.priority === 'medium' ? '#6366F1' : 'rgba(255,255,255,0.2)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: s.priority === 'high' ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${s.priority === 'high' ? 'rgba(245,200,66,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, color: s.priority === 'high' ? CP.gold : CP.muted,
                        }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{s.icon} {s.title}</div>
                          <div style={{ fontSize: 13, color: CP.muted, marginBottom: 4 }}>{s.description}</div>
                          <div style={{ fontSize: 12, color: CP.green, fontWeight: 600 }}>📈 {s.impact}</div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <GlassCard style={{ border: `1px solid rgba(245,200,66,0.25)`, textAlign: 'center' }} padding={36}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: '#fff', letterSpacing: -0.5 }}>
                  加入 CloudPipe 知識圖譜生態系
                </h2>
                <p style={{ color: CP.muted, marginBottom: 24, maxWidth: 560, margin: '0 auto 24px', fontSize: 14, lineHeight: 1.6 }}>
                  每天 175+ 篇新文章持續擴展知識網絡。你的品牌作為生態系的一員，
                  每一篇新 Insight 都在強化你的 AI 能見度。這不是一次性服務，而是持續複利增長的生態系。
                </p>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a href={brandConfig.brandUrl} target="_blank" style={{
                    padding: '12px 28px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #F5C842, #E8A838)',
                    color: '#08111F', textDecoration: 'none', fontWeight: 700, fontSize: 14,
                    boxShadow: '0 4px 16px rgba(245,200,66,0.3)',
                  }}>
                    訪問品牌官網 →
                  </a>
                  <a href="/macao/insights" style={{
                    padding: '12px 28px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14,
                  }}>
                    瀏覽知識百科 →
                  </a>
                </div>
              </GlassCard>

            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '24px 28px',
          textAlign: 'center',
          fontSize: 12,
          color: CP.faint,
        }}>
          CloudPipe AI · 知識圖譜生態系 · {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  )
}
