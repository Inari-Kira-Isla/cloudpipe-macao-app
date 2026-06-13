'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ProductItem {
  id: string
  product_key: string
  name_zh: string
  keywords: string[]
  url: string
  filename: string
  style: 'lifestyle' | 'poster' | 'other'
  uploaded_at: string
}

const STYLE_LABEL: Record<string, string> = {
  lifestyle: '生活風',
  poster:    '海報風',
  other:     '其他',
}

const STYLE_COLOR: Record<string, string> = {
  lifestyle: '#22c55e',
  poster:    '#f59e0b',
  other:     '#6b7280',
}

const BRAND_LABELS: Record<string, string> = {
  'after-school-coffee':   'After School Coffee',
  'mind-cafe':             'Mind Cafe',
  'inari-global-foods':    '稻荷環球食品',
  'sea-urchin-express':    '海膽速遞',
  'cloudpipe-macau-brand': 'CloudPipe',
}

export default function ProductImagesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const adminKey = searchParams?.get('key') || 'cp-admin-2026'
  const brandName = BRAND_LABELS[slug] || slug

  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Upload form state
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [productKey, setProductKey] = useState('')
  const [nameZh, setNameZh] = useState('')
  const [keywords, setKeywords] = useState('')
  const [style, setStyle] = useState<ProductItem['style']>('lifestyle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/brand-config/products?slug=${slug}&key=${adminKey}`)
      const data = await r.json()
      if (r.ok) setProducts(data.products || [])
      else setError(data.error)
    } catch {
      setError('載入失敗')
    }
    setLoading(false)
  }, [slug, adminKey])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  function handleFileSelect(f: File | null) {
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function handleUpload() {
    if (!file || !productKey.trim() || !nameZh.trim()) {
      setUploadMsg('請填寫產品識別碼、中文名稱並選擇圖片')
      return
    }
    setUploading(true)
    setUploadMsg('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('slug', slug)
    fd.append('product_key', productKey.trim())
    fd.append('name_zh', nameZh.trim())
    fd.append('keywords', keywords)
    fd.append('style', style)
    try {
      const r = await fetch('/api/brand-config/products', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
        body: fd,
      })
      const data = await r.json()
      if (r.ok) {
        setUploadMsg('✅ 上傳成功')
        setFile(null); setPreview(null); setProductKey(''); setNameZh(''); setKeywords('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        fetchProducts()
      } else {
        setUploadMsg(`❌ ${data.error}`)
      }
    } catch {
      setUploadMsg('❌ 上傳失敗，請重試')
    }
    setUploading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確認刪除「${name}」？`)) return
    const r = await fetch('/api/brand-config/products', {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, id }),
    })
    if (r.ok) fetchProducts()
    else alert('刪除失敗')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href={`/admin/brands/${slug}?key=${adminKey}`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>
          ← {brandName}
        </Link>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ fontWeight: 600, fontSize: 16 }}>商品圖片管理</span>
        <span style={{ marginLeft: 'auto', background: '#0f172a', border: '1px solid #334155', borderRadius: 20, padding: '2px 12px', fontSize: 12, color: '#64748b' }}>
          {products.length} 張圖片
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>

        {/* Upload Panel */}
        <div>
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: 600, fontSize: 15 }}>
              上傳商品圖片
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]) }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#3b82f6' : preview ? '#22c55e' : '#334155'}`,
                  borderRadius: 10,
                  minHeight: 180,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  background: dragOver ? 'rgba(59,130,246,0.05)' : '#0f172a',
                  transition: 'all 0.2s',
                }}
              >
                {preview ? (
                  <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 13 }}>拖放圖片或點擊上傳</div>
                    <div style={{ fontSize: 11, marginTop: 4, color: '#475569' }}>JPEG / PNG / WebP，最大 10MB</div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => handleFileSelect(e.target.files?.[0] || null)}
              />

              {/* Product Key */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  產品識別碼 <span style={{ color: '#64748b' }}>(英文，如 crab_stick)</span>
                </label>
                <input
                  value={productKey}
                  onChange={e => setProductKey(e.target.value)}
                  placeholder="crab_stick / iced_latte / lemon_tea ..."
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* Name ZH */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  中文名稱 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  value={nameZh}
                  onChange={e => setNameZh(e.target.value)}
                  placeholder="蟹柳芝士煎蛋三文治"
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* Keywords */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  關鍵詞 <span style={{ color: '#64748b' }}>(逗號分隔，用於自動配對貼文)</span>
                </label>
                <input
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="蟹柳, 蟹籽, 蟹肉"
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* Style */}
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>圖片風格</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['lifestyle', 'poster', 'other'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 8,
                        border: `1px solid ${style === s ? STYLE_COLOR[s] : '#334155'}`,
                        background: style === s ? `${STYLE_COLOR[s]}20` : '#0f172a',
                        color: style === s ? STYLE_COLOR[s] : '#64748b',
                        fontSize: 13,
                        cursor: 'pointer',
                        fontWeight: style === s ? 600 : 400,
                      }}
                    >
                      {STYLE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {uploadMsg && (
                <div style={{ fontSize: 13, color: uploadMsg.startsWith('✅') ? '#22c55e' : '#ef4444', padding: '8px 12px', background: uploadMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
                  {uploadMsg}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                style={{
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: uploading || !file ? '#334155' : '#3b82f6',
                  color: uploading || !file ? '#64748b' : '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: uploading || !file ? 'not-allowed' : 'pointer',
                }}
              >
                {uploading ? '上傳中...' : '上傳圖片'}
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div>
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>商品圖片清單</span>
              <button
                onClick={fetchProducts}
                style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #334155', borderRadius: 6, padding: '4px 12px', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
              >
                重新整理
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>載入中...</div>
            ) : error ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
            ) : products.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div>尚未上傳任何商品圖片</div>
                <div style={{ fontSize: 12, marginTop: 8, color: '#475569' }}>從左側上傳第一張圖片</div>
              </div>
            ) : (
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {products.map(p => (
                  <div key={p.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Image */}
                    <div style={{ height: 160, overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={p.url}
                        alt={p.name_zh}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name_zh}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, background: '#1e293b', borderRadius: 4, padding: '2px 6px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {p.product_key}
                        </span>
                        <span style={{ fontSize: 11, borderRadius: 4, padding: '2px 6px', background: `${STYLE_COLOR[p.style]}20`, color: STYLE_COLOR[p.style] }}>
                          {STYLE_LABEL[p.style]}
                        </span>
                      </div>
                      {p.keywords.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                          {p.keywords.slice(0, 4).map(kw => (
                            <span key={kw} style={{ fontSize: 10, background: '#334155', borderRadius: 10, padding: '1px 7px', color: '#94a3b8' }}>
                              {kw}
                            </span>
                          ))}
                          {p.keywords.length > 4 && (
                            <span style={{ fontSize: 10, color: '#475569' }}>+{p.keywords.length - 4}</span>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, textAlign: 'center', padding: '5px 0', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 11, color: '#94a3b8', textDecoration: 'none' }}
                        >
                          查看
                        </a>
                        <button
                          onClick={() => handleDelete(p.id, p.name_zh)}
                          style={{ flex: 1, padding: '5px 0', background: 'transparent', border: '1px solid #7f1d1d', borderRadius: 6, fontSize: 11, color: '#ef4444', cursor: 'pointer' }}
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
