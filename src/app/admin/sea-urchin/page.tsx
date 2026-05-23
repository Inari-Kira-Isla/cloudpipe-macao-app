'use client'

import { useEffect, useState } from 'react'

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
  notice: '🧊 週一新鮮到貨 · 截單：每週六 23:59',
  drop:   { no: '024', name: '北海道馬糞海膽', origin: '北海道 / 利尻島', qtyLeft: 23, qtyTotal: 50, temp: -1.4 },
  sizes:  [
    { id: 'wood',       name: '木板海膽', weight: '100g',     price: 308, sub: '1–2 人',  isB2B: false },
    { id: 'double',     name: '兩板優惠', weight: '100g × 2', price: 598, sub: '2–4 人',  isB2B: false },
    { id: 'restaurant', name: '餐廳採購', weight: '1kg 起訂', price: 0,   sub: '歡迎查詢', isB2B: true  },
  ],
  delivery_day: 1,
  cutoff_day:   6,
  steps: [
    { lbl: 'RELEASE', name: '預告掉落', desc: '每週三在 Facebook 公布本週秘寶預告，記得開啟通知提早鎖定。' },
    { lbl: 'SECURE',  name: '鎖定下單', desc: '每週六 23:59 截單，下單後 24H 內 WhatsApp 確認，售完即止。' },
    { lbl: 'DROP',    name: '空運直送', desc: '北海道捕撈後封箱，經香港轉口直運澳門，全程冷鏈不間斷。' },
    { lbl: 'UNBOX',   name: '即食開箱', desc: '已完整去殼處理，掃 QR 解鎖履歷儀表板，開盒即食。' },
  ],
  archive: [
    { no: '023', name: '利尻馬糞海膽', date: '2026.05.09', sold: 23, time: '31 分鐘售罄', available: false },
    { no: '022', name: '禮文島紫海膽', date: '2026.05.02', sold: 20, time: '45 分鐘售罄', available: false },
    { no: '021', name: '積丹半島馬糞', date: '2026.04.25', sold: 23, time: '28 分鐘售罄', available: false },
  ],
  reviews: [
    { q: '開箱嗰一刻所有人都拍曬相，新鮮程度完全唔輸日本當地！', n: 'C.K.', m: 'DROP 022 · 馬糞 100g', a: 'C' },
    { q: '冷鏈追蹤好安心，一直保持 −1.4°C，比好多餐廳食嘅更新鮮。', n: 'M.L.', m: 'DROP 021 · 主廚精選', a: 'M' },
    { q: '海膽鮮甜完全無腥味，配清酒係神仙享受，下週繼續訂！', n: 'V.W.', m: 'DROP 023 · 家庭套裝', a: 'V' },
  ],
  faq: [
    { q: '海膽幾時到貨？截單時間係幾時？', a: '每週一新鮮到貨，截單時間為每週六 23:59。如未能及時截單，可提前預訂下週。' },
    { q: '配送範圍及費用？', a: '免費配送至澳門半島、氹仔及路環全區。週一到貨後 WhatsApp 確認送達時段（上午或下午）。' },
    { q: '如何付款？', a: '支持 MBway、轉數快、現金（送貨時付款）。確認訂單後提供付款詳情。' },
    { q: '限量數量是多少？為何這麼少？', a: '每週僅放出 50 盒，以確保頂級鮮度及品質。每週六截單，售完即止。' },
    { q: '到貨品質不符預期怎麼辦？', a: '我們提供 100% 鮮度保證。如收到時有品質疑慮，請於開盒後 2 小時內 WhatsApp +853 6282 3037，全額退款或下週補寄。' },
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-amber-400 mb-2">海膽速遞 • 後台管理</h1>
            <p className="text-zinc-400">⚠️ 管理員頁面 · 請勿分享此 URL · <a href="/sea-urchin" target="_blank" className="text-amber-400 underline">前往網站 →</a></p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          {(['content', 'customers'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 font-semibold text-sm transition border-b-2 -mb-px ${tab === t ? 'border-amber-400 text-amber-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
            >
              {t === 'content' ? '📝 頁面內容' : '👥 客戶管理'}
            </button>
          ))}
        </div>

        {/* ── CONTENT TAB ── */}
        {tab === 'content' && (
          <div style={{ fontFamily: 'system-ui', color: '#f4f4f5' }}>
            {saveStatus && (
              <div className={`p-3 rounded-lg mb-4 text-sm font-semibold ${saveStatus.type === 'ok' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
                {saveStatus.msg}
              </div>
            )}

            {/* Notice */}
            <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">📢 公告橫幅</h2>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  className="flex-1 min-w-60 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  value={cfg.notice}
                  onChange={e => setCfg(c => ({ ...c, notice: e.target.value }))}
                />
                <button disabled={saving} onClick={() => saveConfig('notice', cfg.notice)} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-bold uppercase tracking-wider transition">儲存</button>
              </div>
              <div className="mt-2 text-xs text-zinc-500">預覽：<span className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs">{cfg.notice}</span></div>
            </div>

            {/* Drop Info */}
            <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">🎯 本週 DROP</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {([
                  ['no', 'DROP 編號', 'text'],
                  ['name', '商品名稱', 'text'],
                  ['origin', '產地', 'text'],
                  ['qtyLeft', '剩餘數量', 'number'],
                  ['qtyTotal', '總數量', 'number'],
                  ['temp', '冷鏈溫度 (°C)', 'number'],
                ] as [keyof DropConfig, string, string][]).map(([field, label, type]) => (
                  <div key={field}>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">{label}</label>
                    <input
                      type={type}
                      step={type === 'number' ? '0.1' : undefined}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={cfg.drop[field]}
                      onChange={e => setDrop(field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button disabled={saving} onClick={() => saveConfig('drop', cfg.drop)} className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-bold uppercase tracking-wider transition">儲存 DROP 資訊</button>
            </div>

            {/* Delivery */}
            <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">📅 配送設定</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">到貨日</label>
                  <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={cfg.delivery_day} onChange={e => setCfg(c => ({ ...c, delivery_day: parseInt(e.target.value) }))}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">截單日</label>
                  <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={cfg.cutoff_day} onChange={e => setCfg(c => ({ ...c, cutoff_day: parseInt(e.target.value) }))}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">⚠️ 更改此設定後需重新部署網站才能反映倒數計時</p>
              <button disabled={saving} onClick={() => saveConfig('delivery_day', cfg.delivery_day).then(() => saveConfig('cutoff_day', cfg.cutoff_day))} className="mt-3 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-bold uppercase tracking-wider transition">儲存配送設定</button>
            </div>

            {/* Sizes */}
            <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">📦 產品規格及定價</h2>
                <button onClick={addSize} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-bold text-white">＋ 增加規格</button>
              </div>
              {cfg.sizes.map((size, idx) => (
                <div key={size.id} className={`${idx > 0 ? 'border-t border-zinc-800 pt-4 mt-4' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400 uppercase">{size.id}</span>
                      <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                        <input type="checkbox" checked={!!size.isB2B} onChange={e => setSize(idx, 'isB2B', e.target.checked)} className="accent-amber-400" />
                        B2B詢價
                      </label>
                    </div>
                    <button onClick={() => rmSize(idx)} className="text-red-500 hover:text-red-300 text-lg leading-none">×</button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">名稱</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={size.name} onChange={e => setSize(idx, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">規格 / 重量</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={size.weight} onChange={e => setSize(idx, 'weight', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">說明</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={size.sub} onChange={e => setSize(idx, 'sub', e.target.value)} />
                    </div>
                    {!size.isB2B && (
                      <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">價格 (MOP$)</label>
                        <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={size.price} onChange={e => setSize(idx, 'price', parseInt(e.target.value))} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('sizes', cfg.sizes)} className="mt-5 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-bold uppercase tracking-wider transition">儲存產品規格</button>
            </div>

            {/* Steps */}
            <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">📋 四步驟說明</h2>
                <button onClick={addStep} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-bold text-white">＋ 增加步驟</button>
              </div>
              {cfg.steps.map((step, idx) => (
                <div key={idx} className={`${idx > 0 ? 'border-t border-zinc-800 pt-4 mt-4' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-amber-400">步驟 {idx + 1}</span>
                    <button onClick={() => rmStep(idx)} className="text-red-500 hover:text-red-300 text-lg leading-none">×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">標籤 (英文)</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={step.lbl} onChange={e => setStep(idx, 'lbl', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">標題 (中文)</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={step.name} onChange={e => setStep(idx, 'name', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">說明</label>
                    <textarea className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none" rows={2} value={step.desc} onChange={e => setStep(idx, 'desc', e.target.value)} />
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('steps', cfg.steps)} className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-bold uppercase tracking-wider transition">儲存步驟</button>
            </div>

            {/* Archive */}
            <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">📁 過往掉落記錄</h2>
                <button onClick={addArch} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-bold text-white">＋ 新增記錄</button>
              </div>
              {cfg.archive.map((item, idx) => (
                <div key={idx} className={`${idx > 0 ? 'border-t border-zinc-800 pt-4 mt-4' : ''}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-amber-400">DROP NO. {item.no}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!item.available} onChange={e => setArch(idx, 'available', e.target.checked)} className="accent-green-500" />
                        <span className={`text-xs font-semibold ${item.available ? 'text-green-400' : 'text-zinc-500'}`}>
                          {item.available ? '✓ 仍可訂購' : '已售罄'}
                        </span>
                      </label>
                    </div>
                    <button onClick={() => rmArch(idx)} className="text-red-500 hover:text-red-300 text-lg leading-none">×</button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">編號</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={item.no} onChange={e => setArch(idx, 'no', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">商品名稱</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={item.name} onChange={e => setArch(idx, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">日期</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={item.date} onChange={e => setArch(idx, 'date', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">數量 (盒)</label>
                      <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={item.sold} onChange={e => setArch(idx, 'sold', parseInt(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">售罄時間 / 備注</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={item.time} onChange={e => setArch(idx, 'time', e.target.value)} />
                    </div>
                    {item.available && (
                      <>
                        <div>
                          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">規格 (weight)</label>
                          <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="e.g. 100g / 板" value={item.weight ?? ''} onChange={e => setArch(idx, 'weight', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">訂購價格 (MOP$)</label>
                          <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="0" value={item.price ?? 0} onChange={e => setArch(idx, 'price', parseInt(e.target.value))} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('archive', cfg.archive)} className="mt-5 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-bold uppercase tracking-wider transition">儲存過往記錄</button>
            </div>

            {/* Reviews */}
            <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">⭐ 客戶評價</h2>
                <button onClick={addReview} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-bold text-white">＋ 新增評價</button>
              </div>
              {cfg.reviews.map((rev, idx) => (
                <div key={idx} className={`${idx > 0 ? 'border-t border-zinc-800 pt-4 mt-4' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-amber-400">評價 {idx + 1}</span>
                    <button onClick={() => rmReview(idx)} className="text-red-500 hover:text-red-300 text-lg leading-none">×</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">客戶代號 (顯示)</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={rev.n} onChange={e => setRev(idx, 'n', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">頭像字母</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" maxLength={1} value={rev.a} onChange={e => setRev(idx, 'a', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">購買記錄</label>
                      <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={rev.m} onChange={e => setRev(idx, 'm', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">評價內容</label>
                    <textarea className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none" rows={2} value={rev.q} onChange={e => setRev(idx, 'q', e.target.value)} />
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('reviews', cfg.reviews)} className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-bold uppercase tracking-wider transition">儲存評價</button>
            </div>

            {/* FAQ */}
            <div className="bg-zinc-900 rounded-xl p-5 mb-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">❓ 常見問題 FAQ</h2>
                <button onClick={addFaq} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-bold text-white">＋ 新增問題</button>
              </div>
              {cfg.faq.map((item, idx) => (
                <div key={idx} className={`${idx > 0 ? 'border-t border-zinc-800 pt-4 mt-4' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-amber-400">Q.{String(idx + 1).padStart(2, '0')}</span>
                    <button onClick={() => rmFaq(idx)} className="text-red-500 hover:text-red-300 text-lg leading-none">×</button>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">問題</label>
                    <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" value={item.q} onChange={e => setFaq(idx, 'q', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">答案</label>
                    <textarea className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none" rows={2} value={item.a} onChange={e => setFaq(idx, 'a', e.target.value)} />
                  </div>
                </div>
              ))}
              <button disabled={saving} onClick={() => saveConfig('faq', cfg.faq)} className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-bold uppercase tracking-wider transition">儲存 FAQ</button>
            </div>

            {/* Save All */}
            <button
              onClick={saveAll}
              disabled={saving}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm uppercase tracking-wider transition"
            >
              {saving ? '儲存中…' : '💾 全部儲存'}
            </button>
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {tab === 'customers' && (
          <div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="總客戶數" value={stats.total} color="bg-amber-500" />
          <StatCard label="個人客戶" value={stats.retail} color="bg-blue-500" />
          <StatCard label="餐廳批發" value={stats.restaurant} color="bg-green-500" />
          <StatCard label="VIP 客戶" value={stats.vip} color="bg-purple-500" />
          <StatCard label="本週新增" value={stats.thisWeek} color="bg-pink-500" />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'retail', 'restaurant', 'chef', 'vip'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === type
                    ? 'bg-amber-400 text-black'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                {type === 'all'
                  ? '全部'
                  : type === 'retail'
                    ? '個人'
                    : type === 'restaurant'
                      ? '餐廳'
                      : type === 'chef'
                        ? '主廚'
                        : 'VIP'}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition"
          >
            📥 匯出 CSV
          </button>
          <button
            onClick={fetchCustomers}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition"
          >
            🔄 刷新
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-6 text-red-100">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-zinc-400">載入中...</p>
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto bg-zinc-900 rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">姓名</th>
                  <th className="px-4 py-3 text-left font-semibold">電話</th>
                  <th className="px-4 py-3 text-left font-semibold">電郵</th>
                  <th className="px-4 py-3 text-left font-semibold">類型</th>
                  <th className="px-4 py-3 text-left font-semibold">來源</th>
                  <th className="px-4 py-3 text-left font-semibold">級別</th>
                  <th className="px-4 py-3 text-center font-semibold">訂單</th>
                  <th className="px-4 py-3 text-center font-semibold">消費 (MOP)</th>
                  <th className="px-4 py-3 text-left font-semibold">註冊日期</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    className={`border-b border-zinc-800 ${
                      idx % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'
                    } hover:bg-zinc-800 transition`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {customer.name || '未提供'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {customer.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {customer.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          customer.customer_type === 'restaurant'
                            ? 'bg-green-900 text-green-200'
                            : customer.customer_type === 'chef'
                              ? 'bg-orange-900 text-orange-200'
                              : 'bg-blue-900 text-blue-200'
                        }`}
                      >
                        {customer.customer_type === 'retail'
                          ? '個人'
                          : customer.customer_type === 'restaurant'
                            ? '餐廳'
                            : '主廚'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {customer.source === 'landing_page'
                        ? '落地頁'
                        : customer.source === 'whatsapp'
                          ? 'WhatsApp'
                          : customer.source}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          customer.tier === 'gold'
                            ? 'bg-yellow-900 text-yellow-200'
                            : customer.tier === 'silver'
                              ? 'bg-gray-500 text-white'
                              : customer.tier === 'restaurant'
                                ? 'bg-purple-900 text-purple-200'
                                : 'bg-amber-900 text-amber-200'
                        }`}
                      >
                        {customer.tier === 'bronze'
                          ? '銅級'
                          : customer.tier === 'silver'
                            ? '銀級'
                            : customer.tier === 'gold'
                              ? '金級'
                              : '批發'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {customer.total_orders}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {customer.total_spent > 0
                        ? customer.total_spent.toFixed(2)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(customer.created_at).toLocaleDateString('zh-HK')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
            <p className="text-zinc-400">沒有客戶記錄</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-zinc-800 text-xs text-zinc-500">
          <p>顯示 {filtered.length} 名客戶 (篩選後) · 總計 {stats.total} 名</p>
        </div>
          </div>
        )}

      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className={`${color} rounded-lg p-4 text-black`}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
