'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'
import './page.css'

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID

const WA = 'https://wa.me/85362823037'
const WA_ORDER = (product: string, name?: string, date?: string) => {
  const msg = `你好！我剛在網站落咗單，想確認以下訂購詳情：\n\n套裝：${product}\n配送：${date ?? '待確認'}\n姓名：${name ?? '—'}\n\n請確認，謝謝！`
  return `${WA}?text=${encodeURIComponent(msg)}`
}

const PRODUCTS = [
  {
    id: 'family',
    name: '家庭鑑賞套裝',
    desc: '北海道馬糞海膽 · 壽司 / 海膽飯',
    weight: '100g',
    price: 'MOP $380',
    badge: '',
  },
  {
    id: 'chef',
    name: '主廚精選套裝',
    desc: '北海道 + 大連雙產地對比',
    weight: '各 100g × 2',
    price: 'MOP $680',
    badge: '最受歡迎',
  },
  {
    id: 'restaurant',
    name: '餐廳採購',
    desc: '週固定供應 · 支持發票',
    weight: '1kg 起訂',
    price: '歡迎查詢',
    badge: 'B2B',
  },
]

const DATES = (() => {
  const opts = []
  const d = new Date()
  for (let i = 0; i < 14; i++) {
    d.setDate(d.getDate() + (i === 0 ? 0 : 1))
    const day = d.getDay()
    if (day === 5 || day === 6) {
      opts.push(
        d.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })
      )
    }
    if (opts.length >= 4) break
  }
  return opts
})()

type Phase = 'select' | 'form' | 'done'

export default function SeaUrchinPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('select')
  const [form, setForm] = useState({ name: '', phone: '', date: DATES[0] ?? '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [utmSource, setUtmSource] = useState('facebook_ad')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const src = p.get('utm_source') || 'facebook_ad'
    const campaign = p.get('utm_campaign') || ''
    const medium = p.get('utm_medium') || ''
    setUtmSource([src, campaign, medium].filter(Boolean).join('|'))
  }, [])

  const pick = (id: string) => {
    setSelected(id)
    setPhase('form')
    setError('')
    setTimeout(() => document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('請填寫姓名及 WhatsApp 號碼')
      return
    }
    const product = PRODUCTS.find(p => p.id === selected)
    setLoading(true)
    setError('')
    try {
      await fetch('/api/v1/sea-urchin-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          notes: `產品：${product?.name}｜配送：${form.date}｜備注：${form.notes}`,
          source: utmSource,
          customer_type: selected === 'restaurant' ? 'restaurant' : 'retail',
        }),
      })
      setPhase('done')
      if (typeof window !== 'undefined' && (window as any).fbq) {
        ;(window as any).fbq('track', 'Lead', {
          currency: 'MOP',
          content_name: product?.name,
          content_category: selected === 'restaurant' ? 'B2B' : 'Retail',
        })
      }
    } catch {
      setError('提交失敗，請直接 WhatsApp 聯絡我們')
    }
    setLoading(false)
  }

  const product = PRODUCTS.find(p => p.id === selected)

  return (
    <div className="sue">
      {/* Header */}
      <header className="sue-header">
        <span className="sue-brand">海膽速遞</span>
        <a href={WA} target="_blank" rel="noopener noreferrer" className="sue-wa-btn">
          WhatsApp 查詢
        </a>
      </header>

      {/* Cutoff notice */}
      <div className="sue-notice">
        🧊 週五新鮮到貨 · 截單：每週三 23:59
      </div>

      {/* Products */}
      <main className="sue-main">
        {phase === 'done' ? (
          <div className="sue-success">
            <div className="sue-success-icon">✓</div>
            <h2>訂單已收到！</h2>
            <p>我們會在 <strong>24 小時內</strong> WhatsApp 確認。</p>
            <div className="sue-success-summary">
              <div className="sue-success-row"><span>套裝</span><span>{product?.name}</span></div>
              <div className="sue-success-row"><span>配送</span><span>{form.date}</span></div>
              <div className="sue-success-row"><span>聯絡</span><span>{form.phone}</span></div>
            </div>
            <a
              href={WA_ORDER(product?.name ?? '海膽套裝', form.name, form.date)}
              target="_blank"
              rel="noopener noreferrer"
              className="sue-btn sue-btn-wa"
            >
              WhatsApp 即時確認訂單
            </a>
            <p className="sue-success-hint">點擊後發送即可，我們會立即回覆</p>
          </div>
        ) : (
          <>
            <h1 className="sue-h1">選擇套裝</h1>

            <div className="sue-products">
              {PRODUCTS.map(p => (
                <button
                  key={p.id}
                  className={`sue-card ${selected === p.id ? 'active' : ''}`}
                  onClick={() => pick(p.id)}
                >
                  {p.badge && <span className="sue-badge">{p.badge}</span>}
                  <div className="sue-card-name">{p.name}</div>
                  <div className="sue-card-desc">{p.desc}</div>
                  <div className="sue-card-weight">{p.weight}</div>
                  <div className="sue-card-price">{p.price}</div>
                  <div className="sue-card-cta">
                    {selected === p.id ? '✓ 已選擇' : '立即選擇'}
                  </div>
                </button>
              ))}
            </div>

            {/* Order form — slides in after product selection */}
            {phase === 'form' && product && (
              <div id="order-form" className="sue-form-wrap">
                <div className="sue-form-title">
                  確認訂單 · <span>{product.name}</span>
                </div>

                <div className="sue-form">
                  <label className="sue-label">姓名</label>
                  <input
                    className="sue-input"
                    placeholder="你的名字"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    autoComplete="name"
                  />

                  <label className="sue-label">WhatsApp 號碼</label>
                  <input
                    className="sue-input"
                    placeholder="+853 6XXX XXXX"
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    autoComplete="tel"
                  />

                  <label className="sue-label">配送日期</label>
                  <select
                    className="sue-input"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  >
                    {DATES.map(d => <option key={d}>{d}</option>)}
                    <option value="待確認">待 WhatsApp 確認</option>
                  </select>

                  <label className="sue-label">備注（選填）</label>
                  <textarea
                    className="sue-input sue-textarea"
                    placeholder="配送地址、特別要求等"
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />

                  {error && <div className="sue-error">{error}</div>}

                  <button
                    className="sue-btn sue-btn-primary"
                    onClick={submit}
                    disabled={loading}
                  >
                    {loading ? '提交中…' : '確認下單'}
                  </button>

                  <a
                    href={WA_ORDER(product.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sue-btn sue-btn-wa"
                  >
                    或直接 WhatsApp 落單
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="sue-footer">
        <a href={WA} target="_blank" rel="noopener noreferrer">+853 6282 3037</a>
        &nbsp;·&nbsp;澳門唯一海膽直送服務
      </footer>

      {/* Facebook Pixel — only loads when NEXT_PUBLIC_FB_PIXEL_ID is set */}
      {FB_PIXEL_ID && (
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${FB_PIXEL_ID}');
          fbq('track','PageView');
        `}</Script>
      )}
    </div>
  )
}
