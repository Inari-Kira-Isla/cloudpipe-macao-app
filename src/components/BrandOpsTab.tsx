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

interface AssetItem {
  id: string
  asset_type: string
  asset_subtype: string | null
  original_filename: string | null
  file_size: number | null
  parse_status: string
  review_status: string
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

const IMAGE_SUBTYPES = [
  { value: 'product_photo', label: '產品照' },
  { value: 'logo',          label: 'Logo' },
  { value: 'menu_scan',     label: '菜單/目錄掃描' },
  { value: 'catalog',       label: '產品目錄' },
  { value: 'business_card', label: '名片' },
  { value: 'scene_photo',   label: '場景/環境照' },
  { value: 'certificate',   label: '認證/獎狀' },
  { value: 'other',         label: '其他' },
]

const PARSE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  queued:        { label: '排隊中', color: '#9ca3af' },
  parsing:       { label: '解析中', color: '#f59e0b' },
  parsed:        { label: '✅ 已解析', color: '#10b981' },
  failed:        { label: '❌ 失敗', color: '#ef4444' },
  manual_review: { label: '⚠️ 需人工審核', color: '#f59e0b' },
}

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

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface InspireSuggestion {
  type: string
  title: string
  why: string
  outline: string[]
  draft: string
  cta?: string
}

const INSPIRE_OUTPUT_TYPES = [
  { value: 'insight',    label: '📖 品牌 Insight 文章' },
  { value: 'fb_post',   label: '📘 Facebook 文案' },
  { value: 'ig_caption', label: '📸 Instagram Caption' },
  { value: 'threads',   label: '🧵 Threads 短文' },
  { value: 'blog',      label: '✍️ 品牌部落格' },
  { value: 'faq',       label: '❓ FAQ 問答組' },
]

const INSPIRE_TYPE_ICONS: Record<string, string> = {
  insight: '📖', fb_post: '📘', ig_caption: '📸',
  threads: '🧵', blog: '✍️', faq: '❓',
}

