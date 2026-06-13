'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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
  }
  updated_at: string
}

const BRAND_META: Record<string, { accent: string; tag: string }> = {
  'after-school-coffee': { accent: '#f59e0b', tag: 'F&B' },
  'mind-cafe':           { accent: '#a78bfa', tag: 'CAFÉ' },
  'cloudpipe':           { accent: '#38bdf8', tag: 'SAAS' },
  'sea-urchin-delivery': { accent: '#34d399', tag: 'DELIVERY' },
  'inari-global-foods':  { accent: '#f87171', tag: 'B2B' },
}

/* ── 3D tilt card ── */
function BrandCard({ brand, idx, adminKey }: { brand: BrandConfig; idx: number; adminKey: string }) {
  const cardRef  = useRef<HTMLDivElement>(null)
  const glowRef  = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const meta     = BRAND_META[brand.slug] ?? { accent: '#64748b', tag: '—' }
  const kf       = brand.key_facts ?? {}
  const isActive = (brand.mode ?? 'active') === 'active'
  const num      = String(idx + 1).padStart(2, '0')

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el   = cardRef.current!
    const rect = el.getBoundingClientRect()
    const x    = (e.clientX - rect.left) / rect.width  - 0.5
    const y    = (e.clientY - rect.top)  / rect.height - 0.5
    gsap.to(innerRef.current, {
      rotateY: x * 14,
      rotateX: -y * 9,
      duration: 0.35,
      ease: 'power2.out',
      transformPerspective: 900,
    })
    gsap.to(glowRef.current, {
      x: x * 30,
      y: y * 30,
      opacity: 0.9,
      duration: 0.35,
    })
  }, [])

  const onLeave = useCallback(() => {
    gsap.to(innerRef.current, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'elastic.out(1,0.6)' })
    gsap.to(glowRef.current,  { opacity: 0, duration: 0.4 })
  }, [])

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: 900, cursor: 'pointer' }}
      className="brand-card-wrap"
    >
      <Link href={`/admin/brands/${brand.slug}?key=${encodeURIComponent(adminKey)}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          ref={innerRef}
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg,rgba(15,23,42,.95),rgba(8,12,22,.98))',
            border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 16,
            padding: '28px 32px',
            overflow: 'hidden',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transition: 'border-color .3s',
          }}
        >
          {/* glow blob */}
          <div ref={glowRef} style={{
            position: 'absolute', width: 280, height: 280, borderRadius: '50%',
            background: `radial-gradient(circle, ${meta.accent}33 0%, transparent 70%)`,
            top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            pointerEvents: 'none', opacity: 0,
          }} />

          {/* left accent line */}
          <div style={{
            position: 'absolute', left: 0, top: 16, bottom: 16, width: 3,
            borderRadius: 999, background: meta.accent,
            boxShadow: `0 0 12px ${meta.accent}88`,
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            {/* left col */}
            <div style={{ flex: 1 }}>
              {/* index + tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: meta.accent, letterSpacing: '.12em' }}>{num}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: meta.accent, background: `${meta.accent}1a`, border: `1px solid ${meta.accent}44`, padding: '2px 7px', borderRadius: 4 }}>{meta.tag}</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(255,255,255,.08),transparent)' }} />
              </div>

              {/* name */}
              <div style={{ marginBottom: 14 }}>
                <h2 style={{
                  margin: 0, color: '#f1f5f9', fontWeight: 800,
                  fontSize: 'clamp(20px, 2.4vw, 28px)',
                  letterSpacing: '-.01em', lineHeight: 1.1,
                  fontFamily: '"Arial Black","Helvetica Neue",sans-serif',
                }}>
                  {brand.name_zh}
                </h2>
                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {brand.name_en}
                </p>
              </div>

              {/* meta row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                {kf.phone   && <span style={{ color: '#94a3b8' }}>T/ {kf.phone}</span>}
                {kf.hours   && <span>HRS/ {kf.hours}</span>}
                {kf.platforms?.length ? <span>SVC/ {kf.platforms.join('+')}</span> : null}
              </div>

              {kf.address && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#334155', fontFamily: 'monospace', letterSpacing: '.04em' }}>
                  LOC/ {kf.address}
                </div>
              )}
            </div>

            {/* right col */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                color: isActive ? '#4ade80' : '#f59e0b',
                background: isActive ? 'rgba(74,222,128,.1)' : 'rgba(245,158,11,.1)',
                border: `1px solid ${isActive ? '#4ade8033' : '#f59e0b33'}`,
                padding: '3px 10px', borderRadius: 20,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: isActive ? '#4ade80' : '#f59e0b',
                  display: 'inline-block',
                  boxShadow: `0 0 6px ${isActive ? '#4ade80' : '#f59e0b'}`,
                  animation: isActive ? 'pulse-dot 2s infinite' : 'none',
                }} />
                {isActive ? 'ACTIVE' : 'MAINT'}
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>
                {brand.updated_at?.slice(0, 10)}
              </span>
              <span style={{ fontSize: 12, color: meta.accent, fontWeight: 600, letterSpacing: '.08em' }}>
                EDIT →
              </span>
            </div>
          </div>

          {/* bottom scan line */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${meta.accent}33,transparent)` }} />
        </div>
      </Link>
    </div>
  )
}

