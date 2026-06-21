'use client'

import { useEffect, useState } from 'react'
import { TOKENS, getBrandTokens } from '@/lib/design-tokens'

const brand = getBrandTokens('sea-urchin-express')

// ─── Page-content editor types ────────────────────────────────
type SizeEntry    = { id: string; name: string; weight: string; price: number; sub: string; isB2B: boolean }
type DropConfig   = { no: string; name: string; origin: string; qtyLeft: number; qtyTotal: number; temp: number }
type StepEntry    = { lbl: string; name: string; desc: string }
type ArchiveEntry = { no: string; name: string; date: string; sold: number; time: string; available?: boolean; price?: number; weight?: string }
type ReviewEntry  = { q: string; n: string; m: string; a: string }
type FaqEntry     = { q: string; a: string }
type PageConfig = {
  notice:       string
  drop:         DropConfig
  sizes:        SizeEntry[]
  delivery_day: number
  cutoff_day:   number
  steps:        StepEntry[]
  archive:      ArchiveEntry[]
  reviews:      ReviewEntry[]
  faq:          FaqEntry[]
}

const DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const DEFAULT_PAGE_CONFIG: PageConfig = {
  notice: '🧊 每週二、五空運直飛 · 截單：每週四 23:59 · 配送費 MOP$50-100',
  drop:   { no: '024', name: '北海道馬糞海膽', origin: '北海道 / 利尻島', qtyLeft: 23, qtyTotal: 60, temp: 3.5 },
  sizes:  [
    { id: 'wood',       name: '馬糞海膽', weight: '180g',     price: 328, sub: '1–2 人',  isB2B: false },
    { id: 'double',     name: '兩板優惠', weight: '180g × 2', price: 598, sub: '2–4 人',  isB2B: false },
    { id: 'restaurant', name: '餐廳採購', weight: '1kg 起訂', price: 0,   sub: '歡迎查詢', isB2B: true  },
  ],
  delivery_day: 6,
  cutoff_day:   4,
  steps: [
    { lbl: 'RELEASE', name: '預告掉落', desc: '每週二在 Facebook / IG 公布本週秘寶預告，記得開啟通知提早鎖定。' },
    { lbl: 'SECURE',  name: '鎖定下單', desc: '每週四 23:59 截單，下單後 24H 內 WhatsApp 確認，售完即止。' },
    { lbl: 'DROP',    name: '空運直送', desc: '北海道捕撈後封箱，每週二、五空運直飛澳門，全程冷鏈不間斷。' },
    { lbl: 'UNBOX',   name: '即食開箱', desc: '已完整去殼處理，掃 QR 解鎖履歷儀表板，開盒即食。' },
  ],
  // NOTE: 以下 archive 為示例展示數據（sample），非真實過往 Drop 紀錄。
  archive: [
    { no: '023', name: '利尻馬糞海膽', date: '2026.05.09', sold: 30, time: '示例', available: false },
    { no: '022', name: '禮文島紫海膽', date: '2026.05.02', sold: 30, time: '示例', available: false },
    { no: '021', name: '積丹半島馬糞', date: '2026.04.25', sold: 30, time: '示例', available: false },
  ],
  // NOTE: 以下 reviews 為示例展示文案（sample），非真實客戶評論。
  reviews: [
    { q: '開箱嗰一刻所有人都拍曬相，新鮮程度完全唔輸日本當地！', n: '示例', m: '示例展示', a: 'U' },
    { q: '冷鏈追蹤好安心，全程保持正溫冷鏈，比好多餐廳食嘅更新鮮。', n: '示例', m: '示例展示', a: 'U' },
    { q: '海膽鮮甜完全無腥味，配清酒係神仙享受，下週繼續訂！', n: '示例', m: '示例展示', a: 'U' },
  ],
  faq: [
    { q: '海膽幾時到貨？如何運作？', a: '海膽速遞採用週限量 Drop 機制，每批僅發售 30-80 盒。每週二、五由北海道空運直飛抵澳，下單後 2-4 小時內配送。如本週售完，可提前預訂下週 Drop。' },
    { q: '配送範圍及費用？', a: '配送至澳門半島、氹仔及路環全區，配送費 MOP$50-100（視地區及訂單金額）。下單後 WhatsApp 確認送達時段。' },
    { q: '如何付款？', a: '支持 MBway、轉數快、現金（送貨時付款）。確認訂單後提供付款詳情。' },
    { q: '限量數量是多少？為何這麼少？', a: '每批僅放出 30-80 盒，以確保頂級鮮度及品質。每週四截單，售完即止。' },
    { q: '到貨品質不符預期怎麼辦？', a: '我們提供鮮度保證。如收到時有品質疑慮，請於開盒後 2 小時內 WhatsApp +853 6282 3037，全額退款或下週補寄。' },
  ],
}

