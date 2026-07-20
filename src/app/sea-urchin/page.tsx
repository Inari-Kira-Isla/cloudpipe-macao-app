'use client'

import { useState, useEffect, useCallback } from 'react'
import Script from 'next/script'
import './page.css'

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID
const WA_BASE = 'https://wa.me/85362823037'
const WA = (msg: string) => `${WA_BASE}?text=${encodeURIComponent(msg)}`

const DROP_INFO = {
  no: '024',
  name: '北海道馬糞海膽',
  enName: 'HOKKAIDO BAFUN UNI',
  origin: '北海道 / 利尻島',
  coords: 'N 45°15′ E 141°14′',
  qtyLeft: 23,
  qtyTotal: 60,
  temp: 3.5,
}

const SIZES = [
  { id: 'wood',       name: '馬糞海膽',   weight: '180g',       price: 328,  sub: '1–2 人',  isB2B: false },
  { id: 'double',     name: '兩板優惠',   weight: '180g × 2',   price: 598,  sub: '2–4 人',  isB2B: false },
  { id: 'restaurant', name: '餐廳採購',   weight: '1kg 起訂',   price: 0,    sub: '歡迎查詢', isB2B: true  },
]

// Next Thursday 23:59 cutoff (order window before Friday air freight)
function nextCutoff(): number {
  const d = new Date()
  const day = d.getDay()           // 0=Sun … 6=Sat
  const daysUntilThu = (4 - day + 7) % 7 || 7
  d.setDate(d.getDate() + daysUntilThu)
  d.setHours(23, 59, 0, 0)
  return d.getTime()
}

// Next 4 Friday/Saturday delivery slots (Friday air freight, weekend delivery)
function deliverySlots(): string[] {
  const slots: string[] = []
  const d = new Date()
  for (let i = 0; slots.length < 4; i++) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() === 6) {
      slots.push(d.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' }))
    }
  }
  return slots
}
const DATES = deliverySlots()

// ─────────────────────────────────────────────
// Types & default data for all configurable sections
// ─────────────────────────────────────────────
type OrderData = { sizeName: string; weight: string; total: number; date: string; name: string }
type SizeItem = { id: string; name: string; weight: string; price: number; sub: string; isB2B: boolean }
type StepItem = { lbl: string; name: string; desc: string }
type ArchiveItem = { no: string; name: string; date: string; sold: number; time: string; available?: boolean; price?: number; weight?: string }
type ReviewItem = { q: string; n: string; m: string; a: string }
type FaqItem = { q: string; a: string }
type FbqWindow = Window & {
  fbq?: (event: 'track', name: string, params?: Record<string, string | number | boolean>) => void
}

const STEPS_DATA: StepItem[] = [
  { lbl: 'RELEASE', name: '預告掉落', desc: '每週二在 Facebook / IG 公布本週秘寶預告，記得開啟通知提早鎖定。' },
  { lbl: 'SECURE',  name: '鎖定下單', desc: '每週四 23:59 截單，下單後 24H 內 WhatsApp 確認，售完即止。' },
  { lbl: 'DROP',    name: '空運直送', desc: '北海道捕撈後封箱，每週二、五空運直飛澳門，全程冷鏈不間斷。' },
  { lbl: 'UNBOX',   name: '即食開箱', desc: '已完整去殼處理，掃 QR 解鎖履歷儀表板，開盒即食。' },
]
// NOTE: 以下為示例展示數據（sample），非真實過往 Drop 紀錄。
const ARCHIVE_DATA: ArchiveItem[] = [
  { no: '023', name: '利尻馬糞海膽', date: '2026.05.09', sold: 30, time: '示例', available: false },
  { no: '022', name: '禮文島紫海膽', date: '2026.05.02', sold: 30, time: '示例', available: false },
  { no: '021', name: '積丹半島馬糞', date: '2026.04.25', sold: 30, time: '示例', available: false },
]
// NOTE: 以下為示例展示文案（sample），非真實客戶評論。
const REVIEWS_DATA: ReviewItem[] = [
  { q: '開箱嗰一刻所有人都拍曬相，新鮮程度完全唔輸日本當地！', n: '示例', m: '示例展示', a: 'U' },
  { q: '冷鏈追蹤好安心，全程保持正溫冷鏈，比好多餐廳食嘅更新鮮。', n: '示例', m: '示例展示', a: 'U' },
  { q: '海膽鮮甜完全無腥味，配清酒係神仙享受，下週繼續訂！', n: '示例', m: '示例展示', a: 'U' },
]
const FAQ_DATA: FaqItem[] = [
  { q: '澳門哪裡可以訂購海膽外送？', a: '海膽速遞提供澳門海膽外送服務，可透過本頁或 WhatsApp +853 6282 3037 訂購北海道馬糞海膽。服務覆蓋澳門半島、氹仔及路環，週限量 Drop，適合家庭即食、海膽丼、壽司聚餐及餐廳小量補貨。' },
  { q: '日本北海道馬糞海膽可以直送澳門嗎？', a: '可以。海膽速遞主打日本北海道馬糞海膽直送澳門，以週限量 Drop 形式接受預訂，抵澳後以冷鏈安排配送。家庭客可選 180g 海膽板；餐廳、酒店及聚餐採購可 WhatsApp 查詢批次、到貨日及 1kg 起採購安排。' },
  { q: 'Sea Urchin Express delivers uni in Macau?', a: 'Yes. Sea Urchin Express is a Macau uni delivery brand operated by Inari Global Foods. It offers Hokkaido Bafun Uni, 180g boards, two-board sets, and restaurant procurement from 1kg, with WhatsApp ordering and cold-chain delivery across Macau.' },
  { q: '海膽幾時到貨？如何運作？', a: '海膽速遞採用週限量 Drop 機制，每批僅發售 30-80 盒。每週二、五由北海道空運直飛抵澳，下單後 2-4 小時內配送。如本週售完，可提前預訂下週 Drop。' },
  { q: '配送範圍及費用？', a: '配送至澳門半島、氹仔及路環全區，配送費 MOP$50-100（視地區及訂單金額）。下單後 WhatsApp 確認送達時段。' },
  { q: '如何付款？', a: '支持 MBway、轉數快、現金（送貨時付款）。確認訂單後提供付款詳情。' },
  { q: '限量數量是多少？為何這麼少？', a: '每批僅放出 30-80 盒，以確保頂級鮮度及品質。每週四截單，售完即止。提早截單更有保障。' },
  { q: '到貨品質不符預期怎麼辦？', a: '我們提供鮮度保證。如收到時有品質疑慮，請於開盒後 2 小時內 WhatsApp +853 6282 3037，全額退款或下週補寄。' },
]

