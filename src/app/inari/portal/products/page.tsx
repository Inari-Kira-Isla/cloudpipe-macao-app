'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const ADMIN_SECRET = 'cloudpipe2026'

interface Product {
  id: string
  slug: string
  name_zh: string
  name_en: string | null
  description_zh: string | null
  description_en: string | null
  retail_price: number
  wholesale_price: number | null
  stock_qty: number
  unit: string
  unit_weight_g: number | null
  image_url: string | null
  image_urls: string[]
  origin_region: string | null
  certifications: string[]
  mc_status: string
  mc_exclude_reason: string | null
  mc_approved_at: string | null
  season_start: number | null
  season_end: number | null
  is_featured: boolean
  sort_order: number
}

const MC_STATUS_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  approved:    { label: '已核准上架', color: 'bg-green-900 text-green-300 border-green-700', icon: '🟢' },
  draft:       { label: '待審核', color: 'bg-blue-900 text-blue-300 border-blue-700', icon: '🔵' },
  needs_image: { label: '缺少主圖', color: 'bg-red-900 text-red-300 border-red-700', icon: '🔴' },
  needs_price: { label: '缺少售價', color: 'bg-red-900 text-red-300 border-red-700', icon: '🔴' },
  needs_desc:  { label: '描述不足', color: 'bg-yellow-900 text-yellow-300 border-yellow-700', icon: '🟡' },
  excluded:    { label: '已排除', color: 'bg-gray-800 text-gray-400 border-gray-600', icon: '⚫' },
  paused:      { label: '暫停中', color: 'bg-orange-900 text-orange-300 border-orange-700', icon: '🟠' },
}

