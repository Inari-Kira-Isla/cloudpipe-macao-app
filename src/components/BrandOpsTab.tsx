'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface KnowledgeItem {
  id: string
  brand_slug: string
  category: string
  schema_type: string | null
  title: string
  content: string
  source_type: string
  status: 'pending' | 'active' | 'rejected'
  priority: number
  confidence: number | null
  lang: string | null
  valid_until: string | null
  created_at: string
}

interface PostCache {
  id: string
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

// Attachment that can be sent with a chat message
interface ChatAttachment {
  type: 'file' | 'url' | 'website' | 'image'
  label: string         // display label
  url?: string
  base64?: string
  mime?: string
  filename?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  attachment?: { label: string; type: string }  // display only
  recorded?: boolean   // asset was saved to DB
}

const SCHEMA_TYPES = [
  { value: 'brand_identity',     label: '🏷️ 品牌身份/故事' },
  { value: 'brand_voice',        label: '🗣️ 品牌語氣/守則' },
  { value: 'brand_visual',       label: '🎨 視覺規範' },
  { value: 'product_catalog',    label: '📦 產品/服務清單' },
  { value: 'product_detail',     label: '🔍 產品詳細規格' },
  { value: 'service_package',    label: '📋 服務套餐' },
  { value: 'pricing_tier',       label: '💰 定價方案' },
  { value: 'customer_persona',   label: '👥 目標客群' },
  { value: 'use_case',           label: '💡 使用場景' },
  { value: 'customer_story',     label: '⭐ 客戶案例' },
  { value: 'competitor_intel',   label: '🔎 競品情報' },
  { value: 'market_position',    label: '📊 市場定位' },
  { value: 'industry_data',      label: '📈 行業數據' },
  { value: 'location_info',      label: '📍 地點/開放時間' },
  { value: 'contact_channel',    label: '📞 聯絡渠道' },
  { value: 'delivery_logistics', label: '🚚 配送物流' },
  { value: 'certification',      label: '🏆 認證/獎項' },
  { value: 'policy',             label: '📜 政策/條款' },
  { value: 'event_calendar',     label: '📅 活動時程' },
  { value: 'news_update',        label: '📰 最新動態' },
  { value: 'faq_seed',           label: '❓ 常見問答' },
  { value: 'media_asset',        label: '🖼️ 媒體資產' },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  padding: '18px 22px',
  marginBottom: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#1a1a2e',
  marginBottom: 14,
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
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnDanger: React.CSSProperties = {
  background: '#fee2e2',
  color: '#ef4444',
  border: 'none',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrandOpsTab({ slug, brandName }: BrandOpsTabProps) {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [posts, setPosts] = useState<PostCache[]>([])
  const [plan, setPlan] = useState<ContentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [goalInput, setGoalInput] = useState('')
  const [focusInput, setFocusInput] = useState('')

  // Collapsible panels
  const [kbOpen, setKbOpen] = useState(false)
  const [postsOpen, setPostsOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ schema_type: 'news_update', title: '', content: '' })
  const [addingItem, setAddingItem] = useState(false)

  // Unified chat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlType, setUrlType] = useState<'url' | 'website'>('url')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ─── Data loading ───────────────────────────────────────────────────────────

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
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ─── Plan save ──────────────────────────────────────────────────────────────

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

  // ─── Knowledge base actions ─────────────────────────────────────────────────

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

  async function handleAddItem() {
    if (!newItem.title.trim() || !newItem.content.trim()) return
    setAddingItem(true)
    try {
      await fetch('/api/v1/brand-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', slug, category: newItem.schema_type, ...newItem }),
      })
      setNewItem({ schema_type: 'news_update', title: '', content: '' })
      setShowAddForm(false)
      await fetchAll()
    } finally {
      setAddingItem(false)
    }
  }

  // ─── Attachment handlers ────────────────────────────────────────────────────

  function handleFileSelect(files: FileList | null) {
    if (!files?.[0]) return
    const file = files[0]
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setAttachment({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        label: file.name,
        base64,
        mime: file.type,
        filename: file.name,
      })
    }
    reader.readAsDataURL(file)
    setAttachMenuOpen(false)
  }

  function handleUrlAttach() {
    const u = urlInput.trim()
    if (!u) return
    setAttachment({
      type: urlType,
      label: urlType === 'website' ? `🌐 整個網站：${new URL(u).hostname}` : `🔗 ${u.slice(0, 50)}`,
      url: u,
    })
    setUrlInput('')
    setShowUrlInput(false)
    setAttachMenuOpen(false)
  }

  // ─── Unified chat send ──────────────────────────────────────────────────────

  async function handleSend() {
    const text = chatInput.trim()
    if ((!text && !attachment) || chatLoading) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: text || '（請分析附件）',
      attachment: attachment ? { label: attachment.label, type: attachment.type } : undefined,
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setChatInput('')
    const sentAttachment = attachment
    setAttachment(null)
    setChatLoading(true)

    // For file/image attachments, also upload to brand_ops_assets in parallel
    let fileUploadPromise: Promise<void> = Promise.resolve()
    if (sentAttachment && (sentAttachment.type === 'file' || sentAttachment.type === 'image') && sentAttachment.base64 && sentAttachment.mime) {
      fileUploadPromise = (async () => {
        try {
          // Convert base64 back to Blob for FormData upload
          const byteString = atob(sentAttachment.base64!)
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
          const blob = new Blob([ab], { type: sentAttachment.mime })
          const file = new File([blob], sentAttachment.filename || 'attachment', { type: sentAttachment.mime })
          const fd = new FormData()
          fd.append('file', file)
          fd.append('slug', slug)
          fd.append('uploaded_by', 'chat')
          await fetch('/api/v1/brand-ops/upload', { method: 'POST', body: fd })
        } catch { /* non-critical, unified-chat already records it */ }
      })()
    }

    try {
      const payload: Record<string, unknown> = {
        slug,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      }
      if (sentAttachment) {
        payload.attachment = {
          type: sentAttachment.type,
          url: sentAttachment.url,
          base64: sentAttachment.base64,
          mime: sentAttachment.mime,
          filename: sentAttachment.filename,
        }
      }

      const res = await fetch('/api/v1/brand-ops/unified-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as {
        reply?: string
        error?: string
        extracted_count?: number
        asset_id?: string
        attachment_label?: string
      }

      let replyText = data.reply || `❌ 錯誤：${data.error || '未知錯誤'}`

      // Append recording confirmation when attachment was present
      if (sentAttachment && data.asset_id) {
        const extractNote = (data.extracted_count ?? 0) > 0
          ? `\n\n---\n📁 **已記錄到品牌資料庫** | 提取了 **${data.extracted_count} 條知識條目**，等待你在知識庫審核。`
          : `\n\n---\n📁 **已記錄到品牌資料庫**（圖片/媒體類素材，無文字提取）`
        replyText += extractNote
      }

      setMessages(prev => [...prev, { role: 'assistant', content: replyText }])

      // Refresh knowledge list if new items were extracted
      if ((data.extracted_count ?? 0) > 0) {
        await fetchAll()
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ 網絡錯誤，請重試。' }])
    } finally {
      setChatLoading(false)
      await fileUploadPromise
    }
  }

  // ─── Derived state ──────────────────────────────────────────────────────────

  const pending = knowledge.filter(k => k.status === 'pending')
  const active = knowledge.filter(k => k.status === 'active')

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>載入中...</div>
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 860 }}>

      {/* ── 商業目標 ────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🎯 商業目標 &amp; 內容方向</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>商業目標（一句話）</label>
            <input
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder={`${brandName} → 目標客群 + 核心價值`}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box', color: '#1a1a2e', background: '#ffffff' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>下週內容焦點</label>
            <input
              value={focusInput}
              onChange={e => setFocusInput(e.target.value)}
              placeholder="例：強調冷鏈品質保證，配合大閘蟹季節"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box', color: '#1a1a2e', background: '#ffffff' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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

      {/* ── 知識庫（折疊）─────────────────────────────────────────── */}
      <div style={card}>
        <button
          onClick={() => setKbOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: 0 }}
        >
          <div style={{ ...sectionTitle, marginBottom: kbOpen ? 14 : 0, justifyContent: 'space-between' }}>
            <span>
              📚 品牌知識庫
              <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                待審核 {pending.length} · 已啟用 {active.length}
                {pending.length > 0 && (
                  <span style={{ marginLeft: 6, background: '#fef3c7', color: '#d97706', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
                    {pending.length} 待處理
                  </span>
                )}
              </span>
            </span>
            <span style={{ fontSize: 16, color: '#9ca3af' }}>{kbOpen ? '▲' : '▼'}</span>
          </div>
        </button>

        {kbOpen && (
          <>
            {/* 待審核 */}
            {pending.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706', marginBottom: 8 }}>待審核（{pending.length}）</div>
                {pending.map(item => (
                  <div key={item.id} style={{
                    background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a',
                    padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>
                        [{SCHEMA_TYPES.find(s => s.value === (item.schema_type || item.category))?.label || item.schema_type || item.category}] {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                        {item.content.slice(0, 100)}{item.content.length > 100 ? '...' : ''}
                      </div>
                      {item.confidence !== null && (
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                          信心度 {Math.round((item.confidence ?? 0) * 100)}%
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                      <button onClick={() => handleApprove(item.id)} style={btnGold}>✓ 啟用</button>
                      <button onClick={() => handleReject(item.id)} style={btnDanger}>✗</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 已啟用 */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>
                已啟用（{active.length}）
              </div>
              {active.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af', padding: '4px 0' }}>尚無已啟用資料</div>}
              {active.slice(0, 10).map(item => (
                <div key={item.id} style={{
                  borderBottom: '1px solid #f1f5f9', padding: '7px 0',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '2px 7px', fontSize: 11, flexShrink: 0 }}>
                    {SCHEMA_TYPES.find(s => s.value === (item.schema_type || item.category))?.label || item.schema_type || item.category}
                  </span>
                  <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{item.title}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{new Date(item.created_at).toLocaleDateString('zh-HK')}</span>
                </div>
              ))}
              {active.length > 10 && <div style={{ fontSize: 12, color: '#9ca3af', paddingTop: 6 }}>... 共 {active.length} 條</div>}
            </div>

            {/* 手動新增 */}
            <div style={{ marginTop: 14, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              <button onClick={() => setShowAddForm(o => !o)} style={{ ...btnPrimary, fontSize: 12, padding: '6px 14px' }}>
                {showAddForm ? '取消' : '+ 手動新增條目'}
              </button>
              {showAddForm && (
                <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, marginBottom: 10 }}>
                    <select
                      value={newItem.schema_type}
                      onChange={e => setNewItem(p => ({ ...p, schema_type: e.target.value }))}
                      style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, color: '#1a1a2e', background: '#ffffff' }}
                    >
                      {SCHEMA_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <input
                      value={newItem.title}
                      onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))}
                      placeholder="標題"
                      style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, color: '#1a1a2e', background: '#ffffff' }}
                    />
                  </div>
                  <textarea
                    value={newItem.content}
                    onChange={e => setNewItem(p => ({ ...p, content: e.target.value }))}
                    placeholder="內容（可以是產品規格、品牌故事、FAQ、政策說明等）"
                    rows={4}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1a1a2e', background: '#ffffff' }}
                  />
                  <button onClick={handleAddItem} disabled={addingItem} style={{ ...btnPrimary, marginTop: 10, fontSize: 12 }}>
                    {addingItem ? '新增中...' : '新增（待審核）'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 近期發文（折疊）──────────────────────────────────────────── */}
      {posts.length > 0 && (
        <div style={card}>
          <button
            onClick={() => setPostsOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: 0 }}
          >
            <div style={{ ...sectionTitle, marginBottom: postsOpen ? 14 : 0, justifyContent: 'space-between' }}>
              <span>📝 近期發文（最新 {posts.length} 篇）</span>
              <span style={{ fontSize: 16, color: '#9ca3af' }}>{postsOpen ? '▲' : '▼'}</span>
            </div>
          </button>
          {postsOpen && posts.map((p, i) => (
            <div key={p.id || i} style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 12, color: '#6b7280' }}>
                <span>{p.published_at?.slice(0, 10)}</span>
                {p.hook_type && <span style={{ background: '#f3f4f6', borderRadius: 4, padding: '1px 6px' }}>{p.hook_type}</span>}
                <span>👍 {p.likes}</span>
                <span>💬 {p.comments}</span>
                <span>👁 {p.reach}</span>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                {p.content.slice(0, 150)}{p.content.length > 150 ? '...' : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 快速上傳（手機顯眼入口）────────────────────────────────────── */}
      <div className="ops-upload-area" style={{ ...card, padding: '16px 18px' }}>
        <div style={{ ...sectionTitle, marginBottom: 12 }}>📤 快速上傳資料</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { icon: '📸', label: '圖片/相片', action: () => imageInputRef.current?.click() },
            { icon: '📄', label: 'PDF/文件', action: () => fileInputRef.current?.click() },
            { icon: '🔗', label: '加入網頁', action: () => { setUrlType('url'); setShowUrlInput(true); document.querySelector('.brand-ai-section')?.scrollIntoView({ behavior: 'smooth' }) } },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '14px 8px', borderRadius: 10,
                border: '1.5px dashed #d1d5db', background: '#f8fafc',
                cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 500,
                minHeight: 72,
              }}
            >
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        {attachment && (
          <div style={{
            marginTop: 10, padding: '8px 12px', background: '#eff6ff',
            borderRadius: 8, fontSize: 12, color: '#1d4ed8', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>📎 {attachment.label}</span>
            <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
          上傳後可在下方 AI 助理對話，問題包括「幫我寫 FAQ」「總結這份菜單」
        </p>
      </div>

      {/* ── 統一 AI 助理 ─────────────────────────────────────────────── */}
      <div className="brand-ai-section" style={{ ...card, marginBottom: 0 }}>
        <div style={sectionTitle}>
          🤖 AI 品牌助理
          <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>
            — 上傳資料 · 分析網站/文章/YouTube · 生成內容 · 問答知識庫
          </span>
        </div>

        {/* 快速提示 */}
        {messages.length === 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>快速開始：</div>
            <div className="ops-chat-hints" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                '分析近期發文表現，哪種 hook 效果最好？',
                '根據商業目標，建議下週發什麼主題？',
                '幫我寫一篇 Facebook 貼文介紹品牌',
                '品牌現在有什麼重要資料？',
              ].map(q => (
                <button key={q} onClick={() => { setChatInput(q); textareaRef.current?.focus() }}
                  style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20,
                    padding: '6px 14px', fontSize: 12, color: '#374151', cursor: 'pointer',
                  }}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {/* 對話歷史 */}
        {messages.length > 0 && (
          <div style={{
            maxHeight: 480, overflowY: 'auto', marginBottom: 16,
            border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 14px',
            background: '#fafafa',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                marginBottom: 14,
                display: 'flex',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                gap: 10,
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: m.role === 'user' ? '#0f4c81' : '#c5a572',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                }}>
                  {m.role === 'user' ? '👤' : '🤖'}
                </div>
                <div style={{ maxWidth: '80%' }}>
                  {m.attachment && (
                    <div style={{
                      fontSize: 11, background: '#eff6ff', border: '1px solid #bfdbfe',
                      borderRadius: 6, padding: '3px 8px', marginBottom: 5, color: '#1d4ed8',
                      display: 'inline-block',
                    }}>
                      📎 {m.attachment.label}
                    </div>
                  )}
                  <div style={{
                    background: m.role === 'user' ? '#0f4c81' : '#fff',
                    color: m.role === 'user' ? '#fff' : '#1a1a2e',
                    borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    padding: '10px 14px',
                    fontSize: 13,
                    lineHeight: 1.7,
                    border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#c5a572', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🤖</div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px 16px 16px 16px', padding: '10px 16px', fontSize: 13, color: '#9ca3af' }}>
                  <span style={{ animation: 'none' }}>⏳ 思考中...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* 附件預覽 */}
        {attachment && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
            padding: '8px 12px',
          }}>
            <span style={{ fontSize: 16 }}>
              {attachment.type === 'website' ? '🌐' : attachment.type === 'url' ? '🔗' : attachment.type === 'image' ? '🖼️' : '📄'}
            </span>
            <span style={{ fontSize: 13, color: '#1d4ed8', flex: 1 }}>{attachment.label}</span>
            <button onClick={() => setAttachment(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, padding: 0 }}>×</button>
          </div>
        )}

        {/* URL 輸入（彈出） */}
        {showUrlInput && (
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '12px 14px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {(['url', 'website'] as const).map(t => (
                <button key={t} onClick={() => setUrlType(t)} style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: 'none',
                  background: urlType === t ? '#0f4c81' : '#f3f4f6',
                  color: urlType === t ? '#fff' : '#374151',
                  fontWeight: urlType === t ? 600 : 400,
                }}>
                  {t === 'url' ? '🔗 單一網頁' : '🌐 整個網站'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlAttach()}
                placeholder={urlType === 'website' ? 'https://example.com/' : 'https://example.com/article'}
                autoFocus
                style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, color: '#1a1a2e', background: '#ffffff' }}
              />
              <button onClick={handleUrlAttach} style={btnPrimary}>確認</button>
              <button onClick={() => setShowUrlInput(false)} style={{ ...btnDanger, padding: '8px 12px' }}>取消</button>
            </div>
          </div>
        )}

        {/* 輸入區 */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {/* 附件按鈕 */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setAttachMenuOpen(o => !o); setShowUrlInput(false) }}
                title="附加檔案、圖片或網址"
                style={{
                  width: 40, height: 40, borderRadius: 10, border: '1px solid #d1d5db',
                  background: attachMenuOpen ? '#eff6ff' : '#f8fafc',
                  color: attachMenuOpen ? '#0f4c81' : '#6b7280',
                  cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >📎</button>

              {/* Attach dropdown */}
              {attachMenuOpen && (
                <div style={{
                  position: 'absolute', bottom: '110%', left: 0,
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '6px',
                  minWidth: 200, zIndex: 100,
                }}>
                  {[
                    { icon: '📄', label: 'PDF / Word 文件', action: () => { fileInputRef.current?.click(); setAttachMenuOpen(false) } },
                    { icon: '🖼️', label: '圖片', action: () => { imageInputRef.current?.click(); setAttachMenuOpen(false) } },
                    { icon: '🔗', label: '單一網頁 / 文章', action: () => { setUrlType('url'); setShowUrlInput(true); setAttachMenuOpen(false) } },
                    { icon: '🌐', label: '整個網站（爬取所有頁）', action: () => { setUrlType('website'); setShowUrlInput(true); setAttachMenuOpen(false) } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', background: 'none', border: 'none',
                      padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                      fontSize: 13, color: '#374151', textAlign: 'left',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hidden file inputs */}
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files)} />
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files)} />

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder={attachment ? '說明你想怎麼用這個素材（或直接送出讓 AI 分析）' : `問 ${brandName} 的 AI 助理，或點 📎 附加檔案/網址/圖片`}
              rows={2}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                border: '1px solid #d1d5db', fontSize: 13,
                resize: 'none', fontFamily: 'inherit', lineHeight: 1.6,
                outline: 'none', color: '#1a1a2e', background: '#ffffff',
              }}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={chatLoading || (!chatInput.trim() && !attachment)}
              style={{
                ...btnPrimary, width: 40, height: 40, padding: 0,
                borderRadius: 10, fontSize: 18, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                opacity: chatLoading || (!chatInput.trim() && !attachment) ? 0.4 : 1,
              }}
            >➤</button>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, paddingLeft: 48 }}>
            Enter 發送 · Shift+Enter 換行 · 📎 附加 PDF / 圖片 / 網址 / 整個網站
          </div>
        </div>
      </div>

    </div>
  )
}
