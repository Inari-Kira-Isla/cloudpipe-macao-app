'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────

interface BrandProfile {
  brand_slug: string
  name_zh?: string
  name_en?: string
  tagline?: string
  description?: string
  phone?: string
  address?: string
  website_url?: string
  instagram_url?: string
  facebook_url?: string
  [key: string]: string | undefined
}

interface FaqItem {
  id: string | number
  question: string
  answer: string
  lang?: string
  is_published?: boolean
}

interface ProductItem {
  id: string | number
  name_zh?: string
  name_en?: string
  price_mop?: number
  min_order?: string
  description?: string
  is_flagship?: boolean
  sku?: string
  image_url?: string
}

interface AeoAction {
  id: string | number
  priority: string
  action_title?: string
  title?: string
  description?: string
  category?: string
  cat?: string
  due_date?: string
  status?: string
}

interface PortalSession {
  brand_slug: string
  email: string
  expires: number
}

type AuthState = 'loading' | 'authenticated' | 'invalid'
type TabKey = 'dashboard' | 'aeo' | 'faq' | 'products' | 'profile'

// ── Icon component ─────────────────────────────────────────────────────

function Icon({ name, size = 16, stroke = 2, style }: {
  name: string; size?: number; stroke?: number; style?: React.CSSProperties
}) {
  const s = stroke
  const icons: Record<string, React.ReactNode> = {
    cloud: <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></>,
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    sparkles: <><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 8.031 3.371a7.5 7.5 0 0 0-.031.629z"/><path d="M20 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></>,
    lightning: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    'arrow-up': <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    'chevron-right': <><polyline points="9 18 15 12 9 6"/></>,
    'chevron-down': <><polyline points="6 9 12 15 18 9"/></>,
    star: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={s}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {icons[name] ?? null}
    </svg>
  )
}

// ── Score ring ─────────────────────────────────────────────────────────

function ScoreRing({ value }: { value: number }) {
  const r = 56
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  return (
    <div className="score-ring">
      <svg viewBox="0 0 140 140">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5C842" />
            <stop offset="100%" stopColor="#E8A838" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} className="ring-track" />
        <circle cx="70" cy="70" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="ring-center">
        <div className="ring-num">{value}</div>
        <div className="ring-label">AI 能見度</div>
      </div>
    </div>
  )
}

// ── Sparkline ──────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 280, h = 56
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((d - min) / range) * (h - 8) - 4
    return [x, y]
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaPath = `${path} L${w},${h} L0,${h} Z`
  return (
    <svg className="cp-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5C842" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F5C842" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkArea)" />
      <path d={path} fill="none" stroke="#F5C842" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="#F5C842" />
    </svg>
  )
}

// ── Nav items ──────────────────────────────────────────────────────────

const NAV: { key: TabKey; label: string; iconName: string }[] = [
  { key: 'dashboard', label: '主頁',  iconName: 'home' },
  { key: 'aeo',       label: 'AEO',   iconName: 'target' },
  { key: 'faq',       label: 'FAQ',   iconName: 'help' },
  { key: 'products',  label: '產品',  iconName: 'box' },
  { key: 'profile',   label: '設定',  iconName: 'settings' },
]

// ── Brand display helpers ──────────────────────────────────────────────

const BRAND_META: Record<string, { avatarClass: string; initial: string; industry: string }> = {
  'inari-global-foods':   { avatarClass: 'gold',  initial: '稻', industry: 'B2B 食品批發' },
  'sea-urchin-delivery':  { avatarClass: 'coral', initial: '膽', industry: 'B2C 零售外賣' },
  'mind-cafe':            { avatarClass: 'mint',  initial: 'M',  industry: '精品咖啡' },
  'after-school-coffee':  { avatarClass: 'berry', initial: 'A',  industry: '親子咖啡廳' },
}

function getBrandMeta(slug: string) {
  return BRAND_META[slug] ?? { avatarClass: '', initial: slug[0]?.toUpperCase() ?? '?', industry: '' }
}

// ── TopBar ─────────────────────────────────────────────────────────────

