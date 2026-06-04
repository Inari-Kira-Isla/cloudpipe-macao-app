'use client'

import { useState, useEffect, useRef } from 'react'

const WA_BASE = 'https://wa.me/85362823037'
const WA = (msg: string) => `${WA_BASE}?text=${encodeURIComponent(msg)}`

function nextMondays(count = 4): string[] {
  const slots: string[] = []
  const d = new Date()
  for (let i = 0; slots.length < count; i++) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() === 1) {
      slots.push(d.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' }))
    }
  }
  return slots
}

type CartItem = { size: string; name: string; weight: string; price: number; qty: number }

export default function CartPage() {
  const [item, setItem] = useState<CartItem | null>(null)
  const [dates, setDates] = useState<string[]>([])
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    address: '',
    delivery_day: '',
    delivery_slot: 'afternoon',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ orderNo: string } | null>(null)
  const orderNoRef = useRef(`DRP-${Math.floor(Math.random() * 9000 + 1000)}`)

  useEffect(() => {
    const d = nextMondays(4)
    setDates(d)

    // Read cart from URL params (set by main page) or localStorage
    const p = new URLSearchParams(window.location.search)
    const fromUrl: CartItem | null = p.get('name')
      ? {
          size: p.get('size') || 'wood',
          name: decodeURIComponent(p.get('name') || '木板海膽'),
          weight: decodeURIComponent(p.get('weight') || '100g'),
          price: parseInt(p.get('price') || '308'),
          qty: 1,
        }
      : null

    const fromStorage = (() => {
      try { return JSON.parse(localStorage.getItem('sue_cart') || 'null') } catch { return null }
    })()

    setItem(fromUrl || fromStorage || { size: 'wood', name: '木板海膽', weight: '100g', price: 308, qty: 1 })
    setForm(f => ({ ...f, delivery_day: d[0] || '' }))
  }, [])

  const total = item ? item.price * item.qty : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customer_name.trim() || !form.phone.trim()) {
      setError('請填寫姓名及 WhatsApp 號碼')
      return
    }
    if (!form.address.trim()) {
      setError('請填寫配送地址')
      return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/v1/sea-urchin-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.customer_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          delivery_day: form.delivery_day,
          delivery_slot: form.delivery_slot,
          notes: form.notes.trim(),
          product_name: item?.name || '海膽套裝',
          amount_mop: total,
          source: 'cart_checkout',
          status: 'inquiry',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || '提交失敗')
      }
      localStorage.removeItem('sue_cart')
      setSuccess({ orderNo: orderNoRef.current })
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失敗，請直接 WhatsApp 聯絡')
    }
    setLoading(false)
  }

  const waMsg = success
    ? `你好！我剛完成落單，確認以下訂單詳情：\n\n訂單：#${success.orderNo}\n商品：${item?.name} (${item?.weight})\n金額：MOP$${total}\n配送：${form.delivery_day} ${form.delivery_slot === 'morning' ? '(上午)' : '(下午)'}\n地址：${form.address}\n姓名：${form.customer_name}\n\n請確認，謝謝！`
    : ''

  // ── Success ──────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        <div style={{ maxWidth: 480, width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ff5c00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#fff' }}>✓</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.15em', color: '#666', marginBottom: 8 }}>ORDER SECURED · 訂單已確認</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>寶箱已鎖定</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>我們會在 24H 內 WhatsApp 確認訂單詳情</div>

          <div style={{ background: '#0a0a0a', borderRadius: 10, padding: 20, marginBottom: 24, textAlign: 'left' }}>
            {[
              ['ORDER NO.', `#${success.orderNo}`],
              ['商品', `${item?.name} (${item?.weight})`],
              ['金額', `MOP$ ${total.toLocaleString()}`],
              ['配送', `${form.delivery_day}`],
              ['時段', form.delivery_slot === 'morning' ? '上午' : '下午'],
              ['地址', form.address],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                <span style={{ color: '#555', letterSpacing: '0.08em' }}>{k}</span>
                <span style={{ color: '#ccc' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <a
              href={WA(waMsg)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', background: '#25d366', color: '#fff', borderRadius: 10, padding: '14px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.06em' }}
            >
              WhatsApp 確認訂單 →
            </a>
            <a
              href="/sea-urchin"
              style={{ display: 'block', background: '#1a1a1a', color: '#888', borderRadius: 10, padding: '12px 20px', fontSize: 13, textDecoration: 'none' }}
            >
              返回主頁
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Checkout Form ─────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <header style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/sea-urchin" style={{ color: '#666', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', textDecoration: 'none' }}>← BACK</a>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, letterSpacing: '0.12em', color: '#fff', fontWeight: 600 }}>
          UNI<span style={{ color: '#ff5c00' }}>/</span>DROP
          <span style={{ color: '#444', marginLeft: 8, fontSize: 10 }}>CHECKOUT</span>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start' }}>

        {/* ── Left: Form ── */}
        <form onSubmit={submit}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', color: '#555', marginBottom: 8 }}>STEP 01 · 聯絡資料</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>確認訂單</h1>
          </div>

          {/* Name */}
          <Field label="NAME / 姓名" num="01">
            <input
              type="text"
              placeholder="你的名字"
              value={form.customer_name}
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              required
              style={inputStyle}
            />
          </Field>

          {/* Phone */}
          <Field label="WHATSAPP / 號碼" num="02">
            <input
              type="tel"
              placeholder="+853 6XXX XXXX"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
              style={inputStyle}
            />
          </Field>

          {/* Address */}
          <Field label="ADDRESS / 配送地址" num="03">
            <input
              type="text"
              placeholder="澳門半島 / 氹仔 / 路環 · 詳細地址"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              required
              style={inputStyle}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>澳門全區免費配送</div>
          </Field>

          {/* Delivery Day */}
          <Field label="DELIVERY DAY / 配送日期" num="04">
            <select
              value={form.delivery_day}
              onChange={e => setForm(f => ({ ...f, delivery_day: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="待確認">待 WhatsApp 確認</option>
            </select>
          </Field>

          {/* Slot */}
          <Field label="TIME SLOT / 配送時段" num="05">
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { val: 'morning',   label: '上午', sub: '10:00–13:00' },
                { val: 'afternoon', label: '下午', sub: '14:00–18:00' },
              ].map(s => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, delivery_slot: s.val }))}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 8,
                    border: `1px solid ${form.delivery_slot === s.val ? '#ff5c00' : '#222'}`,
                    background: form.delivery_slot === s.val ? 'rgba(255,92,0,0.08)' : '#111',
                    color: form.delivery_slot === s.val ? '#ff5c00' : '#666',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{s.sub}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* Notes */}
          <Field label="NOTES / 備注（選填）" num="06">
            <input
              type="text"
              placeholder="特別要求、門鈴位置等"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={inputStyle}
            />
          </Field>

          {error && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', borderRadius: 8, color: '#ff6060', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 24, width: '100%', padding: '16px 24px',
              background: loading ? '#333' : '#ff5c00',
              color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>{loading ? '提交中…' : '確認落單 · CONFIRM ORDER'}</span>
            {!loading && <span style={{ fontSize: 16 }}>→</span>}
          </button>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#444', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
            提交後 24H 內 WhatsApp 確認 · MBway / 轉數快 / 現金付款
          </div>
        </form>

        {/* ── Right: Order Summary ── */}
        {item && (
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 24 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em', color: '#555', marginBottom: 16 }}>ORDER SUMMARY / 訂單摘要</div>

              {/* Product */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, background: '#0d0d0d', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  🦔
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#555', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>DROP NO. 024 · {item.weight}</div>
                  <div style={{ fontSize: 12, color: '#ff5c00', marginTop: 4 }}>MOP$ {item.price.toLocaleString()}</div>
                </div>
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {[
                  ['小計 SUBTOTAL', `MOP$ ${total.toLocaleString()}`],
                  ['配送 DELIVERY', '免費 FREE'],
                  ['付款 PAYMENT', 'MBway / 轉數快 / 現金'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
                    <span style={{ color: '#555' }}>{k}</span>
                    <span style={{ color: '#ccc' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: '#666' }}>TOTAL DUE</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#ff5c00' }}>MOP$ {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Trust strip */}
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['◆', '產地直送'], ['◆', '全程冷鏈'], ['◆', '24H確認'], ['◆', '鮮度保證']].map(([icon, txt]) => (
                <div key={txt} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 6, fontSize: 11, color: '#555' }}>
                  <span style={{ color: '#ff5c00' }}>{icon}</span>{txt}
                </div>
              ))}
            </div>

            {/* WhatsApp shortcut */}
            <a
              href={WA(`你好！我想查詢海膽速遞下單詳情，請問本週 DROP 024 ${item.name} 還有貨嗎？`)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 12, padding: '12px 16px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 10, fontSize: 11, color: '#555', fontFamily: 'JetBrains Mono, monospace', textDecoration: 'none', textAlign: 'center', letterSpacing: '0.06em' }}
            >
              或直接 WhatsApp 落單 →
            </a>
          </div>
        )}
      </div>

      {/* Mobile: fixed bottom bar */}
      <div style={{ display: 'none' }} id="mobile-bar" />
    </div>
  )
}

function Field({ label, num, children }: { label: string; num: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#333', letterSpacing: '0.1em' }}>{num}</span>
        <label style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' }}>{label}</label>
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', background: '#111', border: '1px solid #222',
  borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none',
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  boxSizing: 'border-box',
}
