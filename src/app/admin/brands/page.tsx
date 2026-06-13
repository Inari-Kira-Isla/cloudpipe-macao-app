'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface Brand {
  slug: string
  name_zh: string
  name_en: string
  mode: string
  key_facts: { phone?: string; hours?: string; address?: string; platforms?: string[] }
  updated_at: string
}

const META: Record<string, { accent: string; tag: string; emoji: string }> = {
  'after-school-coffee': { accent: '#f59e0b', tag: 'F&B',      emoji: '☕' },
  'mind-cafe':           { accent: '#a78bfa', tag: 'CAFÉ',     emoji: '🧠' },
  'cloudpipe':           { accent: '#38bdf8', tag: 'SAAS',     emoji: '☁️' },
  'sea-urchin-delivery': { accent: '#34d399', tag: 'DELIVERY', emoji: '🦔' },
  'inari-global-foods':  { accent: '#f87171', tag: 'B2B',      emoji: '🐟' },
}

/* ─────────────────────────────────────────
   Canvas Particle Network
───────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = 0, H = 0, raf = 0
    let mx = -999, my = -999

    const N = 110
    type P = { x:number; y:number; vx:number; vy:number; r:number; col:string }
    const accentColors = ['#38bdf855','#a78bfa44','#f59e0b33','#34d39933','#f8717133']
    const pts: P[] = []

    function resize() {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
      pts.length = 0
      for (let i = 0; i < N; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - .5) * .35,
          vy: (Math.random() - .5) * .35,
          r: Math.random() * 1.4 + .4,
          col: accentColors[Math.floor(Math.random() * accentColors.length)],
        })
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // move
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        // mouse repel
        const dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx*dx+dy*dy)
        if (d < 100) { p.vx += dx/d * .04; p.vy += dy/d * .04 }
        // dampen
        p.vx *= .995; p.vy *= .995
      }

      // lines
      for (let i = 0; i < N; i++) {
        for (let j = i+1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d  = Math.sqrt(dx*dx + dy*dy)
          if (d < 140) {
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(148,163,184,${(1 - d/140) * .12})`
            ctx.lineWidth = .6
            ctx.stroke()
          }
        }
      }

      // dots
      for (const p of pts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
        ctx.fillStyle = p.col
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    const onMouse = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    resize()
    draw()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouse)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:.75 }} />
}

/* ─────────────────────────────────────────
   Custom Cursor
───────────────────────────────────────── */
function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rx = 0, ry = 0
    const onMove = (e: MouseEvent) => {
      gsap.to(dotRef.current,  { x: e.clientX, y: e.clientY, duration:.08 })
      rx += (e.clientX - rx) * .12
      ry += (e.clientY - ry) * .12
      gsap.to(ringRef.current, { x: e.clientX, y: e.clientY, duration:.18, ease:'power2.out' })
    }
    const onEnter = () => gsap.to(ringRef.current, { scale:2.2, opacity:.6, duration:.25 })
    const onLeave = () => gsap.to(ringRef.current, { scale:1, opacity:1, duration:.25 })
    window.addEventListener('mousemove', onMove)
    document.querySelectorAll('a,button').forEach(el => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
    })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const base: React.CSSProperties = { position:'fixed', borderRadius:'50%', pointerEvents:'none', zIndex:9999, top:0, left:0, transform:'translate(-50%,-50%)' }
  return (
    <>
      <div ref={ringRef}  style={{ ...base, width:36, height:36, border:'1px solid rgba(255,255,255,.45)', mixBlendMode:'difference' }} />
      <div ref={dotRef}   style={{ ...base, width:5,  height:5,  background:'#fff', mixBlendMode:'difference' }} />
    </>
  )
}