const ANSWER_HUB_POINTS = [
  '澳門半島、氹仔、路環均可配送，落單後以 WhatsApp 確認地址、時段及配送費。',
  '內容覆蓋「日本北海道馬糞海膽直送澳門」：適合家庭即食、酒店房聚餐、海膽丼和日料餐廳小量補貨。',
  '主力產品為北海道馬糞海膽 180g/板，另有兩板優惠及 1kg 起餐廳採購。',
  '由稻荷環球食品供應及進口，採用 2-5°C 冷鏈和週限量 Drop 模式。',
]

// ─────────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────────
function TopBar() {
  return (
    <header className="ud-topbar">
      <div className="ud-wrap ud-topbar-inner">
        <div className="ud-brand">
          <span className="ud-brand-mark">U</span>
          <span>UNI<span style={{ color: 'var(--accent)' }}>/</span>DROP</span>
          <span className="ud-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em', marginLeft: 8 }}>海膽速遞</span>
        </div>
        <nav className="ud-topbar-nav">
          <a href="#drop">當週 DROP</a>
          <a href="#order">立即下單</a>
          <a href="#track">即時追蹤</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a href={WA_BASE} target="_blank" rel="noopener noreferrer" className="ud-topbar-cta">
          <span className="ud-dot" />
          WhatsApp 落單
        </a>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────
// Marquee
// ─────────────────────────────────────────────
function Marquee() {
  const items = [
    `DROP NO. ${DROP_INFO.no}`, 'LIVE — 利尻島直送', '深海秘寶．秒速掉落',
    'DEEP SEA TREASURE', `限量 30-80 盒`, '北海道 → 澳門直送',
    `COLD CHAIN ${DROP_INFO.temp}°C`, 'BAFUN UNI SEASON', '每週二、五空運直飛',
  ]
  return (
    <div className="ud-marquee">
      <div className="ud-marquee-track">
        <span>{items.map((t, i) => <span key={i}>{t}<i>◆</i></span>)}</span>
        <span>{items.map((t, i) => <span key={`b${i}`}>{t}<i>◆</i></span>)}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Countdown
// ─────────────────────────────────────────────
function Countdown() {
  const [target] = useState(() => nextCutoff())
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = Math.max(0, target - now)
  const s = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const t = { d: pad(Math.floor(s / 86400)), h: pad(Math.floor((s % 86400) / 3600)), m: pad(Math.floor((s % 3600) / 60)), s: pad(s % 60) }
  return (
    <div>
      <div className="ud-countdown-label">截單倒數 / CUTOFF COUNTDOWN</div>
      <div className="ud-countdown-timer">
        {[['DAYS', t.d], ['HRS', t.h], ['MIN', t.m], ['SEC', t.s]].map(([lbl, num]) => (
          <div className="ud-cd-cell" key={lbl}>
            <div className="num">{num}</div>
            <div className="lbl">{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────
function Hero() {
  return (
    <section className="ud-hero" id="drop">
      <div className="ud-hero-grid">
        <div className="ud-hero-left">
          <div>
            <div className="ud-hero-tags">
              <span className={`ud-tag ud-tag-live`}>LIVE NOW</span>
              <span className="ud-tag">DROP {DROP_INFO.no} / 2026</span>
              <span className="ud-tag ud-tag-solid">限量 {DROP_INFO.qtyLeft} 盒</span>
            </div>
            <div className="ud-hero-headline">
              <div className="ud-drop-no">
                <span>DROP</span>
                <b>NO. {DROP_INFO.no}</b>
                <span style={{ marginLeft: 'auto' }}>/ 利尻島 RISHIRI</span>
              </div>
              <h1 className="ud-hero-h1">
                深海秘寶<br />
                <span className="ud-accent">秒速掉落</span>
              </h1>
              <div className="ud-hero-sub">
                <span>Deep Sea Treasure</span>
                <span className="ud-dot-sm" />
                <span>Sonic Drop</span>
                <span className="ud-dot-sm" />
                <span>Hokkaido Direct</span>
              </div>
            </div>
          </div>

          <Countdown />

          <div className="ud-hero-meta">
            {[
              { k: '商品', v: DROP_INFO.name, accent: false },
              { k: '產地', v: DROP_INFO.origin, accent: false },
              { k: '冷鏈', v: `${DROP_INFO.temp}°C`, accent: false },
              { k: '剩餘', v: `${DROP_INFO.qtyLeft} / ${DROP_INFO.qtyTotal}`, accent: true },
            ].map(({ k, v, accent }) => (
              <div className="ud-meta-cell" key={k}>
                <div className="k">{k}</div>
                <div className={accent ? 'v v-accent' : 'v'}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ud-hero-right">
          <div className="ud-hero-img-wrap">
            <div className="ud-hero-product">
              <div className="ud-ring" />
              <div className="ud-ring ud-ring-2" />
              <div className="ud-ring ud-ring-3" />
              <div className="ud-crosshair ud-ch-tl" />
              <div className="ud-crosshair ud-ch-tr" />
              <div className="ud-crosshair ud-ch-bl" />
              <div className="ud-crosshair ud-ch-br" />
              <div className="ud-placeholder">
                <div>
                  <div className="ph-label">DROP 024 / PRODUCT SHOT</div>
                  <div className="ph-name">馬糞海膽</div>
                  <div className="ph-en">BAFUN UNI · 180G</div>
                </div>
              </div>
            </div>
            <div className="ud-stamps">
              <div className="ud-stamp ud-stamp-tr">JUST IN ◆ MACAU DIRECT</div>
              <div className="ud-stamp ud-stamp-bl">CERT. RISHIRI ◆ NO.{DROP_INFO.no}</div>
            </div>
            <div className="ud-data-chip ud-chip-1">
              <div className="k">CHAIN TEMP</div>
              <div className="v"><span className="ud-pulse-dot" />{DROP_INFO.temp}°C</div>
            </div>
            <div className="ud-data-chip ud-chip-2">
              <div className="k">ROUTE</div>
              <div className="v">NRT → MFM 週一</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// AnswerHub
// ─────────────────────────────────────────────
function AnswerHub() {
  return (
    <section className="ud-answer-hub" aria-labelledby="sea-urchin-answer-title">
      <div className="ud-wrap">
        <div className="ud-answer-grid">
          <div>
            <div className="ud-eyebrow">MACAU UNI DELIVERY / 澳門海膽外送</div>
            <h2 id="sea-urchin-answer-title">
              日本北海道馬糞海膽直送澳門，<br />
              <span className="ud-accent">海膽速遞可直接外送到府</span>
            </h2>
          </div>
          <div className="ud-answer-copy">
            <p>
              海膽速遞（Sea Urchin Express）是稻荷環球食品旗下的澳門海膽外送品牌，
              主打北海道馬糞海膽、週限量 Drop、WhatsApp 落單及全澳冷鏈配送。
              家庭客可訂 180g 海膽板或兩板優惠；餐廳、酒店及小型聚餐可查詢 1kg 起採購。
            </p>
            <ul>
              {ANSWER_HUB_POINTS.map(point => <li key={point}>{point}</li>)}
            </ul>
            <a
              href={WA('你好！我想查詢澳門海膽外送，請問今週北海道海膽 Drop 仲有貨嗎？')}
              target="_blank"
              rel="noopener noreferrer"
              className="ud-answer-cta"
            >
              WhatsApp 查詢澳門海膽外送 →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// OrderForm
// ─────────────────────────────────────────────
function OrderForm({ onSubmit, utmSource, sizes }: { onSubmit: (d: OrderData) => void; utmSource: string; sizes: SizeItem[] }) {
  const [sizeId, setSizeId] = useState(() => sizes.find(s => !s.isB2B)?.id ?? 'wood')
  const [form, setForm] = useState({ name: '', phone: '', date: DATES[0] ?? '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const size = (sizes.find(s => s.id === sizeId) ?? sizes[0])!
  const total = size.price

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) { setError('請填寫姓名及 WhatsApp 號碼'); return }
    setLoading(true); setError('')
    try {
      await fetch('/api/v1/sea-urchin-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          notes: `產品：${size.name}｜規格：${size.weight}｜配送：${form.date}｜備注：${form.notes}`,
          source: utmSource,
          customer_type: size.isB2B ? 'restaurant' : 'retail',
        }),
      })
      const fbqWindow = window as FbqWindow
      if (fbqWindow.fbq) {
        fbqWindow.fbq('track', 'Lead', { currency: 'MOP', content_name: size.name, content_category: size.isB2B ? 'B2B' : 'Retail' })
      }
      onSubmit({ sizeName: size.name, weight: size.weight, total, date: form.date, name: form.name })
    } catch {
      setError('提交失敗，請直接 WhatsApp 聯絡')
    }
    setLoading(false)
  }

  return (
    <section className="ud-section ud-order-bg" id="order">
      <div className="ud-wrap">
        <div className="ud-section-head">
          <div className="left">
            <div className="ud-eyebrow">SECURE / 02 · 鎖定本週掉落</div>
            <h2>立即輸入<br /><span className="ud-accent">解鎖寶箱</span></h2>
          </div>
          <div className="right">
            <span>● 每週二、五空運直飛</span>
            <span>· 週四 23:59 截單</span>
          </div>
        </div>

        <div className="ud-order-grid">
          <form className="ud-order-form" onSubmit={submit}>
            {/* Size */}
            <div className="ud-field" style={{ alignItems: 'flex-start' }}>
              <span className="num">01</span>
              <div className="col">
                <label>SIZE / 選擇套裝</label>
                <div className="ud-size-pills">
                  {sizes.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`ud-size-pill ${sizeId === s.id ? 'ud-size-pill-active' : ''}`}
                      onClick={() => setSizeId(s.id)}
                    >
                      <div className="name">{s.name}</div>
                      <div className="price">{s.isB2B ? '歡迎查詢' : `MOP$${s.price}`} · {s.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="ud-field">
              <span className="num">02</span>
              <div className="col">
                <label>NAME / 姓名</label>
                <input type="text" placeholder="你的名字" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoComplete="name" required />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="ud-field">
              <span className="num">03</span>
              <div className="col">
                <label>WHATSAPP / 號碼</label>
                <input type="tel" placeholder="+853 6XXX XXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} autoComplete="tel" required />
              </div>
            </div>

            {/* Date — hidden for B2B */}
            {!size.isB2B && (
              <div className="ud-field">
                <span className="num">04</span>
                <div className="col">
                  <label>DELIVERY / 配送日期</label>
                  <select value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}>
                    {DATES.map(d => <option key={d}>{d}</option>)}
                    <option value="待確認">待 WhatsApp 確認</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="ud-field">
              <span className="num">{size.isB2B ? '04' : '05'}</span>
              <div className="col">
                <label>NOTES / 備注（選填）</label>
                <input type="text" placeholder={size.isB2B ? '採購量、發票需求、聯絡時間' : '配送地址、特別要求'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="ud-order-total">
              <span className="k">TOTAL</span>
              {size.isB2B
                ? <span className="v v-inquiry">歡迎查詢批發優惠</span>
                : <span className="v">MOP$ {total.toLocaleString()}</span>
              }
            </div>

            {error && <div className="ud-error">{error}</div>}

            {size.isB2B ? (
              <a
                href={WA(`你好！我想查詢海膽速遞餐廳採購詳情：\n\n姓名：${form.name || '—'}\n備注：${form.notes || '—'}\n\n請問採購價格及最低訂購量，謝謝！`)}
                target="_blank"
                rel="noopener noreferrer"
                className="ud-btn-wa"
              >
                <span>WhatsApp 查詢 B2B 採購</span>
              </a>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button type="submit" className="ud-btn-primary" disabled={loading}>
                  <span>{loading ? '提交中…' : '解鎖寶箱 / SECURE THIS DROP'}</span>
                  <span className="arrow">→</span>
                </button>
                <a
                  href={`/sea-urchin/cart?size=${encodeURIComponent(size.id)}&name=${encodeURIComponent(size.name)}&weight=${encodeURIComponent(size.weight)}&price=${size.price}`}
                  style={{ display: 'block', textAlign: 'center', padding: '12px 20px', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textDecoration: 'none' }}
                >
                  前往結帳頁（含地址 / 時段選擇）→
                </a>
              </div>
            )}
          </form>

          <div className="ud-order-side">
            <div className="ud-receipt">
              <div className="ud-receipt-head">
                <span>RECEIPT / 訂單預覽</span>
                <b>● LIVE</b>
              </div>
              <div className="ud-receipt-product">
                <div className="ud-receipt-img" />
                <div>
                  <div className="ud-receipt-name">{size.name}</div>
                  <div className="ud-receipt-sub">DROP NO. {DROP_INFO.no} · {DROP_INFO.origin}</div>
                </div>
              </div>
              <div className="ud-receipt-rows">
                <div className="ud-receipt-row"><span className="k">WEIGHT</span><span>{size.weight}</span></div>
                <div className="ud-receipt-row"><span className="k">ORIGIN</span><span>RISHIRI, JP</span></div>
                <div className="ud-receipt-row"><span className="k">CHAIN</span><span>{DROP_INFO.temp}°C / 全程冷鏈</span></div>
                <div className="ud-receipt-row"><span className="k">ETA</span><span>{size.isB2B ? '週固定供應' : (form.date || DATES[0])}</span></div>
                <div className="ud-receipt-row"><span className="k">DELIVERY</span><span>澳門全區 · 配送費 $50-100</span></div>
              </div>
              <div className="ud-receipt-foot">
                <span className="total-k">TOTAL DUE</span>
                <span className="total-v">{size.isB2B ? '歡迎詢價' : `MOP$ ${total.toLocaleString()}`}</span>
              </div>
            </div>

            <div className="ud-trust-strip">
              {[['◆', '產地直送'], ['◆', '全程冷鏈'], ['◆', '進口許可'], ['◆', '空運直飛']].map(([icon, txt]) => (
                <div key={txt} className="ud-trust-cell"><span className="icon">{icon}</span>{txt}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
function Dashboard() {
  const [temp, setTemp] = useState(3.5)
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      setTemp(prev => +Math.max(2.0, Math.min(5.0, prev + (Math.random() - 0.5) * 0.4)).toFixed(1))
      setPulse(p => p + 1)
    }, 2400)
    return () => clearInterval(t)
  }, [])
  const bars = Array.from({ length: 36 }, (_, i) => {
    const h = 30 + (Math.sin(i * 0.4 + pulse * 0.05) + 1) * 30
    return h
  })

  return (
    <section className="ud-section ud-dashboard" id="track">
      <div className="ud-wrap">
        <div className="ud-section-head">
          <div className="left">
            <div className="ud-eyebrow">LIVE DASHBOARD / 03 · 即時追蹤儀表板</div>
            <h2>每一盒都<br /><span className="ud-accent">看得見</span></h2>
          </div>
          <div className="right">
            <span style={{ color: 'var(--signal)' }}>● LIVE</span>
            <span>· 即時更新</span>
          </div>
        </div>

        <div className="ud-dash-grid">
          <div className="ud-dash-main">
            <div className="ud-dash-card">
              <div className="ud-card-id">DROP.{DROP_INFO.no} / TRACK-A8X</div>
              <h3><span className="ud-pulse-dot" />配送軌跡 / DELIVERY ROUTE</h3>
              <div className="ud-track-route">
                {[
                  { cls: 'done',   ico: '✓', name: '利尻港 · 漁船捕撈',   when: 'RISHIRI HARBOR · HARVEST',  time: '04:00 JST' },
                  { cls: 'done',   ico: '✓', name: '板付出貨 · 冷鏈封箱', when: 'PACKING · 2-5°C SEALED',    time: '07:00 JST' },
                  { cls: 'active', ico: '●', name: '東京成田 · 空運直飛',  when: 'NRT → MFM AIR FREIGHT',     time: '10:00 JST' },
                  { cls: '',       ico: '04', name: '澳門機場 · 清關提領', when: 'MFM AIRPORT · CUSTOMS',      time: '週五' },
                  { cls: '',       ico: '05', name: '指定地址 · 完成掉落', when: 'YOUR DOOR · DROP COMPLETE',  time: '週六' },
                ].map((step, i) => (
                  <div key={i} className={`ud-track-step ${step.cls}`}>
                    <div className="ico">{step.ico}</div>
                    <div className="info">
                      <div className="name">{step.name}</div>
                      <div className="when">{step.when}</div>
                    </div>
                    <div className="time">{step.time}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ud-dash-card">
              <div className="ud-card-id">SENSOR-T1 / 30 MIN</div>
              <h3><span className="ud-pulse-dot" />冷鏈溫度 / COLD CHAIN 2°C ~ 5°C</h3>
              <div className="ud-kpi-row">
                <div className="ud-kpi-cell">
                  <div className="k">CURRENT TEMP</div>
                  <div className={`v v-cool`} style={{ transition: 'all .4s' }}>{temp}°C</div>
                  <div className="sub">SAFE / IN RANGE</div>
                </div>
                <div className="ud-kpi-cell">
                  <div className="k">PEAK TEMP</div>
                  <div className="v">4.8°C</div>
                  <div className="sub">@ 06:22 JST · OK</div>
                </div>
              </div>
              <div className="ud-temp-graph">
                {bars.map((h, i) => (
                  <div key={i} className="ud-temp-bar" style={{ height: `${h}%`, opacity: 0.4 + (i / bars.length) * 0.6 }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                <span>−30 MIN</span><span>−15 MIN</span><span>NOW</span>
              </div>
            </div>
          </div>

          <div className="ud-dash-side">
            <div className="ud-dash-card">
              <div className="ud-card-id">GEO / RISHIRI–MFM</div>
              <h3><span className="ud-pulse-dot" />產地座標 / ORIGIN</h3>
              <div className="ud-coord-box">
                <div className="ud-route-line" />
                <div className="ud-coord-pin ud-pin-origin" />
                <div className="ud-coord-pin ud-pin-dest" />
                <div className="ud-coord-label origin"><b>RISHIRI</b><br />45°15′N 141°14′E</div>
                <div className="ud-coord-label dest"><b>MACAO</b><br />22°09′N 113°33′E</div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                <span>DIST</span><span style={{ color: 'var(--ink)' }}>3,286 KM</span>
              </div>
            </div>

            <div className="ud-dash-card">
              <div className="ud-card-id">CERT-RISHIRI-024</div>
              <h3><span className="ud-pulse-dot" />品質履歷 / CERTIFICATION</h3>
              <div className="ud-kpi-row">
                <div className="ud-kpi-cell">
                  <div className="k">GRADE</div>
                  <div className="v v-accent">A++</div>
                  <div className="sub">SUPER PREMIUM</div>
                </div>
                <div className="ud-kpi-cell">
                  <div className="k">HARVEST</div>
                  <div className="v v-signal">TODAY</div>
                  <div className="sub">04:22 JST</div>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { k: '捕獲海域', v: '利尻島沿岸' },
                  { k: '空運路線', v: 'NRT → MFM' },
                  { k: '冷藏標準', v: '2°C ~ 5°C 全程' },
                  { k: '進口商',   v: '稻荷環球食品' },
                ].map(r => (
                  <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}>
                    <span style={{ color: 'var(--ink-3)' }}>{r.k}</span>
                    <span style={{ color: 'var(--ink-2)' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────
function Steps({ steps = STEPS_DATA }: { steps?: StepItem[] }) {
  return (
    <section className="ud-section">
      <div className="ud-wrap">
        <div className="ud-section-head">
          <div className="left">
            <div className="ud-eyebrow">SYSTEM / 04 · 從捕撈到開盒</div>
            <h2>四步驟<br /><span className="ud-accent">解鎖深海</span></h2>
          </div>
          <div className="right"><span>· 全程 48H 內</span></div>
        </div>
        <div className="ud-steps">
          {steps.map((s, i) => (
            <div className="ud-step" key={i}>
              <div className="corner" />
              <div>
                <div className="no">{String(i + 1).padStart(2, '0')}</div>
                <div className="lbl">{s.lbl}</div>
                <div className="name">{s.name}</div>
              </div>
              <div className="desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Archive
// ─────────────────────────────────────────────
function Archive({ drops = ARCHIVE_DATA }: { drops?: ArchiveItem[] }) {
  const totalSold = drops.reduce((s, d) => s + (d.sold ?? 0), 0) + (DROP_INFO.qtyTotal - DROP_INFO.qtyLeft)
  return (
    <section className="ud-section" id="archive">
      <div className="ud-wrap">
        <div className="ud-section-head">
          <div className="left">
            <div className="ud-eyebrow">ARCHIVE / 05 · 過往掉落紀錄</div>
            <h2>每一次<br /><span className="ud-accent">都是限量</span></h2>
          </div>
          <div className="right"><span>· 累積掉落 {totalSold} 盒</span></div>
        </div>
        <div className="ud-archive-grid">
          {drops.map(d => (
            <div className="ud-archive-card" key={d.no}>
              {d.available ? (
                <div className="ud-stamp-avail">仍可訂購</div>
              ) : (
                <div className="ud-stamp-sold">SOLD OUT</div>
              )}
              <div className="ud-archive-img"><div className="ud-archive-circle" /></div>
              <div className="ud-archive-head">
                <span>DROP <b>NO. {d.no}</b></span>
                <span>{d.date}</span>
              </div>
              <div className="ud-archive-name">{d.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
                <div className="ud-archive-row"><span>QTY</span><span className="v">{d.sold} 盒</span></div>
                {d.available ? (
                  <a
                    href={WA(`你好！我想訂購 DROP NO.${d.no} ${d.name}${d.weight ? ` (${d.weight})` : ''}${d.price ? `，MOP$${d.price}` : ''}，請問仲有貨嗎？`)}
                    target="_blank" rel="noopener noreferrer"
                    className="ud-btn-wa"
                    style={{ marginTop: 8, padding: '10px 14px', fontSize: 11, textAlign: 'center', display: 'block', textDecoration: 'none' }}
                  >
                    WhatsApp 立即訂購 →
                  </a>
                ) : (
                  <div className="ud-archive-row"><span>SELL OUT</span><span className="v" style={{ color: 'var(--accent)' }}>{d.time}</span></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────
function Reviews({ items = REVIEWS_DATA }: { items?: ReviewItem[] }) {
  return (
    <section className="ud-section">
      <div className="ud-wrap">
        <div className="ud-section-head">
          <div className="left">
            <div className="ud-eyebrow">VOICES / 06 · 客戶評價</div>
            <h2>每一盒<br /><span className="ud-accent">都是現場</span></h2>
          </div>
          <div className="right">
            <span style={{ color: 'var(--accent)' }}>★★★★★</span>
            <span>· 示例展示</span>
          </div>
        </div>
        <div className="ud-reviews-row">
          {items.map(r => (
            <div className="ud-review" key={r.n}>
              <div className="stars">★★★★★</div>
              <div className="quote">「{r.q}」</div>
              <div className="who">
                <div className="ud-avatar">{r.a}</div>
                <div className="info">
                  <span className="name">{r.n}</span>
                  <span className="meta">{r.m}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────
function FAQ({ items = FAQ_DATA }: { items?: FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <section className="ud-section" id="faq">
      <div className="ud-wrap">
        <div className="ud-section-head">
          <div className="left">
            <div className="ud-eyebrow">FAQ / 07 · 常見問題</div>
            <h2>關於這次<br /><span className="ud-accent">DROP</span></h2>
          </div>
          <div className="right">
            <a href={WA_BASE} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              · WhatsApp 24h 客服
            </a>
          </div>
        </div>
        <div className="ud-faq-list">
          {items.map((it, i) => (
            <div key={i} className={`ud-faq-item ${openIdx === i ? 'ud-faq-item-open' : ''}`}>
              <button className="ud-faq-btn" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
                <span className="ud-faq-q">
                  <span className="ud-faq-qno">Q.{String(i + 1).padStart(2, '0')}</span>
                  {it.q}
                </span>
                <span className="ud-faq-plus">＋</span>
              </button>
              <div className="ud-faq-answer">{it.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer className="ud-footer">
      <div className="ud-wrap">
        <div className="ud-footer-grid">
          <div>
            <div className="ud-footer-big">UNI<span className="ud-accent">/</span>DROP<br />海膽<span className="ud-accent">速遞</span></div>
            <div className="ud-mono" style={{ marginTop: 16, fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.1em', maxWidth: 320 }}>
              深海秘寶．秒速掉落。<br />
              每週限量釋出，北海道直送澳門。<br />
              稻荷環球食品 · 持有澳門進口許可
            </div>
          </div>
          <div className="ud-footer-col">
            <h4>NAVIGATE</h4>
            <ul>
              <li><a href="#drop">當週 DROP</a></li>
              <li><a href="#order">立即下單</a></li>
              <li><a href="#track">即時追蹤</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="ud-footer-col">
            <h4>CONNECT</h4>
            <ul>
              <li><a href="https://www.facebook.com/960217627179062" target="_blank" rel="noopener noreferrer">Facebook</a></li>
              <li><a href={WA_BASE} target="_blank" rel="noopener noreferrer">WhatsApp +853 6282 3037</a></li>
            </ul>
          </div>
          <div className="ud-footer-col">
            <h4>SUPPORT</h4>
            <ul>
              <li><a href="#faq">配送說明</a></li>
              <li><a href="#faq">鮮度保證</a></li>
              <li><a href="#faq">退換貨政策</a></li>
            </ul>
          </div>
        </div>
        <div className="ud-footer-base">
          <span>© 2026 稻荷環球食品 · 海膽速遞 — ALL DROPS RESERVED.</span>
          <span>MACAU · FROM HOKKAIDO</span>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────
// Success Modal
// ─────────────────────────────────────────────
function SuccessModal({ open, order, onClose }: { open: boolean; order: OrderData | null; onClose: () => void }) {
  const [orderNo] = useState(() => `DRP-${Math.floor(Math.random() * 9000 + 1000)}`)
  const waMsg = order
    ? `你好！我剛在網站落咗單，想確認以下訂購詳情：\n\n訂單：#${orderNo}\n套裝：${order.sizeName} (${order.weight})\n配送：${order.date}\n姓名：${order.name}\n\n請確認，謝謝！`
    : ''
  return (
    <div className={`ud-modal ${open ? 'ud-modal-open' : ''}`}>
      <div className="ud-modal-card">
        <div className="ud-modal-head">
          <span>● <b>SECURED</b> · 寶箱已鎖定</span>
          <button className="ud-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ud-modal-body">
          <div className="ud-modal-icon">✓</div>
          <div className="ud-modal-title">訂單已確認</div>
          <div className="ud-modal-sub">YOUR DROP IS LOCKED · 24H 內 WhatsApp 確認</div>
          <div className="ud-modal-row"><span className="k">ORDER NO.</span><span className="v">#{orderNo}</span></div>
          <div className="ud-modal-row"><span className="k">PRODUCT</span><span className="v v-dark">{order?.sizeName}</span></div>
          <div className="ud-modal-row"><span className="k">DELIVERY</span><span className="v v-dark">{order?.date}</span></div>
          {order && order.total > 0 && (
            <div className="ud-modal-row"><span className="k">TOTAL</span><span className="v">MOP$ {order.total.toLocaleString()}</span></div>
          )}
          <div className="ud-modal-actions">
            <button className="ud-modal-sec" onClick={onClose}>繼續瀏覽</button>
            <a href={WA(waMsg)} target="_blank" rel="noopener noreferrer" className="ud-btn-wa" style={{ flex: 1, padding: '14px', fontSize: 12, letterSpacing: '0.08em' }}>
              WhatsApp 確認訂單 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function SeaUrchinPage() {
  const [utmSource] = useState(() => {
    if (typeof window === 'undefined') return 'facebook_ad'
    const p = new URLSearchParams(window.location.search)
    const src = p.get('utm_source') || 'facebook_ad'
    const campaign = p.get('utm_campaign') || ''
    const medium = p.get('utm_medium') || ''
    return [src, campaign, medium].filter(Boolean).join('|')
  })
  const [order, setOrder] = useState<OrderData | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Dynamic config from Supabase (falls back to module-level defaults)
  const [liveSizes, setLiveSizes] = useState<SizeItem[]>(SIZES)
  const [liveSteps, setLiveSteps] = useState<StepItem[]>(STEPS_DATA)
  const [liveArchive, setLiveArchive] = useState<ArchiveItem[]>(ARCHIVE_DATA)
  const [liveReviews, setLiveReviews] = useState<ReviewItem[]>(REVIEWS_DATA)
  const [liveFaq, setLiveFaq] = useState<FaqItem[]>(FAQ_DATA)

  useEffect(() => {
    fetch('/api/v1/sea-urchin-config')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.sizes)   && data.sizes.length)   setLiveSizes(data.sizes)
        if (Array.isArray(data.steps)   && data.steps.length)   setLiveSteps(data.steps)
        if (Array.isArray(data.archive) && data.archive.length) setLiveArchive(data.archive)
        if (Array.isArray(data.reviews) && data.reviews.length) setLiveReviews(data.reviews)
        if (Array.isArray(data.faq)     && data.faq.length)     setLiveFaq(data.faq)
      })
      .catch(() => {})
  }, [])

  // Reveal on scroll
  useEffect(() => {
    const els = document.querySelectorAll('.ud-reveal')
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  const handleOrder = useCallback((data: OrderData) => {
    setOrder(data)
    setModalOpen(true)
  }, [])

  return (
    <div className="ud-page">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet" />

      <TopBar />
      <div className="ud-notice">🧊 每週二、五空運直飛 · 截單：每週四 23:59 · 配送費 MOP$50-100</div>
      <Marquee />

      <div className="ud-reveal"><Hero /></div>
      <div className="ud-reveal"><AnswerHub /></div>
      <div className="ud-reveal"><OrderForm onSubmit={handleOrder} utmSource={utmSource} sizes={liveSizes} /></div>
      <div className="ud-reveal"><Dashboard /></div>
      <div className="ud-reveal"><Steps steps={liveSteps} /></div>
      <div className="ud-reveal"><Archive drops={liveArchive} /></div>
      <div className="ud-reveal"><Reviews items={liveReviews} /></div>
      <div className="ud-reveal"><FAQ items={liveFaq} /></div>
      <Footer />

      <SuccessModal open={modalOpen} order={order} onClose={() => setModalOpen(false)} />

      {/* Floating admin edit button */}
      <a href="/admin/sea-urchin" className="ud-edit-fab" title="Edit page content" aria-label="Admin edit">✏️</a>

      {FB_PIXEL_ID && (
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${FB_PIXEL_ID}');fbq('track','PageView');
        `}</Script>
      )}
    </div>
  )
}
