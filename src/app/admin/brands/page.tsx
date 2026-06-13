'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'

interface BrandConfig {
  slug: string
  name_zh: string
  name_en: string
  industry_slug: string
  mode: string
  key_facts: {
    phone?: string
    whatsapp?: string
    hours?: string
    address?: string
    platforms?: string[]
    menu?: Record<string, unknown>
  }
  updated_at: string
  updated_by: string
}

const BRAND_META: Record<string, { emoji: string; accent: string; bg: string; label: string }> = {
  'after-school-coffee': { emoji: '☕', accent: '#c87941', bg: 'rgba(200,121,65,0.08)', label: 'F&B' },
  'mind-cafe':           { emoji: '🧠', accent: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', label: 'Café' },
  'cloudpipe':           { emoji: '☁️', accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'SaaS' },
  'sea-urchin-delivery': { emoji: '🦔', accent: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Delivery' },
  'inari-global-foods':  { emoji: '🐟', accent: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'B2B' },
}

function AuthScreen({ onAuth }: { onAuth: (k: string) => void }) {
  const [val, setVal] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    gsap.fromTo(boxRef.current,
      { opacity: 0, y: 32, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
    )
  }, [])

  function submit() { if (val) onAuth(val) }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080f1c' }}>
      <div ref={boxRef} style={{ background: 'linear-gradient(145deg,#111827,#0f172a)', border: '1px solid #1e293b', padding: '40px 36px', borderRadius: 16, width: 340, boxShadow: '0 24px 60px rgba(0,0,0,.6)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
          <h2 style={{ color: '#f1f5f9', margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '.02em' }}>品牌管理面板</h2>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>CloudPipe SSOT Admin</p>
        </div>
        <input
          type="password"
          placeholder="Admin Key"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #1e293b', background: '#0a1120', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' }}
          onFocus={e => (e.target.style.borderColor = '#3b82f6')}
          onBlur={e => (e.target.style.borderColor = '#1e293b')}
        />
        <button
          ref={btnRef}
          onClick={submit}
          onMouseEnter={() => gsap.to(btnRef.current, { scale: 1.03, duration: .15 })}
          onMouseLeave={() => gsap.to(btnRef.current, { scale: 1,    duration: .15 })}
          style={{ marginTop: 12, width: '100%', padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '.04em' }}
        >
          進入
        </button>
      </div>
    </div>
  )
}

function BrandCard({ brand, adminKey, index }: { brand: BrandConfig; adminKey: string; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const meta = BRAND_META[brand.slug] ?? { emoji: '📦', accent: '#64748b', bg: 'rgba(100,116,139,0.08)', label: '—' }
  const kf = brand.key_facts ?? {}

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out', delay: index * 0.08 }
    )
  }, [index])

  function handleEnter() {
    gsap.to(cardRef.current, { y: -4, scale: 1.012, duration: .2, ease: 'power2.out' })
    gsap.to(glowRef.current, { opacity: 1, duration: .2 })
  }
  function handleLeave() {
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: .2, ease: 'power2.out' })
    gsap.to(glowRef.current, { opacity: 0, duration: .3 })
  }
  function handleDown()  { gsap.to(cardRef.current, { scale: 0.99, duration: .1 }) }
  function handleUp()    { gsap.to(cardRef.current, { scale: 1.012, duration: .1 }) }

  return (
    <Link href={`/admin/brands/${brand.slug}?key=${encodeURIComponent(adminKey)}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        ref={cardRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        style={{ position: 'relative', background: '#111827', border: '1px solid #1e293b', borderRadius: 14, padding: '22px 24px', cursor: 'pointer', overflow: 'hidden' }}
      >
        {/* accent left bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '14px 0 0 14px', background: meta.accent }} />

        {/* hover glow */}
        <div ref={glowRef} style={{ position: 'absolute', inset: 0, borderRadius: 14, background: meta.bg, opacity: 0, pointerEvents: 'none', border: `1px solid ${meta.accent}33` }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
          {/* left */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{meta.emoji}</span>
              <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>{brand.name_zh}</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>{brand.name_en}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: meta.accent, background: `${meta.accent}22`, padding: '2px 7px', borderRadius: 4, letterSpacing: '.06em' }}>{meta.label}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 12, color: '#94a3b8' }}>
              {kf.phone   && <span>📞 {kf.phone}</span>}
              {kf.hours   && <span>⏰ {kf.hours}</span>}
              {kf.platforms?.length ? <span>🛵 {kf.platforms.join(', ')}</span> : null}
            </div>

            {kf.address && (
              <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>📍 {kf.address}</div>
            )}
          </div>

          {/* right */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 16, flexShrink: 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '.06em',
              color: brand.mode === 'active' ? '#4ade80' : '#78716c',
              background: brand.mode === 'active' ? 'rgba(74,222,128,.12)' : 'rgba(120,113,108,.12)',
              padding: '3px 9px', borderRadius: 6,
            }}>
              {(brand.mode ?? 'active').toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: '#475569' }}>{brand.updated_at?.slice(0, 10)}</span>
            <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>編輯 →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function BrandsAdminPage() {
  const [brands, setBrands]   = useState<BrandConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [adminKey, setAdminKey] = useState('')
  const [authed, setAuthed]   = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('brand_admin_key')
    if (saved) { setAdminKey(saved); setAuthed(true) }
    // support ?key= query param
    const params = new URLSearchParams(window.location.search)
    const qkey = params.get('key')
    if (qkey) { setAdminKey(qkey); setAuthed(true) }
  }, [])

  useEffect(() => {
    if (!authed) return
    sessionStorage.setItem('brand_admin_key', adminKey)
    fetch('/api/brand-config')
      .then(r => r.json())
      .then(data => { setBrands(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authed, adminKey])

  useEffect(() => {
    if (!loading && authed) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out' })
      gsap.fromTo(footerRef.current, { opacity: 0 }, { opacity: 1, duration: .5, delay: .5 })
    }
  }, [loading, authed])

  if (!authed) return <AuthScreen onAuth={k => { setAdminKey(k); setAuthed(true) }} />

  return (
    <div style={{ minHeight: '100vh', background: '#080f1c', padding: '36px 24px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* header */}
        <div ref={headerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>☁️</div>
            <div>
              <h1 style={{ color: '#f1f5f9', fontSize: 20, margin: 0, fontWeight: 700 }}>品牌資料管理</h1>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>CloudPipe Brand SSOT</p>
            </div>
          </div>
          <span style={{ background: '#1e293b', color: '#3b82f6', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, letterSpacing: '.08em', border: '1px solid #1e3a5f' }}>
            {brands.length} 品牌
          </span>
        </div>

        {/* cards */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 90, borderRadius: 14, background: 'linear-gradient(90deg,#111827 25%,#1e293b 50%,#111827 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {brands.map((brand, i) => (
              <BrandCard key={brand.slug} brand={brand} adminKey={adminKey} index={i} />
            ))}
          </div>
        )}

        {/* footer hint */}
        <div ref={footerRef} style={{ marginTop: 28, padding: '14px 18px', background: '#0d1626', borderRadius: 10, fontSize: 12, color: '#334155', border: '1px solid #1e293b', opacity: 0 }}>
          💡 點擊品牌卡片編輯資料 → 儲存後選「預覽影響」→ 確認同步到 merchant_faqs + knowledge_facts
        </div>
      </div>
    </div>
  )
}
