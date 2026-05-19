'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface VerifyResult {
  valid: boolean
  brand_slug?: string
  email?: string
  error?: string
}

interface PortalSession {
  brand_slug: string
  email: string
  expires: number
}

const BRAND_DISPLAY_NAMES: Record<string, string> = {
  'inari-global-foods': '稻荷環球食品',
  'cloudpipe': 'CloudPipe',
}

type AuthState = 'loading' | 'authenticated' | 'invalid'

export default function PortalPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandSlug = typeof params.brand === 'string' ? params.brand : ''

  const [authState, setAuthState] = useState<AuthState>('loading')
  const [session, setSession] = useState<PortalSession | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    async function authenticate() {
      // Check existing local session first
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
          // Expired — remove it
          localStorage.removeItem(storedKey)
        } catch {
          localStorage.removeItem(storedKey)
        }
      }

      // No valid session — check for token in URL
      const token = searchParams.get('token')
      if (!token) {
        // No token, no session — redirect to public brand page
        router.replace(`/brands/${brandSlug}`)
        return
      }

      // Verify token against API
      try {
        const res = await fetch(`/api/v1/brand-auth/verify?token=${encodeURIComponent(token)}`)
        const data: VerifyResult = await res.json()

        if (!res.ok || !data.valid) {
          setErrorMsg(data.error || '登入連結無效或已過期')
          setAuthState('invalid')
          // Redirect to public page after a short delay
          setTimeout(() => {
            router.replace(`/brands/${brandSlug}`)
          }, 2500)
          return
        }

        // Valid — persist session for 24 hours
        const newSession: PortalSession = {
          brand_slug: data.brand_slug!,
          email: data.email!,
          expires: Date.now() + 24 * 60 * 60 * 1000,
        }
        localStorage.setItem(storedKey, JSON.stringify(newSession))
        setSession(newSession)
        setAuthState('authenticated')

        // Clean token from URL (replace state so back-button does not re-verify)
        const cleanUrl = `/portal/${brandSlug}`
        window.history.replaceState({}, '', cleanUrl)
      } catch (err) {
        console.error('[Portal] verify fetch error:', err)
        setErrorMsg('網路錯誤，請稍後再試')
        setAuthState('invalid')
        setTimeout(() => {
          router.replace(`/brands/${brandSlug}`)
        }, 2500)
      }
    }

    if (brandSlug) {
      authenticate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandSlug])

  const brandName = BRAND_DISPLAY_NAMES[brandSlug] ?? brandSlug

  // ── Shared design tokens ──────────────────────────────────────────
  const bg: React.CSSProperties = {
    background: '#08111F',
    minHeight: '100vh',
    fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (authState === 'loading') {
    return (
      <div style={bg}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          {/* Spinner */}
          <div style={{
            width: 44,
            height: 44,
            border: '3px solid rgba(245,200,66,0.15)',
            borderTopColor: '#F5C842',
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 13, color: 'rgba(220,230,244,0.45)' }}>驗證身份中…</span>
        </div>
      </div>
    )
  }

  // ── Invalid / redirect ────────────────────────────────────────────
  if (authState === 'invalid') {
    return (
      <div style={bg}>
        <div style={{
          background: '#0C1B32',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 14,
          padding: '32px 36px',
          maxWidth: 420,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#F87171', marginBottom: 8 }}>
            登入連結無效
          </div>
          <div style={{ fontSize: 13, color: 'rgba(220,230,244,0.5)', lineHeight: 1.6 }}>
            {errorMsg || '此連結已使用或已過期。'}
            <br />正在重定向至品牌頁面…
          </div>
        </div>
      </div>
    )
  }

  // ── Authenticated ─────────────────────────────────────────────────
  return (
    <div style={{ ...bg, justifyContent: 'flex-start', paddingTop: 0 }}>
      {/* Header */}
      <header style={{
        width: '100%',
        background: 'rgba(8,17,31,0.94)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '0 24px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {/* Logo mark */}
          <div style={{
            width: 26, height: 26,
            background: '#F5C842',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7C2 4.23858 4.23858 2 7 2C9.76142 2 12 4.23858 12 7" stroke="#08111F" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 12V7" stroke="#08111F" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="7" cy="7" r="1.5" fill="#08111F"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>CloudPipe</span>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            Brand Portal
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.35)', fontFamily: 'var(--font-geist-mono)' }}>
              {session?.email}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1160, width: '100%', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Welcome hero */}
        <div style={{
          background: 'linear-gradient(135deg, #0C1B32 0%, rgba(245,200,66,0.04) 100%)',
          border: '1px solid rgba(245,200,66,0.12)',
          borderRadius: 16,
          padding: '40px 36px',
          marginBottom: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(245,200,66,0.07)',
            border: '1px solid rgba(245,200,66,0.14)',
            borderRadius: 20,
            padding: '4px 12px',
            width: 'fit-content',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#F5C842', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              已登入
            </span>
          </div>

          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#DCE6F4',
            margin: 0,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}>
            歡迎回來，
            <span style={{ color: '#F5C842' }}>{brandName}</span>！
          </h1>

          <p style={{
            fontSize: 14,
            color: 'rgba(220,230,244,0.5)',
            margin: 0,
            lineHeight: 1.65,
          }}>
            Brand Portal 載入中…<br />
            Phase 2 將在此提供 AI 能見度控制台、AEO 行動管理與直播報告。
          </p>
        </div>

        {/* Placeholder cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {[
            { icon: '📊', title: 'AI 能見度儀表板', desc: '即時監控 Perplexity、ChatGPT、Gemini、Grok 的品牌引用狀態', badge: '即將推出' },
            { icon: '🎯', title: 'AEO 行動計劃', desc: '查看待完成的 AEO 優化行動、進度追蹤與優先排序', badge: '即將推出' },
            { icon: '💬', title: 'AI Agent 對話', desc: '與品牌專屬 AI 助理對話，獲得個人化 AEO 建議', badge: '即將推出' },
            { icon: '📈', title: '週度報告', desc: '每週自動生成品牌 AI 能見度提升成效報告', badge: '即將推出' },
          ].map((card) => (
            <div key={card.title} style={{
              background: '#0C1B32',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 13,
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              opacity: 0.72,
            }}>
              <div style={{ fontSize: 24 }}>{card.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>{card.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.4)', lineHeight: 1.55, flex: 1 }}>{card.desc}</div>
              <div style={{
                display: 'inline-block', width: 'fit-content',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '3px 9px', borderRadius: 100,
                background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.12)',
                color: 'rgba(245,200,66,0.6)',
              }}>
                {card.badge}
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