function McBadge({ status }: { status: string }) {
  const s = MC_STATUS_LABEL[status] ?? { label: status, color: 'bg-gray-800 text-gray-400 border-gray-600', icon: '?' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border font-mono ${s.color}`}>
      {s.icon} {s.label}
    </span>
  )
}

interface UploadState {
  uploading: boolean
  progress: number
  preview: string | null
  result: string | null
  error: string | null
}

export default function ProductManagePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Product | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Product>>({})
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const extraInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/inari/products/manage?secret=${ADMIN_SECRET}`)
    const json = await res.json()
    setProducts(json.products ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // ── Image upload with preview ────────────────────────────────
  async function handleImageDrop(
    e: React.DragEvent | React.ChangeEvent<HTMLInputElement>,
    slug: string,
    index = 0
  ) {
    e.preventDefault()
    const file = 'dataTransfer' in e
      ? e.dataTransfer.files[0]
      : (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    // Client-side preview
    const preview = URL.createObjectURL(file)
    setUploads(u => ({ ...u, [slug + index]: { uploading: true, progress: 0, preview, result: null, error: null } }))

    const form = new FormData()
    form.append('file', file)
    form.append('slug', slug)
    form.append('index', String(index))

    try {
      // Simulate progress (sharp processes server-side)
      const timer = setInterval(() => {
        setUploads(u => {
          const cur = u[slug + index]
          if (!cur || cur.progress >= 85) { clearInterval(timer); return u }
          return { ...u, [slug + index]: { ...cur, progress: cur.progress + 15 } }
        })
      }, 300)

      const res = await fetch(`/api/inari/products/upload-image?secret=${ADMIN_SECRET}`, {
        method: 'POST',
        body: form,
      })
      clearInterval(timer)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      setUploads(u => ({ ...u, [slug + index]: { uploading: false, progress: 100, preview, result: json.url, error: null } }))
      showToast(`✅ 圖片處理完成：${json.processed.width}×${json.processed.height}px, ${json.processed.size_kb}KB`)
      fetchProducts()
    } catch (err) {
      setUploads(u => ({ ...u, [slug + index]: { uploading: false, progress: 0, preview: null, result: null, error: String(err) } }))
      showToast(`❌ 上傳失敗：${err}`, false)
    }
  }

  // ── Status actions ────────────────────────────────────────────
  async function handleAction(slug: string, action: string, reason?: string) {
    setActionLoading(slug + action)
    try {
      const res = await fetch('/api/inari/products/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET,
        },
        body: JSON.stringify({ action, slug, data: reason ? { reason } : undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`✅ ${slug} → ${json.mc_status}`)
      fetchProducts()
    } catch (err) {
      showToast(`❌ ${err}`, false)
    } finally {
      setActionLoading(null)
    }
  }

  // ── Edit save ─────────────────────────────────────────────────
  async function handleSave() {
    if (!selected) return
    setActionLoading('save')
    try {
      const res = await fetch('/api/inari/products/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ action: 'update', slug: selected.slug, data: editData }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast('✅ 已儲存')
      setEditMode(false)
      fetchProducts()
    } catch (err) {
      showToast(`❌ ${err}`, false)
    } finally {
      setActionLoading(null)
    }
  }

  const summary = {
    total: products.length,
    approved: products.filter(p => p.mc_status === 'approved').length,
    ready: products.filter(p => ['draft'].includes(p.mc_status)).length,
    blocked: products.filter(p => ['needs_image','needs_price','needs_desc'].includes(p.mc_status)).length,
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all
          ${toast.ok ? 'bg-green-800 text-green-100 border border-green-600' : 'bg-red-800 text-red-100 border border-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#C9A961] mb-1">商品管理</h1>
        <p className="text-gray-400 text-sm">上傳商品資料 · 圖片處理 · Merchant Center 上架審核</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '商品總數', val: summary.total, color: 'text-white' },
          { label: '已上架', val: summary.approved, color: 'text-green-400' },
          { label: '待審核', val: summary.ready, color: 'text-blue-400' },
          { label: '需補資料', val: summary.blocked, color: 'text-red-400' },
        ].map(c => (
          <div key={c.label} className="bg-[#0F1F3A] border border-white/10 rounded-xl p-4">
            <div className={`text-3xl font-bold ${c.color}`}>{c.val}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">載入中...</div>
      ) : (
        <div className="space-y-4">
          {products.map(p => {
            const uploadKey0 = p.slug + '0'
            const up = uploads[uploadKey0]

            return (
              <div key={p.slug}
                className="bg-[#0F1F3A] border border-white/10 rounded-xl overflow-hidden">
                <div className="flex gap-4 p-4">

                  {/* ── Image drop zone ── */}
                  <div
                    className="w-32 h-32 flex-shrink-0 relative rounded-lg overflow-hidden border-2 border-dashed border-white/20 cursor-pointer
                      hover:border-[#C9A961]/60 transition-colors group"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleImageDrop(e, p.slug, 0)}
                    onClick={() => {
                      setSelected(p)
                      fileInputRef.current?.click()
                    }}
                  >
                    {up?.uploading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-black/60">
                        <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-[#C9A961] rounded-full transition-all" style={{ width: `${up.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">處理中...</span>
                      </div>
                    ) : (up?.result || p.image_url) ? (
                      <>
                        <img
                          src={up?.result || p.image_url || ''}
                          alt={p.name_zh}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs text-white">更換圖片</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-600 text-center">拖放或點擊<br/>上傳主圖</span>
                      </div>
                    )}
                  </div>

                  {/* ── Product info ── */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-white">{p.name_zh}</h3>
                        <p className="text-xs text-gray-500 font-mono">{p.slug}</p>
                      </div>
                      <McBadge status={p.mc_status} />
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-3">
                      <span>MOP <span className="text-[#C9A961] font-medium">{p.retail_price}</span></span>
                      <span>庫存 <span className={p.stock_qty > 0 ? 'text-green-400' : 'text-red-400'}>{p.stock_qty}</span></span>
                      {p.unit_weight_g && <span>{p.unit_weight_g}g/{p.unit}</span>}
                      {p.origin_region && <span>📍 {p.origin_region}</span>}
                      {p.season_start && <span>🗓 {p.season_start}-{p.season_end}月</span>}
                    </div>

                    {p.mc_exclude_reason && (
                      <p className="text-xs text-red-400 mb-2">⚠️ {p.mc_exclude_reason}</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {p.mc_status !== 'approved' && p.image_url && (
                        <button
                          onClick={() => handleAction(p.slug, 'approve')}
                          disabled={actionLoading === p.slug + 'approve'}
                          className="px-3 py-1 text-xs rounded bg-green-800 hover:bg-green-700 text-green-200 border border-green-600 disabled:opacity-50 transition-colors">
                          {actionLoading === p.slug + 'approve' ? '...' : '✅ 核准上架'}
                        </button>
                      )}
                      {p.mc_status === 'approved' && (
                        <button
                          onClick={() => handleAction(p.slug, 'pause', '季節性暫停')}
                          disabled={actionLoading === p.slug + 'pause'}
                          className="px-3 py-1 text-xs rounded bg-orange-900 hover:bg-orange-800 text-orange-200 border border-orange-700 disabled:opacity-50 transition-colors">
                          暫停
                        </button>
                      )}
                      {p.mc_status !== 'excluded' && (
                        <button
                          onClick={() => handleAction(p.slug, 'exclude', 'B2B 批發專屬，不公開上架')}
                          disabled={actionLoading === p.slug + 'exclude'}
                          className="px-3 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-600 disabled:opacity-50 transition-colors">
                          排除
                        </button>
                      )}
                      {p.mc_status === 'excluded' && (
                        <button
                          onClick={() => handleAction(p.slug, 'draft')}
                          className="px-3 py-1 text-xs rounded bg-blue-900 hover:bg-blue-800 text-blue-300 border border-blue-700 transition-colors">
                          恢復審核
                        </button>
                      )}
                      <button
                        onClick={() => { setSelected(p); setEditData({}); setEditMode(true) }}
                        className="px-3 py-1 text-xs rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors">
                        ✏️ 編輯資料
                      </button>
                    </div>
                  </div>
                </div>

                {/* Extra images strip */}
                {p.image_url && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3">
                    <p className="text-xs text-gray-500 mb-2">附加圖片（最多5張）</p>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(idx => {
                        const extraUrl = p.image_urls?.[idx - 1]
                        const upExtra = uploads[p.slug + idx]
                        return (
                          <div
                            key={idx}
                            className="w-14 h-14 rounded border border-dashed border-white/20 hover:border-[#C9A961]/50 cursor-pointer
                              overflow-hidden flex items-center justify-center transition-colors"
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleImageDrop(e, p.slug, idx)}
                            onClick={() => {
                              setSelected({ ...p, sort_order: idx })
                              extraInputRef.current?.click()
                            }}
                          >
                            {upExtra?.uploading ? (
                              <div className="w-full h-full bg-black/60 flex items-center justify-center">
                                <span className="text-xs text-gray-400">{upExtra.progress}%</span>
                              </div>
                            ) : (upExtra?.result || extraUrl) ? (
                              <img src={upExtra?.result || extraUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-600 text-lg">+</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif,.webp,.tiff,.bmp"
        className="hidden"
        onChange={e => { if (selected) handleImageDrop(e, selected.slug, 0) }}
      />
      <input
        ref={extraInputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif,.webp,.tiff,.bmp"
        className="hidden"
        onChange={e => { if (selected) handleImageDrop(e, selected.slug, selected.sort_order) }}
      />

      {/* Edit modal */}
      {editMode && selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditMode(false)}>
          <div className="bg-[#0F1F3A] border border-white/20 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#C9A961] mb-4">編輯商品資料 — {selected.name_zh}</h2>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {[
                { key: 'name_zh', label: '中文名稱', type: 'text' },
                { key: 'name_en', label: '英文名稱', type: 'text' },
                { key: 'retail_price', label: '零售售價 (MOP)', type: 'number' },
                { key: 'wholesale_price', label: '批發底價 (MOP)', type: 'number' },
                { key: 'stock_qty', label: '庫存數量', type: 'number' },
                { key: 'unit_weight_g', label: '單件重量 (克)', type: 'number' },
                { key: 'origin_region', label: '原產地區', type: 'text' },
                { key: 'origin_detail', label: '原產地細節', type: 'text' },
                { key: 'season_start', label: '上市季節（月，開始）', type: 'number' },
                { key: 'season_end', label: '上市季節（月，結束）', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    defaultValue={String(selected[f.key as keyof Product] ?? '')}
                    onChange={e => setEditData(d => ({ ...d, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                      focus:border-[#C9A961]/50 focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">產品描述（中文）</label>
                <textarea
                  rows={3}
                  defaultValue={selected.description_zh ?? ''}
                  onChange={e => setEditData(d => ({ ...d, description_zh: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                    focus:border-[#C9A961]/50 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">產品描述（英文）</label>
                <textarea
                  rows={3}
                  defaultValue={selected.description_en ?? ''}
                  onChange={e => setEditData(d => ({ ...d, description_en: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                    focus:border-[#C9A961]/50 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditMode(false)}
                className="flex-1 py-2 text-sm rounded-lg border border-white/10 text-gray-400 hover:bg-white/5">
                取消
              </button>
              <button onClick={handleSave} disabled={actionLoading === 'save'}
                className="flex-1 py-2 text-sm rounded-lg bg-[#C9A961] text-black font-semibold hover:bg-[#b8934d] disabled:opacity-50">
                {actionLoading === 'save' ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MC spec reminder */}
      <div className="mt-8 p-4 bg-[#0F1F3A] border border-[#C9A961]/20 rounded-xl text-xs text-gray-400 space-y-1">
        <p className="text-[#C9A961] font-medium mb-2">📋 圖片規格說明</p>
        <p>• 支援任何格式：JPG / PNG / WebP / HEIC / AVIF / BMP / TIFF</p>
        <p>• 任何尺寸均可上傳，系統自動處理為 <strong className="text-white">1200×1200px，白底，JPG</strong></p>
        <p>• 主圖建議：白底，產品置中，無文字及浮水印</p>
        <p>• 圖片上傳後，補齊描述，再點「✅ 核准上架」即可進入 Merchant Center Feed</p>
      </div>
    </div>
  )
}
