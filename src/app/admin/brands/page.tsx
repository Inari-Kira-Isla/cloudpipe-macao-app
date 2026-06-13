'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BrandConfig {
  slug: string
  name_zh: string
  name_en: string
  industry_slug: string
  mode: string
  key_facts: {
    phone?: string
    whatsapp?: string
    hours?: string
    address?: string
    platforms?: string[]
    menu?: Record<string, unknown>
  }
  updated_at: string
  updated_by: string
}

const BRAND_LABELS: Record<string, { emoji: string; color: string }> = {
  'after-school-coffee': { emoji: '☕', color: '#8B4513' },
  'mind-cafe':           { emoji: '🧠', color: '#6B46C1' },
  'cloudpipe':           { emoji: '☁️', color: '#2563EB' },
  'sea-urchin-delivery': { emoji: '🦔', color: '#059669' },
  'inari-global-foods':  { emoji: '🐟', color: '#DC2626' },
}

export default function BrandsAdminPage() {
  const [brands, setBrands] = useState<BrandConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [adminKey, setAdminKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [keyInput, setKeyInput] = useState('')

  function tryAuth() {
    setAdminKey(keyInput)
    setAuthed(true)
    sessionStorage.setItem('brand_admin_key', keyInput)
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('brand_admin_key')
    if (saved) { setAdminKey(saved); setAuthed(true) }
  }, [])

  useEffect(() => {
    if (!authed) return
    fetch('/api/brand-config')
      .then(r => r.json())
      .then(data => { setBrands(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authed])

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ background: '#1e293b', padding: 40, borderRadius: 12, width: 340 }}>
          <h2 style={{ color: '#f1f5f9', margin: '0 0 24px', fontSize: 20 }}>🔑 品牌管理面板</h2>
          <input
            type="password"
            placeholder="Admin Key"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryAuth()}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
          />
          <button onClick={tryAuth} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer' }}>
            進入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <h1 style={{ color: '#f1f5f9', fontSize: 24, margin: 0 }}>CloudPipe 品牌資料管理</h1>
          <span style={{ background: '#1e293b', color: '#64748b', fontSize: 12, padding: '3px 8px', borderRadius: 6 }}>SSOT</span>
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>載入中…</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {brands.map(brand => {
              const meta = BRAND_LABELS[brand.slug] ?? { emoji: '📦', color: '#64748b' }
              const kf = brand.key_facts ?? {}
              return (
                <Link
                  key={brand.slug}
                  href={`/admin/brands/${brand.slug}?key=${encodeURIComponent(adminKey)}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: '#1e293b',
                    border: `1px solid #334155`,
                    borderLeft: `4px solid ${meta.color}`,
                    borderRadius: 10,
                    padding: '20px 24px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 16 }}>{brand.name_zh}</span>
                          <span style={{ color: '#64748b', fontSize: 12 }}>{brand.name_en}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#94a3b8' }}>
                          <span>📞 {kf.phone ?? '—'}</span>
                          <span>⏰ {kf.hours ?? '—'}</span>
                          {kf.platforms && kf.platforms.length > 0 && (
                            <span>🛵 {kf.platforms.join(', ')}</span>
                          )}
                        </div>
                        {kf.address && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            📍 {kf.address}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 11, color: '#475569' }}>
                        <div style={{ background: brand.mode === 'active' ? '#14532d' : '#1c1917', color: brand.mode === 'active' ? '#4ade80' : '#78716c', padding: '2px 8px', borderRadius: 4, marginBottom: 4 }}>
                          {brand.mode ?? 'active'}
                        </div>
                        <div>更新: {brand.updated_at?.slice(0, 10)}</div>
                        <div style={{ color: '#3b82f6' }}>編輯 →</div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 24, padding: '16px 20px', background: '#1e293b', borderRadius: 8, fontSize: 12, color: '#475569' }}>
          <strong style={{ color: '#64748b' }}>說明：</strong>
          點擊品牌卡片進入編輯頁。修改後按「儲存」→ 選擇「預覽影響」確認受影響的 FAQ/KG 行數 → 確認同步。
          所有資料以此面板為唯一 SSOT，改一次自動推送到 merchant_faqs + knowledge_facts。
        </div>
      </div>
    </div>
  )
}