export default function BrandOpsTab({ slug, brandName }: BrandOpsTabProps) {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [posts, setPosts] = useState<PostCache[]>([])
  const [plan, setPlan] = useState<ContentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const [fileUploadMsg, setFileUploadMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedSubtype, setSelectedSubtype] = useState('other')
  const [newItem, setNewItem] = useState({ schema_type: 'news_update', title: '', content: '' })
  const [goalInput, setGoalInput] = useState('')
  const [focusInput, setFocusInput] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [websiteSubmitting, setWebsiteSubmitting] = useState(false)
  const [websiteMsg, setWebsiteMsg] = useState('')
  // Inspire Panel
  const [inspireContentType, setInspireContentType] = useState<'url' | 'youtube' | 'image' | 'text'>('url')
  const [inspireUrl, setInspireUrl] = useState('')
  const [inspireDescription, setInspireDescription] = useState('')
  const [inspireGoals, setInspireGoals] = useState<string[]>(['insight', 'fb_post'])
  const [inspireImage, setInspireImage] = useState<{ base64: string; mime: string; name: string } | null>(null)
  const [inspireLoading, setInspireLoading] = useState(false)
  const [inspireSuggestions, setInspireSuggestions] = useState<InspireSuggestion[]>([])
  const [inspireCopied, setInspireCopied] = useState<string | null>(null)
  const [inspireError, setInspireError] = useState('')
  const inspireImageRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [kRes, pRes, plRes, aRes] = await Promise.all([
        fetch(`/api/v1/brand-ops?slug=${slug}&action=knowledge`),
        fetch(`/api/v1/brand-ops?slug=${slug}&action=posts`),
        fetch(`/api/v1/brand-ops?slug=${slug}&action=plan`),
        fetch(`/api/v1/brand-ops/upload?slug=${slug}`),
      ])
      const [k, p, pl, a] = await Promise.all([kRes.json(), pRes.json(), plRes.json(), aRes.json()])
      setKnowledge(k.items || [])
      setPosts(p.posts || [])
      setAssets(a.assets || [])
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/v1/brand-ops/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, messages: newMessages }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `錯誤：${data.error || '未知錯誤'}` }])
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '網絡錯誤，請重試。' }])
    } finally {
      setChatLoading(false)
    }
  }

  async function handleUpload() {
    if (!newItem.title.trim() || !newItem.content.trim()) return
    setUploading(true)
    try {
      await fetch('/api/v1/brand-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', slug, category: newItem.schema_type, ...newItem }),
      })
      setNewItem({ schema_type: 'news_update', title: '', content: '' })
      setShowForm(false)
      await fetchAll()
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileUploading(true)
    setFileUploadMsg('')
    const results: string[] = []
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('slug', slug)
        fd.append('asset_subtype', selectedSubtype)
        const res = await fetch('/api/v1/brand-ops/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) {
          results.push(data.duplicate ? `${file.name}（已存在）` : `✅ ${file.name}`)
        } else {
          results.push(`❌ ${file.name}: ${data.error}`)
        }
      } catch {
        results.push(`❌ ${file.name}: 上傳失敗`)
      }
    }
    setFileUploadMsg(results.join(' | '))
    setFileUploading(false)
    await fetchAll()
  }

  async function handleWebsiteAnalysis() {
    const url = websiteUrl.trim()
    if (!url) return
    setWebsiteSubmitting(true)
    setWebsiteMsg('')
    try {
      const fd = new FormData()
      fd.append('slug', slug)
      fd.append('source_url', url)
      fd.append('is_website', 'true')
      const res = await fetch('/api/v1/brand-ops/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setWebsiteMsg(`✅ ${data.message}`)
        setWebsiteUrl('')
        await fetchAll()
      } else {
        setWebsiteMsg(`❌ ${data.error}`)
      }
    } catch {
      setWebsiteMsg('❌ 提交失敗，請重試')
    } finally {
      setWebsiteSubmitting(false)
    }
  }

  function toggleInspireGoal(g: string) {
    setInspireGoals(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  async function handleInspireImageSelect(files: FileList | null) {
    if (!files?.[0]) return
    const file = files[0]
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setInspireImage({ base64, mime: file.type, name: file.name })
    }
    reader.readAsDataURL(file)
  }

  async function handleInspireAnalyze() {
    if (inspireLoading) return
    if (inspireContentType !== 'text' && !inspireUrl && !inspireImage) {
      setInspireError('請輸入網址或上傳圖片')
      return
    }
    if (!inspireDescription.trim() && inspireContentType === 'text') {
      setInspireError('請輸入說明文字')
      return
    }
    if (inspireGoals.length === 0) {
      setInspireError('請選擇至少一種輸出類型')
      return
    }

    setInspireLoading(true)
    setInspireError('')
    setInspireSuggestions([])

    try {
      const payload: Record<string, unknown> = {
        slug,
        content_type: inspireContentType,
        description: inspireDescription,
        output_goals: inspireGoals,
      }
      if (inspireContentType === 'image' && inspireImage) {
        payload.image_base64 = inspireImage.base64
        payload.image_mime = inspireImage.mime
      } else if (inspireUrl) {
        payload.url = inspireUrl
      }

      const res = await fetch('/api/v1/brand-ops/inspire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.error) {
        setInspireError(data.error)
      } else {
        setInspireSuggestions(data.suggestions ?? [])
      }
    } catch {
      setInspireError('分析失敗，請重試')
    } finally {
      setInspireLoading(false)
    }
  }

  async function copyToClipboard(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setInspireCopied(key)
    setTimeout(() => setInspireCopied(null), 2000)
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

      {/* 📂 檔案上傳 */}
      <div style={card}>
        <div style={sectionTitle}>📂 上傳品牌資料（PDF / 圖片 / 文件）</div>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          支援 PDF、JPG/PNG/WebP、CSV、Word 文件（最大 20MB）。AI 自動解析成結構化知識條目，由你審核後啟用。
        </p>

        {/* Subtype 選擇（圖片用） */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#6b7280', lineHeight: '28px' }}>圖片類型：</span>
          {IMAGE_SUBTYPES.map(s => (
            <button key={s.value} onClick={() => setSelectedSubtype(s.value)} style={{
              padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
              background: selectedSubtype === s.value ? '#0f4c81' : '#f3f4f6',
              color: selectedSubtype === s.value ? '#fff' : '#374151',
              border: 'none', fontWeight: selectedSubtype === s.value ? 600 : 400,
            }}>{s.label}</button>
          ))}
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#0f4c81' : '#d1d5db'}`,
            borderRadius: 10, padding: '32px 16px', textAlign: 'center',
            background: dragOver ? '#eff6ff' : '#fafafa',
            cursor: 'pointer', transition: 'all 0.2s',
            marginBottom: 12,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv,.xlsx,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => handleFileUpload(e.target.files)}
          />
          {fileUploading ? (
            <div style={{ color: '#0f4c81', fontWeight: 600 }}>上傳中...</div>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>拖放檔案到這裡，或點擊選擇</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>PDF · 圖片 · Word · CSV · 最大 20MB</div>
            </>
          )}
        </div>

        {fileUploadMsg && (
          <div style={{ fontSize: 13, color: '#374151', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            {fileUploadMsg}
          </div>
        )}

        {/* 已上傳檔案列表 */}
        {assets.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>已上傳 ({assets.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {assets.map(a => {
                const st = PARSE_STATUS_LABELS[a.parse_status] || { label: a.parse_status, color: '#9ca3af' }
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#f8fafc', borderRadius: 6, padding: '8px 12px',
                    fontSize: 13,
                  }}>
                    <span style={{ fontSize: 18 }}>
                      {a.asset_type === 'pdf' ? '📄' : a.asset_type === 'image' ? '🖼️' : a.asset_type === 'spreadsheet' ? '📊' : a.asset_type === 'website' ? '🌐' : a.asset_type === 'url' ? '🔗' : '📝'}
                    </span>
                    <span style={{ flex: 1, color: '#1a1a2e', fontWeight: 500 }}>
                      {a.original_filename || '未命名'}
                      {a.asset_subtype && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>({a.asset_subtype})</span>}
                    </span>
                    {a.file_size && (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {(a.file_size / 1024).toFixed(0)}KB
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 🌐 網站分析 */}
      <div style={card}>
        <div style={sectionTitle}>🌐 分析品牌網站</div>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          輸入品牌網站網址，AI 會自動爬取所有頁面（最多10頁），提取產品、服務、品牌故事等結構化知識。
          靜態網站（GitHub Pages / Webflow）效果最佳。
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleWebsiteAnalysis()}
            placeholder="https://example.com/brand/"
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8,
              border: '1px solid #d1d5db', fontSize: 14,
            }}
          />
          <button
            onClick={handleWebsiteAnalysis}
            disabled={websiteSubmitting || !websiteUrl.trim()}
            style={{
              ...btnPrimary,
              opacity: websiteSubmitting || !websiteUrl.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {websiteSubmitting ? '提交中...' : '🔍 分析整個網站'}
          </button>
        </div>
        {websiteMsg && (
          <div style={{
            fontSize: 13, borderRadius: 8, padding: '8px 12px',
            background: websiteMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${websiteMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
            color: websiteMsg.startsWith('✅') ? '#15803d' : '#dc2626',
          }}>
            {websiteMsg}
          </div>
        )}
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
          💡 稻荷網站：https://inari-kira-isla.github.io/inari-global-foods/
        </p>
      </div>

      {/* 品牌資料庫 */}
      <div style={card}>
        <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
          <span>📚 品牌知識庫</span>
          <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
            {showForm ? '取消' : '+ 手動新增'}
          </button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div style={{
            background: '#f8fafc', borderRadius: 8, padding: 16,
            border: '1px solid #e2e8f0', marginBottom: 16,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  知識類型
                </label>
                <select
                  value={newItem.schema_type}
                  onChange={e => setNewItem(p => ({ ...p, schema_type: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                >
                  {SCHEMA_TYPES.map(c => (
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
                  placeholder="例：北海道海膽進貨標準 2026"
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
                placeholder="填入品牌資料、產品介紹、政策、常見問答等..."
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
                    [{SCHEMA_TYPES.find(s => s.value === (item.schema_type || item.category))?.label || item.schema_type || item.category}] {item.title}
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
                {SCHEMA_TYPES.find(s => s.value === (item.schema_type || item.category))?.label || item.schema_type || item.category}
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

      {/* 💡 內容靈感分析器 */}
      <div style={card}>
        <div style={sectionTitle}>
          💡 內容靈感分析器
          <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>
            — 貼入文章/YouTube/圖片，AI 結合品牌知識庫生成可用內容
          </span>
        </div>

        {/* 素材類型選擇 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {([
            { v: 'url', label: '🔗 文章/網頁' },
            { v: 'youtube', label: '▶️ YouTube' },
            { v: 'image', label: '🖼️ 圖片' },
            { v: 'text', label: '✏️ 文字說明' },
          ] as const).map(({ v, label }) => (
            <button key={v} onClick={() => { setInspireContentType(v); setInspireUrl(''); setInspireImage(null) }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: 'none',
                background: inspireContentType === v ? '#0f4c81' : '#f3f4f6',
                color: inspireContentType === v ? '#fff' : '#374151',
                fontWeight: inspireContentType === v ? 600 : 400,
              }}>{label}</button>
          ))}
        </div>

        {/* URL / YouTube 輸入 */}
        {(inspireContentType === 'url' || inspireContentType === 'youtube') && (
          <input
            value={inspireUrl}
            onChange={e => setInspireUrl(e.target.value)}
            placeholder={inspireContentType === 'youtube'
              ? 'https://www.youtube.com/watch?v=...'
              : 'https://example.com/article/...'}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid #d1d5db', fontSize: 14, marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />
        )}

        {/* 圖片上傳 */}
        {inspireContentType === 'image' && (
          <div style={{ marginBottom: 10 }}>
            <input
              ref={inspireImageRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleInspireImageSelect(e.target.files)}
            />
            {inspireImage ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', border: '1px solid #bbf7d0',
              }}>
                <span style={{ fontSize: 20 }}>🖼️</span>
                <span style={{ fontSize: 13, color: '#15803d', flex: 1 }}>{inspireImage.name}</span>
                <button onClick={() => setInspireImage(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>×</button>
              </div>
            ) : (
              <div
                onClick={() => inspireImageRef.current?.click()}
                style={{
                  border: '2px dashed #d1d5db', borderRadius: 8, padding: '20px',
                  textAlign: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 13,
                }}
              >
                📁 點擊上傳圖片（JPG / PNG / WebP）
              </div>
            )}
          </div>
        )}

        {/* 說明文字 */}
        <textarea
          value={inspireDescription}
          onChange={e => setInspireDescription(e.target.value)}
          placeholder={
            inspireContentType === 'image'
              ? '描述圖片內容及用途（例：這是我們在北海道供應商的漁場現場照，想做品牌溯源推廣）'
              : inspireContentType === 'youtube'
              ? '補充說明（例：這是競品的宣傳影片，想了解他們如何包裝賣點）'
              : inspireContentType === 'text'
              ? '輸入任何文字說明，例如：最近大閘蟹季節到了，品牌想推北海道毛蟹作高端替代選擇...'
              : '補充說明（可選）：想用此素材達到什麼效果？'
          }
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical',
            marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />

        {/* 輸出類型選擇 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>選擇輸出類型（可多選）：</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INSPIRE_OUTPUT_TYPES.map(t => (
              <button key={t.value} onClick={() => toggleInspireGoal(t.value)}
                style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: 'none',
                  background: inspireGoals.includes(t.value) ? '#c5a572' : '#f3f4f6',
                  color: inspireGoals.includes(t.value) ? '#fff' : '#374151',
                  fontWeight: inspireGoals.includes(t.value) ? 600 : 400,
                }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* 分析按鈕 */}
        <button
          onClick={handleInspireAnalyze}
          disabled={inspireLoading || inspireGoals.length === 0}
          style={{
            ...btnPrimary, padding: '10px 24px', fontSize: 14,
            opacity: inspireLoading || inspireGoals.length === 0 ? 0.5 : 1,
          }}
        >
          {inspireLoading ? '⏳ AI 分析中（約15-30秒）...' : '✨ 開始分析，生成內容建議'}
        </button>

        {inspireError && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#dc2626', background: '#fef2f2', borderRadius: 8, padding: '8px 12px' }}>
            ❌ {inspireError}
          </div>
        )}

        {/* 結果卡片 */}
        {inspireSuggestions.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
              ✅ 已生成 {inspireSuggestions.length} 個內容建議
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {inspireSuggestions.map((s, i) => (
                <div key={i} style={{
                  background: '#fafafa', borderRadius: 10, border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}>
                  {/* Card Header */}
                  <div style={{
                    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>{INSPIRE_TYPE_ICONS[s.type] ?? '📝'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.why}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12,
                      background: '#eff6ff', color: '#0f4c81',
                    }}>
                      {INSPIRE_OUTPUT_TYPES.find(t => t.value === s.type)?.label ?? s.type}
                    </span>
                  </div>

                  {/* Outline */}
                  {s.outline?.length > 0 && (
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>大綱</div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                        {s.outline.map((pt, j) => <li key={j}>{pt}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Draft */}
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>草稿</div>
                      <button
                        onClick={() => copyToClipboard(s.draft + (s.cta ? `\n\n${s.cta}` : ''), `draft-${i}`)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db',
                          background: inspireCopied === `draft-${i}` ? '#dcfce7' : '#fff',
                          color: inspireCopied === `draft-${i}` ? '#15803d' : '#374151',
                          fontSize: 12, cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        {inspireCopied === `draft-${i}` ? '✅ 已複製' : '📋 複製草稿'}
                      </button>
                    </div>
                    <div style={{
                      background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0',
                      padding: '12px 14px', fontSize: 13, color: '#374151',
                      lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 300,
                      overflowY: 'auto',
                    }}>
                      {s.draft}
                      {s.cta && <div style={{ marginTop: 12, fontWeight: 600, color: '#0f4c81' }}>{s.cta}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI 顧問 Chatbot */}
      <div style={{ ...card, marginBottom: 0 }}>
        <div style={sectionTitle}>
          🤖 AI 品牌顧問
          <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>
            — 搜尋知識庫・分析數據・提供策略建議
          </span>
        </div>

        {/* 快速提問按鈕 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[
            '分析近期發文表現，哪種 hook 效果最好？',
            '根據商業目標，建議下週發什麼主題？',
            '品牌知識庫有什麼重要資料？',
            '如何提升觸及率？',
          ].map(q => (
            <button key={q} onClick={() => { setChatInput(q) }}
              style={{
                background: '#f0f7ff', color: '#0f4c81', border: '1px solid #bfdbfe',
                borderRadius: 20, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
              }}>
              {q}
            </button>
          ))}
        </div>

        {/* 對話記錄 */}
        <div style={{
          minHeight: 200, maxHeight: 420, overflowY: 'auto',
          background: '#f8fafc', borderRadius: 10, padding: 16,
          border: '1px solid #e2e8f0', marginBottom: 12,
        }}>
          {chatMessages.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
              向 AI 顧問提問，或點擊上方快速問題開始對話
            </p>
          ) : (
            chatMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}>
                <div style={{
                  maxWidth: '80%',
                  background: msg.role === 'user' ? '#0f4c81' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1a1a2e',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px', fontSize: 13, lineHeight: 1.65,
                  border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px 16px 16px 4px',
                padding: '10px 16px', fontSize: 13, color: '#6b7280',
              }}>
                ⏳ 分析中…
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 輸入欄 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
            placeholder={`問 ${brandName} 的 AI 顧問...`}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 13,
              border: '1px solid #e2e8f0', outline: 'none',
            }}
          />
          <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{
            ...btnPrimary,
            opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
            padding: '10px 20px',
          }}>
            發送
          </button>
          {chatMessages.length > 0 && (
            <button onClick={() => setChatMessages([])} style={{
              background: '#f1f5f9', color: '#6b7280', border: 'none',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, cursor: 'pointer',
            }}>
              清除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
