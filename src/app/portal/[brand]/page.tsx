'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface DashData {
  visibility: any
  aeoActions: any
  lifecycle: any
}

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
  const [dashData, setDashData] = useState<DashData | null>(null)
  const [dashLoading, setDashLoading] = useState(false)

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

  // ── Fetch dashboard data after auth ──────────────────────────────
  useEffect(() => {
    if (authState !== 'authenticated' || !brandSlug) return
    setDashLoading(true)
    Promise.all([
      fetch(`/api/v1/brands-summary?brand=${brandSlug}`).then(r => r.json()).catch(() => null),
      fetch(`/api/v1/brand-aeo-score/${brandSlug}`).then(r => r.json()).catch(() => null),
      fetch(`/api/v1/brand-lifecycle?brand=${brandSlug}`).then(r => r.json()).catch(() => null),
    ]).then(([visibility, aeoActions, lifecycle]) => {
      setDashData({ visibility, aeoActions, lifecycle })
    }).catch(() => {
      setDashData(null)
    }).finally(() => setDashLoading(false))
  }, [authState, brandSlug])

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
            管理品牌的 AI 能見度、AEO 行動計劃與週度報告。
          </p>
        </div>

        {/* Dashboard cards */}
        <style>{`
          @keyframes cp-pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
          @keyframes cp-spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>

          {/* Card 1: AI 能見度儀表板 */}
          <div style={{
            background: '#0C1B32',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 13,
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ fontSize: 24 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>AI 能見度儀表板</div>
            {dashLoading ? (
              <div style={{ height: 60, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'cp-pulse 1.5s ease-in-out infinite' }} />
            ) : dashData?.visibility && !dashData.visibility.error ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {(['chatgpt', 'perplexity', 'gemini', 'grok'] as const).map(platform => {
                  const vis = dashData.visibility
                  const mentioned = vis[platform]?.mentioned ?? vis?.platforms?.[platform]?.mentioned ?? false
                  return (
                    <div key={platform} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'rgba(220,230,244,0.6)', textTransform: 'capitalize' }}>{platform}</span>
                      <span style={{ fontSize: 13 }}>{mentioned ? '✅' : '❌'}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.4)', flex: 1, lineHeight: 1.55 }}>
                數據載入中
              </div>
            )}
          </div>

          {/* Card 2: AEO 行動計劃 */}
          <div style={{
            background: '#0C1B32',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 13,
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ fontSize: 24 }}>🎯</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>AEO 行動計劃</div>
            {dashLoading ? (
              <div style={{ height: 60, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'cp-pulse 1.5s ease-in-out infinite' }} />
            ) : dashData?.aeoActions && !dashData.aeoActions.error ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {(() => {
                  const d = dashData.aeoActions
                  const pending = d.pending_count ?? d.actions?.filter((a: any) => a.status === 'pending')?.length ?? 0
                  const actions: any[] = d.actions?.slice(0, 2) ?? []
                  return (
                    <>
                      <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.5)' }}>
                        待完成行動：<span style={{ color: '#F5C842', fontWeight: 700 }}>{pending}</span> 項
                      </div>
                      {actions.map((a: any, i: number) => (
                        <div key={i} style={{
                          fontSize: 11, color: 'rgba(220,230,244,0.6)',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 6, padding: '4px 8px',
                          lineHeight: 1.4,
                        }}>
                          {a.title ?? a.action_title ?? a.action ?? '行動項'}
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.4)', flex: 1, lineHeight: 1.55 }}>
                暫無行動項
              </div>
            )}
          </div>

          {/* Card 3: AI Agent 對話 */}
          <div style={{
            background: '#0C1B32',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 13,
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ fontSize: 24 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>AI Agent 對話</div>
            <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.5)', flex: 1, lineHeight: 1.55 }}>
              品牌專屬 AI 助理已就緒
            </div>
            <a
              href={`/macao/brand/${brandSlug}?tab=ops`}
              style={{
                display: 'inline-block',
                background: '#F5C842',
                color: '#08111F',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                textDecoration: 'none',
                textAlign: 'center',
                width: 'fit-content',
              }}
            >
              前往管理後台對話
            </a>
          </div>

          {/* Card 4: 週度報告 */}
          <div style={{
            background: '#0C1B32',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 13,
            padding: '22px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ fontSize: 24 }}>📈</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>週度報告</div>
            {dashLoading ? (
              <div style={{ height: 50, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'cp-pulse 1.5s ease-in-out infinite' }} />
            ) : dashData?.lifecycle && !dashData.lifecycle.error ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {(() => {
                  const lc = dashData.lifecycle
                  const citations = lc.total_citations ?? lc.weekly_citations ?? lc.ai_citations ?? null
                  const updated = lc.updated_at ?? lc.last_updated ?? null
                  return (
                    <>
                      {citations != null && (
                        <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.5)' }}>
                          本週 AI 引用：<span style={{ color: '#F5C842', fontWeight: 700 }}>{citations}</span> 次
                        </div>
                      )}
                      {updated && (
                        <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.35)' }}>
                          最後更新：{String(updated).slice(0, 10)}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.4)', flex: 1, lineHeight: 1.55 }}>
                下次週報：每週一 09:00
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  )
}
