'use client'

import { useEffect, useState } from 'react'

const gold = '#F5C842'
const navy = '#08111F'
const glass = 'rgba(255,255,255,0.04)'
const glassBorder = 'rgba(255,255,255,0.08)'
const textPrimary = '#DCE6F4'
const textMuted = 'rgba(220,230,244,0.5)'

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

const btnPrimary: React.CSSProperties = {
  background: gold,
  color: navy,
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
}

const btnDelete: React.CSSProperties = {
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.2)',
  color: '#F87171',
  borderRadius: 8,
  padding: '6px 12px',
  fontWeight: 500,
  cursor: 'pointer',
  fontSize: 12,
}

const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: textPrimary,
  borderRadius: 8,
  padding: '6px 12px',
  fontWeight: 500,
  cursor: 'pointer',
  fontSize: 12,
}

interface Product {
  id: string | number
  name: string
  description?: string
  price?: string | number
  currency?: string
}

const emptyForm = (): Omit<Product, 'id'> => ({ name: '', description: '', price: '', currency: 'HKD' })

export default function BrandProductsEditor({ slug }: { slug: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null)

  useEffect(() => {
    fetch(`/api/v1/brand-products/${slug}`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : (d?.products || [])))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [slug])

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setEditForm({ name: p.name, description: p.description || '', price: p.price || '', currency: p.currency || 'HKD' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm())
  }

  const saveEdit = async (id: string | number) => {
    setSaving(true)
    try {
      await fetch(`/api/v1/brand-products/${slug}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...editForm } : p))
      cancelEdit()
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async () => {
    if (!addForm.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/brand-products/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const added = await res.json()
      setProducts(prev => [...prev, added])
      setAddForm(emptyForm())
      setShowAdd(false)
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string | number) => {
    try {
      await fetch(`/api/v1/brand-products/${slug}/${id}`, { method: 'DELETE' })
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch {
      // silent fail
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const FormFields = ({
    form,
    onChange,
  }: {
    form: Omit<Product, 'id'>
    onChange: (key: keyof Omit<Product, 'id'>, val: string) => void
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="text"
        value={form.name}
        onChange={e => onChange('name', e.target.value)}
        placeholder="產品/服務名稱 *"
        style={inputStyle}
      />
      <textarea
        value={form.description}
        onChange={e => onChange('description', e.target.value)}
        placeholder="描述..."
        rows={2}
        style={inputStyle}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
        <input
          type="text"
          value={String(form.price ?? '')}
          onChange={e => onChange('price', e.target.value)}
          placeholder="價格"
          style={inputStyle}
        />
        <select
          value={form.currency}
          onChange={e => onChange('currency', e.target.value)}
          style={{ ...inputStyle, width: '100%' }}
        >
          <option value="HKD">HKD</option>
          <option value="MOP">MOP</option>
          <option value="JPY">JPY</option>
          <option value="USD">USD</option>
          <option value="CNY">CNY</option>
        </select>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: 90, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: gold }}>📦 產品/服務</div>
        <button onClick={() => setShowAdd(v => !v)} style={btnPrimary}>
          + 新增產品
        </button>
      </div>

      {showAdd && (
        <div style={{
          background: glass,
          border: `1px solid ${gold}44`,
          borderRadius: 12,
          padding: '18px 16px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: gold }}>新增產品/服務</div>
          <FormFields
            form={addForm}
            onChange={(k, v) => setAddForm(prev => ({ ...prev, [k]: v }))}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={saving || !addForm.name.trim()} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? '新增中…' : '確認新增'}
            </button>
            <button onClick={() => { setShowAdd(false); setAddForm(emptyForm()) }} style={btnSecondary}>
              取消
            </button>
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: textMuted, fontSize: 13 }}>
          尚無產品/服務，點擊「新增產品」開始建立
        </div>
      )}

      {products.map(product => (
        <div key={product.id} style={{
          background: glass,
          border: `1px solid ${glassBorder}`,
          borderRadius: 12,
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {editingId === product.id ? (
            <>
              <FormFields
                form={editForm}
                onChange={(k, v) => setEditForm(prev => ({ ...prev, [k]: v }))}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveEdit(product.id)} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? '儲存中…' : '儲存'}
                </button>
                <button onClick={cancelEdit} style={btnSecondary}>取消</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{product.name}</div>
                  {product.description && (
                    <div style={{ fontSize: 12, color: textMuted, marginTop: 4, lineHeight: 1.6 }}>{product.description}</div>
                  )}
                </div>
                {product.price != null && product.price !== '' && (
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: gold,
                    whiteSpace: 'nowrap', paddingTop: 2,
                  }}>
                    {product.currency || ''} {product.price}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => startEdit(product)} style={btnSecondary}>編輯</button>
                {confirmDeleteId === product.id ? (
                  <>
                    <span style={{ fontSize: 12, color: '#F87171', alignSelf: 'center' }}>確認刪除？</span>
                    <button onClick={() => handleDelete(product.id)} style={btnDelete}>確認</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={btnSecondary}>取消</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDeleteId(product.id)} style={btnDelete}>刪除</button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
