'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TOKENS, getBrandTokens } from '@/lib/design-tokens'

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

function BrandEditorContent() {
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

  // Brand design tokens (accent colour driven by brand slug)
  const brandTokens = getBrandTokens(brand?.slug ?? slug ?? '')

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

  // ─── White Minimal design system (linear.app / notion style) ───────────────

  const inputStyle: React.CSSProperties = {
    ...TOKENS.input,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const inputDirtyStyle: React.CSSProperties = {
    ...inputStyle,
    border: `1px solid ${brandTokens.accent}`,
  }

  const btnDark: React.CSSProperties = {
    ...TOKENS.button.primary,
    padding: '8px 20px',
    whiteSpace: 'nowrap',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const btnBlue: React.CSSProperties = {
    background: TOKENS.color.info,
    color: '#fff',
    border: 'none',
    borderRadius: TOKENS.radius.md,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const btnCancel: React.CSSProperties = {
    ...TOKENS.button.secondary,
    padding: '8px 16px',
    whiteSpace: 'nowrap',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  const cardStyle: React.CSSProperties = {
    ...TOKENS.card,
    padding: 28,
    marginBottom: 20,
  }

  const labelStyle: React.CSSProperties = {
    ...TOKENS.type.label,
    marginBottom: 6,
    display: 'block',
  }

  const sectionHeader = (label: string) => (
    <div style={TOKENS.sectionHeader(brandTokens.accent)}>
      {label}
    </div>
  )

  // ─── Loading / not found ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: TOKENS.color.bgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: TOKENS.color.textMuted, fontFamily: 'system-ui, -apple-system, sans-serif' }}>載入中…</p>
      </div>
    )
  }

  if (!brand) {
    return (
      <div style={{ minHeight: '100vh', background: TOKENS.color.bgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#991b1b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>找不到品牌：{slug}</p>
      </div>
    )
  }

  const kfFields = ['phone', 'whatsapp', 'hours', 'address', 'platforms']

  return (
    <div style={{ background: TOKENS.color.bgSubtle, minHeight: '100vh', color: TOKENS.color.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Sticky Navbar */}
      <div style={{
        ...TOKENS.nav,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 60,
        borderTop: `3px solid ${brandTokens.accent}`,
      }}>
        {/* Left: brand name + back link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: brandTokens.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {brand.name_zh}
          </span>
          <Link
            href={`/admin/brands?key=${encodeURIComponent(adminKey)}`}
            style={{ fontSize: 13, color: TOKENS.color.textMuted, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            ← 品牌列表
          </Link>
        </div>

        {/* Right: products link */}
        <Link
          href={`/admin/brands/${brand.slug}/products?key=${encodeURIComponent(adminKey)}`}
          style={{
            ...TOKENS.button.primary,
            flexShrink: 0,
            padding: '8px 20px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          商品圖片
        </Link>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

        {/* Page title area */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.color.textSubtle, marginBottom: 6 }}>
            Admin · Brands
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: TOKENS.color.text, letterSpacing: '-0.02em', margin: 0 }}>
            {brand.name_zh}
          </h1>
          <div style={{ fontSize: 14, color: TOKENS.color.textMuted, marginTop: 4 }}>
            {brand.name_en} · slug: {brand.slug} · 更新: {brand.updated_at?.slice(0, 16)} · by {brand.updated_by}
          </div>
        </div>

        {/* Tab bar */}
        <div style={TOKENS.tab.bar}>
          {(['edit', 'audit'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...TOKENS.tab.item(tab === t, brandTokens.accent),
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {t === 'edit' ? '編輯資料' : '矛盾報告'}
            </button>
          ))}
        </div>

        {/* Status messages */}
        {saveMsg && (
          <div style={{
            marginBottom: 20,
            padding: '10px 14px',
            borderRadius: TOKENS.radius.md,
            fontSize: 13,
            ...(saveMsg.startsWith('✅')
              ? { color: TOKENS.color.success, background: TOKENS.color.successBg, border: `1px solid ${TOKENS.color.successBorder}` }
              : { color: '#991b1b', background: TOKENS.color.errorBg, border: `1px solid ${TOKENS.color.errorBorder}` }),
          }}>
            {saveMsg}
          </div>
        )}
        {applyMsg && (
          <div style={{
            marginBottom: 20,
            padding: '10px 14px',
            borderRadius: TOKENS.radius.md,
            fontSize: 13,
            ...(applyMsg.startsWith('✅')
              ? { color: TOKENS.color.success, background: TOKENS.color.successBg, border: `1px solid ${TOKENS.color.successBorder}` }
              : { color: '#991b1b', background: TOKENS.color.errorBg, border: `1px solid ${TOKENS.color.errorBorder}` }),
          }}>
            {applyMsg}
          </div>
        )}

        {/* Edit Tab */}
        {tab === 'edit' && (
          <div>

            {/* Basic info card */}
            <div style={cardStyle}>
              {sectionHeader('基本資料')}
              <div>
                {[
                  { key: 'name_zh', label: '中文名稱' },
                  { key: 'name_en', label: '英文名稱' },
                  { key: 'industry_slug', label: '行業 slug' },
                  { key: 'uvp', label: '品牌定位 (UVP)' },
                  { key: 'mode', label: '狀態 (active/paused)' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>{label}</label>
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
                        style={btnDark}
                      >
                        儲存
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact / operating data card */}
            <div style={cardStyle}>
              {sectionHeader('聯絡 / 營業資料')}
              <p style={{ color: TOKENS.color.textMuted, fontSize: 13, margin: '0 0 20px' }}>
                修改後按「儲存+同步」→ 預覽影響行數 → 確認同步
              </p>
              <div>
                {kfFields.map(field => {
                  const label = FIELD_LABELS[field] ?? field
                  const currentStored = field === 'platforms'
                    ? (Array.isArray(brand.key_facts?.platforms) ? brand.key_facts.platforms.join(', ') : '')
                    : ((brand.key_facts ?? {}) as Record<string, string>)[field] ?? ''
                  const isDirty = (edits[field] ?? '') !== currentStored

                  return (
                    <div key={field} style={{ marginBottom: 20 }}>
                      <label style={labelStyle}>
                        {label}
                        {field === 'platforms' && <span style={{ color: TOKENS.color.textSubtle, marginLeft: 6, textTransform: 'none', fontWeight: 400 }}>(逗號分隔)</span>}
                        {isDirty && <span style={{ color: brandTokens.accent, marginLeft: 6, textTransform: 'none', fontWeight: 600 }}>● 已修改</span>}
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          style={isDirty ? inputDirtyStyle : inputStyle}
                          value={edits[field] ?? ''}
                          onChange={e => setEdits(prev => ({ ...prev, [field]: e.target.value }))}
                        />
                        <button
                          onClick={() => handleSyncPreview(field)}
                          disabled={previewLoading || applying}
                          style={btnBlue}
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
              <div style={{
                background: TOKENS.color.infoBg,
                border: `1px solid ${TOKENS.color.infoBorder}`,
                borderRadius: TOKENS.radius.lg,
                padding: 24,
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 16 }}>
                  同步預覽 — {syncField ? (FIELD_LABELS[syncField] ?? syncField) : ''}
                </div>
                {previewLoading ? (
                  <p style={{ color: '#1e3a8a', fontSize: 13 }}>掃描中…</p>
                ) : preview ? (
                  <>
                    <div style={{ fontSize: 13, color: '#1e3a8a', marginBottom: 12 }}>
                      <div>舊值：<code style={{ color: '#991b1b', background: '#fff', padding: '1px 6px', borderRadius: 4 }}>{preview.old_value}</code></div>
                      <div style={{ marginTop: 4 }}>新值：<code style={{ color: '#166534', background: '#fff', padding: '1px 6px', borderRadius: 4 }}>{preview.new_value}</code></div>
                    </div>
                    <div style={{ fontSize: 13, color: '#1e40af', marginBottom: 12 }}>
                      影響 <strong style={{ color: TOKENS.color.text }}>{preview.affected_count}</strong> 行
                      {preview.affected_count > 0 && (
                        <span style={{ color: TOKENS.color.textMuted, marginLeft: 8 }}>
                          ({[...new Set(preview.affected.map(r => r.table))].join(', ')})
                        </span>
                      )}
                    </div>
                    {preview.affected.length > 0 && (
                      <div style={{ maxHeight: 140, overflowY: 'auto', marginBottom: 12 }}>
                        {preview.affected.map((row, i) => (
                          <div key={i} style={{ fontSize: 13, color: '#1e3a8a', padding: '4px 0', borderBottom: `1px solid ${TOKENS.color.infoBorder}` }}>
                            {row.table} #{row.id}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSyncApply}
                        disabled={applying}
                        style={btnBlue}
                      >
                        {applying ? '同步中…' : `確認同步 ${preview.affected_count} 行`}
                      </button>
                      <button
                        onClick={() => { setPreview(null); setSyncField(null) }}
                        style={btnCancel}
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
          <div style={{
            background: TOKENS.color.errorBg,
            border: `1px solid ${TOKENS.color.errorBorder}`,
            borderRadius: TOKENS.radius.lg,
            padding: 24,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
                矛盾偵測報告
              </div>
              <button onClick={runAudit} disabled={auditLoading} style={btnDark}>
                {auditLoading ? '掃描中…' : '重新掃描'}
              </button>
            </div>

            {auditLoading && <p style={{ color: '#7f1d1d', fontSize: 13 }}>掃描中…</p>}

            {audit && (
              <>
                <div style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 16 }}>
                  掃描時間：{audit.checked_at?.slice(0, 19).replace('T', ' ')} ·
                  發現 <strong style={{ color: audit.conflict_count > 0 ? '#991b1b' : '#166534' }}>
                    {audit.conflict_count}
                  </strong> 個矛盾
                </div>

                {audit.conflict_count === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#166534', fontSize: 14 }}>
                    ✅ 各資料來源一致，無矛盾
                  </div>
                ) : (
                  <div>
                    {audit.conflicts.map((c, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${TOKENS.color.errorBorder}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#7f1d1d' }}>
                            {FIELD_LABELS[c.field] ?? c.field}
                          </span>
                          <span style={{ color: '#991b1b', fontSize: 12 }}>{c.conflicting_source}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#7f1d1d', display: 'grid', gap: 4 }}>
                          <div>
                            <span style={{ color: '#991b1b' }}>SSOT：</span>
                            <code style={{ color: '#166534', background: '#fff', padding: '1px 6px', borderRadius: 3 }}>{c.brand_config_value}</code>
                          </div>
                          <div>
                            <span style={{ color: '#991b1b' }}>衝突值：</span>
                            <code style={{ color: '#991b1b', background: '#fff', padding: '1px 6px', borderRadius: 3 }}>{c.conflicting_value}</code>
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
        <div style={{ marginTop: 24, padding: '12px 16px', background: TOKENS.color.bg, border: `1px solid ${TOKENS.color.border}`, borderRadius: TOKENS.radius.md, fontSize: 12, color: TOKENS.color.textSubtle }}>
          SSOT：brand_configs → merchants + knowledge_facts + merchant_faqs 自動同步
        </div>
      </div>
    </div>
  )
}

export default function BrandEditorPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#94a3b8", fontFamily: "system-ui" }}>Loading…</div>}>
      <BrandEditorContent />
    </Suspense>
  )
}
