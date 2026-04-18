'use client'

import { useState, useEffect, useCallback } from 'react'

interface KnowledgeItem {
  id: string
  brand_slug: string
  category: string
  title: string
  content: string
  source_type: string
  status: 'pending' | 'active' | 'rejected'
  priority: number
  created_at: string
}

interface PostCache {
  id: string
  brand_slug: string
  local_post_id: number
  content: string
  hook_type: string | null
  published_at: string | null
  likes: number
  comments: number
  reach: number
}

interface ContentPlan {
  brand_slug: string
  commercial_goal: string | null
  content_pillars: string[]
  avoid_topics: string[]
  next_focus: string | null
  updated_at: string
}

interface BrandOpsTabProps {
  slug: string
  brandName: string
}

const CATEGORIES = [
  { value: 'brand_story', label: '品牌故事' },
  { value: 'products', label: '產品/服務' },
  { value: 'customer_personas', label: '目標客群' },
  { value: 'competitive_positioning', label: '競爭定位' },
  { value: 'content_guidelines', label: '內容守則' },
  { value: 'event_calendar', label: '活動時程' },
  { value: 'industry_knowledge', label: '行業知識' },
  { value: 'reference_materials', label: '參考資料' },
  { value: 'news', label: '最新動態' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: '待審核',
  active: '已啟用',
  rejected: '已拒絕',
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  padding: '20px 24px',
  marginBottom: 20,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: '#1a1a2e',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const btnPrimary: React.CSSProperties = {
  background: '#0f4c81',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnGold: React.CSSProperties = {
  background: '#c5a572',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnDanger: React.CSSProperties = {
  background: '#fee2e2',
  color: '#ef4444',
  border: 'none',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

export default function BrandOpsTab({ slug, brandName }: BrandOpsTabProps) {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [posts, setPosts] = useState<PostCache[]>([])
  const [plan, setPlan] = useState<ContentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newItem, setNewItem] = useState({ category: 'news', title: '', content: '' })
  const [goalInput, setGoalInput] = useState('')
  const [focusInput, setFocusInput] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [kRes, pRes, plRes] = await Promise.all([
        fetch(`/api/v1/brand-ops?slug=${slug}&action=knowledge`),
        fetch(`/api/v1/brand-ops?slug=${slug}&action=posts`),
        fetch(`/api/v1/brand-ops?slug=${slug}&action=plan`),
      ])
      const [k, p, pl] = await Promise.all([kRes.json(), pRes.json(), plRes.json()])
      setKnowledge(k.items || [])
      setPosts(p.posts || [])
      if (pl.plan) {
        setPlan(pl.plan)
        setGoalInput(pl.plan.commercial_goal || '')
        setFocusInput(pl.plan.next_focus || '')
      }
    } catch (e) {
      console.error('Brand Ops fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleUpload() {
    if (!newItem.title.trim() || !newItem.content.trim()) return
    setUploading(true)
    try {
      await fetch('/api/v1/brand-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', slug, ...newItem }),
      })
      setNewItem({ category: 'news', title: '', content: '' })
      setShowForm(false)
      await fetchAll()
    } finally {
      setUploading(false)
    }
  }

  async function handleApprove(id: string) {
    await fetch('/api/v1/brand-ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id }),
    })
    await fetchAll()
  }

  async function handleReject(id: string) {
    await fetch('/api/v1/brand-ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id }),
    })
    await fetchAll()
  }

  async function handleSavePlan() {
    setSaving(true)
    try {
      await fetch('/api/v1/brand-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-plan',
          slug,
          commercial_goal: goalInput,
          next_focus: focusInput,
          content_pillars: plan?.content_pillars || [],
          avoid_topics: plan?.avoid_topics || [],
        }),
      })
      setSavedMsg('✅ 已儲存')
      setTimeout(() => setSavedMsg(''), 3000)
      await fetchAll()
    } finally {
      setSaving(false)
    }
  }

  const pending = knowledge.filter(k => k.status === 'pending')
  const active = knowledge.filter(k => k.status === 'active')

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        載入中...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900 }}>

      {/* 商業目標設定 */}
      <div style={card}>
        <div style={sectionTitle}>🎯 商業目標 &amp; 內容方向</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
              商業目標（一句話）
            </label>
            <input
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder={`${brandName} → 目標客群 + 核心價值`}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #d1d5db', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
              下週內容焦點
            </label>
            <input
              value={focusInput}
              onChange={e => setFocusInput(e.target.value)}
              placeholder="例：強調冷鏈品質保證，配合大閘蟹季節"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #d1d5db', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={handleSavePlan} disabled={saving} style={btnPrimary}>
            {saving ? '儲存中...' : '儲存設定'}
          </button>
          {savedMsg && <span style={{ fontSize: 13, color: '#10b981' }}>{savedMsg}</span>}
          {plan?.updated_at && (
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>
              上次更新：{new Date(plan.updated_at).toLocaleString('zh-HK')}
            </span>
          )}
        </div>
      </div>

      {/* 品牌資料庫 */}
      <div style={card}>
        <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
          <span>📚 品牌資料庫</span>
          <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
            {showForm ? '取消' : '+ 新增資料'}
          </button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div style={{
            background: '#f8fafc', borderRadius: 8, padding: 16,
            border: '1px solid #e2e8f0', marginBottom: 16,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  類別
                </label>
                <select
                  value={newItem.category}
                  onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  標題
                </label>
                <input
                  value={newItem.title}
                  onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))}
                  placeholder="例：2026年北海道海膽進貨標準"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                內容
              </label>
              <textarea
                value={newItem.content}
                onChange={e => setNewItem(p => ({ ...p, content: e.target.value }))}
                placeholder="填入品牌資料、產品介紹、公告、客群描述等..."
                rows={5}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6,
                  border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button onClick={handleUpload} disabled={uploading} style={btnGold}>
              {uploading ? '提交中...' : '儲存並等待審核'}
            </button>
          </div>
        )}

        {/* 待審核 */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>
              ⏳ 待審核 ({pending.length})
            </div>
            {pending.map(item => (
              <div key={item.id} style={{
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 8, padding: '10px 14px', marginBottom: 8,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>
                    [{CATEGORIES.find(c => c.value === item.category)?.label || item.category}] {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                    {item.content.slice(0, 120)}{item.content.length > 120 ? '...' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    {new Date(item.created_at).toLocaleDateString('zh-HK')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleApprove(item.id)} style={btnGold}>✓ 啟用</button>
                  <button onClick={() => handleReject(item.id)} style={btnDanger}>✗</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 已啟用 */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>
            ✅ 已啟用 ({active.length}) — 下次同步後注入生成引擎
          </div>
          {active.length === 0 && (
            <div style={{ fontSize: 13, color: '#9ca3af', padding: '8px 0' }}>尚無已啟用資料</div>
          )}
          {active.map(item => (
            <div key={item.id} style={{
              borderBottom: '1px solid #f1f5f9', padding: '8px 0',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                background: '#e0f2fe', color: '#0369a1',
                borderRadius: 4, padding: '2px 8px', fontSize: 11, flexShrink: 0,
              }}>
                {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
              </span>
              <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{item.title}</span>
              <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
                {new Date(item.created_at).toLocaleDateString('zh-HK')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 近期發文 */}
      <div style={card}>
        <div style={sectionTitle}>
          📝 近期發文（最新 {posts.length} 篇）
          {posts.length === 0 && (
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>
              — 需先執行 brand_ops_sync.py 同步本地發文
            </span>
          )}
        </div>
        {posts.length === 0 && (
          <div style={{
            background: '#f8fafc', borderRadius: 8, padding: 20,
            textAlign: 'center', color: '#9ca3af', fontSize: 13,
          }}>
            暫無發文記錄。執行 <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>brand_ops_sync.py</code> 後重新整理。
          </div>
        )}
        {posts.map((post, i) => (
          <div key={post.id} style={{
            borderBottom: i < posts.length - 1 ? '1px solid #f1f5f9' : 'none',
            padding: '12px 0',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              {post.hook_type && (
                <span style={{
                  background: '#f0f9ff', color: '#0369a1',
                  borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                }}>
                  {post.hook_type}
                </span>
              )}
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                <span>👍 {post.likes}</span>
                <span>💬 {post.comments}</span>
                <span>👁 {post.reach}</span>
              </div>
              {post.published_at && (
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
                  {new Date(post.published_at).toLocaleDateString('zh-HK')}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              {post.content.slice(0, 150)}{post.content.length > 150 ? '...' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
