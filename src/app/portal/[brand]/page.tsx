'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { BRAND_PORTAL_CONFIGS } from '@/lib/brandPortalConfig'

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Sections ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview',  label: '總覽' },
  { id: 'aeo',       label: '行動' },
  { id: 'faq',       label: 'FAQ' },
  { id: 'products',  label: '產品' },
  { id: 'evidence',  label: '成效記錄' },
  { id: 'profile',   label: '品牌資料' },
]

// ── Brand meta ─────────────────────────────────────────────────────────────

const BRAND_META: Record<string, { avatarClass: string; initial: string; name: string }> = {
  'inari-global-foods':  { avatarClass: 'gold',  initial: '稻', name: '稻荷環球食品' },
  'sea-urchin-delivery': { avatarClass: 'coral', initial: '膽', name: '海膽速遞' },
  'mind-cafe':           { avatarClass: 'mint',  initial: 'M',  name: 'Mind Cafe' },
  'after-school-coffee': { avatarClass: 'berry', initial: 'A',  name: 'After School Coffee' },
}
function getBrandMeta(slug: string) {
  return BRAND_META[slug] ?? { avatarClass: '', initial: slug[0]?.toUpperCase() ?? '?', name: slug }
}

// ── Icon ───────────────────────────────────────────────────────────────────

function Icon({ name, size = 16, stroke = 2, style, className }: {
  name: string; size?: number; stroke?: number
  style?: React.CSSProperties; className?: string
}) {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg', width: size, height: size,
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style, className,
  }
  const icons: Record<string, React.ReactNode> = {
    cloud:         <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></>,
    home:          <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    target:        <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    help:          <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    box:           <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    settings:      <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    logout:        <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    user:          <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    mail:          <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    check:         <><polyline points="20 6 9 17 4 12"/></>,
    plus:          <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit:          <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:         <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    search:        <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    sparkles:      <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></>,
    lightning:     <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    'arrow-up':    <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    'arrow-right': <><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></>,
    'chevron-down':<><polyline points="6 9 12 15 18 9"/></>,
    star:          <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    x:             <><path d="M18 6L6 18M6 6l12 12"/></>,
  }
  return <svg {...common}>{icons[name] ?? null}</svg>
}

// ── useReveal ──────────────────────────────────────────────────────────────

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!ref.current || shown) return
    const ob = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { setShown(true); ob.disconnect() } })
    }, { threshold, rootMargin: '0px 0px -8% 0px' })
    ob.observe(ref.current)
    return () => ob.disconnect()
  }, [shown, threshold])
  return { ref, className: shown ? 'in reveal' : 'reveal' }
}

// ── ScoreRing ──────────────────────────────────────────────────────────────

function ScoreRing({ value }: { value: number }) {
  const r = 56, c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  return (
    <div className="score-ring">
      <svg viewBox="0 0 140 140">
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

// ── Sparkline ──────────────────────────────────────────────────────────────

const SPARKLINE_DATA = [12, 14, 11, 18, 16, 22, 20, 24, 22, 28, 32, 30, 35, 38, 42, 39, 44, 47]

function Sparkline({ data }: { data: number[] }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 120); return () => clearTimeout(t) }, [])
  const w = 300, h = 60
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - ((d - min) / range) * (h - 8) - 4] as [number, number])
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1]
    len += Math.sqrt(dx*dx + dy*dy)
  }
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg className={`sparkline${drawn ? ' draw' : ''}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
      style={{ '--len': len.toFixed(1) } as React.CSSProperties}>
      <path d={path} fill="none" stroke="#B8923A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="#B8923A" />
    </svg>
  )
}

// ── BrandSwitcher ──────────────────────────────────────────────────────────

function BrandSwitcher({ brandSlug, onPickBrand }: { brandSlug: string; onPickBrand: (slug: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const meta = getBrandMeta(brandSlug)
  const allBrands = Object.entries(BRAND_META).map(([slug, m]) => ({ slug, ...m }))

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="brand-switcher" ref={ref}>
      <button className="brand-switcher-btn" onClick={() => setOpen(o => !o)}>
        <span className={`brand-avatar ${meta.avatarClass}`} style={{ width: 22, height: 22, fontSize: 11, borderRadius: 6 }}>{meta.initial}</span>
        <span className="truncate" style={{ maxWidth: 140 }}>{meta.name}</span>
        <Icon name="chevron-down" size={14} stroke={2} style={{ color: 'var(--muted)' }} />
      </button>
      {open && (
        <div className="brand-pop fade-in">
          <div style={{ padding: '8px 10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="label">切換品牌</span>
            <span className="label" style={{ color: 'var(--faint)' }}>{allBrands.length} 個</span>
          </div>
          {allBrands.map(b => (
            <div key={b.slug} className={`brand-row ${b.slug === brandSlug ? 'active' : ''}`}
              onClick={() => { onPickBrand(b.slug); setOpen(false) }}>
              <span className={`brand-avatar ${b.avatarClass}`}>{b.initial}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="truncate" style={{ fontSize: 13.5, fontWeight: 500 }}>{b.name}</div>
              </div>
              {b.slug === brandSlug && <Icon name="check" size={15} stroke={2.4} style={{ color: 'var(--gold)' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TopNav ─────────────────────────────────────────────────────────────────

function TopNav({ brandSlug, activeSection, aeoCount, faqCount, productCount, userEmail, onLogout, onPickBrand }: {
  brandSlug: string; activeSection: string
  aeoCount: number | null; faqCount: number | null; productCount: number | null
  userEmail: string; onLogout: () => void; onPickBrand: (slug: string) => void
}) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <div className="cp-logo">
          <span className="cp-logo-mark"><Icon name="cloud" size={14} stroke={2.4} /></span>
          <span>CloudPipe</span>
          <span className="tag hide-mobile" style={{ marginLeft: 4, fontSize: 9.5 }}>Portal</span>
        </div>

        <nav className="topnav-links">
          {SECTIONS.map(s => (
            <button key={s.id} className={`topnav-link ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => scrollTo(s.id)}>
              <span>{s.label}</span>
              {s.id === 'aeo'      && aeoCount     !== null && <span className="badge-num">{aeoCount}</span>}
              {s.id === 'faq'      && faqCount      !== null && <span className="badge-num">{faqCount}</span>}
              {s.id === 'products' && productCount  !== null && <span className="badge-num">{productCount}</span>}
            </button>
          ))}
        </nav>

        <div className="topnav-right">
          <BrandSwitcher brandSlug={brandSlug} onPickBrand={onPickBrand} />
          <button className="btn btn-ghost btn-sm hide-mobile" onClick={onLogout}
            title={`${userEmail} · 登出`} style={{ minHeight: 36, padding: '0 10px' }}>
            <Icon name="logout" size={14} stroke={2} />
          </button>
        </div>
      </div>
    </header>
  )
}

// ── AIBot ──────────────────────────────────────────────────────────────────

interface BotMessage { role: 'user' | 'ai'; text: string }