interface Customer {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  customer_type: string
  source: string
  tier: string
  total_orders: number
  total_spent: number
  created_at: string
  is_active: boolean
}

interface Stats {
  total: number
  retail: number
  restaurant: number
  vip: number
  thisWeek: number
}

const ADMIN_KEY = 'sue-admin-2026'

// ─── White Minimal shared styles ───────────────────────────────
const sectionCard: React.CSSProperties = {
  ...TOKENS.card,
  padding: 28,
  marginBottom: 20,
}

const inputStyle: React.CSSProperties = {
  ...TOKENS.input,
}

const selectStyle: React.CSSProperties = {
  ...TOKENS.input,
  cursor: 'pointer',
}

const primaryBtn: React.CSSProperties = {
  ...TOKENS.button.primary,
}

const amberBtn: React.CSSProperties = {
  ...TOKENS.button.primary,
  background: brand.accent,
}

const secondaryBtn: React.CSSProperties = {
  ...TOKENS.button.secondary,
}

const dangerBtn: React.CSSProperties = {
  background: TOKENS.color.errorBg,
  border: `1px solid ${TOKENS.color.errorBorder}`,
  borderRadius: TOKENS.radius.md,
  padding: '4px 10px',
  color: '#dc2626',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
}

const addBtn: React.CSSProperties = {
  background: brand.accentLight,
  border: `1px solid ${brand.accentBorder}`,
  borderRadius: TOKENS.radius.md,
  padding: '5px 14px',
  color: brand.accentDark,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

const sectionDivider: React.CSSProperties = {
  borderTop: `1px solid ${TOKENS.color.borderMuted}`,
  paddingTop: 16,
  marginTop: 16,
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={TOKENS.sectionHeader(brand.accent)}>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', ...TOKENS.type.label, marginBottom: 6 }}>
      {children}
    </label>
  )
}

