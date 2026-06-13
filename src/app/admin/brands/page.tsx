'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TOKENS, getBrandTokens, BRAND_TOKENS } from '@/lib/design-tokens'

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

const META: Record<string, { tag: string }> = {
  'after-school-coffee': { tag: 'F&B' },
  'mind-cafe':           { tag: 'CAFÉ' },
  'cloudpipe':           { tag: 'SAAS' },
  'sea-urchin-delivery': { tag: 'DELIVERY' },
  'inari-global-foods':  { tag: 'B2B' },
}

/* ─────────────────────────────────────────
   Brand Card
───────────────────────────────────────── */
function BrandCard({ b, adminKey }: { b: Brand; adminKey: string }) {
  const m = META[b.slug] ?? { tag: '—' }
  const kf = b.key_facts ?? {}
  const active = (b.mode ?? 'active') === 'active'
  const brand = getBrandTokens(b.slug)

  return (
    <div
      style={{
        ...TOKENS.card,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* badge + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.color.textSubtle, fontWeight: 700 }}>
          {m.tag}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: active ? brand.accent : '#f59e0b',
          }} />
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? '#16a34a' : '#d97706', fontWeight: 700 }}>
            {active ? 'Active' : 'Maint'}
          </span>
        </span>
      </div>

      {/* brand name */}
      <h2 style={{
        margin: 0, marginTop: 4,
        fontSize: 22, fontWeight: 700, color: TOKENS.color.text, letterSpacing: '-0.01em',
      }}>
        {b.name_zh}
      </h2>
      <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: TOKENS.color.textSubtle }}>{b.name_en}</p>

      {/* slug tag */}
      <span style={{
        display: 'inline-block', alignSelf: 'flex-start',
        fontSize: 11, color: brand.accent, background: brand.accentLight,
        borderRadius: TOKENS.radius.sm, padding: '2px 8px', marginTop: 8,
      }}>
        {b.slug}
      </span>

      {/* address */}
      {kf.address && (
        <p style={{ margin: 0, marginTop: 12, fontSize: 13, color: TOKENS.color.textMuted, lineHeight: 1.5 }}>
          {kf.address}
        </p>
      )}
      {/* phone */}
      {kf.phone && (
        <p style={{ margin: 0, marginTop: 4, fontSize: 13, color: TOKENS.color.textMuted }}>
          {kf.phone}
        </p>
      )}
      {kf.hours && (
        <p style={{ margin: 0, marginTop: 4, fontSize: 13, color: TOKENS.color.textSubtle }}>
          {kf.hours}
        </p>
      )}

      {/* edit button */}
      <Link
        href={`/admin/brands/${b.slug}?key=${encodeURIComponent(adminKey)}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          alignSelf: 'flex-start', marginTop: 16,
          background: brand.accent, color: '#fff', borderRadius: TOKENS.radius.md,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}
      >
        Edit
        <span aria-hidden>→</span>
      </Link>

      {/* updated */}
      <span style={{ marginTop: 12, fontSize: 11, color: '#cbd5e1' }}>
        Updated {b.updated_at?.slice(0, 10)}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────
   Auth Screen
───────────────────────────────────────── */
function AuthScreen({ onAuth }: { onAuth: (k: string) => void }) {
  const [val, setVal] = useState('')

  return (
    <div style={{
      background: TOKENS.color.bg, minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', color: TOKENS.color.text,
      padding: 24,
    }}>
      <div style={{
        ...TOKENS.card,
        padding: 40, width: 380, maxWidth: '100%',
      }}>
        <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: TOKENS.color.textSubtle, margin: 0, marginBottom: 8 }}>
          CloudPipe · Brand OS
        </p>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: TOKENS.color.text, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Access Control
        </h2>
        <p style={{ fontSize: 14, color: TOKENS.color.textMuted, marginTop: 8, marginBottom: 24 }}>
          Enter your admin key to continue.
        </p>
        <input
          type="password"
          placeholder="Admin key"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && val && onAuth(val)}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: TOKENS.radius.md,
            border: `1px solid ${TOKENS.color.border}`, background: TOKENS.color.bg, color: TOKENS.color.text,
            fontSize: 14, outline: 'none', boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onFocus={e => (e.target.style.borderColor = BRAND_TOKENS.cloudpipe.accent)}
          onBlur={e => (e.target.style.borderColor = TOKENS.color.border)}
        />
        <button
          onClick={() => val && onAuth(val)}
          style={{
            ...TOKENS.button.primary,
            marginTop: 12, width: '100%', padding: 12, borderRadius: TOKENS.radius.md,
            fontSize: 14, justifyContent: 'center',
          }}
        >
          Enter
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main
───────────────────────────────────────── */
export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [adminKey, setAdminKey] = useState('')
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
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

  if (!authed) return <AuthScreen onAuth={k => { setAdminKey(k); setAuthed(true) }} />

  const activeCount = brands.filter(b => b.mode === 'active').length
  const maintCount = brands.filter(b => b.mode !== 'active').length

  return (
    <div style={{
      background: TOKENS.color.bg, minHeight: '100vh', color: TOKENS.color.text,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* navbar */}
      <nav style={{
        ...TOKENS.nav,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: TOKENS.color.text,
        }}>
          CloudPipe · Brand OS
        </span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: TOKENS.color.textMuted }}>{new Date().toISOString().slice(0, 10)}</span>
          <span style={{ fontSize: 13, color: TOKENS.color.textMuted }}>Admin</span>
        </div>
      </nav>

      {/* hero / page header */}
      <header style={{ padding: '60px 40px 40px', borderBottom: `1px solid ${TOKENS.color.borderMuted}` }}>
        <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: TOKENS.color.textSubtle, margin: 0, marginBottom: 8 }}>
          Brand Management System
        </p>
        <h1 style={{
          margin: 0, fontSize: 'clamp(28px,5vw,52px)', fontWeight: 800,
          color: TOKENS.color.text, letterSpacing: '-0.02em', lineHeight: 1.1,
        }}>
          Brand Control
        </h1>
        <p style={{ fontSize: 15, color: TOKENS.color.textMuted, marginTop: 8, marginBottom: 0 }}>
          Manage brand configuration, facts, and AI visibility across the portfolio.
        </p>
      </header>

      {/* stats bar */}
      <div style={{
        background: TOKENS.color.bgSubtle, borderTop: `1px solid ${TOKENS.color.border}`, borderBottom: `1px solid ${TOKENS.color.border}`,
        padding: '20px 40px', display: 'flex', gap: 40, flexWrap: 'wrap',
      }}>
        {[
          { value: brands.length, label: 'Total Brands' },
          { value: activeCount, label: 'Active' },
          { value: maintCount, label: 'Maintenance' },
        ].map(({ value, label }, i) => (
          <div key={i}>
            <span style={{ fontSize: 24, fontWeight: 700, color: TOKENS.color.text, display: 'block' }}>{value}</span>
            <span style={{ fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* cards grid */}
      <main style={{ padding: '40px' }}>
        {loading ? (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 24,
          }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 220, borderRadius: TOKENS.radius.lg,
                border: `1px solid ${TOKENS.color.border}`, background: TOKENS.color.bgSubtle,
              }} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 24,
          }}>
            {brands.map(b => (
              <BrandCard key={b.slug} b={b} adminKey={adminKey} />
            ))}
          </div>
        )}

        {/* footer note */}
        <p style={{
          marginTop: 48, fontSize: 12, color: TOKENS.color.textSubtle,
          textAlign: 'center', letterSpacing: '0.04em',
        }}>
          SSOT · Changes sync to merchant_faqs + knowledge_facts
        </p>
      </main>
    </div>
  )
}
