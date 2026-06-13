'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Design tokens (matches existing brand page) ────────────────────────────
const gold = '#F5C842'
const navy = '#08111F'
const glass = 'rgba(255,255,255,0.04)'
const glassBorder = 'rgba(255,255,255,0.08)'
const textPrimary = '#DCE6F4'
const textMuted = 'rgba(220,230,244,0.5)'
const textDim = 'rgba(220,230,244,0.35)'
const ADMIN_KEY = 'cp-admin-2026'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  color: textPrimary,
  fontSize: 13,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: textMuted,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 4,
}

// ── Types ──────────────────────────────────────────────────────────────────
interface KeyFacts {
  phone?: string
  whatsapp?: string
  hours?: string
  address?: string
  platforms?: string[]
}

interface BrandConfig {
  slug: string
  name_zh: string
  key_facts: KeyFacts
  updated_at: string
  updated_by: string
}

interface SyncPreview {
  affected_count: number
  affected: { table: string; id: string }[]
  old_value: string
  new_value: string
  field: string
  message: string
}

interface Conflict {
  field: string
  brand_config_value: string
  conflicting_source: string
  conflicting_value: string
}

const FIELD_LABELS: Record<string, string> = {
  phone: '電話',
  whatsapp: 'WhatsApp',
  hours: '營業時間',
  address: '地址',
  platforms: '外賣平台',
}

const KF_FIELDS = ['phone', 'whatsapp', 'hours', 'address', 'platforms'] as const