function AIBot({ brandSlug, brandName }: { brandSlug: string; brandName: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<BotMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const quickPrompts = [
    '如何提升 AEO 分數？',
    '推薦 3 個引用率高的 FAQ 問題',
    '幫我改寫品牌簡介',
    '為什麼 Grok 未提及我們？',
  ]

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 100)
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [open, messages.length, sending])

  useEffect(() => { setMessages([]) }, [brandSlug])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || sending) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: msg }])
    setSending(true)
    try {
      const res = await fetch('/api/v1/brand-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_slug: brandSlug, message: msg }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'ai', text: data.reply ?? '抱歉，我現在無法回應。' }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '抱歉，我現在無法回應。請稍後再試。' }])
    } finally {
      setSending(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {open && (
        <div className="bot-panel" role="dialog" aria-label="AI 助手">
          <div className="bot-head">
            <div className="bot-avatar">AI</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>CloudPipe AI 顧問</div>
              <div className="small" style={{ fontSize: 11.5, color: 'var(--green)' }}>
                <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 999, background: 'currentColor', marginRight: 4 }} />
                在線 · 了解「{brandName}」
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm"
              style={{ minHeight: 30, width: 30, padding: 0, borderRadius: 8 }} aria-label="關閉">
              <Icon name="x" size={14} stroke={2.2} />
            </button>
          </div>

          <div className="bot-body" ref={bodyRef}>
            {messages.length === 0 && (
              <>
                <div className="bot-msg welcome">
                  你好，我是你的 AI 策略顧問。試試看：
                </div>
                <div className="bot-chips">
                  {quickPrompts.map(q => (
                    <button key={q} className="bot-chip" onClick={() => send(q)}>{q}</button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`bot-msg ${m.role}`}>{m.text}</div>
            ))}
            {sending && (
              <div className="bot-typing">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            )}
          </div>

          <div className="bot-footer">
            <div className="bot-input-wrap">
              <textarea ref={inputRef} className="bot-input" placeholder="問我任何事…"
                rows={1} value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={onKey} />
              <button className="bot-send" disabled={!input.trim() || sending}
                onClick={() => send()} aria-label="發送">
                <Icon name="arrow-up" size={14} stroke={2.2} />
              </button>
            </div>
            <div className="bot-foot-note">Enter 發送 · Shift+Enter 換行</div>
          </div>
        </div>
      )}

      <button className="bot-fab" onClick={() => setOpen(o => !o)}
        aria-label={open ? '關閉 AI 顧問' : '打開 AI 顧問'}>
        {!open && <span className="bot-fab-ring" />}
        {open ? <Icon name="x" size={20} stroke={2} /> : <Icon name="sparkles" size={20} stroke={1.8} />}
      </button>
    </>
  )
}

// ── SectionOverview ────────────────────────────────────────────────────────

interface DashData {
  aeoScore?: Record<string, unknown> | null
  lifecycle?: { total_citations?: number; weekly_citations?: number } | null
}

function SectionOverview({ brandSlug, brandName, dashData, dashLoading }: {
  brandSlug: string; brandName: string
  dashData: DashData | null; dashLoading: boolean
}) {
  const reveal = useReveal()
  const aeoRaw = dashData?.aeoScore ?? null
  const score = (aeoRaw?.total_score as number) ?? (aeoRaw?.score as number) ?? 72
  const scoreDelta = (aeoRaw?.score_delta as number) ?? 0
  const priorityFixes = (aeoRaw?.priority_fixes as unknown[]) ?? []
  const pendingCount = priorityFixes.length
  const p1Count = priorityFixes.filter((f: unknown) => (f as Record<string, number>).potential_gain >= 10).length
  const citations = dashData?.lifecycle?.total_citations ?? dashData?.lifecycle?.weekly_citations ?? 47
  const firstName = brandName.split(/[\s（(]/)[0]

  // Use BRAND_PORTAL_CONFIGS for engine data (includes Copilot + detail text)
  const brandConfig = BRAND_PORTAL_CONFIGS.find(c => c.slug === brandSlug)
  const engines = brandConfig?.engines ?? []
  const okCount = engines.filter(e => e.mentioned).length
  const totalEngines = engines.length || 5

  return (
    <section id="overview" ref={reveal.ref} className={`anchor ${reveal.className}`}>
      <div className="hero">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <span className="gold-thin-rule" />
          <span className="label">01 · 總覽</span>
        </div>
        <h1 className="display" style={{ marginBottom: 14, maxWidth: 720 }}>
          歡迎回來，<span className="serif" style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--gold)' }}>{firstName}</span>。
        </h1>
        <p className="body" style={{ fontSize: 16.5, maxWidth: 640, margin: 0 }}>
          您的品牌在 <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{okCount}/{totalEngines}</strong> 個 AI 平台已被收錄
          {scoreDelta > 0 && <>，本週分數成長 <strong style={{ color: 'var(--green)', fontWeight: 600 }}>+{scoreDelta}</strong></>}。
        </p>
      </div>

      {dashLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <>
          {/* Score block */}
          <div className="card" style={{ padding: '28px 26px', overflow: 'hidden', marginBottom: 32 }}>
            <div className="row between gap-20" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="label" style={{ marginBottom: 12 }}>AI 能見度評分</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 56, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1 }} className="num">{score}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 17 }}>/ 100</span>
                </div>
                {scoreDelta > 0 && (
                  <div className="row gap-8" style={{ fontSize: 13.5, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--green)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="arrow-up" size={13} stroke={2.2} /> +{scoreDelta} 本週
                    </span>
                  </div>
                )}
              </div>
              <ScoreRing value={score} />
            </div>
            <hr className="divider" style={{ margin: '24px 0 4px' }} />
            {engines.length > 0 ? engines.map(e => (
              <div key={e.key} className="platform-row">
                <div className="row gap-12" style={{ minWidth: 0 }}>
                  <div className="platform-icon">{e.name[0]}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="platform-name">{e.name}</div>
                    <div className="platform-stat" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.mentioned ? e.detail : '尚未被引用 · ' + e.query}
                    </div>
                  </div>
                </div>
                {e.mentioned
                  ? <span className="status-pill ok"><Icon name="check" size={11} stroke={2.6} /> 提及</span>
                  : <span className="status-pill miss">未提及</span>}
              </div>
            )) : (
              ['ChatGPT', 'Perplexity', 'Gemini', 'Grok', 'Copilot'].map(name => (
                <div key={name} className="platform-row">
                  <div className="row gap-12"><div className="platform-icon">{name[0]}</div><div className="platform-name">{name}</div></div>
                  <span className="status-pill miss">未提及</span>
                </div>
              ))
            )}
          </div>

          {/* Stats grid */}
          <div className="stats">
            <a href="#aeo" className="stat-tile" onClick={e => { e.preventDefault(); document.getElementById('aeo')?.scrollIntoView({ behavior: 'smooth' }) }}>
              <div className="row between" style={{ width: '100%' }}>
                <Icon name="target" size={17} stroke={1.6} style={{ color: 'var(--text-3)' }} />
                <Icon name="arrow-right" size={14} stroke={1.8} className="stat-arrow" />
              </div>
              <div className="stat-label">AEO 行動</div>
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-sub">P1 優先 {p1Count} 項</div>
            </a>
            <a href="#faq" className="stat-tile" onClick={e => { e.preventDefault(); document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }) }}>
              <div className="row between" style={{ width: '100%' }}>
                <Icon name="help" size={17} stroke={1.6} style={{ color: 'var(--text-3)' }} />
                <Icon name="arrow-right" size={14} stroke={1.8} className="stat-arrow" />
              </div>
              <div className="stat-label">FAQ</div>
              <div className="stat-value">—</div>
              <div className="stat-sub">點擊管理</div>
            </a>
            <a href="#products" className="stat-tile" onClick={e => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) }}>
              <div className="row between" style={{ width: '100%' }}>
                <Icon name="box" size={17} stroke={1.6} style={{ color: 'var(--text-3)' }} />
                <Icon name="arrow-right" size={14} stroke={1.8} className="stat-arrow" />
              </div>
              <div className="stat-label">產品</div>
              <div className="stat-value">—</div>
              <div className="stat-sub">點擊管理</div>
            </a>
            <div className="stat-tile" style={{ cursor: 'default' }}>
              <div className="row between" style={{ width: '100%' }}>
                <Icon name="sparkles" size={17} stroke={1.6} style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="stat-label">本週引用</div>
              <div className="stat-value">{citations}</div>
              <div className="stat-sub">AI 對話次數</div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="card" style={{ padding: '22px 24px', marginBottom: 12 }}>
            <div className="row between" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>過去 18 天引用趨勢</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }} className="num">{citations}</span>
                  <span className="text-muted" style={{ fontSize: 13 }}>次引用</span>
                </div>
              </div>
              <span className="tag tag-green">↑ 已監測中</span>
            </div>
            <Sparkline data={SPARKLINE_DATA} />
          </div>
        </>
      )}
    </section>
  )
}