/* ─────────────────────────────────────────
   Brand Card
───────────────────────────────────────── */
function BrandCard({ b, idx, adminKey }: { b: Brand; idx: number; adminKey: string }) {
  const wrapRef   = useRef<HTMLDivElement>(null)
  const innerRef  = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const m   = META[b.slug] ?? { accent:'#64748b', tag:'—', emoji:'📦' }
  const kf  = b.key_facts ?? {}
  const num = String(idx+1).padStart(2,'0')
  const active = (b.mode ?? 'active') === 'active'

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r  = innerRef.current!.getBoundingClientRect()
    const x  = (e.clientX - r.left) / r.width  - .5
    const y  = (e.clientY - r.top)  / r.height - .5
    // 3D tilt
    gsap.to(innerRef.current, { rotateY: x*16, rotateX: -y*10, duration:.3, ease:'power2.out', transformPerspective:900 })
    // highlight follow
    gsap.to(highlightRef.current, {
      x: (e.clientX - r.left) - 150,
      y: (e.clientY - r.top)  - 150,
      opacity:1, duration:.25,
    })
  }, [])

  const onLeave = useCallback(() => {
    gsap.to(innerRef.current,   { rotateY:0, rotateX:0, duration:.7, ease:'elastic.out(1,.55)' })
    gsap.to(highlightRef.current, { opacity:0, duration:.4 })
  }, [])

  // magnetic wrap
  const onWrapMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r  = wrapRef.current!.getBoundingClientRect()
    const cx = r.left + r.width/2, cy = r.top + r.height/2
    const dx = e.clientX - cx, dy = e.clientY - cy
    gsap.to(wrapRef.current, { x: dx*.06, y: dy*.06, duration:.4, ease:'power2.out' })
  }, [])

  const onWrapLeave = useCallback(() => {
    gsap.to(wrapRef.current, { x:0, y:0, duration:.7, ease:'elastic.out(1,.55)' })
  }, [])

  return (
    <div ref={wrapRef} onMouseMove={onWrapMove} onMouseLeave={onWrapLeave} style={{ willChange:'transform' }}>
      <Link href={`/admin/brands/${b.slug}?key=${encodeURIComponent(adminKey)}`} style={{ textDecoration:'none', display:'block' }}>
        <div
          ref={innerRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          style={{
            position:'relative', overflow:'hidden', cursor:'none',
            background:'linear-gradient(135deg,rgba(10,15,28,.96),rgba(5,8,18,.98))',
            border:'1px solid rgba(255,255,255,.055)',
            borderRadius:18, padding:'30px 36px',
            transformStyle:'preserve-3d', willChange:'transform',
          }}
          onMouseEnter={e => {
            gsap.to(e.currentTarget, { borderColor:`${m.accent}44`, duration:.3 })
          }}
          onMouseOut={e => {
            gsap.to(e.currentTarget, { borderColor:'rgba(255,255,255,.055)', duration:.4 })
          }}
        >
          {/* moving highlight */}
          <div ref={highlightRef} style={{
            position:'absolute', width:300, height:300, borderRadius:'50%',
            background:`radial-gradient(circle,${m.accent}22 0%,transparent 70%)`,
            pointerEvents:'none', opacity:0, top:0, left:0,
          }} />

          {/* left glow bar */}
          <div style={{
            position:'absolute', left:0, top:20, bottom:20, width:3, borderRadius:999,
            background:`linear-gradient(180deg,transparent,${m.accent},transparent)`,
            boxShadow:`0 0 16px ${m.accent}66`,
          }} />

          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20 }}>
            {/* LEFT */}
            <div style={{ flex:1, minWidth:0 }}>
              {/* row 1: num + tag */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span style={{ fontFamily:'monospace', fontSize:11, color:m.accent, letterSpacing:'.14em', opacity:.8 }}>{num}</span>
                <div style={{ height:1, width:32, background:`${m.accent}44` }} />
                <span style={{ fontSize:9, fontWeight:800, letterSpacing:'.16em', color:m.accent, background:`${m.accent}14`, border:`1px solid ${m.accent}33`, padding:'2px 8px', borderRadius:3 }}>{m.tag}</span>
              </div>

              {/* row 2: brand name */}
              <div style={{ marginBottom:14 }}>
                <h2 style={{
                  margin:0, color:'#f1f5f9', fontWeight:900, lineHeight:.94,
                  fontSize:'clamp(22px,2.8vw,34px)',
                  fontFamily:'"Arial Black","Impact","Helvetica Neue",sans-serif',
                  letterSpacing:'-.025em',
                  textShadow:`0 0 40px ${m.accent}22`,
                }}>
                  {b.name_zh}
                </h2>
                <p style={{ margin:'5px 0 0', color:'#334155', fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'monospace' }}>
                  {b.name_en}
                </p>
              </div>

              {/* row 3: metadata */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 20px', fontFamily:'monospace', fontSize:11, color:'#475569' }}>
                {kf.phone    && <span style={{ color:'#64748b' }}>T/ {kf.phone}</span>}
                {kf.hours    && <span>HRS/ {kf.hours}</span>}
                {kf.platforms?.length ? <span>SVC/ {kf.platforms.join('+')}</span> : null}
              </div>
              {kf.address && (
                <p style={{ margin:'7px 0 0', fontFamily:'monospace', fontSize:10, color:'#1e3a5f', letterSpacing:'.04em' }}>
                  LOC/ {kf.address}
                </p>
              )}
            </div>

            {/* RIGHT */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10, flexShrink:0 }}>
              <div style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:9, fontWeight:800, letterSpacing:'.14em',
                color: active ? '#4ade80' : '#f59e0b',
                background: active ? 'rgba(74,222,128,.09)' : 'rgba(245,158,11,.09)',
                border:`1px solid ${active ? '#4ade8030' : '#f59e0b30'}`,
                padding:'4px 12px', borderRadius:99,
              }}>
                <span style={{
                  width:5, height:5, borderRadius:'50%', display:'block',
                  background: active ? '#4ade80' : '#f59e0b',
                  boxShadow:`0 0 7px ${active ? '#4ade80' : '#f59e0b'}`,
                  animation: active ? 'blink 2s ease-in-out infinite' : 'none',
                }} />
                {active ? 'ACTIVE' : 'MAINT'}
              </div>
              <span style={{ fontFamily:'monospace', fontSize:10, color:'#1e3a5f' }}>{b.updated_at?.slice(0,10)}</span>
              <span style={{ fontSize:11, color:m.accent, fontWeight:700, letterSpacing:'.1em', transition:'letter-spacing .2s' }}>
                EDIT →
              </span>
            </div>
          </div>

          {/* bottom accent line */}
          <div style={{
            position:'absolute', bottom:0, left:'10%', right:'10%', height:1,
            background:`linear-gradient(90deg,transparent,${m.accent}55,transparent)`,
          }} />
        </div>
      </Link>
    </div>
  )
}