// ── Component ──────────────────────────────────────────────────────────────
export default function BrandSsotEditor({ slug }: { slug: string }) {
  const [config, setConfig] = useState<BrandConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  // Sync preview state
  const [syncField, setSyncField] = useState<string | null>(null)
  const [preview, setPreview] = useState<SyncPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')

  // Audit state
  const [auditOpen, setAuditOpen] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditChecked, setAuditChecked] = useState('')

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/brand-config?slug=${encodeURIComponent(slug)}`)
      const data = await r.json()
      setConfig(data)
      const kf: KeyFacts = data?.key_facts ?? {}
      setEdits({
        phone: kf.phone ?? '',
        whatsapp: kf.whatsapp ?? '',
        hours: kf.hours ?? '',
        address: kf.address ?? '',
        platforms: Array.isArray(kf.platforms) ? kf.platforms.join(', ') : '',
      })
    } catch {
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  async function handleSyncPreview(field: string) {
    if (!config) return
    const kf = config.key_facts ?? {}
    const stored = field === 'platforms'
      ? (Array.isArray(kf.platforms) ? kf.platforms.join(', ') : '')
      : (kf as Record<string, string>)[field] ?? ''

    const newVal = edits[field] ?? ''
    if (newVal === stored) {
      flash('⚠️ 值未改變')
      return
    }

    setSyncField(field)
    setPreview(null)
    setPreviewLoading(true)
    setApplyMsg('')
    try {
      const r = await fetch('/api/brand-config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ slug, field, new_value: newVal, dry_run: true }),
      })
      setPreview(await r.json())
    } catch {
      setApplyMsg('❌ 預覽失敗')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSyncApply() {
    if (!preview || !syncField) return
    setApplying(true)
    try {
      const r = await fetch('/api/brand-config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ slug, field: syncField, new_value: preview.new_value, dry_run: false }),
      })
      const data = await r.json()
      if (data.applied !== undefined) {
        setApplyMsg(`✅ 同步完成：更新 ${data.applied} 行`)
        setPreview(null); setSyncField(null)
        await fetchConfig()
      } else {
        setApplyMsg(`❌ ${data.error ?? '同步失敗'}`)
      }
    } catch {
      setApplyMsg('❌ 網路錯誤')
    } finally {
      setApplying(false)
    }
  }

  async function runAudit() {
    setAuditLoading(true)
    try {
      const r = await fetch(`/api/brand-config/audit?slug=${encodeURIComponent(slug)}`)
      const data = await r.json()
      setConflicts(data.conflicts ?? [])
      setAuditChecked(data.checked_at?.slice(0, 16).replace('T', ' ') ?? '')
    } finally {
      setAuditLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 12, flexDirection: 'column', marginTop: 24 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ height: 36, borderRadius: 8, background: glass, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  if (!config) {
    return (
      <div style={{ marginTop: 24, padding: '16px 20px', background: glass, border: `1px solid ${glassBorder}`, borderRadius: 12, color: textMuted, fontSize: 13 }}>
        ⚠️ 未找到 brand_configs 記錄（slug: {slug}）
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>

      {/* ── Section header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: gold }}>⚡ SSOT 同步引擎</div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
            改動後自動同步至 merchant_faqs + knowledge_facts · 更新: {config.updated_at?.slice(0, 10)} by {config.updated_by}
          </div>
        </div>
        {msg && (
          <span style={{ fontSize: 12, color: msg.startsWith('✅') ? '#4ADE80' : '#FBBF24' }}>{msg}</span>
        )}
      </div>

      {/* ── Key facts edit grid ── */}
      <div style={{
        background: glass,
        border: `1px solid ${glassBorder}`,
        borderRadius: 14,
        padding: '20px 22px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {KF_FIELDS.map(field => {
          const kf = config.key_facts ?? {}
          const stored = field === 'platforms'
            ? (Array.isArray(kf.platforms) ? kf.platforms.join(', ') : '')
            : (kf as Record<string, string>)[field] ?? ''
          const isDirty = (edits[field] ?? '') !== stored

          return (
            <div key={field}>
              <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {FIELD_LABELS[field]}
                {field === 'platforms' && <span style={{ color: textDim, fontWeight: 400 }}>(逗號分隔)</span>}
                {isDirty && <span style={{ color: '#FBBF24', fontSize: 10 }}>● 已修改</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, borderColor: isDirty ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)' }}
                  value={edits[field] ?? ''}
                  onChange={e => setEdits(prev => ({ ...prev, [field]: e.target.value }))}
                />
                <button
                  onClick={() => handleSyncPreview(field)}
                  disabled={previewLoading || applying}
                  style={{
                    background: isDirty ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isDirty ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    color: isDirty ? gold : textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isDirty ? '同步' : '推送'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Sync preview panel ── */}
      {(previewLoading || preview || applyMsg) && (
        <div style={{
          background: 'rgba(29,78,216,0.08)',
          border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: 14,
          padding: '18px 22px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA', marginBottom: 12 }}>
            📋 同步預覽 — {syncField ? FIELD_LABELS[syncField] ?? syncField : ''}
          </div>

          {previewLoading && <div style={{ color: textMuted, fontSize: 13 }}>掃描中…</div>}

          {applyMsg && (
            <div style={{ fontSize: 13, color: applyMsg.startsWith('✅') ? '#4ADE80' : '#F87171' }}>{applyMsg}</div>
          )}

          {preview && !applyMsg && (
            <>
              <div style={{ fontSize: 12, color: textMuted, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                <div>
                  舊值：<code style={{ color: '#FCA5A5', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 3 }}>{preview.old_value}</code>
                </div>
                <div>
                  新值：<code style={{ color: '#86EFAC', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 3 }}>{preview.new_value}</code>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#60A5FA', marginBottom: 12 }}>
                影響 <strong style={{ color: textPrimary }}>{preview.affected_count}</strong> 行
                {preview.affected_count > 0 && (
                  <span style={{ color: textDim, marginLeft: 8 }}>
                    ({[...new Set(preview.affected.map(r => r.table))].join(', ')})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSyncApply}
                  disabled={applying}
                  style={{
                    background: 'rgba(22,163,74,0.2)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    borderRadius: 8,
                    padding: '8px 16px',
                    color: '#4ADE80',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {applying ? '同步中…' : `確認同步 ${preview.affected_count} 行`}
                </button>
                <button
                  onClick={() => { setPreview(null); setSyncField(null); setApplyMsg('') }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    color: textMuted,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Conflict audit ── */}
      <div style={{
        background: glass,
        border: `1px solid ${glassBorder}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <button
          onClick={() => {
            setAuditOpen(o => !o)
            if (!auditChecked) runAudit()
          }}
          style={{
            width: '100%',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            color: textPrimary,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: gold }}>🔍 矛盾偵測</span>
            {auditChecked && !auditLoading && (
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: conflicts.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.1)',
                color: conflicts.length > 0 ? '#F87171' : '#4ADE80',
              }}>
                {conflicts.length > 0 ? `${conflicts.length} 個矛盾` : '✓ 無矛盾'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {auditChecked && <span style={{ fontSize: 11, color: textDim }}>{auditChecked}</span>}
            <button
              onClick={e => { e.stopPropagation(); runAudit() }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                padding: '4px 10px',
                color: textMuted,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {auditLoading ? '掃描…' : '重掃'}
            </button>
            <span style={{ color: textDim, fontSize: 16 }}>{auditOpen ? '▲' : '▼'}</span>
          </div>
        </button>

        {auditOpen && (
          <div style={{ padding: '0 22px 18px', borderTop: `1px solid ${glassBorder}` }}>
            {auditLoading && <div style={{ color: textMuted, fontSize: 13, paddingTop: 14 }}>掃描中…</div>}

            {!auditLoading && conflicts.length === 0 && auditChecked && (
              <div style={{ paddingTop: 14, color: '#4ADE80', fontSize: 13 }}>
                ✅ 所有資料來源一致，無矛盾
              </div>
            )}

            {!auditLoading && conflicts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14 }}>
                {conflicts.map((c, i) => (
                  <div key={i} style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 10,
                    padding: '12px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        background: 'rgba(239,68,68,0.2)',
                        color: '#FCA5A5',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        {FIELD_LABELS[c.field] ?? c.field}
                      </span>
                      <span style={{ color: textDim, fontSize: 12 }}>{c.conflicting_source}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                      <div>
                        <span style={{ color: textDim }}>SSOT：</span>
                        <code style={{ color: '#86EFAC', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 3 }}>
                          {c.brand_config_value}
                        </code>
                      </div>
                      <div>
                        <span style={{ color: textDim }}>衝突值：</span>
                        <code style={{ color: '#FCA5A5', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 3 }}>
                          {c.conflicting_value}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