// ── ContentAuditRow (with notify button) ───────────────────────────────────

interface ContentAuditItem { label: string; status: 'pass' | 'partial' | 'fail'; note?: string }

function ContentAuditRow({ item, isLast, brandSlug, showToast }: {
  item: ContentAuditItem; isLast: boolean
  brandSlug: string; showToast: (msg: string) => void
}) {
  const [notified, setNotified] = useState(false)
  const [notifying, setNotifying] = useState(false)

  const handleNotify = async () => {
    setNotifying(true)
    try {
      await fetch('/api/v1/brand-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_slug: brandSlug,
          message: `請為「${item.label}」生成具體優化建議，並列出3個立即可執行的步驟。現況：${item.note ?? '需要優化'}`,
        }),
      })
      setNotified(true)
      showToast(`已通知 AI 顧問分析「${item.label}」`)
    } catch {
      showToast('通知失敗，請稍後再試')
    }
    setNotifying(false)
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--line)' }}>
      <span style={{
        flexShrink: 0, width: 18, height: 18, borderRadius: 4, marginTop: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
        background: item.status === 'pass' ? 'rgba(26,139,62,0.10)' : item.status === 'partial' ? 'rgba(180,114,0,0.10)' : 'rgba(196,37,37,0.10)',
        color: item.status === 'pass' ? 'var(--green)' : item.status === 'partial' ? 'var(--amber)' : 'var(--red)',
      }}>
        {item.status === 'pass' ? '✓' : item.status === 'partial' ? '~' : '✗'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{item.label}</div>
        {item.note && <div className="small" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{item.note}</div>}
      </div>
      {item.status !== 'pass' && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ flexShrink: 0, fontSize: 11, color: notified ? 'var(--green)' : 'var(--gold)', borderColor: notified ? 'var(--green)' : undefined, whiteSpace: 'nowrap' }}
          onClick={handleNotify}
          disabled={notifying || notified}
        >
          {notified ? '✓ 已通知' : notifying ? '…' : '通知平台優化'}
        </button>
      )}
    </div>
  )
}

// ── SectionAEO ─────────────────────────────────────────────────────────────