/* ─────────────────────────────────────────
   Auth Screen
───────────────────────────────────────── */
function AuthScreen({ onAuth }: { onAuth:(k:string)=>void }) {
  const [val, setVal] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(boxRef.current,
      { opacity:0, y:50, scale:.93 },
      { opacity:1, y:0,  scale:1, duration:.6, ease:'power4.out' }
    )
  }, [])

  return (
    <>
      <ParticleCanvas />
      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#050810' }}>
        <div ref={boxRef} style={{
          background:'rgba(8,12,22,.92)', backdropFilter:'blur(24px)',
          border:'1px solid rgba(255,255,255,.07)', borderRadius:22,
          padding:'48px 44px', width:380,
          boxShadow:'0 50px 100px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.03)',
        }}>
          <p style={{ color:'#38bdf8', fontFamily:'monospace', fontSize:10, letterSpacing:'.2em', margin:'0 0 14px' }}>CLOUDPIPE // BRAND OS v2</p>
          <h2 style={{ color:'#f1f5f9', margin:'0 0 30px', fontWeight:900, fontSize:28, letterSpacing:'-.02em', fontFamily:'"Arial Black",sans-serif', lineHeight:1.1 }}>
            ACCESS<br />CONTROL
          </h2>
          <input
            type="password" placeholder="ENTER ADMIN KEY"
            value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key==='Enter' && val && onAuth(val)}
            style={{ width:'100%', padding:'14px 18px', borderRadius:12, border:'1px solid rgba(255,255,255,.08)', background:'rgba(0,0,0,.5)', color:'#f1f5f9', fontSize:13, fontFamily:'monospace', letterSpacing:'.12em', outline:'none', boxSizing:'border-box', transition:'border-color .2s' }}
            onFocus={e => (e.target.style.borderColor='rgba(56,189,248,.4)')}
            onBlur={e  => (e.target.style.borderColor='rgba(255,255,255,.08)')}
          />
          <button
            onClick={() => val && onAuth(val)}
            style={{ marginTop:12, width:'100%', padding:14, borderRadius:12, background:'linear-gradient(135deg,#1e40af,#3b82f6)', color:'#fff', border:'none', fontSize:12, fontWeight:800, cursor:'none', letterSpacing:'.14em' }}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale:1.03, duration:.15 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale:1, duration:.2 })}
          >
            ENTER SYSTEM
          </button>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   Main
