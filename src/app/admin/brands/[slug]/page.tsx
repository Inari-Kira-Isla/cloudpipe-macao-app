'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface BrandConfig {
  slug: string
  name_zh: string
  name_en: string
  industry_slug: string
  mode: string
  uvp?: string
  key_facts: {
    phone?: string
    whatsapp?: string
    hours?: string
    address?: string
    platforms?: string[]
    menu?: Record<string, string[]>
  }
  updated_at: string
  updated_by: string
}

interface Conflict {
  field: string
  brand_config_value: string
  conflicting_source: string
  conflicting_value: string
}

interface AuditResult {
  slug: string
  conflict_count: number
  conflicts: Conflict[]
  checked_at: string
}

interface SyncPreview {
  dry_run: boolean
  affected_count: number
  affected: { table: string; id: string }[]
  old_value: string
  new_value: string
  field: string
  message: string
}

type Tab = 'edit' | 'audit'

const FIELD_LABELS: Record<string, string> = {
  phone: '電話',
  whatsapp: 'WhatsApp',
  hours: '營業時間',
  address: '地址',
  platforms: '外賣平台',
}

const TOP_LEVEL_FIELDS = ['name_zh', 'name_en', 'industry_slug', 'uvp', 'mode']

export default function BrandEditorPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const adminKey = searchParams.get('key') ?? ''

  const [brand, setBrand] = useState<BrandConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('edit')

  // Edit state
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Sync preview state
  const [syncField, setSyncField] = useState<string | null>(null)
  const [preview, setPreview] = useState<SyncPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')

  // Audit state
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)

  const fetchBrand = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/brand-config?slug=${encodeURIComponent(slug)}`)
      const data = await r.json()
      setBrand(data)
      // Initialize edits from current values
      const kf = data?.key_facts ?? {}
      const init: Record<string, string> = {
        name_zh: data?.name_zh ?? '',
        name_en: data?.name_en ?? '',
        industry_slug: data?.industry_slug ?? '',
        uvp: data?.uvp ?? '',
        mode: data?.mode ?? 'active',
        phone: kf.phone ?? '',
        whatsapp: kf.whatsapp ?? '',
        hours: kf.hours ?? '',
        address: kf.address ?? '',
        platforms: Array.isArray(kf.platforms) ? kf.platforms.join(', ') : '',
      }
      setEdits(init)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchBrand()
  }, [fetchBrand])

  async function runAudit() {
    setAuditLoading(true)
    setAudit(null)
    try {
      const r = await fetch(`/api/brand-config/audit?slug=${encodeURIComponent(slug)}`)
      const data = await r.json()
      setAudit(data)
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'audit' && !audit) runAudit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Save top-level fields (name_zh, name_en, etc.) and key_facts directly
  async function handleSave(field: string) {
    setSaving(true)
    setSaveMsg('')
    try {
      const value = field === 'platforms'
        ? edits.platforms.split(',').map(s => s.trim()).filter(Boolean)
        : edits[field]

      const r = await fetch('/api/brand-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ slug, field, value }),
      })
      const data = await r.json()
      if (data.ok) {
        setSaveMsg(`✅ ${FIELD_LABELS[field] ?? field} 已儲存`)
        await fetchBrand()
      } else {
        setSaveMsg(`❌ ${data.error ?? '儲存失敗'}`)
      }
    } catch {
      setSaveMsg('❌ 網路錯誤')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 4000)
    }
  }

  // Sync: dry run first
  async function handleSyncPreview(field: string) {
    const kf = brand?.key_facts ?? {}
    const currentStored = field === 'platforms'
      ? (Array.isArray(kf.platforms) ? kf.platforms.join(', ') : '')
      : (kf as Record<string, string>)[field] ?? ''

    const newValue = edits[field] ?? ''
    if (newValue === currentStored) {
      setSaveMsg('⚠️ 值未改變，無需同步')
      setTimeout(() => setSaveMsg(''), 3000)
      return
    }

    setSyncField(field)
    setPreview(null)
    setPreviewLoading(true)
    setApplyMsg('')
    try {
      const r = await fetch('/api/brand-config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ slug, field, new_value: newValue, dry_run: true }),
      })
      const data = await r.json()
      setPreview(data)
    } catch {
      setApplyMsg('❌ 預覽失敗')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSyncApply() {
    if (!preview || !syncField) return
    setApplying(true)
    setApplyMsg('')
    try {
      const r = await fetch('/api/brand-config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ slug, field: syncField, new_value: preview.new_value, dry_run: false }),
      })
      const data = await r.json()
      if (data.applied !== undefined) {
        setApplyMsg(`✅ 同步完成：更新 ${data.applied} 行`)
        setPreview(null)
        setSyncField(null)
        await fetchBrand()
      } else {
        setApplyMsg(`❌ ${data.error ?? '同步失敗'}`)
      }
    } catch {
      setApplyMsg('❌ 網路錯誤')
    } finally {
      setApplying(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
  }

  const btnStyle = (color = '#3b82f6'): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    background: color,
    color: '#fff',
    border: 'none',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>載入中…</p>
      </div>
    )
  }

  if (!brand) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ef4444' }}>找不到品牌：{slug}</p>
      </div>
    )
  }

  const kfFields = ['phone', 'whatsapp', 'hours', 'address', 'platforms']

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link href={`/admin/brands?key=${encodeURIComponent(adminKey)}`} style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>
            ← 品牌列表
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1 style={{ color: '#f1f5f9', fontSize: 22, margin: '8px 0 4px' }}>
                {brand.name_zh}
                <span style={{ color: '#64748b', fontSize: 14, marginLeft: 8 }}>{brand.name_en}</span>
              </h1>
              <div style={{ fontSize: 12, color: '#475569' }}>
                slug: {brand.slug} · 更新: {brand.updated_at?.slice(0, 16)} · by {brand.updated_by}
              </div>
            </div>
            <Link
              href={`/admin/brands/${brand.slug}/products?key=${encodeURIComponent(adminKey)}`}
              style={{ flexShrink: 0, marginTop: 8, padding: '7px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13, color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              📷 商品圖片
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: '#1e293b', borderRadius: 8, padding: 4, width: 'fit-content' }}>
          {(['edit', 'audit'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                background: tab === t ? '#3b82f6' : 'transparent',
                color: tab === t ? '#fff' : '#94a3b8',
              }}
            >
              {t === 'edit' ? '✏️ 編輯資料' : '🔍 矛盾報告'}
            </button>
          ))}
        </div>

        {/* Status messages */}
        {saveMsg && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#1e293b', borderRadius: 6, fontSize: 13, color: saveMsg.startsWith('✅') ? '#4ade80' : '#fbbf24' }}>
            {saveMsg}
          </div>
        )}
        {applyMsg && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#1e293b', borderRadius: 6, fontSize: 13, color: applyMsg.startsWith('✅') ? '#4ade80' : '#fbbf24' }}>
            {applyMsg}
          </div>
        )}

        {/* Edit Tab */}
        {tab === 'edit' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Top-level fields */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 20 }}>
              <h3 style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>基本資料</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { key: 'name_zh', label: '中文名稱' },
                  { key: 'name_en', label: '英文名稱' },
                  { key: 'industry_slug', label: '行業 slug' },
                  { key: 'uvp', label: '品牌定位 (UVP)' },
                  { key: 'mode', label: '狀態 (active/paused)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        style={inputStyle}
                        value={edits[key] ?? ''}
                        onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSave(key)}
                      />
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving}
                        style={btnStyle()}
                      >
                        儲存
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* key_facts fields with sync */}
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 20 }}>
              <h3 style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>聯絡 / 營業資料</h3>
              <p style={{ color: '#475569', fontSize: 12, margin: '0 0 16px' }}>
                修改後按「儲存+同步」→ 預覽影響行數 → 確認同步
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                {kfFields.map(field => {
                  const label = FIELD_LABELS[field] ?? field
                  const currentStored = field === 'platforms'
                    ? (Array.isArray(brand.key_facts?.platforms) ? brand.key_facts.platforms.join(', ') : '')
                    : ((brand.key_facts ?? {}) as Record<string, string>)[field] ?? ''
                  const isDirty = (edits[field] ?? '') !== currentStored

                  return (
                    <div key={field}>
                      <label style={{ color: '#64748b', fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {label}
                        {field === 'platforms' && <span style={{ color: '#475569', marginLeft: 6 }}>(逗號分隔)</span>}
                        {isDirty && <span style={{ color: '#fbbf24', marginLeft: 6 }}>● 已修改</span>}
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          style={{ ...inputStyle, borderColor: isDirty ? '#fbbf24' : '#334155' }}
                          value={edits[field] ?? ''}
                          onChange={e => setEdits(prev => ({ ...prev, [field]: e.target.value }))}
                        />
                        <button
                          onClick={() => handleSyncPreview(field)}
                          disabled={previewLoading || applying}
                          style={btnStyle(isDirty ? '#f59e0b' : '#3b82f6')}
                        >
                          {isDirty ? '儲存+同步' : '同步'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sync Preview Panel */}
            {(previewLoading || preview) && (
              <div style={{ background: '#0c1a2e', border: '1px solid #1d4ed8', borderRadius: 10, padding: 20 }}>
                <h3 style={{ color: '#60a5fa', fontSize: 14, margin: '0 0 12px' }}>
                  📋 同步預覽 — {syncField ? (FIELD_LABELS[syncField] ?? syncField) : ''}
                </h3>
                {previewLoading ? (
                  <p style={{ color: '#64748b', fontSize: 13 }}>掃描中…</p>
                ) : preview ? (
                  <>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
                      <div>舊值：<code style={{ color: '#fca5a5', background: '#1e293b', padding: '1px 6px', borderRadius: 3 }}>{preview.old_value}</code></div>
                      <div style={{ marginTop: 4 }}>新值：<code style={{ color: '#86efac', background: '#1e293b', padding: '1px 6px', borderRadius: 3 }}>{preview.new_value}</code></div>
                    </div>
                    <div style={{ fontSize: 13, color: '#60a5fa', marginBottom: 12 }}>
                      影響 <strong style={{ color: '#f1f5f9' }}>{preview.affected_count}</strong> 行
                      {preview.affected_count > 0 && (
                        <span style={{ color: '#64748b', marginLeft: 8 }}>
                          ({[...new Set(preview.affected.map(r => r.table))].join(', ')})
                        </span>
                      )}
                    </div>
                    {preview.affected.length > 0 && (
                      <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 12 }}>
                        {preview.affected.map((row, i) => (
                          <div key={i} style={{ fontSize: 11, color: '#475569', padding: '2px 0' }}>
                            {row.table} #{row.id}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSyncApply}
                        disabled={applying}
                        style={btnStyle('#16a34a')}
                      >
                        {applying ? '同步中…' : `確認同步 ${preview.affected_count} 行`}
                      </button>
                      <button
                        onClick={() => { setPreview(null); setSyncField(null) }}
                        style={btnStyle('#334155')}
                      >
                        取消
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Audit Tab */}
        {tab === 'audit' && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ color: '#94a3b8', fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>矛盾偵測報告</h3>
              <button onClick={runAudit} disabled={auditLoading} style={btnStyle()}>
                {auditLoading ? '掃描中…' : '重新掃描'}
              </button>
            </div>

            {auditLoading && <p style={{ color: '#64748b', fontSize: 13 }}>掃描中…</p>}

            {audit && (
              <>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  掃描時間：{audit.checked_at?.slice(0, 19).replace('T', ' ')} ·
                  發現 <strong style={{ color: audit.conflict_count > 0 ? '#f87171' : '#4ade80' }}>
                    {audit.conflict_count}
                  </strong> 個矛盾
                </div>

                {audit.conflict_count === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#4ade80', fontSize: 14 }}>
                    ✅ 各資料來源一致，無矛盾
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {audit.conflicts.map((c, i) => (
                      <div key={i} style={{ background: '#1a0c0c', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ background: '#7f1d1d', color: '#fca5a5', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
                            {FIELD_LABELS[c.field] ?? c.field}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>{c.conflicting_source}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'grid', gap: 4 }}>
                          <div>
                            <span style={{ color: '#475569' }}>SSOT：</span>
                            <code style={{ color: '#86efac', background: '#0f172a', padding: '1px 6px', borderRadius: 3 }}>{c.brand_config_value}</code>
                          </div>
                          <div>
                            <span style={{ color: '#475569' }}>衝突值：</span>
                            <code style={{ color: '#fca5a5', background: '#0f172a', padding: '1px 6px', borderRadius: 3 }}>{c.conflicting_value}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Bottom hint */}
        <div style={{ marginTop: 24, padding: '12px 16px', background: '#1e293b', borderRadius: 8, fontSize: 11, color: '#475569' }}>
          SSOT：brand_configs → merchants + knowledge_facts + merchant_faqs 自動同步
        </div>
      </div>
    </div>
  )
}