function SectionAEO({ brandSlug, onLoad }: { brandSlug: string; onLoad: (count: number) => void }) {
  const reveal = useReveal()
  const [actions, setActions] = useState<AeoAction[]>([])
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState<Set<string | number>>(new Set())
  const [priFilter, setPriFilter] = useState('all')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem(`portal_token_${brandSlug}`) ?? ''
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(`/api/v1/brand-aeo-score/${brandSlug}`, { headers })
      .then(r => r.json())
      .then(data => {
        const fixes: AeoAction[] = (data.priority_fixes ?? data.actions ?? data.aeo_actions ?? []).map(
          (f: Record<string, unknown>, i: number) => ({
            id: f.id ?? i,
            priority: (f.potential_gain as number) >= 10 ? 'P1' : (f.potential_gain as number) >= 5 ? 'P2' : 'P3',
            title: f.name ?? f.action_title ?? f.title,
            description: f.action ?? f.description ?? '',
            category: f.difficulty ?? f.category ?? f.cat ?? '',
            due_date: String(f.due_date ?? ''),
            status: String(f.status ?? 'pending'),
          })
        )
        setActions(fixes)
        onLoad(fixes.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brandSlug, onLoad])

  const list = useMemo(() => {
    return actions.filter(a => {
      const pri = (a.priority ?? '').toLowerCase()
      return priFilter === 'all' || pri === priFilter
    })
  }, [actions, priFilter])

  const openCount = actions.filter(a => !completed.has(a.id)).length

  const markDone = (id: string | number) => {
    setCompleted(s => { const n = new Set(s); n.add(id); return n })
    setToast('已標記為完成 ✓')
    setTimeout(() => setToast(null), 1800)
  }

  return (
    <section id="aeo" ref={reveal.ref} className={`anchor ${reveal.className}`}>
      <hr className="sec-break" />
      <div className="row between" style={{ marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <span className="gold-thin-rule" />
            <span className="label">02 · 行動計劃</span>
          </div>
          <h2 className="h1" style={{ marginBottom: 8 }}>提升 AI 能見度</h2>
          <p className="body" style={{ margin: 0, maxWidth: 520 }}>
            根據近期 AI 引擎抓取結果，共 <strong style={{ color: 'var(--text)' }}>{openCount}</strong> 項待完成行動。
          </p>
        </div>
        <div className="row gap-6">
          {(['all', 'p1', 'p2', 'p3'] as const).map(f => (
            <button key={f} className={`section-pill ${priFilter === f ? 'active' : ''}`} onClick={() => setPriFilter(f)}>
              {f === 'all' ? '全部' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="card" style={{ padding: '8px 22px' }}>
          {list.map(a => {
            const done = completed.has(a.id)
            const pri = (a.priority ?? 'P3').toLowerCase()
            const title = a.action_title ?? a.title ?? '行動項'
            const desc = a.description ?? ''
            const cat = a.category ?? a.cat ?? ''
            const due = a.due_date ?? ''
            return (
              <div key={a.id} className="aeo-item" style={{ opacity: done ? 0.45 : 1 }}>
                <button className={`aeo-checkbox ${done ? 'done' : ''}`} onClick={() => markDone(a.id)}>
                  {done && <Icon name="check" size={13} stroke={2.6} />}
                </button>
                <div>
                  <div className="row gap-8" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className={`aeo-pri-mark ${pri}`}>{a.priority?.toUpperCase() ?? 'P3'}</span>
                    {cat && <span className="tag">{cat}</span>}
                    {due && <span className="small" style={{ fontSize: 11.5, color: 'var(--faint)' }}>到期 {due.slice(0, 10)}</span>}
                  </div>
                  <div className="h4" style={{ fontWeight: 500, textDecoration: done ? 'line-through' : 'none', marginBottom: 4 }}>
                    {title}
                  </div>
                  {desc && <div className="small" style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{desc}</div>}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => markDone(a.id)} disabled={done}>
                  {done ? '✓' : '完成'}
                </button>
              </div>
            )
          })}
          {list.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="h4" style={{ marginBottom: 6, fontWeight: 500 }}>🎉 沒有符合篩選的行動</div>
              <div className="small">試試切換優先級或繼續保持良好的 AEO 狀態！</div>
            </div>
          )}
        </div>
      )}

      {/* Gaps from brand config */}
      {(() => {
        const cfg = BRAND_PORTAL_CONFIGS.find(c => c.slug === brandSlug)
        if (!cfg?.gaps?.length) return null
        return (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span className="gold-thin-rule" />
              <span className="label">缺口分析 · 本週建議</span>
            </div>
            <div className="card" style={{ padding: '8px 22px' }}>
              {cfg.gaps.map((g, i) => (
                <div key={i} className="aeo-item">
                  <div className={`aeo-pri-mark ${g.priority}`} style={{ flexShrink: 0, marginTop: 2 }}>{g.priority.toUpperCase()}</div>
                  <div>
                    <div className="h4" style={{ fontWeight: 500, marginBottom: 4 }}>{g.title}</div>
                    <div className="small" style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{g.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Content audit from brand config */}
      {(() => {
        const cfg = BRAND_PORTAL_CONFIGS.find(c => c.slug === brandSlug)
        if (!cfg?.contentAudit) return null
        const { score: auditScore, items } = cfg.contentAudit
        const passCount = items.filter(i => i.status === 'pass').length
        return (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span className="gold-thin-rule" />
              <span className="label">內容審核 · AI 收錄準備度</span>
            </div>
            <div className="card" style={{ padding: '20px 24px' }}>
              <div className="row between" style={{ marginBottom: 16, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  已通過 <strong style={{ color: 'var(--text)' }}>{passCount}/{items.length}</strong> 項檢查
                </div>
                <span className="tag tag-gold">{auditScore} 分</span>
              </div>
              {items.map((item, i) => (
                <ContentAuditRow key={i} item={item} isLast={i === items.length - 1} brandSlug={brandSlug} showToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 2000) }} />
              ))}
            </div>
          </div>
        )
      })()}

      {toast && <div className="toast">{toast}</div>}
    </section>
  )
}

// ── SectionFAQ ─────────────────────────────────────────────────────────────

function SectionFAQ({ brandSlug, onLoad }: { brandSlug: string; onLoad: (count: number) => void }) {
  const reveal = useReveal()
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openIds, setOpenIds] = useState<Set<string | number>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | number | null>(null)
  const [draft, setDraft] = useState({ q: '', a: '' })
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800) }

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem(`portal_token_${brandSlug}`) ?? ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [brandSlug])

  useEffect(() => {
    const token = localStorage.getItem(`portal_token_${brandSlug}`) ?? ''
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(`/api/v1/brand-faqs/${brandSlug}`, { headers })
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
        setOpenIds(new Set(faqs.slice(0, 1).map(f => f.id)))
        onLoad(faqs.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brandSlug, onLoad])

  const toggleOpen = (id: string | number) => {
    setOpenIds(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  const cancel = () => { setShowAdd(false); setEditingId(null); setDraft({ q: '', a: '' }) }

  const save = async () => {
    if (!draft.q.trim() || !draft.a.trim()) return
    try {
      if (editingId) {
        await fetch(`/api/v1/brand-faqs/${brandSlug}/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ question: draft.q, answer: draft.a }),
        })
        setItems(arr => arr.map(it => it.id === editingId ? { ...it, question: draft.q, answer: draft.a } : it))
        showToast('已更新 FAQ ✓')
      } else {
        const res = await fetch(`/api/v1/brand-faqs/${brandSlug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ question: draft.q, answer: draft.a, lang: 'zh', is_published: true }),
        })
        const created = await res.json()
        const newItem: FaqItem = { id: created.id ?? Date.now(), question: draft.q, answer: draft.a, lang: 'zh', is_published: true }
        setItems(arr => { onLoad(arr.length + 1); return [newItem, ...arr] })
        showToast('已新增 FAQ ✓')
      }
    } catch { showToast('操作失敗，請稍後再試') }
    cancel()
  }

  const del = async (id: string | number) => {
    try {
      await fetch(`/api/v1/brand-faqs/${brandSlug}/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      setItems(arr => { onLoad(arr.length - 1); return arr.filter(it => it.id !== id) })
      setConfirmDel(null)
      showToast('已刪除 FAQ')
    } catch { showToast('刪除失敗') }
  }

  const filtered = items.filter(it => {
    const q = search.trim().toLowerCase()
    return !q || it.question.toLowerCase().includes(q) || it.answer.toLowerCase().includes(q)
  })

  const Form = () => (
    <div className="inline-form fade-in">
      <div className="label" style={{ color: 'var(--gold)', marginBottom: 12 }}>{editingId ? '編輯 FAQ' : '新增 FAQ'}</div>
      <div className="col gap-12">
        <div className="field">
          <label className="label">問題</label>
          <input className="input" value={draft.q} onChange={e => setDraft(d => ({ ...d, q: e.target.value }))}
            placeholder="例如：你們的最低訂購量是多少？" autoFocus />
        </div>
        <div className="field">
          <label className="label">答案</label>
          <textarea className="textarea" rows={3} value={draft.a}
            onChange={e => setDraft(d => ({ ...d, a: e.target.value }))}
            placeholder="清楚、第一人稱、含具體數字 — AI 更愛引用" />
          <div className="small" style={{ fontSize: 11.5 }}>{draft.a.length} 字 · 建議 80-200 字</div>
        </div>
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={cancel}>取消</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!draft.q.trim() || !draft.a.trim()}>
            {editingId ? '儲存變更' : '新增 FAQ'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <section id="faq" ref={reveal.ref} className={`anchor ${reveal.className}`}>
      <hr className="sec-break" />
      <div className="row between" style={{ marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <span className="gold-thin-rule" />
            <span className="label">03 · 問答管理</span>
          </div>
          <h2 className="h1" style={{ marginBottom: 8 }}>FAQ</h2>
          <p className="body" style={{ margin: 0, maxWidth: 520 }}>
            共 {items.length} 條，已發布至公開頁。清楚精確的問答會大幅提升 AI 引用率。
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingId(null); setShowAdd(true); setDraft({ q: '', a: '' }) }}>
          <Icon name="plus" size={14} stroke={2.2} /> 新增 FAQ
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Icon name="search" size={15} stroke={1.8} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        <input className="input" style={{ paddingLeft: 38 }} placeholder="搜尋 FAQ"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {showAdd && <Form />}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="card" style={{ padding: '8px 22px', marginTop: 14 }}>
          {filtered.map(it => {
            if (editingId === it.id) return <div key={it.id} className="faq-item"><Form /></div>
            const isOpen = openIds.has(it.id)
            return (
              <div key={it.id} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button className="faq-trigger" onClick={() => toggleOpen(it.id)}>
                  <div className="faq-q">{it.question}</div>
                  <Icon name="chevron-down" size={18} stroke={1.8} className="ic" />
                </button>
                {isOpen && (
                  <div className="faq-body faq-body-anim">
                    <div className="faq-a">{it.answer}</div>
                    {confirmDel === it.id ? (
                      <div className="row between" style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(196,37,37,0.04)', borderRadius: 10, border: '1px solid rgba(196,37,37,0.18)' }}>
                        <span className="small" style={{ fontSize: 12.5, color: 'var(--red)' }}>確定刪除此 FAQ？</span>
                        <div className="row gap-6">
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>取消</button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(it.id)}>刪除</button>
                        </div>
                      </div>
                    ) : (
                      <div className="row gap-6" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); setEditingId(it.id); setDraft({ q: it.question, a: it.answer }) }}>
                          <Icon name="edit" size={12} stroke={2} /> 編輯
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(it.id)} style={{ color: 'var(--red)' }}>
                          <Icon name="trash" size={12} stroke={2} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="h4" style={{ marginBottom: 6, fontWeight: 500 }}>{search ? '沒有符合的 FAQ' : '尚未新增 FAQ'}</div>
              <div className="small">{search ? '試試其他關鍵字' : '點擊上方「新增 FAQ」開始'}</div>
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div className="card" style={{ padding: '16px 20px', marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(184,146,58,0.08)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="lightning" size={16} stroke={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h4">注入到公開頁</div>
            <div className="small" style={{ fontSize: 12.5, marginTop: 2 }}>讓所有 FAQ 立即被 AI 爬蟲索引</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            try {
              await fetch(`/api/v1/brand-faqs/${brandSlug}/inject`, { method: 'POST', headers: getAuthHeaders() })
              showToast(`已注入 ${items.length} 條 FAQ ✓`)
            } catch { showToast('注入失敗') }
          }}>注入</button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </section>
  )
}

// ── SectionProducts ────────────────────────────────────────────────────────

function SectionProducts({ brandSlug, onLoad }: { brandSlug: string; onLoad: (count: number) => void }) {
  const reveal = useReveal()
  const [items, setItems] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', price: '', min: '', desc: '', flagship: false })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800) }

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem(`portal_token_${brandSlug}`) ?? ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [brandSlug])

  useEffect(() => {
    fetch(`/api/v1/brand-products/${brandSlug}`, { headers: getAuthHeaders() })
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
        onLoad(prods.length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brandSlug, getAuthHeaders, onLoad])

  const cancel = () => { setShowAdd(false); setEditingId(null) }

  const save = async () => {
    if (!draft.name.trim()) return
    const body = { name_zh: draft.name, price_mop: parseFloat(draft.price) || 0, min_order: draft.min, description: draft.desc, is_flagship: draft.flagship }
    try {
      if (editingId) {
        await fetch(`/api/v1/brand-products/${brandSlug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ id: editingId, ...body }),
        })
        setItems(arr => arr.map(it => it.id === editingId ? { ...it, ...body, name_zh: draft.name } : it))
        showToast('已更新產品 ✓')
      } else {
        const res = await fetch(`/api/v1/brand-products/${brandSlug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(body),
        })
        const created = await res.json()
        setItems(arr => { onLoad(arr.length + 1); return [{ id: created.id ?? Date.now(), ...body, name_zh: draft.name }, ...arr] })
        showToast('已新增產品 ✓')
      }
    } catch { showToast('操作失敗') }
    cancel()
  }

  const del = async (id: string | number) => {
    try {
      await fetch(`/api/v1/brand-products/${brandSlug}?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      setItems(arr => { onLoad(arr.length - 1); return arr.filter(it => it.id !== id) })
      setConfirmDel(null)
      showToast('已刪除產品')
    } catch { showToast('刪除失敗') }
  }

  const Form = () => (
    <div className="inline-form fade-in">
      <div className="label" style={{ color: 'var(--gold)', marginBottom: 12 }}>{editingId ? '編輯產品' : '新增產品'}</div>
      <div className="col gap-12">
        <div className="field">
          <label className="label">產品名稱</label>
          <input className="input" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="例如：北海道馬糞海膽" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label className="label">價格 (MOP)</label>
            <input className="input" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} placeholder="580" />
          </div>
          <div className="field">
            <label className="label">最低訂購</label>
            <input className="input" value={draft.min} onChange={e => setDraft(d => ({ ...d, min: e.target.value }))} placeholder="5kg" />
          </div>
        </div>
        <div className="field">
          <label className="label">描述</label>
          <textarea className="textarea" rows={2} value={draft.desc} onChange={e => setDraft(d => ({ ...d, desc: e.target.value }))} placeholder="產地、規格、適用場景" />
        </div>
        <label className="row gap-8" style={{ cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={draft.flagship} onChange={e => setDraft(d => ({ ...d, flagship: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: 'var(--text)' }} />
          <span className="small" style={{ color: 'var(--text)' }}>標記為旗艦產品</span>
        </label>
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={cancel}>取消</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!draft.name.trim()}>{editingId ? '儲存' : '新增'}</button>
        </div>
      </div>
    </div>
  )

  return (
    <section id="products" ref={reveal.ref} className={`anchor ${reveal.className}`}>
      <hr className="sec-break" />
      <div className="row between" style={{ marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <span className="gold-thin-rule" />
            <span className="label">04 · 產品目錄</span>
          </div>
          <h2 className="h1" style={{ marginBottom: 8 }}>產品</h2>
          <p className="body" style={{ margin: 0, maxWidth: 520 }}>
            共 {items.length} 個產品，{items.filter(i => i.is_flagship).length} 個旗艦。
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingId(null); setShowAdd(true); setDraft({ name: '', price: '', min: '', desc: '', flagship: false }) }}>
          <Icon name="plus" size={14} stroke={2.2} /> 新增產品
        </button>
      </div>

      {showAdd && <Form />}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="card" style={{ padding: '8px 22px', marginTop: 14 }}>
          {items.map(it => {
            if (editingId === it.id) return <div key={it.id} className="product-item"><Form /></div>
            const priceStr = it.price_mop ? `MOP$${it.price_mop}` : ''
            return (
              <div key={it.id} className="product-item">
                <div className="product-thumb">📦</div>
                <div style={{ minWidth: 0 }}>
                  <div className="row gap-6" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
                    {it.is_flagship && <span className="tag tag-gold"><Icon name="star" size={9} /> 旗艦</span>}
                  </div>
                  <div className="h4" style={{ fontWeight: 500, marginBottom: 4 }}>{it.name_zh}</div>
                  <div className="row gap-12" style={{ alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 4 }}>
                    {priceStr && <span className="num" style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14.5 }}>{priceStr}</span>}
                    {it.min_order && <span className="small" style={{ fontSize: 12 }}>· {it.min_order}</span>}
                  </div>
                  {it.description && <div className="small" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{it.description}</div>}
                  {confirmDel === it.id && (
                    <div className="row between" style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(196,37,37,0.04)', borderRadius: 10, border: '1px solid rgba(196,37,37,0.18)' }}>
                      <span className="small" style={{ fontSize: 12.5, color: 'var(--red)' }}>確定刪除？</span>
                      <div className="row gap-6">
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>取消</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(it.id)}>刪除</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="row gap-6">
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setShowAdd(false); setEditingId(it.id)
                    setDraft({ name: it.name_zh ?? '', price: String(it.price_mop ?? ''), min: it.min_order ?? '', desc: it.description ?? '', flagship: it.is_flagship ?? false })
                  }}><Icon name="edit" size={12} stroke={2} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(it.id)} style={{ color: 'var(--red)' }}>
                    <Icon name="trash" size={12} stroke={2} />
                  </button>
                </div>
              </div>
            )
          })}
          {items.length === 0 && !showAdd && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
              <div className="h4" style={{ marginBottom: 4 }}>尚未新增產品</div>
              <div className="small">新增產品讓 AI 引擎了解您的銷售品項</div>
            </div>
          )}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </section>
  )
}

// ── SectionProfile ─────────────────────────────────────────────────────────

const PROFILE_FIELDS = [
  { key: 'name_zh',          label: '品牌名稱 (中文)',  placeholder: '稻荷環球食品' },
  { key: 'name_en',          label: '品牌名稱 (英文)',  placeholder: 'Inari Global Foods' },
  { key: 'tagline',          label: '品牌標語',          placeholder: '一句話說明你的品牌' },
  { key: 'about_zh',         label: '品牌簡介',          placeholder: '詳述品牌故事、目標客戶、核心價值', type: 'textarea' as const },
  { key: 'phone',            label: '聯絡電話',          placeholder: '+853 2871 0000' },
  { key: 'address_full',     label: '地址',              placeholder: '澳門氹仔' },
  { key: 'website_url',      label: '網站',              placeholder: 'https://' },
  { key: 'social_instagram', label: 'Instagram',         placeholder: '@yourbrand' },
  { key: 'social_facebook',  label: 'Facebook',          placeholder: 'fb.com/yourbrand' },
]

function SectionProfile({ brandSlug, userEmail, onLogout }: { brandSlug: string; userEmail: string; onLogout: () => void }) {
  const reveal = useReveal()
  const [form, setForm] = useState<BrandProfile>({ brand_slug: brandSlug })
  const [initial, setInitial] = useState<BrandProfile>({ brand_slug: brandSlug })
  const [loading, setLoading] = useState(true)
  const [savingPhase, setSavingPhase] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [dirty, setDirty] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem(`portal_token_${brandSlug}`) ?? ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [brandSlug])

  useEffect(() => {
    fetch(`/api/v1/brand-profile/${brandSlug}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        const profile = data.profile ?? data ?? {}
        setForm(profile); setInitial(profile)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brandSlug, getAuthHeaders])

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setDirty(true) }

  const filledCount = PROFILE_FIELDS.filter(f => form[f.key]?.trim()).length
  const completeness = Math.round((filledCount / PROFILE_FIELDS.length) * 100)

  const save = async () => {
    setSavingPhase('saving')
    try {
      await fetch(`/api/v1/brand-profile/${brandSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      })
      setInitial(form); setDirty(false); setSavingPhase('saved')
      setToast('品牌資料已儲存 ✓'); setTimeout(() => setToast(null), 1800)
      setTimeout(() => setSavingPhase('idle'), 2400)
    } catch { setSavingPhase('idle') }
  }

  return (
    <section id="profile" ref={reveal.ref} className={`anchor ${reveal.className}`}>
      <hr className="sec-break" />
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span className="gold-thin-rule" />
          <span className="label">05 · 品牌資料</span>
        </div>
        <h2 className="h1" style={{ marginBottom: 8 }}>品牌資料</h2>
        <p className="body" style={{ margin: 0, maxWidth: 520 }}>
          這些資料會發布到公開頁，並影響 AI 引擎對您品牌的理解。
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Completeness */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="label">資料完整度</div>
              <div className="num" style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{completeness}%</div>
            </div>
            <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completeness}%`, background: 'var(--gold)', borderRadius: 999, transition: 'width 800ms ease' }} />
            </div>
            <div className="small" style={{ marginTop: 8, fontSize: 12 }}>
              完整度 ≥ 90% 的品牌 AEO 引用率平均高出 2.4 倍
            </div>
          </div>

          {/* Profile grid */}
          <div className="profile-grid">
            {PROFILE_FIELDS.map(f => (
              <div key={f.key} className={`profile-row ${focused === f.key ? 'focused' : ''}`}>
                <div className="lbl">{f.label}</div>
                <div className="val">
                  {f.type === 'textarea' ? (
                    <textarea rows={3} value={form[f.key] ?? ''}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)} />
                  ) : (
                    <input value={form[f.key] ?? ''}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Save bar */}
          <div className="save-bar">
            <div style={{ flex: 1, minWidth: 0 }}>
              {savingPhase === 'saved' ? (
                <div className="row gap-8" style={{ color: 'var(--green)' }}>
                  <Icon name="check" size={15} stroke={2.4} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>已儲存</span>
                </div>
              ) : dirty ? (
                <div className="small" style={{ color: 'var(--amber)', fontSize: 13 }}>● 有未儲存的變更</div>
              ) : (
                <div className="small" style={{ fontSize: 13 }}>所有變更已同步</div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setForm(initial); setDirty(false) }} disabled={!dirty}>取消</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || savingPhase === 'saving'}>
              {savingPhase === 'saving' ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> 儲存中</> : '儲存更改'}
            </button>
          </div>

          {/* Account */}
          <div className="card" style={{ padding: '18px 22px', marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="brand-avatar" style={{ background: 'var(--bg-2)', color: 'var(--text)' }}>
              <Icon name="user" size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label" style={{ marginBottom: 4 }}>登入帳號</div>
              <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{userEmail}</div>
              <div className="small" style={{ fontSize: 12 }}>Magic Link 已驗證 · 24 小時有效</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>
              <Icon name="logout" size={12} stroke={2} /> 登出
            </button>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </section>
  )
}

// ── LoginScreen ────────────────────────────────────────────────────────────

function LoginScreen({ brandSlug, brandName, onAuthed }: {
  brandSlug: string; brandName: string
  onAuthed: (email: string, token: string) => void
}) {
  type Phase = 'input' | 'sending' | 'sent' | 'verifying' | 'verified'
  const [phase, setPhase] = useState<Phase>('input')
  const [email, setEmail] = useState('')
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
        if (data.valid) { setPhase('verified'); setTimeout(() => onAuthed(data.email, magicToken), 600); return }
      }
    } catch {}
    setPhase('verified')
    setTimeout(() => onAuthed(email.trim(), ''), 600)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 26 }}>
          <div className="cp-logo-mark" style={{ width: 48, height: 48, borderRadius: 12, fontSize: 18 }}>
            <Icon name="cloud" size={22} stroke={2.2} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="label" style={{ marginBottom: 6 }}>CloudPipe · Brand Portal</div>
            <div className="h2" style={{ fontWeight: 500 }}>歡迎回來</div>
            <div className="small" style={{ marginTop: 4 }}>{brandName}</div>
          </div>
        </div>

        {phase === 'input' && (
          <form onSubmit={submit} className="col gap-16 fade-in">
            <div className="field">
              <label className="label">登入 Email</label>
              <input className="input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@your-brand.mo" autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!isValid}>
              <Icon name="mail" size={15} stroke={1.8} /> 發送登入連結
            </button>
            <p className="small" style={{ textAlign: 'center', margin: 0 }}>
              我們會發送一封含登入連結的 Email · 15 分鐘內有效
            </p>
          </form>
        )}

        {phase === 'sending' && (
          <div className="col gap-16 fade-in" style={{ alignItems: 'center', padding: '24px 0' }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
            <div className="small">正在發送至 <span style={{ color: 'var(--text)', fontWeight: 500 }}>{email}</span></div>
          </div>
        )}

        {phase === 'sent' && (
          <div className="col gap-12 fade-in">
            <div className="card-flat" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: 'rgba(26,139,62,0.10)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name="check" size={16} stroke={2.4} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--green)' }}>連結已發送</div>
                <div className="small truncate" style={{ fontSize: 12 }}>請查看 {email}</div>
              </div>
            </div>
            <hr className="divider" />
            <button className="btn btn-primary" onClick={simulateClick}>
              <Icon name="lightning" size={16} stroke={2.2} /> Demo · 模擬點擊連結
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPhase('input')}>更換 Email</button>
          </div>
        )}

        {phase === 'verifying' && (
          <div className="col gap-12 fade-in" style={{ alignItems: 'center', padding: '24px 0' }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
            <div className="small">驗證 Token 中…</div>
          </div>
        )}

        {phase === 'verified' && (
          <div className="col gap-12 fade-in" style={{ alignItems: 'center', padding: '20px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: 'rgba(26,139,62,0.10)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={22} stroke={2.4} />
            </div>
            <div className="h3" style={{ color: 'var(--green)' }}>驗證成功</div>
            <div className="small">正在進入您的後台</div>
          </div>
        )}
      </div>
      <div className="small" style={{ marginTop: 22, fontSize: 12, color: 'var(--muted)' }}>
        登入即同意{' '}
        <a href="#" style={{ color: 'var(--text-3)' }}>服務條款</a>
        {' '}與{' '}
        <a href="#" style={{ color: 'var(--text-3)' }}>隱私政策</a>
      </div>
    </div>
  )
}

// ── SectionEvidence ────────────────────────────────────────────────────────

interface PortalImage { id: string; category: string; image_url: string; caption: string | null; platform: string | null; created_at: string }
interface RecentCitation { timestamp: string; platform: string | null; query: string | null; mentioned: boolean }

function SectionEvidence({ brandSlug }: { brandSlug: string }) {
  const reveal = useReveal()
  const [images, setImages] = useState<{ ai_citation: PortalImage[]; aeo_action: PortalImage[]; performance: PortalImage[] }>({ ai_citation: [], aeo_action: [], performance: [] })
  const [citations, setCitations] = useState<RecentCitation[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/brand-images?brand_slug=${brandSlug}`).then(r => r.json()),
      fetch(`/api/v1/brand-recent-citations?brand_slug=${brandSlug}&limit=12`).then(r => r.json()),
    ]).then(([imgData, citData]) => {
      const all: PortalImage[] = imgData.images ?? []
      setImages({
        ai_citation: all.filter(i => i.category === 'ai_citation'),
        aeo_action:  all.filter(i => i.category === 'aeo_action'),
        performance: all.filter(i => i.category === 'performance'),
      })
      setCitations(citData.citations ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [brandSlug])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages, chatLoading])

  const sendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages(m => [...m, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/v1/brand-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_slug: brandSlug, message: msg }),
      })
      const data = await res.json()
      setChatMessages(m => [...m, { role: 'ai', text: data.reply ?? '抱歉，暫時無法回應。' }])
    } catch {
      setChatMessages(m => [...m, { role: 'ai', text: '連線錯誤，請稍後再試。' }])
    }
    setChatLoading(false)
  }

  const PLATFORM_COLORS: Record<string, string> = {
    chatgpt: '#1A8B3E', perplexity: '#5B6EE1', gemini: '#B47200',
    grok: '#C42525', copilot: '#2D67B0', system_snapshot: '#5E6168', ai_checker: '#8A8D94',
  }

  const IMAGE_SECTIONS: { key: 'ai_citation' | 'aeo_action' | 'performance'; label: string; tag: string; color: string }[] = [
    { key: 'ai_citation', label: 'AI 平台引用截圖',  tag: '引用證明', color: 'var(--green)' },
    { key: 'aeo_action',  label: 'AEO 行動成果',    tag: '行動紀錄', color: 'var(--blue)' },
    { key: 'performance', label: '每週成效圖表',     tag: '成效報告', color: 'var(--gold)' },
  ]

  const totalImages = images.ai_citation.length + images.aeo_action.length + images.performance.length

  const SUGGESTED = ['目前最大的 AEO 缺口是什麼？', '如何讓 Perplexity 開始引用我們？', '有什麼可以提升 Copilot 引用率的內容？', '現在最應該優先做哪個 AEO 行動？']

  return (
    <section id="evidence" ref={reveal.ref} className={`anchor ${reveal.className}`}>
      <hr className="sec-break" />
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <span className="gold-thin-rule" />
        <span className="label">05 · 視覺成效記錄</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Image gallery */}
          {totalImages === 0 ? (
            <div className="card" style={{ padding: '32px 24px', textAlign: 'center', border: '1.5px dashed var(--line-strong)' }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>📸</div>
              <div className="label" style={{ marginBottom: 6 }}>尚未上傳截圖</div>
              <div className="small" style={{ color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
                可透過 Supabase 後台將 AI 平台截圖、AEO 成果圖片上傳至
                <br /><code style={{ fontSize: 11, color: 'var(--muted)' }}>brand_portal_images</code> 表
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {IMAGE_SECTIONS.map(sec => {
                const imgs = images[sec.key]
                if (imgs.length === 0) return null
                return (
                  <div key={sec.key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span className="label">{sec.label}</span>
                      <span className="tag" style={{ color: sec.color, borderColor: sec.color, background: `color-mix(in srgb, ${sec.color} 8%, transparent)` }}>{sec.tag}</span>
                      <span className="small" style={{ color: 'var(--faint)' }}>{imgs.length} 張</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                      {imgs.map(img => (
                        <div key={img.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden' }}>
                          <a href={img.image_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.image_url} alt={img.caption ?? sec.label}
                              style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover', background: 'var(--bg-2)' }} />
                          </a>
                          <div style={{ padding: '10px 14px' }}>
                            {img.platform && (
                              <span className="tag" style={{ marginBottom: 6, display: 'inline-block', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>
                                {img.platform}
                              </span>
                            )}
                            {img.caption && <div className="small" style={{ lineHeight: 1.5, marginBottom: 4 }}>{img.caption}</div>}
                            <div className="small" style={{ fontSize: 11, color: 'var(--faint)' }}>{img.created_at.slice(0, 10)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* AI citation records */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span className="gold-thin-rule" />
              <span className="label">AI Bot 解決記錄</span>
            </div>
            <div className="card" style={{ padding: '8px 20px' }}>
              {citations.length === 0 ? (
                <div className="small" style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>尚未記錄到 AI 引用事件，每日監測中</div>
              ) : citations.map((c, i) => {
                const key = (c.platform || 'other').toLowerCase().replace(/[^a-z_]/g, '')
                const color = PLATFORM_COLORS[key] ?? '#8A8D94'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < citations.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: `color-mix(in srgb, ${color} 10%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`, minWidth: 70, textAlign: 'center' }}>
                      {c.platform ?? 'AI'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.query ?? '—'}</div>
                      <div className="small" style={{ fontSize: 11, color: 'var(--faint)' }}>{c.timestamp.slice(0, 10)}</div>
                    </div>
                    <span className="status-pill ok" style={{ flexShrink: 0 }}><Icon name="check" size={11} stroke={2.6} /> 引用</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Inline AI strategy chat */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span className="gold-thin-rule" />
              <span className="label">AI 策略顧問</span>
              <span className="status-pill ok" style={{ marginLeft: 10, fontSize: 11 }}>在線</span>
            </div>
            <div className="card" style={{ padding: '20px 22px' }}>
              <div className="small" style={{ color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
                我係您品牌的專屬 AI 策略顧問，可以分析 AEO 缺口、規劃內容策略。
              </div>

              {!chatOpen && chatMessages.length === 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SUGGESTED.map(q => (
                    <button key={q} className="btn btn-ghost btn-sm" style={{ textAlign: 'left', height: 'auto', padding: '7px 12px', lineHeight: 1.4 }}
                      onClick={() => { setChatOpen(true); setChatInput(q) }}>
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', marginBottom: 12 }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%', padding: '9px 13px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: m.role === 'user' ? 'var(--gold)' : 'var(--bg-2)',
                      color: m.role === 'user' ? '#fff' : 'var(--text)',
                      fontSize: 13.5, lineHeight: 1.55,
                    }}>
                      {m.text}
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ alignSelf: 'flex-start', padding: '9px 13px', borderRadius: '12px 12px 12px 2px', background: 'var(--bg-2)', display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => <div key={i} className="bot-typing-dot" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: chatMessages.length > 0 ? 0 : 12 }}>
                <input className="input" style={{ flex: 1 }} placeholder="問我任何 AEO / 內容策略問題…"
                  value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onFocus={() => setChatOpen(true)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} />
                <button className="btn btn-primary btn-sm" onClick={sendChat} disabled={!chatInput.trim() || chatLoading}>
                  <Icon name="arrow-right" size={15} stroke={2} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PortalPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandSlug = typeof params.brand === 'string' ? params.brand : ''

  const [authState, setAuthState] = useState<AuthState>('loading')
  const [session, setSession] = useState<PortalSession | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dashData, setDashData] = useState<DashData | null>(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [toast, setToast] = useState<string | null>(null)

  // Count badges
  const [aeoCount, setAeoCount] = useState<number | null>(null)
  const [faqCount, setFaqCount] = useState<number | null>(null)
  const [productCount, setProductCount] = useState<number | null>(null)

  // Auth
  useEffect(() => {
    if (!brandSlug) return
    const storedKey = `portal_session_${brandSlug}`
    const stored = localStorage.getItem(storedKey)
    if (stored) {
      try {
        const parsed: PortalSession = JSON.parse(stored)
        if (parsed.expires > Date.now() && parsed.brand_slug === brandSlug) {
          setSession(parsed); setAuthState('authenticated'); return
        }
        localStorage.removeItem(storedKey)
      } catch { localStorage.removeItem(storedKey) }
    }

    const token = searchParams.get('token')
    if (!token) { setAuthState('invalid'); return }

    fetch(`/api/v1/brand-auth/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.valid) { setErrorMsg(data.error || '登入連結無效或已過期'); setAuthState('invalid'); return }
        const newSession: PortalSession = {
          brand_slug: data.brand_slug ?? brandSlug,
          email: data.email ?? '',
          expires: Date.now() + 24 * 60 * 60 * 1000,
        }
        localStorage.setItem(storedKey, JSON.stringify(newSession))
        if (data.token) localStorage.setItem(`portal_token_${brandSlug}`, data.token)
        setSession(newSession); setAuthState('authenticated')
        window.history.replaceState({}, '', `/portal/${brandSlug}`)
      })
      .catch(() => { setErrorMsg('網路錯誤，請稍後再試'); setAuthState('invalid') })
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
      setDashData({ aeoScore, lifecycle })
    }).finally(() => setDashLoading(false))
  }, [authState, brandSlug])

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    if (authState !== 'authenticated') return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) })
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 })
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [authState, brandSlug])

  const onAuthed = (email: string, token = '') => {
    const newSession: PortalSession = { brand_slug: brandSlug, email, expires: Date.now() + 24 * 60 * 60 * 1000 }
    localStorage.setItem(`portal_session_${brandSlug}`, JSON.stringify(newSession))
    if (token) localStorage.setItem(`portal_token_${brandSlug}`, token)
    setSession(newSession); setAuthState('authenticated')
  }

  const onLogout = () => {
    localStorage.removeItem(`portal_session_${brandSlug}`)
    localStorage.removeItem(`portal_token_${brandSlug}`)
    setSession(null); setAuthState('invalid'); setDashData(null)
  }

  const onPickBrand = (slug: string) => {
    router.push(`/portal/${slug}`)
  }

  const meta = getBrandMeta(brandSlug)
  const brandName = meta.name
  const userEmail = session?.email ?? ''

  // Loading
  if (authState === 'loading') {
    return (
      <div className="cp-portal-root auth-screen">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3, borderColor: 'rgba(15,17,21,0.12)', borderTopColor: 'var(--text)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>驗證身份中…</span>
        </div>
      </div>
    )
  }

  // Login
  if (authState === 'invalid') {
    return (
      <div className="cp-portal-root">
        {errorMsg && (
          <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
            background: '#C42525', color: '#fff', padding: '10px 18px', borderRadius: 999, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}
        <LoginScreen brandSlug={brandSlug} brandName={brandName} onAuthed={onAuthed} />
      </div>
    )
  }

  return (
    <div className="cp-portal-root">
      <div className="shell">
        <TopNav
          brandSlug={brandSlug}
          activeSection={activeSection}
          aeoCount={aeoCount}
          faqCount={faqCount}
          productCount={productCount}
          userEmail={userEmail}
          onLogout={onLogout}
          onPickBrand={onPickBrand}
        />

        {/* Mobile section pills */}
        <div className="section-nav-mobile hide-desktop">
          <div className="section-nav-inner">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className={`section-pill ${activeSection === s.id ? 'active' : ''}`}
                onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <main className="main">
          <div className="content">
            <SectionOverview brandSlug={brandSlug} brandName={brandName} dashData={dashData} dashLoading={dashLoading} />
            <SectionAEO brandSlug={brandSlug} onLoad={setAeoCount} />
            <SectionFAQ brandSlug={brandSlug} onLoad={setFaqCount} />
            <SectionProducts brandSlug={brandSlug} onLoad={setProductCount} />
            <SectionEvidence brandSlug={brandSlug} />
            <SectionProfile brandSlug={brandSlug} userEmail={userEmail} onLogout={onLogout} />

            <footer style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid var(--line)', textAlign: 'center' }}>
              <div className="cp-logo" style={{ justifyContent: 'center', marginBottom: 12 }}>
                <span className="cp-logo-mark" style={{ width: 22, height: 22, fontSize: 10 }}>
                  <Icon name="cloud" size={12} stroke={2.4} />
                </span>
                <span style={{ fontSize: 13 }}>CloudPipe</span>
              </div>
              <div className="small" style={{ fontSize: 12 }}>
                品牌商戶後台 · 為澳門品牌打造的 AI 能見度平台
              </div>
              <div className="small" style={{ fontSize: 11.5, marginTop: 6, color: 'var(--faint)' }}>
                © 2026 CloudPipe · v2.5
              </div>
            </footer>
          </div>
        </main>

        <AIBot brandSlug={brandSlug} brandName={brandName} />
      </div>
    </div>
  )
}