/* ── Auth ── */
function AuthScreen({ onAuth }: { onAuth: (k: string) => void }) {
  const [val, setVal] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    gsap.fromTo(boxRef.current, { opacity: 0, y: 40, scale: .94 }, { opacity: 1, y: 0, scale: 1, duration: .55, ease: 'power3.out' })
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06080f' }}>
      <div ref={boxRef} style={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(255,255,255,.07)', padding: '44px 40px', borderRadius: 20, width: 360, backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,.8)' }}>
        <p style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: 11, letterSpacing: '.2em', margin: '0 0 16px' }}>CLOUDPIPE // BRAND OS</p>
        <h2 style={{ color: '#f1f5f9', margin: '0 0 28px', fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', fontFamily: '"Arial Black",sans-serif' }}>ACCESS<br/>CONTROL</h2>
        <input type="password" placeholder="ADMIN KEY" value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && val && onAuth(val)}
          style={{ width: '100%', padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(0,0,0,.4)', color: '#f1f5f9', fontSize: 13, fontFamily: 'monospace', letterSpacing: '.1em', outline: 'none', boxSizing: 'border-box' }}
        />
        <button onClick={() => val && onAuth(val)} style={{ marginTop: 12, width: '100%', padding: 13, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '.12em' }}>
          ENTER SYSTEM
        </button>
      </div>
    </div>
  )
}

/* ── Main ── */
export default function BrandsAdminPage() {
  const [brands, setBrands]     = useState<BrandConfig[]>([])
  const [loading, setLoading]   = useState(true)
  const [adminKey, setAdminKey] = useState('')
  const [authed, setAuthed]     = useState(false)

  const heroRef    = useRef<HTMLDivElement>(null)
  const titleRef   = useRef<HTMLDivElement>(null)
  const orbRef     = useRef<HTMLDivElement>(null)
  const cardsRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    gsap.registerPlugin(ScrollTrigger)
    const saved = sessionStorage.getItem('brand_admin_key')
    if (saved) { setAdminKey(saved); setAuthed(true) }
    const q = new URLSearchParams(window.location.search).get('key')
    if (q) { setAdminKey(q); setAuthed(true) }
  }, [])

  useEffect(() => {
    if (!authed) return
    sessionStorage.setItem('brand_admin_key', adminKey)
    fetch('/api/brand-config')
      .then(r => r.json())
      .then(d => { setBrands(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authed, adminKey])

  useEffect(() => {
    if (loading || !authed) return
    // hero title stagger
    const words = titleRef.current?.querySelectorAll('.word')
    if (words?.length) {
      gsap.fromTo(words,
        { opacity: 0, y: 60, skewY: 4 },
        { opacity: 1, y: 0, skewY: 0, duration: .7, stagger: .12, ease: 'power4.out', delay: .1 }
      )
    }
    // orb breathe
    gsap.to(orbRef.current, {
      scale: 1.12, opacity: .7,
      duration: 4, ease: 'sine.inOut',
      yoyo: true, repeat: -1,
    })
    // cards scroll reveal
    const cardEls = cardsRef.current?.querySelectorAll('.brand-card-wrap')
    if (cardEls?.length) {
      cardEls.forEach((el, i) => {
        gsap.fromTo(el,
          { opacity: 0, x: -30, filter: 'blur(6px)' },
          {
            opacity: 1, x: 0, filter: 'blur(0px)',
            duration: .55, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%' },
            delay: i * .06,
          }
        )
      })
    }
  }, [loading, authed])

  if (!authed) return <AuthScreen onAuth={k => { setAdminKey(k); setAuthed(true) }} />

  return (
    <>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#06080f', fontFamily: 'system-ui,-apple-system,sans-serif', overflowX: 'hidden' }}>

        {/* ── background grid ── */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* ── ambient orb ── */}
        <div ref={orbRef} style={{
          position: 'fixed', top: '-10%', right: '-5%', width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(59,130,246,.12) 0%,rgba(139,92,246,.06) 40%,transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 920, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* ── nav ── */}
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>☁️</div>
              <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: 11, letterSpacing: '.16em' }}>CLOUDPIPE // BRAND OS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155', letterSpacing: '.1em' }}>
                {new Date().toISOString().slice(0, 10)}
              </span>
              <span style={{ background: 'rgba(56,189,248,.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,.2)', fontSize: 9, fontWeight: 700, letterSpacing: '.14em', padding: '3px 10px', borderRadius: 20 }}>
                ADMIN
              </span>
            </div>
          </nav>

          {/* ── hero ── */}
          <div ref={heroRef} style={{ paddingTop: 64, paddingBottom: 56 }}>
            <p style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: 11, letterSpacing: '.18em', marginBottom: 20 }}>
              // BRAND MANAGEMENT SYSTEM
            </p>
            <div ref={titleRef} style={{ overflow: 'hidden' }}>
              {['BRAND', 'CONTROL'].map(w => (
                <div key={w} className="word" style={{
                  display: 'block',
                  fontFamily: '"Arial Black","Impact","Helvetica Neue",sans-serif',
                  fontSize: 'clamp(56px,8vw,108px)',
                  fontWeight: 900,
                  lineHeight: .92,
                  letterSpacing: '-.03em',
                  color: '#f1f5f9',
                  opacity: 0,
                }}>
                  {w}
                </div>
              ))}
            </div>

            {/* stats row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginTop: 36, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div>
                <div style={{ fontFamily: '"Arial Black",sans-serif', fontSize: 36, fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>{brands.length}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569', letterSpacing: '.14em', marginTop: 4 }}>BRANDS</div>
              </div>
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,.06)' }} />
              <div>
                <div style={{ fontFamily: '"Arial Black",sans-serif', fontSize: 36, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>
                  {brands.filter(b => b.mode === 'active').length}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569', letterSpacing: '.14em', marginTop: 4 }}>ACTIVE</div>
              </div>
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,.06)' }} />
              <div>
                <div style={{ fontFamily: '"Arial Black",sans-serif', fontSize: 36, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                  {brands.filter(b => b.mode !== 'active').length}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569', letterSpacing: '.14em', marginTop: 4 }}>MAINTENANCE</div>
              </div>
            </div>
          </div>

          {/* ── brand cards ── */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{
                  height: 110, borderRadius: 16,
                  background: 'linear-gradient(90deg,rgba(15,23,42,.8) 25%,rgba(30,41,59,.5) 50%,rgba(15,23,42,.8) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  border: '1px solid rgba(255,255,255,.04)',
                }} />
              ))}
              <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            </div>
          ) : (
            <div ref={cardsRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {brands.map((brand, i) => (
                <BrandCard key={brand.slug} brand={brand} idx={i} adminKey={adminKey} />
              ))}
            </div>
          )}

          {/* ── footer ── */}
          <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#1e293b', letterSpacing: '.1em' }}>
              SSOT — CHANGES PROPAGATE TO merchant_faqs + knowledge_facts
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
          </div>
        </div>
      </div>
    </>
  )
}