export default function SeaUrchinAdminPage() {
  const [tab, setTab] = useState<'customers' | 'content'>('content')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    retail: 0,
    restaurant: 0,
    vip: 0,
    thisWeek: 0,
  })
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Page content editor state
  const [cfg, setCfg] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/v1/sea-urchin-config')
      .then(r => r.json())
      .then((data: Partial<PageConfig>) => {
        setCfg(c => ({
          ...c,
          ...(data.notice       !== undefined && { notice:       data.notice }),
          ...(data.drop         !== undefined && { drop:         data.drop }),
          ...(data.sizes        !== undefined && { sizes:        data.sizes }),
          ...(data.delivery_day !== undefined && { delivery_day: Number(data.delivery_day) }),
          ...(data.cutoff_day   !== undefined && { cutoff_day:   Number(data.cutoff_day) }),
          ...(Array.isArray(data.steps)   && data.steps.length   && { steps:   data.steps }),
          ...(Array.isArray(data.archive) && data.archive.length && { archive: data.archive }),
          ...(Array.isArray(data.reviews) && data.reviews.length && { reviews: data.reviews }),
          ...(Array.isArray(data.faq)     && data.faq.length     && { faq:     data.faq }),
        }))
      })
      .catch(() => {})
  }, [])

  const saveConfig = async (key: string, value: unknown) => {
    setSaving(true); setSaveStatus(null)
    try {
      const res = await fetch('/api/v1/sea-urchin-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaveStatus({ type: 'ok', msg: `✓ 已儲存 "${key}"` })
    } catch (err) {
      setSaveStatus({ type: 'err', msg: `✗ 失敗: ${err}` })
    }
    setSaving(false)
  }

  const saveAll = async () => {
    setSaving(true); setSaveStatus(null)
    try {
      const res = await fetch('/api/v1/sea-urchin-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ updates: [
          { key: 'notice',       value: cfg.notice },
          { key: 'drop',         value: cfg.drop },
          { key: 'sizes',        value: cfg.sizes },
          { key: 'delivery_day', value: cfg.delivery_day },
          { key: 'cutoff_day',   value: cfg.cutoff_day },
          { key: 'steps',        value: cfg.steps },
          { key: 'archive',      value: cfg.archive },
          { key: 'reviews',      value: cfg.reviews },
          { key: 'faq',          value: cfg.faq },
        ]}),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaveStatus({ type: 'ok', msg: '✓ 全部設定已儲存' })
    } catch (err) {
      setSaveStatus({ type: 'err', msg: `✗ 失敗: ${err}` })
    }
    setSaving(false)
  }

  // Field setters
  const setDrop  = (f: keyof DropConfig,    v: string | number) =>
    setCfg(c => ({ ...c, drop: { ...c.drop, [f]: v } }))
  const setSize  = (i: number, f: keyof SizeEntry,    v: string | number | boolean) =>
    setCfg(c => ({ ...c, sizes:   c.sizes.map((x, j)   => j === i ? { ...x, [f]: v } : x) }))
  const setStep  = (i: number, f: keyof StepEntry,    v: string) =>
    setCfg(c => ({ ...c, steps:   c.steps.map((x, j)   => j === i ? { ...x, [f]: v } : x) }))
  const setArch  = (i: number, f: keyof ArchiveEntry, v: string | number | boolean) =>
    setCfg(c => ({ ...c, archive: c.archive.map((x, j) => j === i ? { ...x, [f]: v } : x) }))
  const setRev   = (i: number, f: keyof ReviewEntry,  v: string) =>
    setCfg(c => ({ ...c, reviews: c.reviews.map((x, j) => j === i ? { ...x, [f]: v } : x) }))
  const setFaq   = (i: number, f: keyof FaqEntry,     v: string) =>
    setCfg(c => ({ ...c, faq:     c.faq.map((x, j)    => j === i ? { ...x, [f]: v } : x) }))

  // List mutators
  const addSize    = () => setCfg(c => ({ ...c, sizes:   [...c.sizes,   { id: `size${Date.now()}`, name: '新規格', weight: '100g', price: 0, sub: '1–2 人', isB2B: false }] }))
  const rmSize     = (i: number) => setCfg(c => ({ ...c, sizes:   c.sizes.filter((_, j) => j !== i) }))
  const addStep    = () => setCfg(c => ({ ...c, steps:   [...c.steps,   { lbl: 'NEW', name: '新步驟', desc: '說明文字' }] }))
  const rmStep     = (i: number) => setCfg(c => ({ ...c, steps:   c.steps.filter((_, j) => j !== i) }))
  const addArch    = () => setCfg(c => ({ ...c, archive: [...c.archive, { no: '???', name: '新掉落', date: new Date().toISOString().slice(0,10).replace(/-/g,'.'), sold: 0, time: '—', available: false }] }))
  const rmArch     = (i: number) => setCfg(c => ({ ...c, archive: c.archive.filter((_, j) => j !== i) }))
  const addReview  = () => setCfg(c => ({ ...c, reviews: [...c.reviews, { q: '客戶評價', n: '客戶名', m: 'DROP ??? · 商品', a: '客' }] }))
  const rmReview   = (i: number) => setCfg(c => ({ ...c, reviews: c.reviews.filter((_, j) => j !== i) }))
  const addFaq     = () => setCfg(c => ({ ...c, faq:     [...c.faq,     { q: '問題', a: '答案' }] }))
  const rmFaq      = (i: number) => setCfg(c => ({ ...c, faq:     c.faq.filter((_, j) => j !== i) }))

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v1/sea-urchin-customers?limit=200', {
        headers: { 'x-admin-key': ADMIN_KEY },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const data = await response.json()
      setCustomers(data.customers || [])

      // Calculate stats
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const retail = data.customers.filter(
        (c: Customer) => c.customer_type === 'retail'
      ).length
      const restaurant = data.customers.filter(
        (c: Customer) => c.customer_type === 'restaurant'
      ).length
      const vip = data.customers.filter((c: Customer) => c.tier === 'gold').length
      const thisWeek = data.customers.filter((c: Customer) => {
        const created = new Date(c.created_at)
        return created > sevenDaysAgo
      }).length

      setStats({
        total: data.customers.length,
        retail,
        restaurant,
        vip,
        thisWeek,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const filtered =
    filter === 'all'
      ? customers
      : customers.filter((c) => c.customer_type === filter)

  const exportCSV = () => {
    const headers = [
      '姓名',
      '電話',
      '電郵',
      '客戶類型',
      '來源',
      '級別',
      '訂單數',
      '總消費',
      '註冊日期',
    ]
    const rows = filtered.map((c) => [
      c.name || '',
      c.phone || '',
      c.email || '',
      c.customer_type,
      c.source,
      c.tier,
      c.total_orders,
      c.total_spent,
      new Date(c.created_at).toLocaleDateString('zh-HK'),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sea-urchin-customers-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const today = new Date().toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{
      background: TOKENS.color.bgSubtle,
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: TOKENS.color.text,
    }}>
      {/* ── Sticky Navbar ── */}
      <div style={{
        ...TOKENS.nav,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TOKENS.color.text }}>
            Sea Urchin Admin
          </span>
          <span style={{
            fontSize: 11,
            color: brand.accentDark,
            background: brand.accentLight,
            border: `1px solid ${brand.accentBorder}`,
            borderRadius: 20,
            padding: '2px 10px',
            marginLeft: 12,
          }}>
            海膽速遞
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: TOKENS.color.textSubtle }}>{today}</span>
          <a
            href="/sea-urchin"
            target="_blank"
            style={{ fontSize: 12, color: brand.accent, textDecoration: 'none', fontWeight: 600 }}
          >
            前往網站 →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.color.textSubtle }}>
            管理員頁面 · 請勿分享此 URL
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: TOKENS.color.text, letterSpacing: '-0.02em', marginTop: 4, marginBottom: 0 }}>
            海膽速遞 · 後台管理
          </h1>
        </div>

        {/* ── Tabs ── */}
        <div style={TOKENS.tab.bar}>
          {(['content', 'customers'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={TOKENS.tab.item(tab === t, brand.accent)}
            >
              {t === 'content' ? '頁面內容' : '客戶管理'}
            </button>
          ))}
        </div>

        {/* ── CONTENT TAB ── */}
        {tab === 'content' && (
          <div>
            {saveStatus && (
              <div style={{
                padding: '12px 16px',
                borderRadius: TOKENS.radius.md,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 20,
                background: saveStatus.type === 'ok' ? TOKENS.color.successBg : TOKENS.color.errorBg,
                border: saveStatus.type === 'ok' ? `1px solid ${TOKENS.color.successBorder}` : `1px solid ${TOKENS.color.errorBorder}`,
                color: saveStatus.type === 'ok' ? '#166534' : '#dc2626',
              }}>
                {saveStatus.msg}
              </div>
            )}

            {/* Notice */}
            <div style={sectionCard}>
              <SectionHeader>公告橫幅</SectionHeader>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: 240 }}
                  value={cfg.notice}
                  onChange={e => setCfg(c => ({ ...c, notice: e.target.value }))}
                />
                <button disabled={saving} onClick={() => saveConfig('notice', cfg.notice)} style={secondaryBtn}>
                  儲存
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: TOKENS.color.textSubtle }}>
                預覽：
                <span style={{ background: brand.accent, color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12, marginLeft: 6 }}>
                  {cfg.notice}
                </span>
              </div>
            </div>

            {/* Drop Info */}
            <div style={sectionCard}>
              <SectionHeader>本週 DROP</SectionHeader>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {([
                  ['no', 'DROP 編號', 'text'],
                  ['name', '商品名稱', 'text'],
                  ['origin', '產地', 'text'],
                  ['qtyLeft', '剩餘數量', 'number'],
                  ['qtyTotal', '總數量', 'number'],
                  ['temp', '冷鏈溫度 (°C)', 'number'],
                ] as [keyof DropConfig, string, string][]).map(([field, label, type]) => (
                  <div key={field}>
                    <FieldLabel>{label}</FieldLabel>
                    <input
                      type={type}
                      step={type === 'number' ? '0.1' : undefined}
                      style={inputStyle}
                      value={cfg.drop[field]}
                      onChange={e => setDrop(field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <button disabled={saving} onClick={() => saveConfig('drop', cfg.drop)} style={secondaryBtn}>
                  儲存 DROP 資訊
                </button>
              </div>
            </div>

            {/* Delivery */}
            <div style={sectionCard}>
              <SectionHeader>配送設定</SectionHeader>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 400 }}>
                <div>
                  <FieldLabel>到貨日</FieldLabel>
                  <select style={selectStyle} value={cfg.delivery_day} onChange={e => setCfg(c => ({ ...c, delivery_day: parseInt(e.target.value) }))}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>截單日</FieldLabel>
                  <select style={selectStyle} value={cfg.cutoff_day} onChange={e => setCfg(c => ({ ...c, cutoff_day: parseInt(e.target.value) }))}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: TOKENS.color.textSubtle }}>
                更改此設定後需重新部署網站才能反映倒數計時
              </p>
              <button
                disabled={saving}
                onClick={() => saveConfig('delivery_day', cfg.delivery_day).then(() => saveConfig('cutoff_day', cfg.cutoff_day))}
                style={{ ...secondaryBtn, marginTop: 12 }}
              >
                儲存配送設定
              </button>
            </div>

            {/* Sizes */}
            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionHeader>產品規格及定價</SectionHeader>
                <button onClick={addSize} style={addBtn}>＋ 增加規格</button>
              </div>
              {cfg.sizes.map((size, idx) => (
                <div key={size.id} style={idx > 0 ? sectionDivider : {}}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: brand.accent, letterSpacing: '0.08em' }}>{size.id}</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TOKENS.color.textMuted, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!size.isB2B}
                          onChange={e => setSize(idx, 'isB2B', e.target.checked)}
                          style={{ accentColor: brand.accent }}
                        />
                        B2B詢價
                      </label>
                    </div>
                    <button onClick={() => rmSize(idx)} style={dangerBtn}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    <div>
                      <FieldLabel>名稱</FieldLabel>
                      <input style={inputStyle} value={size.name} onChange={e => setSize(idx, 'name', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>規格 / 重量</FieldLabel>
                      <input style={inputStyle} value={size.weight} onChange={e => setSize(idx, 'weight', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>說明</FieldLabel>
                      <input style={inputStyle} value={size.sub} onChange={e => setSize(idx, 'sub', e.target.value)} />
                    </div>
                    {!size.isB2B && (
                      <div>
                        <FieldLabel>價格 (MOP$)</FieldLabel>
                        <input type="number" style={inputStyle} value={size.price} onChange={e => setSize(idx, 'price', parseInt(e.target.value))} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('sizes', cfg.sizes)} style={{ ...secondaryBtn, marginTop: 18 }}>
                儲存產品規格
              </button>
            </div>

            {/* Steps */}
            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionHeader>四步驟說明</SectionHeader>
                <button onClick={addStep} style={addBtn}>＋ 增加步驟</button>
              </div>
              {cfg.steps.map((step, idx) => (
                <div key={idx} style={idx > 0 ? sectionDivider : {}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: brand.accent, letterSpacing: '0.08em' }}>步驟 {idx + 1}</span>
                    <button onClick={() => rmStep(idx)} style={dangerBtn}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                    <div>
                      <FieldLabel>標籤 (英文)</FieldLabel>
                      <input style={inputStyle} value={step.lbl} onChange={e => setStep(idx, 'lbl', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>標題 (中文)</FieldLabel>
                      <input style={inputStyle} value={step.name} onChange={e => setStep(idx, 'name', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>說明</FieldLabel>
                    <textarea
                      style={TOKENS.textarea}
                      rows={2}
                      value={step.desc}
                      onChange={e => setStep(idx, 'desc', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('steps', cfg.steps)} style={{ ...secondaryBtn, marginTop: 16 }}>
                儲存步驟
              </button>
            </div>

            {/* Archive */}
            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionHeader>過往掉落記錄</SectionHeader>
                <button onClick={addArch} style={addBtn}>＋ 新增記錄</button>
              </div>
              {cfg.archive.map((item, idx) => (
                <div key={idx} style={idx > 0 ? sectionDivider : {}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: brand.accent, letterSpacing: '0.08em' }}>DROP NO. {item.no}</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!item.available}
                          onChange={e => setArch(idx, 'available', e.target.checked)}
                          style={{ accentColor: '#16a34a' }}
                        />
                        {item.available ? (
                          <span style={{ ...TOKENS.badge.default, ...TOKENS.badge.success }}>
                            仍可訂購
                          </span>
                        ) : (
                          <span style={{ ...TOKENS.badge.default, ...TOKENS.badge.neutral }}>
                            已售罄
                          </span>
                        )}
                      </label>
                    </div>
                    <button onClick={() => rmArch(idx)} style={dangerBtn}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    <div>
                      <FieldLabel>編號</FieldLabel>
                      <input style={inputStyle} value={item.no} onChange={e => setArch(idx, 'no', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>商品名稱</FieldLabel>
                      <input style={inputStyle} value={item.name} onChange={e => setArch(idx, 'name', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>日期</FieldLabel>
                      <input style={inputStyle} value={item.date} onChange={e => setArch(idx, 'date', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>數量 (盒)</FieldLabel>
                      <input type="number" style={inputStyle} value={item.sold} onChange={e => setArch(idx, 'sold', parseInt(e.target.value))} />
                    </div>
                    <div>
                      <FieldLabel>售罄時間 / 備注</FieldLabel>
                      <input style={inputStyle} value={item.time} onChange={e => setArch(idx, 'time', e.target.value)} />
                    </div>
                    {item.available && (
                      <>
                        <div>
                          <FieldLabel>規格 (weight)</FieldLabel>
                          <input style={inputStyle} placeholder="e.g. 100g / 板" value={item.weight ?? ''} onChange={e => setArch(idx, 'weight', e.target.value)} />
                        </div>
                        <div>
                          <FieldLabel>訂購價格 (MOP$)</FieldLabel>
                          <input type="number" style={inputStyle} placeholder="0" value={item.price ?? 0} onChange={e => setArch(idx, 'price', parseInt(e.target.value))} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('archive', cfg.archive)} style={{ ...secondaryBtn, marginTop: 18 }}>
                儲存過往記錄
              </button>
            </div>

            {/* Reviews */}
            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionHeader>客戶評價</SectionHeader>
                <button onClick={addReview} style={addBtn}>＋ 新增評價</button>
              </div>
              {cfg.reviews.map((rev, idx) => (
                <div key={idx} style={idx > 0 ? sectionDivider : {}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: brand.accent, letterSpacing: '0.08em' }}>評價 {idx + 1}</span>
                    <button onClick={() => rmReview(idx)} style={dangerBtn}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 10 }}>
                    <div>
                      <FieldLabel>客戶代號 (顯示)</FieldLabel>
                      <input style={inputStyle} value={rev.n} onChange={e => setRev(idx, 'n', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>頭像字母</FieldLabel>
                      <input style={inputStyle} maxLength={1} value={rev.a} onChange={e => setRev(idx, 'a', e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>購買記錄</FieldLabel>
                      <input style={inputStyle} value={rev.m} onChange={e => setRev(idx, 'm', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>評價內容</FieldLabel>
                    <textarea
                      style={TOKENS.textarea}
                      rows={2}
                      value={rev.q}
                      onChange={e => setRev(idx, 'q', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('reviews', cfg.reviews)} style={{ ...secondaryBtn, marginTop: 16 }}>
                儲存評價
              </button>
            </div>

            {/* FAQ */}
            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionHeader>常見問題 FAQ</SectionHeader>
                <button onClick={addFaq} style={addBtn}>＋ 新增問題</button>
              </div>
              {cfg.faq.map((item, idx) => (
                <div key={idx} style={idx > 0 ? sectionDivider : {}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: brand.accent, letterSpacing: '0.08em' }}>
                      Q.{String(idx + 1).padStart(2, '0')}
                    </span>
                    <button onClick={() => rmFaq(idx)} style={dangerBtn}>×</button>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <FieldLabel>問題</FieldLabel>
                    <input style={inputStyle} value={item.q} onChange={e => setFaq(idx, 'q', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>答案</FieldLabel>
                    <textarea
                      style={TOKENS.textarea}
                      rows={2}
                      value={item.a}
                      onChange={e => setFaq(idx, 'a', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('faq', cfg.faq)} style={{ ...secondaryBtn, marginTop: 16 }}>
                儲存 FAQ
              </button>
            </div>

            {/* Save All */}
            <button
              onClick={saveAll}
              disabled={saving}
              style={{
                ...amberBtn,
                width: '100%',
                padding: '14px 20px',
                fontSize: 14,
                borderRadius: TOKENS.radius.lg,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '儲存中…' : '全部儲存'}
            </button>
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {tab === 'customers' && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
              {[
                { label: '總客戶數', value: stats.total, accent: '#f59e0b' },
                { label: '個人客戶', value: stats.retail, accent: '#3b82f6' },
                { label: '餐廳批發', value: stats.restaurant, accent: '#22c55e' },
                { label: 'VIP 客戶', value: stats.vip, accent: '#a855f7' },
                { label: '本週新增', value: stats.thisWeek, accent: '#ec4899' },
              ].map(({ label, value, accent }) => (
                <div key={label} style={{
                  ...TOKENS.card,
                  borderTop: `2px solid ${accent}`,
                  padding: 18,
                }}>
                  <p style={{ fontSize: 11, color: TOKENS.color.textSubtle, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 32, fontWeight: 800, margin: '8px 0 0', color: TOKENS.color.text }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {['all', 'retail', 'restaurant', 'chef', 'vip'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  style={filter === type ? {
                    background: brand.accentLight,
                    border: `1px solid ${brand.accentBorder}`,
                    color: brand.accentDark,
                    borderRadius: TOKENS.radius.md,
                    padding: '7px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  } : {
                    background: TOKENS.color.bg,
                    border: `1px solid ${TOKENS.color.border}`,
                    color: TOKENS.color.textMuted,
                    borderRadius: TOKENS.radius.md,
                    padding: '7px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {type === 'all' ? '全部' : type === 'retail' ? '個人' : type === 'restaurant' ? '餐廳' : type === 'chef' ? '主廚' : 'VIP'}
                </button>
              ))}
              <button onClick={exportCSV} style={{
                background: TOKENS.color.successBg,
                border: `1px solid ${TOKENS.color.successBorder}`,
                color: '#166534',
                borderRadius: TOKENS.radius.md,
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                marginLeft: 4,
              }}>
                匯出 CSV
              </button>
              <button onClick={fetchCustomers} style={secondaryBtn}>
                刷新
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: TOKENS.color.errorBg,
                border: `1px solid ${TOKENS.color.errorBorder}`,
                padding: '12px 16px',
                borderRadius: TOKENS.radius.md,
                marginBottom: 20,
                color: '#dc2626',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ color: TOKENS.color.textSubtle, fontSize: 14 }}>載入中...</p>
              </div>
            )}

            {/* Table */}
            {!loading && filtered.length > 0 && (
              <div style={{
                border: `1px solid ${TOKENS.color.border}`,
                borderRadius: TOKENS.radius.lg,
                overflow: 'hidden',
                background: TOKENS.color.bg,
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: TOKENS.color.bgSubtle, borderBottom: `1px solid ${TOKENS.color.border}` }}>
                        {['姓名', '電話', '電郵', '類型', '來源', '級別', '訂單', '消費 (MOP)', '註冊日期'].map(h => (
                          <th key={h} style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: TOKENS.color.textSubtle,
                            whiteSpace: 'nowrap',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((customer) => (
                        <tr
                          key={customer.id}
                          style={{
                            borderBottom: `1px solid ${TOKENS.color.borderMuted}`,
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: 500, color: TOKENS.color.text }}>
                            {customer.name || '未提供'}
                          </td>
                          <td style={{ padding: '14px 16px', color: TOKENS.color.textMuted }}>
                            {customer.phone || '—'}
                          </td>
                          <td style={{ padding: '14px 16px', color: TOKENS.color.textMuted }}>
                            {customer.email || '—'}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              background: customer.customer_type === 'restaurant'
                                ? '#f0fdf4'
                                : customer.customer_type === 'chef'
                                  ? '#fff7ed'
                                  : '#eff6ff',
                              border: customer.customer_type === 'restaurant'
                                ? '1px solid #86efac'
                                : customer.customer_type === 'chef'
                                  ? '1px solid #fdba74'
                                  : '1px solid #bfdbfe',
                              color: customer.customer_type === 'restaurant'
                                ? '#166534'
                                : customer.customer_type === 'chef'
                                  ? '#c2410c'
                                  : '#1d4ed8',
                            }}>
                              {customer.customer_type === 'retail' ? '個人' : customer.customer_type === 'restaurant' ? '餐廳' : '主廚'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: TOKENS.color.textMuted, fontSize: 12 }}>
                            {customer.source === 'landing_page' ? '落地頁' : customer.source === 'whatsapp' ? 'WhatsApp' : customer.source}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              background: customer.tier === 'gold'
                                ? '#fefce8'
                                : customer.tier === 'silver'
                                  ? '#f8fafc'
                                  : customer.tier === 'restaurant'
                                    ? '#faf5ff'
                                    : '#fffbeb',
                              border: customer.tier === 'gold'
                                ? '1px solid #fde047'
                                : customer.tier === 'silver'
                                  ? '1px solid #e2e8f0'
                                  : customer.tier === 'restaurant'
                                    ? '1px solid #e9d5ff'
                                    : '1px solid #fde68a',
                              color: customer.tier === 'gold'
                                ? '#a16207'
                                : customer.tier === 'silver'
                                  ? '#64748b'
                                  : customer.tier === 'restaurant'
                                    ? '#7e22ce'
                                    : '#b45309',
                            }}>
                              {customer.tier === 'bronze' ? '銅級' : customer.tier === 'silver' ? '銀級' : customer.tier === 'gold' ? '金級' : '批發'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 500, color: TOKENS.color.text }}>
                            {customer.total_orders}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', color: TOKENS.color.textMuted }}>
                            {customer.total_spent > 0 ? customer.total_spent.toFixed(2) : '—'}
                          </td>
                          <td style={{ padding: '14px 16px', color: TOKENS.color.textSubtle, fontSize: 12 }}>
                            {new Date(customer.created_at).toLocaleDateString('zh-HK')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && filtered.length === 0 && (
              <div style={{
                ...TOKENS.card,
                textAlign: 'center',
                padding: '48px 20px',
              }}>
                <p style={{ color: TOKENS.color.textSubtle, fontSize: 14 }}>沒有客戶記錄</p>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${TOKENS.color.border}`, fontSize: 12, color: TOKENS.color.textSubtle }}>
              顯示 {filtered.length} 名客戶 (篩選後) · 總計 {stats.total} 名
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