function TopBar({ brandName, userEmail, onLogout }: {
  brandName: string; userEmail: string; onLogout: () => void
}) {
  return (
    <header className="cp-topbar">
      <div className="cp-row cp-gap-12">
        <span className="cp-logo">
          <span className="cp-logo-mark"><Icon name="cloud" size={16} stroke={2.4} /></span>
          <span>CloudPipe</span>
        </span>
      </div>
      <div className="cp-row cp-gap-8">
        <span style={{ fontSize: 12, color: 'var(--cp-text-faint)', marginRight: 4 }} className="cp-truncate">{userEmail}</span>
        <button className="btn btn-ghost btn-sm" onClick={onLogout} title="登出" style={{ minHeight: 36, padding: '6px 10px' }}>
          <Icon name="logout" size={15} />
        </button>
      </div>
    </header>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────

function Sidebar({ brandSlug, brandName, currentTab, onTabChange, onLogout, userEmail }: {
  brandSlug: string; brandName: string; currentTab: TabKey
  onTabChange: (t: TabKey) => void; onLogout: () => void; userEmail: string
}) {
  const meta = getBrandMeta(brandSlug)
  return (
    <aside className="cp-sidebar">
      <div className="cp-logo" style={{ padding: '4px 6px 12px' }}>
        <span className="cp-logo-mark"><Icon name="cloud" size={16} stroke={2.4} /></span>
        <span style={{ fontSize: 16 }}>CloudPipe</span>
        <span className="badge badge-gold" style={{ marginLeft: 4 }}>Portal</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px 10px' }}>
        <div className={`brand-avatar ${meta.avatarClass}`}>{meta.initial}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cp-text)' }} className="cp-truncate">{brandName}</div>
          <div className="cp-small" style={{ fontSize: 11 }}>{meta.industry}</div>
        </div>
      </div>

      <nav className="cp-sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.key}
            className={`cp-sidebar-link ${currentTab === item.key ? 'active' : ''}`}
            onClick={() => onTabChange(item.key)}
          >
            <Icon name={item.iconName} size={17} stroke={2} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="cp-sidebar-foot">
        <div className="brand-avatar" style={{ background: 'var(--cp-glass)', border: '1px solid var(--cp-glass-border)' }}>
          <Icon name="user" size={16} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="cp-small" style={{ fontSize: 11.5 }}>已登入</div>
          <div className="cp-truncate" style={{ fontSize: 12, color: 'var(--cp-text)', fontWeight: 500 }}>{userEmail}</div>
        </div>
        <button className="btn btn-ghost" onClick={onLogout} title="登出" style={{ minHeight: 32, width: 32, padding: 0, borderRadius: 8 }}>
          <Icon name="logout" size={14} />
        </button>
      </div>
    </aside>
  )
}

// ── TabBar ─────────────────────────────────────────────────────────────

function TabBar({ currentTab, onTabChange }: { currentTab: TabKey; onTabChange: (t: TabKey) => void }) {
  return (
    <nav className="cp-tabbar">
      {NAV.map(item => (
        <button
          key={item.key}
          className={`cp-tabbar-btn ${currentTab === item.key ? 'active' : ''}`}
          onClick={() => onTabChange(item.key)}
        >
          <Icon name={item.iconName} size={20} stroke={2} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── Dashboard screen ───────────────────────────────────────────────────

const SPARKLINE_DATA = [12, 14, 11, 18, 16, 22, 20, 24, 22, 28, 32, 30, 35, 38, 42, 39, 44, 47]

interface DashData {
  profile?: BrandProfile | null
  aeoScore?: { score?: number; score_delta?: number; platforms?: Record<string, boolean> } | null
  aeoActions?: { actions?: AeoAction[]; pending_count?: number } | null
  lifecycle?: { total_citations?: number; weekly_citations?: number; last_updated?: string } | null
}

function DashboardScreen({ brandSlug, brandName, dashData, dashLoading, onNav }: {
  brandSlug: string; brandName: string; dashData: DashData | null; dashLoading: boolean; onNav: (t: TabKey) => void
}) {
  const score = dashData?.aeoScore?.score ?? 72
  const scoreDelta = dashData?.aeoScore?.score_delta ?? 0
  const platforms = dashData?.aeoScore?.platforms ?? {}
  const platformList = [
    { key: 'chatgpt',    name: 'ChatGPT',    ok: platforms.chatgpt ?? false },
    { key: 'perplexity', name: 'Perplexity', ok: platforms.perplexity ?? false },
    { key: 'gemini',     name: 'Gemini',     ok: platforms.gemini ?? false },
    { key: 'grok',       name: 'Grok',       ok: platforms.grok ?? false },
  ]
  const okCount = platformList.filter(p => p.ok).length
  const actions = dashData?.aeoActions?.actions ?? []
  const pendingCount = dashData?.aeoActions?.pending_count ?? actions.filter(a => a.status !== 'done').length
  const p1Count = actions.filter(a => (a.priority === 'P1' || a.priority === 'p1')).length
  const citations = dashData?.lifecycle?.total_citations ?? dashData?.lifecycle?.weekly_citations ?? 47
  const firstWord = brandName.split(/[\s（(]/)[0]

  const Skeleton = () => (
    <div style={{ height: 50, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'cp-pulse 1.5s ease-in-out infinite' }} />
  )

  return (
    <div className="cp-content fade-in">
      <style>{`@keyframes cp-pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>

      {/* Hero */}
      <div style={{ marginBottom: 20 }}>
        <span className="badge badge-green" style={{ marginBottom: 12 }}>
          <span className="cp-dot dot-pulse" /> 監測中 · 實時更新
        </span>
        <h1 className="cp-h1" style={{ marginBottom: 6 }}>
          歡迎回來，<span className="cp-gold">{firstWord}</span>
        </h1>
        <p className="cp-small" style={{ fontSize: 13.5, margin: 0 }}>
          管理品牌的 AI 能見度、FAQ 與產品資料
        </p>
      </div>

      {/* Score ring + platforms */}
      <div className="glass" style={{ padding: 18, marginBottom: 14 }}>
        <div className="cp-row cp-between cp-gap-12" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
          <div>
            <div className="cp-label" style={{ marginBottom: 4 }}>今日 AI 能見度</div>
            <div className="cp-h3" style={{ marginBottom: 4 }}>{okCount}/4 個 AI 平台已收錄</div>
            {scoreDelta !== 0 && (
              <div className="cp-row cp-gap-6" style={{ fontSize: 12.5 }}>
                <Icon name="arrow-up" size={13} stroke={2.4} style={{ color: 'var(--cp-green)' }} />
                <span style={{ color: 'var(--cp-green)', fontWeight: 600 }}>+{scoreDelta}</span>
                <span className="cp-muted">本週</span>
              </div>
            )}
          </div>
          <ScoreRing value={score} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {platformList.map(p => (
            <div key={p.key} className="platform-pill">
              <div className="platform-left">
                <div className={`platform-icon ${p.key}`}>{p.name[0]}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="platform-name">{p.name}</div>
                  <div className="platform-stat">{p.ok ? '已收錄' : '尚未提及'}</div>
                </div>
              </div>
              {p.ok
                ? <span className="badge badge-green"><span className="cp-dot dot-pulse" /> 提及</span>
                : <span className="badge badge-red">未提及</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 2×2 stat grid */}
      <div className="stat-grid-2" style={{ marginBottom: 14 }}>
        {[
          { icon: 'target',    label: 'AEO 待完成', value: `${pendingCount} 項`, sub: `P1 優先 ${p1Count} 項`, tab: 'aeo' as TabKey, accent: undefined },
          { icon: 'sparkles', label: 'AI 對話',     value: '立即開始',           sub: '策略顧問',             tab: null,             accent: 'rgba(96,165,250,0.10)' },
          { icon: 'help',      label: '已發布 FAQ',  value: '—',                  sub: '點擊管理',              tab: 'faq' as TabKey,  accent: 'rgba(74,222,128,0.10)' },
          { icon: 'box',       label: '產品目錄',    value: '—',                  sub: '點擊管理',              tab: 'products' as TabKey, accent: 'rgba(199,123,217,0.10)' },
        ].map(tile => (
          <div
            key={tile.label}
            className="glass glass-hover"
            onClick={() => tile.tab && onNav(tile.tab)}
            style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div className="cp-row cp-between cp-gap-8" style={{ alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: tile.accent ?? 'rgba(245,200,66,0.10)', border: `1px solid ${tile.accent ? 'rgba(255,255,255,0.08)' : 'rgba(245,200,66,0.25)'}`, color: 'var(--cp-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name={tile.icon} size={16} stroke={2} />
              </div>
              <Icon name="chevron-right" size={15} style={{ color: 'var(--cp-text-faint)' }} />
            </div>
            <div className="cp-label" style={{ marginTop: 2 }}>{tile.label}</div>
            <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }} className="cp-num">{tile.value}</div>
            <div className="cp-small" style={{ fontSize: 12 }}>{tile.sub}</div>
          </div>
        ))}
      </div>

      {/* Weekly report */}
      <div className="glass" style={{ padding: 16, marginBottom: 14 }}>
        <div className="cp-row cp-between" style={{ marginBottom: 8 }}>
          <div>
            <div className="cp-label">本週報告</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 700 }} className="cp-num">{citations}</span>
              <span className="cp-small">次引用</span>
              <span className="badge badge-green" style={{ marginLeft: 4 }}>
                <Icon name="arrow-up" size={10} stroke={2.6} /> +23%
              </span>
            </div>
          </div>
        </div>
        <Sparkline data={SPARKLINE_DATA} />
        <div className="cp-row cp-between cp-small" style={{ marginTop: 4, fontSize: 11.5 }}>
          <span>過去 18 天</span>
          <span>已連接 AI 監測</span>
        </div>
      </div>

      {/* Contact CP */}
      <div className="glass" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,200,66,0.10)', border: '1px solid rgba(245,200,66,0.25)', color: 'var(--cp-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="sparkles" size={18} stroke={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cp-h4">需要支援？</div>
          <div className="cp-small" style={{ fontSize: 12.5 }}>聯絡 CloudPipe 團隊取得策略建議</div>
        </div>
        <button className="btn btn-ghost btn-sm">聯絡</button>
      </div>
    </div>
  )
}

// ── AEO screen ─────────────────────────────────────────────────────────

function AeoScreen({ brandSlug }: { brandSlug: string }) {
  const [actions, setActions] = useState<AeoAction[]>([])
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState<Set<string | number>>(new Set())
  const [priFilter, setPriFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/v1/brand-aeo-score/${brandSlug}`)
      .then(r => r.json())
      .then(data => {
        const acts: AeoAction[] = data.actions ?? data.aeo_actions ?? []
        setActions(acts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brandSlug])

  const cats = useMemo(() => Array.from(new Set(actions.map(a => a.category ?? a.cat ?? '其他'))), [actions])

  const list = useMemo(() => {
    return actions.filter(a => {
      const pri = (a.priority ?? '').toLowerCase()
      if (priFilter !== 'all' && pri !== priFilter) return false
      const cat = a.category ?? a.cat ?? '其他'
      if (catFilter !== 'all' && cat !== catFilter) return false
      return true
    })
  }, [actions, priFilter, catFilter])

  const openCount = actions.filter(a => !completed.has(a.id)).length
  const p1Count = actions.filter(a => (a.priority?.toUpperCase() === 'P1') && !completed.has(a.id)).length

  const markDone = (id: string | number) => {
    setCompleted(s => { const n = new Set(s); n.add(id); return n })
    setToast('已標記為完成 ✓')
    setTimeout(() => setToast(null), 1800)
  }

  if (loading) return (
    <div className="cp-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div className="cp-spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div className="cp-content fade-in">
      <div className="section-head">
        <div>
          <div className="cp-label" style={{ marginBottom: 6 }}>AEO 行動計劃</div>
          <h1 className="cp-h2">提升 AI 能見度</h1>
          <p className="cp-small" style={{ margin: '4px 0 0' }}>
            <span style={{ color: 'var(--cp-gold)', fontWeight: 600 }}>{openCount}</span> 待完成 ·
            P1 優先 <span style={{ color: 'var(--cp-red)', fontWeight: 600 }}>{p1Count}</span>
          </p>
        </div>
      </div>

      <div className="filter-row">
        {['all', 'p1', 'p2', 'p3'].map(f => (
          <button key={f} className={`chip ${priFilter === f ? 'active' : ''}`} onClick={() => setPriFilter(f)}>
            {f === 'all' ? '全部優先度' : f === 'p1' ? '🔴 P1' : f === 'p2' ? '🟡 P2' : '🔵 P3'}
          </button>
        ))}
        <div style={{ width: 1, background: 'var(--cp-glass-border)', margin: '0 4px' }} />
        <button className={`chip ${catFilter === 'all' ? 'active' : ''}`} onClick={() => setCatFilter('all')}>全部分類</button>
        {cats.map(c => (
          <button key={c} className={`chip ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="glass" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div className="cp-h4" style={{ marginBottom: 4 }}>沒有符合篩選的行動</div>
          <div className="cp-small">試試重置篩選，或繼續保持良好的 AEO 狀態！</div>
        </div>
      )}

      {list.map(a => {
        const done = completed.has(a.id)
        const pri = (a.priority ?? 'P3').toLowerCase()
        const title = a.action_title ?? a.title ?? '行動項'
        const desc = a.description ?? ''
        const cat = a.category ?? a.cat ?? ''
        const due = a.due_date ?? ''
        return (
          <div key={a.id} className="glass aeo-item fade-in" style={{ opacity: done ? 0.55 : 1 }}>
            <div className="cp-row cp-between cp-gap-8" style={{ alignItems: 'flex-start' }}>
              <div className="cp-row cp-gap-8" style={{ flexWrap: 'wrap' }}>
                <span className={`aeo-pri ${pri}`}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: 'currentColor' }} />
                  {a.priority?.toUpperCase() ?? 'P3'}
                </span>
                {cat && <span className="badge">{cat}</span>}
              </div>
              {due && <div className="cp-small" style={{ fontSize: 11.5, color: 'var(--cp-text-faint)' }}>{due.slice(0, 10)}</div>}
            </div>
            <div className="cp-h4" style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--cp-text-muted)' : 'var(--cp-text)' }}>
              {title}
            </div>
            {desc && <div className="cp-small" style={{ fontSize: 13 }}>{desc}</div>}
            <div className="cp-row cp-between cp-gap-8" style={{ marginTop: 4 }}>
              <div />
              <button
                className={done ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
                onClick={() => markDone(a.id)}
                disabled={done}
              >
                {done ? <><Icon name="check" size={12} stroke={2.4} /> 已完成</> : '標記完成'}
              </button>
            </div>
          </div>
        )
      })}

      <div className="glass" style={{ padding: 14, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(96,165,250,0.10)', color: 'var(--cp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="sparkles" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cp-h4">需要更多建議？</div>
          <div className="cp-small" style={{ fontSize: 12.5 }}>讓 AI 顧問針對您的品牌生成自訂行動清單</div>
        </div>
        <button className="btn btn-ghost btn-sm">啟動</button>
      </div>

      {toast && <div className="cp-toast">{toast}</div>}
    </div>
  )
}

// ── FAQ screen ─────────────────────────────────────────────────────────

function FaqScreen({ brandSlug }: { brandSlug: string }) {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draft, setDraft] = useState({ q: '', a: '' })
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch(`/api/v1/brand-faqs/${brandSlug}`)
      .then(r => r.json())
      .then(data => {
        const faqs: FaqItem[] = (data.faqs ?? data ?? []).map((f: Record<string, unknown>) => ({
          id: f.id ?? f.faq_id,
          question: String(f.question ?? f.q ?? ''),
          answer: String(f.answer ?? f.a ?? ''),
          lang: String(f.lang ?? 'zh'),
          is_published: Boolean(f.is_published ?? true),
        }))
        setItems(faqs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brandSlug])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800) }
  const cancel = () => { setShowAdd(false); setEditingId(null); setDraft({ q: '', a: '' }) }

  const save = async () => {
    if (!draft.q.trim() || !draft.a.trim()) return
    try {
      if (editingId) {
        await fetch(`/api/v1/brand-faqs/${brandSlug}/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: draft.q, answer: draft.a }),
        })
        setItems(arr => arr.map(it => it.id === editingId ? { ...it, question: draft.q, answer: draft.a } : it))
        showToast('已更新 FAQ ✓')
      } else {
        const res = await fetch(`/api/v1/brand-faqs/${brandSlug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: draft.q, answer: draft.a, lang: 'zh', is_published: true }),
        })
        const created = await res.json()
        const newItem: FaqItem = { id: created.id ?? Date.now(), question: draft.q, answer: draft.a, lang: 'zh', is_published: true }
        setItems(arr => [newItem, ...arr])
        showToast('已新增 FAQ ✓')
      }
    } catch {
      showToast('操作失敗，請稍後再試')
    }
    cancel()
  }

  const del = async (id: string | number) => {
    try {
      await fetch(`/api/v1/brand-faqs/${brandSlug}/${id}`, { method: 'DELETE' })
      setItems(arr => arr.filter(it => it.id !== id))
      setConfirmDel(null)
      showToast('已刪除 FAQ')
    } catch {
      showToast('刪除失敗')
    }
  }

  const filtered = items.filter(it => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return it.question.toLowerCase().includes(q) || it.answer.toLowerCase().includes(q)
  })

  const EditorForm = ({ onCancel }: { onCancel: () => void }) => (
    <div className="glass fade-in" style={{ padding: 16, marginBottom: 10, borderColor: 'rgba(245,200,66,0.25)' }}>
      <div className="cp-label" style={{ color: 'var(--cp-gold)', marginBottom: 12 }}>{editingId ? '編輯 FAQ' : '新增 FAQ'}</div>
      <div className="cp-col cp-gap-12">
        <div className="field">
          <label className="cp-label">問題</label>
          <input className="cp-input" value={draft.q} onChange={e => setDraft(d => ({ ...d, q: e.target.value }))} placeholder="例如：你們的最低訂購量是多少？" autoFocus />
        </div>
        <div className="field">
          <label className="cp-label">答案</label>
          <textarea className="cp-textarea" rows={3} value={draft.a} onChange={e => setDraft(d => ({ ...d, a: e.target.value }))} placeholder="清楚、第一人稱、含具體數字 — AI 更愛引用" />
          <div className="cp-small" style={{ fontSize: 11.5 }}>{draft.a.length} 字 · 建議 80-200 字</div>
        </div>
        <div className="cp-row cp-gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>取消</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!draft.q.trim() || !draft.a.trim()}>
            {editingId ? '儲存變更' : '新增 FAQ'}
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="cp-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div className="cp-spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div className="cp-content fade-in">
      <div className="section-head">
        <div>
          <div className="cp-label" style={{ marginBottom: 6 }}>FAQ 管理</div>
          <h1 className="cp-h2">問與答</h1>
          <p className="cp-small" style={{ margin: '4px 0 0' }}>
            共 <span style={{ color: 'var(--cp-gold)', fontWeight: 600 }}>{items.length}</span> 條 FAQ
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingId(null); setShowAdd(true); setDraft({ q: '', a: '' }) }}>
          <Icon name="plus" size={14} stroke={2.4} /> 新增
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Icon name="search" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--cp-text-faint)', pointerEvents: 'none' }} />
        <input className="cp-input" style={{ paddingLeft: 40 }} placeholder="搜尋問題或答案…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {showAdd && <EditorForm onCancel={cancel} />}

      {filtered.length === 0 && !showAdd && (
        <div className="glass" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{query ? '🔍' : '❓'}</div>
          <div className="cp-h4" style={{ marginBottom: 4 }}>{query ? '沒有符合的 FAQ' : '尚未新增 FAQ'}</div>
          <div className="cp-small">{query ? '試試其他關鍵字' : '新增 FAQ 可大幅提升 AI 引用率'}</div>
        </div>
      )}

      {filtered.map(it => {
        if (editingId === it.id) return <div key={it.id}><EditorForm onCancel={cancel} /></div>
        return (
          <div key={it.id} className="glass faq-item fade-in">
            <div className="faq-q">
              <span className="faq-q-mark">Q.</span>
              <span style={{ flex: 1 }}>{it.question}</span>
            </div>
            <div className="faq-a">{it.answer}</div>
            {confirmDel === it.id ? (
              <div className="cp-row cp-between" style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 10, border: '1px solid var(--cp-red-border)' }}>
                <span className="cp-small" style={{ fontSize: 12.5, color: 'var(--cp-red)' }}>確定刪除此 FAQ？</span>
                <div className="cp-row cp-gap-6">
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>取消</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(it.id)}><Icon name="trash" size={12} stroke={2.2} /> 刪除</button>
                </div>
              </div>
            ) : (
              <div className="cp-row cp-between" style={{ marginTop: 12 }}>
                <div className="cp-row cp-gap-6">
                  <span className="badge">{it.lang === 'en' ? '英文' : '中文'}</span>
                  {it.is_published && <span className="badge badge-green"><Icon name="check" size={9} stroke={3} /> 已發布</span>}
                </div>
                <div className="cp-row cp-gap-6">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); setEditingId(it.id); setDraft({ q: it.question, a: it.answer }) }}>
                    <Icon name="edit" size={12} stroke={2.2} /> 編輯
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(it.id)} style={{ color: 'var(--cp-red)' }}>
                    <Icon name="trash" size={12} stroke={2.2} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {items.length > 0 && (
        <div className="glass" style={{ padding: 14, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(245,200,66,0.10)', color: 'var(--cp-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="lightning" size={16} stroke={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cp-h4">注入到公開頁</div>
            <div className="cp-small" style={{ fontSize: 12.5 }}>讓所有 FAQ 立即被 AI 爬蟲索引</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            try {
              await fetch(`/api/v1/brand-faqs/${brandSlug}/inject`, { method: 'POST' })
              showToast(`已注入 ${items.length} 條 FAQ ✓`)
            } catch { showToast('注入失敗') }
          }}>注入</button>
        </div>
      )}

      {toast && <div className="cp-toast">{toast}</div>}
    </div>
  )
}

// ── Products screen ────────────────────────────────────────────────────

function ProductsScreen({ brandSlug }: { brandSlug: string }) {
  const [items, setItems] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', price: '', min: '', desc: '', flagship: false })

  useEffect(() => {
    fetch(`/api/v1/brand-products/${brandSlug}`)
      .then(r => r.json())
      .then(data => {
        const prods: ProductItem[] = (data.products ?? data ?? []).map((p: Record<string, unknown>) => ({
          id: p.id,
          name_zh: String(p.name_zh ?? p.name ?? ''),
          name_en: String(p.name_en ?? ''),
          price_mop: Number(p.price_mop ?? 0),
          min_order: String(p.min_order ?? ''),
          description: String(p.description ?? ''),
          is_flagship: Boolean(p.is_flagship ?? false),
        }))
        setItems(prods)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brandSlug])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800) }
  const cancel = () => { setShowAdd(false); setEditingId(null) }

  const save = async () => {
    if (!draft.name.trim()) return
    const body = { name_zh: draft.name, price_mop: parseFloat(draft.price) || 0, min_order: draft.min, description: draft.desc, is_flagship: draft.flagship }
    try {
      if (editingId) {
        await fetch(`/api/v1/brand-products/${brandSlug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...body }),
        })
        setItems(arr => arr.map(it => it.id === editingId ? { ...it, name_zh: draft.name, price_mop: body.price_mop, min_order: draft.min, description: draft.desc, is_flagship: draft.flagship } : it))
        showToast('已更新產品 ✓')
      } else {
        const res = await fetch(`/api/v1/brand-products/${brandSlug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const created = await res.json()
        setItems(arr => [{ id: created.id ?? Date.now(), ...body, name_zh: draft.name }, ...arr])
        showToast('已新增產品 ✓')
      }
    } catch { showToast('操作失敗') }
    cancel()
  }

  const del = async (id: string | number) => {
    try {
      await fetch(`/api/v1/brand-products/${brandSlug}?id=${id}`, { method: 'DELETE' })
      setItems(arr => arr.filter(it => it.id !== id))
      setConfirmDel(null)
      showToast('已刪除產品')
    } catch { showToast('刪除失敗') }
  }

  const EditorForm = ({ onCancel }: { onCancel: () => void }) => (
    <div className="glass fade-in" style={{ padding: 16, marginBottom: 10, borderColor: 'rgba(245,200,66,0.25)' }}>
      <div className="cp-label" style={{ color: 'var(--cp-gold)', marginBottom: 12 }}>{editingId ? '編輯產品' : '新增產品'}</div>
      <div className="cp-col cp-gap-12">
        <div className="field">
          <label className="cp-label">產品名稱</label>
          <input className="cp-input" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="例如：北海道馬糞海膽" autoFocus />
        </div>
        <div className="desk-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label className="cp-label">價格 (MOP)</label>
            <input className="cp-input" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} placeholder="580" />
          </div>
          <div className="field">
            <label className="cp-label">最低訂購</label>
            <input className="cp-input" value={draft.min} onChange={e => setDraft(d => ({ ...d, min: e.target.value }))} placeholder="5kg" />
          </div>
        </div>
        <div className="field">
          <label className="cp-label">描述</label>
          <textarea className="cp-textarea" rows={2} value={draft.desc} onChange={e => setDraft(d => ({ ...d, desc: e.target.value }))} placeholder="產地、規格、適用場景…" />
        </div>
        <label className="cp-row cp-gap-8" style={{ cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={draft.flagship} onChange={e => setDraft(d => ({ ...d, flagship: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--cp-gold)' }} />
          <span className="cp-small" style={{ color: 'var(--cp-text)' }}>標記為旗艦產品</span>
        </label>
        <div className="cp-row cp-gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>取消</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!draft.name.trim()}>{editingId ? '儲存變更' : '新增'}</button>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="cp-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div className="cp-spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  const flagshipCount = items.filter(i => i.is_flagship).length

  return (
    <div className="cp-content fade-in">
      <div className="section-head">
        <div>
          <div className="cp-label" style={{ marginBottom: 6 }}>產品目錄</div>
          <h1 className="cp-h2">產品管理</h1>
          <p className="cp-small" style={{ margin: '4px 0 0' }}>
            共 <span style={{ color: 'var(--cp-gold)', fontWeight: 600 }}>{items.length}</span> 個產品 ·
            旗艦 <span style={{ color: 'var(--cp-gold)', fontWeight: 600 }}>{flagshipCount}</span> 個
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingId(null); setShowAdd(true); setDraft({ name: '', price: '', min: '', desc: '', flagship: false }) }}>
          <Icon name="plus" size={14} stroke={2.4} /> 新增
        </button>
      </div>

      {showAdd && <EditorForm onCancel={cancel} />}

      {items.map(it => {
        if (editingId === it.id) {
          return <div key={it.id}><EditorForm onCancel={cancel} /></div>
        }
        const priceStr = it.price_mop ? `MOP$${it.price_mop}` : ''
        return (
          <div key={it.id} className="glass product-card fade-in">
            <div className="cp-row cp-gap-12" style={{ alignItems: 'flex-start' }}>
              <div className="product-thumb">📦</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cp-row cp-between cp-gap-8" style={{ alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="cp-row cp-gap-6" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
                      {it.is_flagship && <span className="badge badge-gold"><Icon name="star" size={9} /> 旗艦</span>}
                    </div>
                    <div className="cp-h4">{it.name_zh}</div>
                  </div>
                </div>
                <div className="cp-row cp-gap-12" style={{ marginTop: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  {priceStr && <span style={{ color: 'var(--cp-gold)', fontWeight: 700, fontSize: 14 }} className="cp-num">{priceStr}</span>}
                  {it.min_order && <span className="cp-small" style={{ fontSize: 12 }}>· {it.min_order}</span>}
                </div>
                {it.description && <div className="cp-small" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>{it.description}</div>}

                {confirmDel === it.id ? (
                  <div className="cp-row cp-between" style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 10, border: '1px solid var(--cp-red-border)' }}>
                    <span className="cp-small" style={{ fontSize: 12.5, color: 'var(--cp-red)' }}>確定刪除？</span>
                    <div className="cp-row cp-gap-6">
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>取消</button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(it.id)}><Icon name="trash" size={12} stroke={2.2} /> 刪除</button>
                    </div>
                  </div>
                ) : (
                  <div className="cp-row cp-gap-6" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      setShowAdd(false)
                      setEditingId(it.id)
                      setDraft({ name: it.name_zh ?? '', price: String(it.price_mop ?? ''), min: it.min_order ?? '', desc: it.description ?? '', flagship: it.is_flagship ?? false })
                    }}><Icon name="edit" size={12} stroke={2.2} /> 編輯</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(it.id)} style={{ color: 'var(--cp-red)' }}><Icon name="trash" size={12} stroke={2.2} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {items.length === 0 && !showAdd && (
        <div className="glass" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
          <div className="cp-h4" style={{ marginBottom: 4 }}>尚未新增產品</div>
          <div className="cp-small">新增產品讓 AI 引擎了解您的銷售品項</div>
        </div>
      )}

      {toast && <div className="cp-toast">{toast}</div>}
    </div>
  )
}

// ── Profile screen ─────────────────────────────────────────────────────

const PROFILE_FIELDS = [
  { key: 'name_zh',       label: '品牌名稱（中文）', placeholder: '稻荷環球食品',           type: 'input' as const },
  { key: 'name_en',       label: '品牌名稱（英文）', placeholder: 'Inari Global Foods',     type: 'input' as const },
  { key: 'tagline',       label: '品牌標語',          placeholder: '一句話說明你的品牌',    type: 'input' as const },
  { key: 'description',   label: '品牌簡介',          placeholder: '品牌故事、目標客戶、核心價值…', type: 'textarea' as const },
  { key: 'phone',         label: '聯絡電話',          placeholder: '+853 2871 0000',         type: 'input' as const },
  { key: 'address',       label: '地址',              placeholder: '澳門…',                  type: 'input' as const },
  { key: 'website_url',   label: '網站 URL',          placeholder: 'https://…',              type: 'input' as const },
  { key: 'instagram_url', label: 'Instagram',         placeholder: '@yourbrand',             type: 'input' as const },
  { key: 'facebook_url',  label: 'Facebook',          placeholder: 'fb.com/yourbrand',       type: 'input' as const },
]

function ProfileScreen({ brandSlug, userEmail, onLogout }: {
  brandSlug: string; userEmail: string; onLogout: () => void
}) {
  const [form, setForm] = useState<BrandProfile>({ brand_slug: brandSlug })
  const [initial, setInitial] = useState<BrandProfile>({ brand_slug: brandSlug })
  const [loading, setLoading] = useState(true)
  const [savingPhase, setSavingPhase] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/brand-profile/${brandSlug}`)
      .then(r => r.json())
      .then(data => {
        const profile = data.profile ?? data ?? {}
        setForm(profile)
        setInitial(profile)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brandSlug])

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setDirty(true) }

  const filledCount = PROFILE_FIELDS.filter(f => form[f.key]?.trim()).length
  const completeness = Math.round((filledCount / PROFILE_FIELDS.length) * 100)

  const save = async () => {
    setSavingPhase('saving')
    try {
      await fetch(`/api/v1/brand-profile/${brandSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setInitial(form)
      setDirty(false)
      setSavingPhase('saved')
      setTimeout(() => setSavingPhase('idle'), 2400)
    } catch {
      setSavingPhase('idle')
    }
  }

  if (loading) return (
    <div className="cp-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div className="cp-spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div className="cp-content fade-in">
      <div className="section-head">
        <div>
          <div className="cp-label" style={{ marginBottom: 6 }}>品牌資料</div>
          <h1 className="cp-h2">編輯品牌</h1>
          <p className="cp-small" style={{ margin: '4px 0 0' }}>資料會影響 AI 引擎對您品牌的理解</p>
        </div>
      </div>

      {/* Completeness bar */}
      <div className="glass" style={{ padding: 14, marginBottom: 16 }}>
        <div className="cp-row cp-between" style={{ marginBottom: 8 }}>
          <div className="cp-label">資料完整度</div>
          <div style={{ color: 'var(--cp-gold)', fontWeight: 700, fontSize: 14 }} className="cp-num">{completeness}%</div>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${completeness}%`, background: 'linear-gradient(90deg, var(--cp-gold), var(--cp-gold-2))', borderRadius: 999, transition: 'width 800ms ease-out' }} />
        </div>
        <div className="cp-small" style={{ marginTop: 8, fontSize: 12.5 }}>
          ⓘ 完整度 ≥ 90% 的品牌 AEO 引用率平均高出 2.4 倍
        </div>
      </div>

      {/* Form */}
      <div className="glass" style={{ padding: 18 }}>
        <div className="desk-2col" style={{ display: 'grid', gap: 14 }}>
          {PROFILE_FIELDS.filter(f => f.type === 'input').map(f => (
            <div key={f.key} className="field">
              <label className="cp-label">{f.label}</label>
              <input className="cp-input" value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PROFILE_FIELDS.filter(f => f.type === 'textarea').map(f => (
            <div key={f.key} className="field">
              <label className="cp-label">{f.label}</label>
              <textarea className="cp-textarea" rows={3} value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
              <div className="cp-small" style={{ fontSize: 11.5 }}>{(form[f.key] ?? '').length} 字 · 建議 100-300 字</div>
            </div>
          ))}
        </div>
      </div>

      {/* Save bar */}
      <div className="glass" style={{ padding: 14, marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', bottom: 80, zIndex: 5 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {savingPhase === 'saved' ? (
            <div className="cp-row cp-gap-8" style={{ color: 'var(--cp-green)' }}>
              <Icon name="check" size={15} stroke={2.4} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>已儲存</span>
            </div>
          ) : dirty ? (
            <div className="cp-small" style={{ color: 'var(--cp-amber)', fontWeight: 500 }}>● 有未儲存的變更</div>
          ) : (
            <div className="cp-small" style={{ fontSize: 12.5 }}>所有變更已同步</div>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setForm(initial); setDirty(false) }} disabled={!dirty}>取消</button>
        <button className="btn btn-primary" onClick={save} disabled={!dirty || savingPhase === 'saving'}>
          {savingPhase === 'saving' ? <><div className="cp-spinner" style={{ width: 14, height: 14 }} /> 儲存中</> : '儲存更改'}
        </button>
      </div>

      {/* Account block */}
      <div className="glass" style={{ padding: 16, marginTop: 16 }}>
        <div className="cp-label" style={{ marginBottom: 12 }}>帳號</div>
        <div className="cp-row cp-gap-12">
          <div className="brand-avatar" style={{ background: 'var(--cp-glass)', border: '1px solid var(--cp-glass-border)' }}>
            <Icon name="user" size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }} className="cp-truncate">{userEmail}</div>
            <div className="cp-small" style={{ fontSize: 12 }}>Magic Link 已驗證 · 24h 有效</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}><Icon name="logout" size={13} stroke={2.2} /> 登出</button>
        </div>
      </div>
    </div>
  )
}

// ── Login screen ───────────────────────────────────────────────────────

function LoginScreen({ brandSlug, brandName, onAuthed }: {
  brandSlug: string; brandName: string; onAuthed: (email: string, token: string) => void
}) {
  type Phase = 'input' | 'sending' | 'sent' | 'verifying' | 'verified'
  const [phase, setPhase] = useState<Phase>('input')
  const [email, setEmail] = useState('inari@cloudpipe.ai')
  const [magicToken, setMagicToken] = useState('')
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!isValid) return
    setPhase('sending')
    try {
      const res = await fetch('/api/v1/brand-auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), brand_slug: brandSlug }),
      })
      const data = await res.json()
      if (data.token) setMagicToken(data.token)
    } catch {}
    setPhase('sent')
  }

  const simulateClick = async () => {
    setPhase('verifying')
    try {
      if (magicToken) {
        const res = await fetch(`/api/v1/brand-auth/verify?token=${magicToken}`)
        const data = await res.json()
        if (data.valid) {
          setPhase('verified')
          setTimeout(() => onAuthed(data.email, magicToken), 600)
          return
        }
      }
    } catch {}
    // fallback: bypass without real token
    setPhase('verified')
    setTimeout(() => onAuthed(email.trim(), ''), 600)
  }

  return (
    <div className="auth-screen">
      <div className="cp-aurora" />
      <div className="auth-card glass fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div className="cp-logo-mark" style={{ width: 56, height: 56, borderRadius: 16, fontSize: 22 }}>
            <Icon name="cloud" size={28} stroke={2.2} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="cp-h2" style={{ marginBottom: 4 }}>歡迎回到 <span className="cp-gold">CloudPipe</span></div>
            <div className="cp-small">品牌商戶後台 · {brandName}</div>
          </div>
        </div>

        {phase === 'input' && (
          <form onSubmit={submit} className="cp-col cp-gap-12 fade-in">
            <div className="field">
              <label className="cp-label">登入 Email</label>
              <input className="cp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@your-brand.mo" autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!isValid}>
              <Icon name="mail" size={16} stroke={2} /> 發送 Magic Link
            </button>
            <p className="cp-small" style={{ textAlign: 'center', margin: 0 }}>我們會發送一封含登入連結的 Email · 15 分鐘內有效</p>
          </form>
        )}

        {phase === 'sending' && (
          <div className="cp-col cp-gap-16 fade-in" style={{ alignItems: 'center', padding: '24px 0' }}>
            <div className="cp-spinner" style={{ width: 28, height: 28 }} />
            <div className="cp-small">正在發送至 <span style={{ color: 'var(--cp-text)' }}>{email}</span>…</div>
          </div>
        )}

        {phase === 'sent' && (
          <div className="cp-col cp-gap-12 fade-in" style={{ alignItems: 'stretch', padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'var(--cp-green-bg)', border: '1px solid var(--cp-green-border)', borderRadius: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: 'rgba(74,222,128,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-green)', flex: 'none' }}>
                <Icon name="check" size={16} stroke={2.5} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--cp-green)' }}>連結已發送</div>
                <div className="cp-small cp-truncate" style={{ fontSize: 12.5 }}>請查看 {email} 的收件匣</div>
              </div>
            </div>
            <p className="cp-small" style={{ textAlign: 'center', margin: '4px 0' }}>沒收到？檢查垃圾郵件，或</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setPhase('input')}>更換 Email</button>
            <hr className="cp-divider" />
            <button className="btn btn-primary" onClick={simulateClick}>
              <Icon name="lightning" size={16} stroke={2.2} /> Demo：模擬點擊連結
            </button>
            <p className="cp-small" style={{ textAlign: 'center', fontSize: 11, margin: 0, color: 'var(--cp-text-faint)' }}>（此原型用本機 Demo 跳過實際郵件）</p>
          </div>
        )}

        {phase === 'verifying' && (
          <div className="cp-col cp-gap-12 fade-in" style={{ alignItems: 'center', padding: '24px 0' }}>
            <div className="cp-spinner" style={{ width: 28, height: 28 }} />
            <div className="cp-small">驗證 Token 中…</div>
          </div>
        )}

        {phase === 'verified' && (
          <div className="cp-col cp-gap-12 fade-in" style={{ alignItems: 'center', padding: '24px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: 'rgba(74,222,128,0.18)', border: '1px solid var(--cp-green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-green)' }}>
              <Icon name="check" size={24} stroke={2.5} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="cp-h3" style={{ color: 'var(--cp-green)' }}>驗證成功</div>
              <div className="cp-small">正在進入您的後台…</div>
            </div>
          </div>
        )}
      </div>

      <div className="cp-small" style={{ position: 'relative', zIndex: 1, marginTop: 20, textAlign: 'center', fontSize: 12 }}>
        登入即同意 <a href="#" style={{ color: 'var(--cp-text-muted)', textDecoration: 'underline' }}>服務條款</a> 與 <a href="#" style={{ color: 'var(--cp-text-muted)', textDecoration: 'underline' }}>隱私政策</a>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────

export default function PortalPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandSlug = typeof params.brand === 'string' ? params.brand : ''

  const [authState, setAuthState] = useState<AuthState>('loading')
  const [session, setSession] = useState<PortalSession | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [dashData, setDashData] = useState<DashData | null>(null)
  const [dashLoading, setDashLoading] = useState(false)

  // Auth
  useEffect(() => {
    if (!brandSlug) return
    const storedKey = `portal_session_${brandSlug}`
    const stored = localStorage.getItem(storedKey)
    if (stored) {
      try {
        const parsed: PortalSession = JSON.parse(stored)
        if (parsed.expires > Date.now() && parsed.brand_slug === brandSlug) {
          setSession(parsed)
          setAuthState('authenticated')
          return
        }
        localStorage.removeItem(storedKey)
      } catch { localStorage.removeItem(storedKey) }
    }

    const token = searchParams.get('token')
    if (!token) {
      // No session, no token — show login
      setAuthState('invalid')
      return
    }

    fetch(`/api/v1/brand-auth/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.valid) {
          setErrorMsg(data.error || '登入連結無效或已過期')
          setAuthState('invalid')
          return
        }
        const newSession: PortalSession = {
          brand_slug: data.brand_slug ?? brandSlug,
          email: data.email ?? '',
          expires: Date.now() + 24 * 60 * 60 * 1000,
        }
        localStorage.setItem(storedKey, JSON.stringify(newSession))
        setSession(newSession)
        setAuthState('authenticated')
        window.history.replaceState({}, '', `/portal/${brandSlug}`)
      })
      .catch(() => {
        setErrorMsg('網路錯誤，請稍後再試')
        setAuthState('invalid')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandSlug])

  // Fetch dashboard data
  useEffect(() => {
    if (authState !== 'authenticated' || !brandSlug) return
    setDashLoading(true)
    const token = localStorage.getItem(`portal_token_${brandSlug}`) ?? ''
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    Promise.all([
      fetch(`/api/v1/brand-aeo-score/${brandSlug}`, { headers: authHeaders }).then(r => r.json()).catch(() => null),
      fetch(`/api/v1/brand-lifecycle?brand=${brandSlug}`, { headers: authHeaders }).then(r => r.json()).catch(() => null),
    ]).then(([aeoScore, lifecycle]) => {
      setDashData({ aeoScore, aeoActions: aeoScore, lifecycle })
    }).finally(() => setDashLoading(false))
  }, [authState, brandSlug])

  const onAuthed = (email: string, token: string = '') => {
    const newSession: PortalSession = {
      brand_slug: brandSlug,
      email,
      expires: Date.now() + 24 * 60 * 60 * 1000,
    }
    localStorage.setItem(`portal_session_${brandSlug}`, JSON.stringify(newSession))
    if (token) localStorage.setItem(`portal_token_${brandSlug}`, token)
    setSession(newSession)
    setAuthState('authenticated')
  }

  const onLogout = () => {
    localStorage.removeItem(`portal_session_${brandSlug}`)
    localStorage.removeItem(`portal_token_${brandSlug}`)
    setSession(null)
    setAuthState('invalid')
    setDashData(null)
    setTab('dashboard')
  }

  const goTab = (key: TabKey) => {
    setTab(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Brand display name
  const brandName = (() => {
    const map: Record<string, string> = {
      'inari-global-foods': '稻荷環球食品',
      'sea-urchin-delivery': '海膽速遞',
      'mind-cafe': 'Mind Cafe',
      'after-school-coffee': 'After School Coffee',
    }
    return map[brandSlug] ?? brandSlug
  })()

  const userEmail = session?.email ?? ''

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="cp-portal-root auth-screen">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div className="cp-spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
          <span style={{ fontSize: 13, color: 'rgba(220,230,244,0.45)' }}>驗證身份中…</span>
        </div>
      </div>
    )
  }

  // Not authenticated — show login
  if (authState === 'invalid') {
    return (
      <div className="cp-portal-root">
        <LoginScreen brandSlug={brandSlug} brandName={brandName} onAuthed={onAuthed} />
      </div>
    )
  }

  // Authenticated — show portal
  let content: React.ReactNode
  if (tab === 'dashboard') content = <DashboardScreen brandSlug={brandSlug} brandName={brandName} dashData={dashData} dashLoading={dashLoading} onNav={goTab} />
  else if (tab === 'aeo')      content = <AeoScreen brandSlug={brandSlug} />
  else if (tab === 'faq')      content = <FaqScreen brandSlug={brandSlug} />
  else if (tab === 'products') content = <ProductsScreen brandSlug={brandSlug} />
  else if (tab === 'profile')  content = <ProfileScreen brandSlug={brandSlug} userEmail={userEmail} onLogout={onLogout} />

  return (
    <div className="cp-portal-root">
      <div className="cp-app-shell">
        <Sidebar brandSlug={brandSlug} brandName={brandName} currentTab={tab} onTabChange={goTab} onLogout={onLogout} userEmail={userEmail} />
        <main className="cp-main">
          <TopBar brandName={brandName} userEmail={userEmail} onLogout={onLogout} />
          <div className="cp-content-narrow" style={{ width: '100%' }}>
            {content}
          </div>
          <TabBar currentTab={tab} onTabChange={goTab} />
        </main>
      </div>
    </div>
  )
}