───────────────────────────────────────── */
export default function BrandsPage() {
  const [brands, setBrands]   = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [adminKey, setAdminKey] = useState('')
  const [authed, setAuthed]   = useState(false)

  const charsRef  = useRef<HTMLSpanElement[]>([])
  const statsRef  = useRef<HTMLDivElement>(null)
  const cardsRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    gsap.registerPlugin(ScrollTrigger)
    const saved = sessionStorage.getItem('bak')
    if (saved) { setAdminKey(saved); setAuthed(true) }
    const q = new URLSearchParams(window.location.search).get('key')
    if (q) { setAdminKey(q); setAuthed(true) }
  }, [])

  useEffect(() => {
    if (!authed) return
    sessionStorage.setItem('bak', adminKey)
    fetch('/api/brand-config')
      .then(r => r.json())
      .then(d => { setBrands(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authed, adminKey])

  useEffect(() => {
    if (loading || !authed) return

    // char stagger reveal
    const chars = charsRef.current.filter(Boolean)
    if (chars.length) {
      gsap.fromTo(chars,
        { opacity:0, y:'110%', skewY:6 },
        { opacity:1, y:'0%',   skewY:0, duration:.65, stagger:.04, ease:'power4.out', delay:.15 }
      )
    }
    // stats fade
    gsap.fromTo(statsRef.current,
      { opacity:0, y:20 },
      { opacity:1, y:0, duration:.6, ease:'power3.out', delay:.55 }
    )
    // cards
    const cardEls = cardsRef.current?.querySelectorAll('[data-card]')
    cardEls?.forEach((el, i) => {
      gsap.fromTo(el,
        { opacity:0, y:40, filter:'blur(8px)' },
        {
          opacity:1, y:0, filter:'blur(0px)',
          duration:.6, ease:'power3.out',
          scrollTrigger:{ trigger:el, start:'top 90%' },
          delay: i * .08,
        }
      )
    })
  }, [loading, authed])

  if (!authed) return <AuthScreen onAuth={k => { setAdminKey(k); setAuthed(true) }} />

  const heroWords = [
    { text:'BRAND', color:'#f1f5f9' },
    { text:'CONTROL', color:'transparent', stroke:true },
  ]

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }
        *{ box-sizing:border-box }
        html{ cursor:none }
        ::-webkit-scrollbar{ width:3px }
        ::-webkit-scrollbar-track{ background:#050810 }
        ::-webkit-scrollbar-thumb{ background:#1e293b; border-radius:99px }
        .noise::before{
          content:''; position:fixed; inset:0; z-index:1; pointer-events:none; opacity:.028;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat:repeat; background-size:200px;
        }
      `}</style>

      <Cursor />
      <ParticleCanvas />

      <div className="noise" style={{ minHeight:'100vh', background:'#050810', position:'relative', zIndex:2, fontFamily:'system-ui,-apple-system,sans-serif' }}>

        {/* nav */}
        <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 40px 0', position:'relative', zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>☁️</div>
            <span style={{ color:'#1e3a5f', fontFamily:'monospace', fontSize:10, letterSpacing:'.18em' }}>CLOUDPIPE · BRAND OS</span>
          </div>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            <span style={{ fontFamily:'monospace', fontSize:9, color:'#1e293b', letterSpacing:'.1em' }}>{new Date().toISOString().slice(0,10)}</span>
            <span style={{ background:'rgba(56,189,248,.1)', color:'#38bdf8', border:'1px solid rgba(56,189,248,.18)', fontSize:8, fontWeight:800, letterSpacing:'.18em', padding:'3px 10px', borderRadius:99 }}>ADMIN</span>
          </div>
        </nav>

        <div style={{ maxWidth:960, margin:'0 auto', padding:'0 40px 100px' }}>

          {/* hero */}
          <div style={{ paddingTop:72, paddingBottom:64 }}>
            <p style={{ color:'#1e3a5f', fontFamily:'monospace', fontSize:10, letterSpacing:'.2em', marginBottom:24 }}>
              // 00 — BRAND MANAGEMENT SYSTEM
            </p>

            {heroWords.map((w, wi) => (
              <div key={wi} style={{ overflow:'hidden', lineHeight:1 }}>
                <div style={{
                  fontFamily:'"Arial Black","Impact","Helvetica Neue",sans-serif',
                  fontSize:'clamp(64px,9vw,120px)',
                  fontWeight:900, letterSpacing:'-.03em',
                  lineHeight:.88, marginBottom:4,
                  color: w.stroke ? 'transparent' : w.color,
                  WebkitTextStroke: w.stroke ? '2px rgba(255,255,255,.18)' : 'none',
                }}>
                  {w.text.split('').map((ch, ci) => (
                    <span
                      key={ci}
                      ref={el => { charsRef.current[wi * 10 + ci] = el! }}
                      style={{ display:'inline-block', opacity:0 }}
                    >{ch}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* stats */}
            <div ref={statsRef} style={{ display:'flex', alignItems:'center', gap:40, marginTop:48, paddingTop:32, borderTop:'1px solid rgba(255,255,255,.04)', opacity:0 }}>
              {[
                { n: brands.length,                                    label:'TOTAL BRANDS', col:'#f1f5f9' },
                { n: brands.filter(b=>b.mode==='active').length,       label:'ACTIVE',       col:'#4ade80' },
                { n: brands.filter(b=>b.mode!=='active').length,       label:'MAINTENANCE',  col:'#f59e0b' },
              ].map(({ n, label, col }, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-end', gap:10 }}>
                  <span style={{ fontFamily:'"Arial Black",sans-serif', fontSize:42, fontWeight:900, color:col, lineHeight:1, letterSpacing:'-.04em' }}>{n}</span>
                  <span style={{ fontFamily:'monospace', fontSize:9, color:'#334155', letterSpacing:'.14em', marginBottom:5 }}>{label}</span>
                  {i < 2 && <div style={{ width:1, height:36, background:'rgba(255,255,255,.05)', marginLeft:24 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* section label */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
            <span style={{ fontFamily:'monospace', fontSize:9, color:'#1e3a5f', letterSpacing:'.18em', whiteSpace:'nowrap' }}>// INDEXED BRANDS</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,.04)' }} />
          </div>

          {/* cards */}
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{
                  height:120, borderRadius:18,
                  background:'linear-gradient(90deg,rgba(10,15,28,.9) 25%,rgba(20,30,50,.5) 50%,rgba(10,15,28,.9) 75%)',
                  backgroundSize:'200% 100%',
                  border:'1px solid rgba(255,255,255,.04)',
                  animation:`shimmer ${1.2 + i*.1}s ease-in-out infinite`,
                }} />
              ))}
              <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            </div>
          ) : (
            <div ref={cardsRef} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {brands.map((b, i) => (
                <div key={b.slug} data-card="">
                  <BrandCard b={b} idx={i} adminKey={adminKey} />
                </div>
              ))}
            </div>
          )}

          {/* footer */}
          <div style={{ marginTop:64, display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,.04)' }} />
            <span style={{ fontFamily:'monospace', fontSize:9, color:'#0f172a', letterSpacing:'.1em', whiteSpace:'nowrap' }}>
              SSOT · CHANGES SYNC TO merchant_faqs + knowledge_facts
            </span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,.04)' }} />
          </div>
        </div>
      </div>
    </>
  )
}
