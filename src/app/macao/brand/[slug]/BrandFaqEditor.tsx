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

interface Faq {
  id: string | number
  question: string
  answer: string
}

export default function BrandFaqEditor({ slug }: { slug: string }) {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [editQ, setEditQ] = useState('')
  const [editA, setEditA] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null)

  useEffect(() => {
    fetch(`/api/v1/brand-faqs/${slug}`)
      .then(r => r.json())
      .then(d => setFaqs(Array.isArray(d) ? d : (d?.faqs || [])))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false))
  }, [slug])

  const startEdit = (faq: Faq) => {
    setEditingId(faq.id)
    setEditQ(faq.question)
    setEditA(faq.answer)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditQ('')
    setEditA('')
  }

  const saveEdit = async (id: string | number) => {
    setSaving(true)
    try {
      await fetch(`/api/v1/brand-faqs/${slug}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: editQ, answer: editA }),
      })
      setFaqs(prev => prev.map(f => f.id === id ? { ...f, question: editQ, answer: editA } : f))
      cancelEdit()
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async () => {
    if (!newQ.trim() || !newA.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/brand-faqs/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQ, answer: newA }),
      })
      const added = await res.json()
      setFaqs(prev => [...prev, added])
      setNewQ('')
      setNewA('')
      setShowAdd(false)
    } catch {
      // silent fail
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string | number) => {
    try {
      await fetch(`/api/v1/brand-faqs/${slug}/${id}`, { method: 'DELETE' })
      setFaqs(prev => prev.filter(f => f.id !== id))
    } catch {
      // silent fail
    } finally {
      setConfirmDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: 80, borderRadius: 10,
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
        <div style={{ fontSize: 15, fontWeight: 700, color: gold }}>❓ FAQ 管理</div>
        <button onClick={() => setShowAdd(v => !v)} style={btnPrimary}>
          + 新增 FAQ
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
          <div style={{ fontSize: 12, fontWeight: 600, color: gold, marginBottom: 4 }}>新增問答</div>
          <textarea
            value={newQ}
            onChange={e => setNewQ(e.target.value)}
            placeholder="問題..."
            rows={2}
            style={inputStyle}
          />
          <textarea
            value={newA}
            onChange={e => setNewA(e.target.value)}
            placeholder="答案..."
            rows={3}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={saving || !newQ.trim() || !newA.trim()} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? '新增中…' : '確認新增'}
            </button>
            <button onClick={() => { setShowAdd(false); setNewQ(''); setNewA('') }} style={btnSecondary}>
              取消
            </button>
          </div>
        </div>
      )}

      {faqs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: textMuted, fontSize: 13 }}>
          尚無 FAQ，點擊「新增 FAQ」開始建立
        </div>
      )}

      {faqs.map(faq => (
        <div key={faq.id} style={{
          background: glass,
          border: `1px solid ${glassBorder}`,
          borderRadius: 12,
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {editingId === faq.id ? (
            <>
              <textarea
                value={editQ}
                onChange={e => setEditQ(e.target.value)}
                rows={2}
                style={inputStyle}
              />
              <textarea
                value={editA}
                onChange={e => setEditA(e.target.value)}
                rows={3}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveEdit(faq.id)} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? '儲存中…' : '儲存'}
                </button>
                <button onClick={cancelEdit} style={btnSecondary}>取消</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, lineHeight: 1.5 }}>
                Q: {faq.question}
              </div>
              <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.65 }}>
                A: {faq.answer}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => startEdit(faq)} style={btnSecondary}>編輯</button>
                {confirmDeleteId === faq.id ? (
                  <>
                    <span style={{ fontSize: 12, color: '#F87171', alignSelf: 'center' }}>確認刪除？</span>
                    <button onClick={() => handleDelete(faq.id)} style={btnDelete}>確認</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={btnSecondary}>取消</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDeleteId(faq.id)} style={btnDelete}>刪除</button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
