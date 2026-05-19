'use client'

import { useEffect, useState } from 'react'

export const metadata = undefined // handled via generateMetadata below — client component uses head injection

const DEMO_SLUG = 'inari-global-foods'

const C = {
  bg:         '#08111F',
  surface:    '#0C1B32',
  border:     'rgba(255,255,255,0.06)',
  gold:       '#F5C842',
  goldAlpha:  'rgba(245,200,66,0.08)',
  goldBorder: 'rgba(245,200,66,0.15)',
  text:       '#DCE6F4',
  muted:      'rgba(220,230,244,0.45)',
  faint:      'rgba(220,230,244,0.25)',
  green:      '#4ADE80',
}

interface WidgetApiResponse {
  embed_html: string
  brand_slug: string
  brand_name: string
  widget_url: string
}

export default function WidgetDemoPage() {
  const [embedHtml, setEmbedHtml]   = useState<string>('')
  const [brandName, setBrandName]   = useState<string>('稻荷環球食品')
  const [widgetUrl, setWidgetUrl]   = useState<string>('')
  const [copied, setCopied]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const [widgetLoaded, setWidgetLoaded] = useState(false)

  // Inject noindex
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])

  // Fetch embed snippet from API
  useEffect(() => {
    fetch(`/api/v1/brand-widget/${DEMO_SLUG}`)
      .then(r => r.json())
      .then((data: WidgetApiResponse) => {
        setEmbedHtml(data.embed_html || '')
        setBrandName(data.brand_name || '稻荷環球食品')
        setWidgetUrl(data.widget_url || '')
      })
      .catch(() => {
        // Fallback hardcode
        const fallback = `<!-- CloudPipe Brand Chat Widget — 稻荷環球食品 -->\n<script>\n  window.CloudPipeWidget = {\n    "brandSlug": "${DEMO_SLUG}",\n    "brandName": "稻荷環球食品",\n    "primaryColor": "#F5C842",\n    "greeting": "你好！我是稻荷環球食品的 AI 策略顧問。有什麼可以幫你？",\n    "position": "bottom-right"\n  };\n<\/script>\n<script src="https://cloudpipe-macao-app.vercel.app/widget/brand-chat.js" async defer><\/script>`
        setEmbedHtml(fallback)
      })
      .finally(() => setLoading(false))
  }, [])

  // Dynamically inject the widget script for live preview
  useEffect(() => {
    if (widgetLoaded || !widgetUrl) return

    // Set config before loading script
    ;(window as typeof window & { CloudPipeWidget?: object }).CloudPipeWidget = {
      brandSlug: DEMO_SLUG,
      brandName: brandName,
      primaryColor: '#F5C842',
      greeting: `你好！我是 ${brandName} 的 AI 策略顧問，有什麼可以幫你？`,
      position: 'bottom-right',
    }

    const script = document.createElement('script')
    script.src = widgetUrl
    script.async = true
    script.defer = true
    script.onload = () => setWidgetLoaded(true)
    document.body.appendChild(script)
    setWidgetLoaded(true)

    return () => {
      // Clean up widget DOM on unmount
      const btn = document.getElementById('cp-widget-btn')
      const panel = document.getElementById('cp-widget-panel')
      const styles = document.getElementById('cp-widget-styles')
      btn?.remove()
      panel?.remove()
      styles?.remove()
    }
  }, [widgetUrl, brandName, widgetLoaded])

  function copyCode() {
    navigator.clipboard?.writeText(embedHtml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: C.bg,
      minHeight: '100vh',
      fontFamily: 'var(--font-geist-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
      color: C.text,
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(8,17,31,0.94)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 24px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 26, height: 26,
            background: C.gold,
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
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>CloudPipe</span>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: C.muted, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            Widget Demo
          </span>
          <a
            href="/portal/inari-global-foods"
            style={{ marginLeft: 'auto', fontSize: 11, color: C.faint, textDecoration: 'none' }}
          >
            ← 返回 Portal
          </a>
        </div>
      </header>

      {/* Hero */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 0' }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.surface} 0%, rgba(245,200,66,0.04) 100%)`,
          border: `1px solid ${C.goldBorder}`,
          borderRadius: 16,
          padding: '40px 36px',
          marginBottom: 36,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: C.goldAlpha, border: `1px solid ${C.goldBorder}`,
            borderRadius: 20, padding: '4px 12px', width: 'fit-content',
            marginBottom: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: C.gold, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              可嵌入 Widget · 免安裝
            </span>
          </div>

          <h1 style={{
            fontSize: 28, fontWeight: 700, color: C.text, margin: '0 0 12px',
            letterSpacing: '-0.01em', lineHeight: 1.2,
          }}>
            品牌 AI 對話 Widget
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.65, maxWidth: 560 }}>
            兩行代碼，讓任何網站都能嵌入 CloudPipe AI 策略顧問。<br />
            品牌主在自己網站上提供 AI 搜索能見度顧問服務，無需 React、無需構建步驟。
          </p>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Left: Embed code */}
          <div>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 13, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>嵌入代碼</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    示例：{brandName}
                  </div>
                </div>
                <button
                  onClick={copyCode}
                  style={{
                    background: copied ? 'rgba(74,222,128,0.1)' : C.goldAlpha,
                    border: `1px solid ${copied ? 'rgba(74,222,128,0.25)' : C.goldBorder}`,
                    color: copied ? C.green : C.gold,
                    borderRadius: 8, padding: '6px 14px',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {copied ? '已複製！' : '複製代碼'}
                </button>
              </div>
              <div style={{ padding: '16px 18px' }}>
                {loading ? (
                  <div style={{ fontSize: 12, color: C.muted }}>載入中…</div>
                ) : (
                  <pre style={{
                    fontSize: 11,
                    color: 'rgba(220,230,244,0.75)',
                    fontFamily: '"Geist Mono", "JetBrains Mono", "Fira Code", monospace',
                    margin: 0, overflowX: 'auto',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    {embedHtml}
                  </pre>
                )}
              </div>
            </div>

            {/* How to use */}
            <div style={{
              marginTop: 16,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 13, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>
                如何使用
              </div>
              {[
                { step: '1', title: '複製上方代碼', desc: '點擊「複製代碼」按鈕' },
                { step: '2', title: '貼到網站 HTML', desc: '放在 </body> 標籤之前' },
                { step: '3', title: '自定義外觀', desc: '修改 brandName、primaryColor、greeting 等參數' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: C.goldAlpha, border: `1px solid ${C.goldBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: C.gold, flexShrink: 0, marginTop: 1,
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Config reference */}
          <div>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 13, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 18px',
                borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Config 參數說明</div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {[
                  { param: 'brandSlug', type: 'string', required: true,  desc: '品牌唯一識別碼（如 inari-global-foods）' },
                  { param: 'brandName', type: 'string', required: true,  desc: '顯示在 Widget 標題的品牌名稱' },
                  { param: 'primaryColor', type: 'string', required: false, desc: '主題色（十六進制，預設 #F5C842）' },
                  { param: 'greeting',    type: 'string', required: false, desc: '開場問候語' },
                  { param: 'position',    type: 'string', required: false, desc: '"bottom-right"（預設）或 "bottom-left"' },
                  { param: 'apiKey',      type: 'string', required: false, desc: '品牌 API Key（未來驗證用）' },
                ].map((row, i) => (
                  <div key={row.param} style={{
                    padding: '12px 18px',
                    borderBottom: i < 5 ? `1px solid ${C.border}` : 'none',
                    display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'start',
                  }}>
                    <div>
                      <code style={{
                        fontSize: 11, color: C.gold,
                        fontFamily: 'monospace',
                      }}>{row.param}</code>
                      {row.required && (
                        <span style={{ fontSize: 9, color: '#F87171', marginLeft: 4 }}>必填</span>
                      )}
                      <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>{row.type}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55 }}>{row.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live preview note */}
            <div style={{
              marginTop: 16,
              background: C.goldAlpha,
              border: `1px solid ${C.goldBorder}`,
              borderRadius: 13,
              padding: '16px 20px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: C.green, boxShadow: '0 0 6px rgba(74,222,128,0.6)',
                marginTop: 4, flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                  即時預覽已啟動
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                  頁面右下角的金色圓形按鈕即為實際嵌入後的效果。<br />
                  點擊開啟對話面板，測試與 {brandName} AI 顧問的對話。
                </div>
              </div>
            </div>

            {/* Widget endpoint info */}
            <div style={{
              marginTop: 16,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 13, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 10 }}>Widget 文件路徑</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'JS Widget', url: '/widget/brand-chat.js' },
                  { label: '嵌入代碼 API', url: `/api/v1/brand-widget/${DEMO_SLUG}` },
                  { label: 'Chat API', url: '/api/v1/visibility-chat' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 10, color: C.muted, width: 80, flexShrink: 0 }}>{row.label}</div>
                    <code style={{
                      fontSize: 10, color: 'rgba(220,230,244,0.55)',
                      fontFamily: 'monospace', wordBreak: 'break-all',
                    }}>{row.url}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
