'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ─── 類型 ─────────────────────────────────────────────────────────────────────
interface Listing {
  id: string; building_name: string | null; district: string | null
  sub_district: string | null; address: string | null; unit: string | null
  listing_type: 'sale' | 'rent' | null; price: number | null
  price_per_sqft: number | null; gross_area_sqft: number | null
  usable_area_sqft: number | null; bedrooms: number | null
  bathrooms: number | null; floor: string | null; has_parking: boolean | null
  condition: string | null; features: string[]; source_agency: string | null
  source_contact: string | null; notes: string | null
  confidence: number | null; added_at: string; source_method: 'upload' | 'chat' | 'manual'
}

interface Client {
  id: string; name: string; phone?: string; whatsapp?: string
  budget_min?: number; budget_max?: number; preferred_districts?: string[]
  preferred_bedrooms?: number[]; listing_type?: string
  urgency?: 'hot' | 'warm' | 'cold'; source?: string; notes?: string
  last_contact_at?: string; next_followup_at?: string; status?: string
  created_at?: string
}

interface VisitPhoto {
  id: string; image_url: string; room_type?: string
  ai_caption?: string; ai_tags?: string[]; is_defect?: boolean
}

interface Visit {
  id: string; listing_ref?: string; client_name?: string
  visit_date: string; duration_minutes?: number; notes?: string
  client_reaction?: string; followup_needed?: boolean; created_at?: string
  property_visit_photos?: VisitPhoto[]
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

// ─── 常數 ─────────────────────────────────────────────────────────────────────
const T = {
  bg: '#08111F', panel: '#0D1B2E', border: 'rgba(255,255,255,0.07)',
  gold: '#F5C842', muted: 'rgba(255,255,255,0.45)', text: 'rgba(255,255,255,0.9)',
  green: '#34D399', red: '#F87171', blue: '#60A5FA', purple: '#A78BFA',
}

const URGENCY_COLOR = { hot: T.red, warm: T.gold, cold: T.blue }
const REACTION_LABEL: Record<string, string> = {
  very_interested: '🔥 非常感興趣', considering: '🤔 考慮中',
  not_interested: '❌ 不感興趣', offer_ready: '💰 準備出價',
}
const ROOM_LABEL: Record<string, string> = {
  living_room: '客廳', bedroom: '睡房', master_bedroom: '主人房',
  kitchen: '廚房', bathroom: '浴室', balcony: '露台',
  view: '景觀', facade: '外牆', parking: '車位', defect: '⚠️瑕疵', other: '其他',
}

// ─── 工具 ─────────────────────────────────────────────────────────────────────
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function toCSV(listings: Listing[]): string {
  const h = ['大廈','地區','類型','叫價(萬)','呎價','面積','房','樓層','裝修','信心','錄入']
  const rows = listings.map(l => [
    l.building_name ?? '', l.district ?? '',
    l.listing_type === 'sale' ? '買賣' : l.listing_type === 'rent' ? '租賃' : '',
    l.price ?? '', l.price_per_sqft ?? '', l.gross_area_sqft ?? '',
    l.bedrooms ?? '', l.floor ?? '', l.condition ?? '',
    l.confidence != null ? Math.round(l.confidence * 100) + '%' : '',
    l.source_method,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`))
  return [h.map(x => `"${x}"`).join(','), ...rows.map(r => r.join(','))].join('\n')
}

function toWhatsApp(l: Listing): string {
  const t = l.listing_type === 'sale' ? '出售' : l.listing_type === 'rent' ? '出租' : ''
  return `🏢 *${l.building_name || '澳門樓盤'} ${t}*
📍 ${[l.district, l.sub_district].filter(Boolean).join(' ')}${l.unit ? `  ${l.unit}` : ''}
💰 ${l.price ? `MOP ${l.price}萬` : '價格待議'}${l.price_per_sqft ? `（呎價 ${l.price_per_sqft}）` : ''}
📐 ${l.gross_area_sqft ? `${l.gross_area_sqft}呎` : '-'}  ${[l.bedrooms && `${l.bedrooms}房`, l.has_parking === true && '有車位'].filter(Boolean).join(' ')}
${(l.features || []).slice(0, 3).join('・')}`.trim()
}

function btnS(bg: string, color: string, extra?: React.CSSProperties): React.CSSProperties {
  return { padding: '7px 14px', background: bg, border: `1px solid ${color}40`, borderRadius: 8, color, fontSize: 13, cursor: 'pointer', ...extra }
}
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 5px', color: T.text }
const inputS: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: 13, width: '100%', boxSizing: 'border-box' }

// ─── 主頁面 ───────────────────────────────────────────────────────────────────
export default function PropertyDemoPage() {
  const [mainTab, setMainTab] = useState<'listings' | 'clients' | 'visits'>('listings')

  // 盤源
  const [listings, setListings] = useState<Listing[]>([])
  const [inputTab, setInputTab] = useState<'upload' | 'chat'>('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([{ role: 'assistant', content: '你好！請描述要記錄的樓盤資料，我幫你整理入庫。' }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editId, setEditId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // 客戶
  const [clients, setClients] = useState<Client[]>([])
  const [clientLoading, setClientLoading] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [clientForm, setClientForm] = useState<Partial<Client>>({ urgency: 'warm', listing_type: 'sale', status: 'active' })
  const [editClientId, setEditClientId] = useState<string | null>(null)

  // 睇樓
  const [visits, setVisits] = useState<Visit[]>([])
  const [visitLoading, setVisitLoading] = useState(false)
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [visitForm, setVisitForm] = useState<Partial<Visit>>({ client_reaction: 'considering', followup_needed: true })
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  const fileRef    = useRef<HTMLInputElement>(null)
  const pasteRef   = useRef<HTMLTextAreaElement>(null)
  const chatRef    = useRef<HTMLDivElement>(null)
  const photoRef   = useRef<HTMLInputElement>(null)

  // localStorage for listings
  useEffect(() => {
    const s = localStorage.getItem('cp_property_listings')
    if (s) try { setListings(JSON.parse(s)) } catch {}
  }, [])
  useEffect(() => { localStorage.setItem('cp_property_listings', JSON.stringify(listings)) }, [listings])

  // 聊天捲底
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }) }, [chatMsgs])

  // ── 載入 clients / visits ──────────────────────────────────────────────────
  const loadClients = useCallback(async () => {
    setClientLoading(true)
    const r = await fetch('/api/property/clients').then(r => r.json()).catch(() => ({ data: [] }))
    setClients(r.data || [])
    setClientLoading(false)
  }, [])

  const loadVisits = useCallback(async () => {
    setVisitLoading(true)
    const r = await fetch('/api/property/visits').then(r => r.json()).catch(() => ({ data: [] }))
    setVisits(r.data || [])
    setVisitLoading(false)
  }, [])

  useEffect(() => { if (mainTab === 'clients') loadClients() }, [mainTab, loadClients])
  useEffect(() => { if (mainTab === 'visits') loadVisits() }, [mainTab, loadVisits])

  // ── 盤源新增 ──────────────────────────────────────────────────────────────
  const addListing = useCallback((data: Record<string, unknown>, method: Listing['source_method']) => {
    const l: Listing = {
      id: newId(), building_name: (data.building_name as string) || null,
      district: (data.district as string) || null, sub_district: (data.sub_district as string) || null,
      address: (data.address as string) || null, unit: (data.unit as string) || null,
      listing_type: (data.listing_type as 'sale' | 'rent') || null, price: (data.price as number) || null,
      price_per_sqft: (data.price_per_sqft as number) || null, gross_area_sqft: (data.gross_area_sqft as number) || null,
      usable_area_sqft: (data.usable_area_sqft as number) || null, bedrooms: (data.bedrooms as number) || null,
      bathrooms: (data.bathrooms as number) || null, floor: (data.floor as string) || null,
      has_parking: data.has_parking != null ? Boolean(data.has_parking) : null,
      condition: (data.condition as string) || null, features: Array.isArray(data.features) ? data.features : [],
      source_agency: (data.source_agency as string) || null, source_contact: (data.source_contact as string) || null,
      notes: (data.notes as string) || null, confidence: (data.confidence as number) || null,
      added_at: new Date().toISOString(), source_method: method,
    }
    setListings(prev => [l, ...prev])
  }, [])

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    setUploading(true); setUploadMsg(`分析 ${arr.length} 張圖片...`)
    let done = 0
    for (const file of arr) {
      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(file)
        })
        const resp = await fetch('/api/property/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, mimeType: file.type }) })
        const json = await resp.json()
        if (json.ok && json.data) { addListing(json.data, 'upload'); done++ }
      } catch {}
    }
    setUploadMsg(`✅ 入庫 ${done} 條`); setUploading(false)
    setTimeout(() => setUploadMsg(''), 3000)
  }

  async function handlePasteExtract() {
    const text = pasteRef.current?.value?.trim(); if (!text) return
    setUploading(true); setUploadMsg('分析中...')
    try {
      const resp = await fetch('/api/property/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const json = await resp.json()
      if (json.ok && json.data) { addListing(json.data, 'upload'); setUploadMsg('✅ 已入庫'); if (pasteRef.current) pasteRef.current.value = '' }
      else setUploadMsg('❌ 提取失敗')
    } catch { setUploadMsg('❌ 網路錯誤') }
    setUploading(false); setTimeout(() => setUploadMsg(''), 3000)
  }

  async function sendChat() {
    const msg = chatInput.trim(); if (!msg || chatLoading) return
    const newMsgs: ChatMsg[] = [...chatMsgs, { role: 'user', content: msg }]
    setChatMsgs(newMsgs); setChatInput(''); setChatLoading(true)
    try {
      const resp = await fetch('/api/property/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMsgs.slice(-10) }) })
      const json = await resp.json()
      setChatMsgs(prev => [...prev, { role: 'assistant', content: json.reply || '請重試。' }])
      if (json.extracted) { addListing(json.extracted, 'chat'); setChatMsgs(prev => [...prev, { role: 'assistant', content: '✅ 已入庫！可在盤源管理查看。' }]) }
    } catch { setChatMsgs(prev => [...prev, { role: 'assistant', content: '網路錯誤，請重試。' }]) }
    setChatLoading(false)
  }

  // ── 客戶 CRUD ──────────────────────────────────────────────────────────────
  async function saveClient() {
    if (!clientForm.name?.trim()) return
    const method = editClientId ? 'PATCH' : 'POST'
    const body   = editClientId ? { id: editClientId, ...clientForm } : clientForm
    const r      = await fetch('/api/property/clients', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
    if (r.ok) { await loadClients(); setShowClientForm(false); setClientForm({ urgency: 'warm', listing_type: 'sale', status: 'active' }); setEditClientId(null) }
  }

  async function deleteClient(id: string) {
    if (!confirm('確定刪除此客戶？')) return
    await fetch('/api/property/clients', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadClients()
  }

  async function updateClientField(id: string, field: string, value: unknown) {
    await fetch('/api/property/clients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, [field]: value }) })
    await loadClients()
  }

  // ── 睇樓 CRUD ──────────────────────────────────────────────────────────────
  async function saveVisit() {
    if (!visitForm.visit_date) visitForm.visit_date = new Date().toISOString()
    const r = await fetch('/api/property/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(visitForm) }).then(r => r.json())
    if (r.ok) { await loadVisits(); setShowVisitForm(false); setVisitForm({ client_reaction: 'considering', followup_needed: true }); setActiveVisit(r.data) }
  }

  async function deleteVisit(id: string) {
    if (!confirm('確定刪除此睇樓記錄？')) return
    await fetch('/api/property/visits', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadVisits(); if (activeVisit?.id === id) setActiveVisit(null)
  }

  async function uploadVisitPhoto(files: FileList, visitId: string) {
    setPhotoUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append('file', file); fd.append('visit_id', visitId)
      await fetch('/api/property/upload', { method: 'POST', body: fd })
    }
    await loadVisits()
    const updated = visits.find(v => v.id === visitId)
    if (updated) {
      const r = await fetch('/api/property/visits').then(r => r.json())
      const fresh = (r.data || []).find((v: Visit) => v.id === visitId)
      if (fresh) setActiveVisit(fresh)
    }
    setPhotoUploading(false)
  }

  function exportCSV() {
    const target = selected.size > 0 ? listings.filter(l => selected.has(l.id)) : listings
    const blob = new Blob(['\uFEFF' + toCSV(target)], { type: 'text/csv;charset=utf-8;' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `盤源_${new Date().toLocaleDateString('zh-HK').replace(/\//g, '-')}.csv` })
    a.click()
  }

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: T.gold }}>🏢 澳門地產盤源管理</span>
          <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(245,200,66,0.12)', border: `1px solid ${T.gold}40`, borderRadius: 10, color: T.gold }}>DEMO</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {mainTab === 'listings' && <button onClick={exportCSV} style={btnS('#1e3a5f', T.blue)}>⬇ CSV{selected.size > 0 ? ` (${selected.size})` : ''}</button>}
          {mainTab === 'clients' && <button onClick={() => { setClientForm({ urgency: 'warm', listing_type: 'sale', status: 'active' }); setEditClientId(null); setShowClientForm(true) }} style={btnS('rgba(52,211,153,0.12)', T.green)}>+ 新增客戶</button>}
          {mainTab === 'visits'  && <button onClick={() => { setVisitForm({ client_reaction: 'considering', followup_needed: true }); setShowVisitForm(true) }} style={btnS('rgba(167,139,250,0.12)', T.purple)}>+ 新增睇樓</button>}
        </div>
      </div>

      {/* 主 Tab */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, padding: '0 24px' }}>
        {([['listings', '🏢 盤源管理'], ['clients', '👤 客戶跟進'], ['visits', '📸 睇樓記錄']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setMainTab(key)} style={{
            padding: '11px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14,
            color: mainTab === key ? T.gold : T.muted, fontWeight: mainTab === key ? 700 : 400,
            borderBottom: mainTab === key ? `2px solid ${T.gold}` : '2px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      {/* ══ 盤源管理 ══════════════════════════════════════════════════════════ */}
      {mainTab === 'listings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', height: 'calc(100vh - 109px)', overflow: 'hidden' }}>

          {/* 左：輸入 */}
          <div style={{ borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
              {(['upload', 'chat'] as const).map(t => (
                <button key={t} onClick={() => setInputTab(t)} style={{
                  flex: 1, padding: '11px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
                  color: inputTab === t ? T.gold : T.muted, fontWeight: inputTab === t ? 700 : 400,
                  borderBottom: inputTab === t ? `2px solid ${T.gold}` : '2px solid transparent',
                }}>{t === 'upload' ? '📸 截圖上傳' : '💬 對話輸入'}</button>
              ))}
            </div>

            {inputTab === 'upload' && (
              <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                <div onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }} onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${T.border}`, borderRadius: 12, padding: 28, textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{uploading ? '⏳' : '📷'}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{uploading ? uploadMsg : '拖入或點擊上傳截圖'}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>JPG / PNG / WebP，可多張</div>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files && handleFiles(e.target.files)} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>或貼上文字</div>
                  <textarea ref={pasteRef} rows={5} placeholder="貼上 WhatsApp 轉發盤源文字..." style={{ ...inputS, resize: 'vertical' }} />
                  <button onClick={handlePasteExtract} disabled={uploading} style={{ ...btnS('rgba(52,211,153,0.1)', T.green, { width: '100%', marginTop: 8 }) }}>🤖 AI 提取入庫</button>
                </div>
                {uploadMsg && !uploading && <div style={{ fontSize: 13, color: uploadMsg.startsWith('✅') ? T.green : T.red, textAlign: 'center' }}>{uploadMsg}</div>}
              </div>
            )}

            {inputTab === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatMsgs.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '85%', padding: '9px 13px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: m.role === 'user' ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${m.role === 'user' ? 'rgba(245,200,66,0.25)' : T.border}` }}>{m.content}</div>
                    </div>
                  ))}
                  {chatLoading && <div style={{ alignSelf: 'flex-start', padding: '9px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, fontSize: 13, color: T.muted }}>⏳</div>}
                </div>
                <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
                  <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }} placeholder="例：氹仔3房700呎580萬" rows={2} style={{ flex: 1, ...inputS, resize: 'none' }} />
                  <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={btnS('rgba(245,200,66,0.12)', T.gold, { alignSelf: 'stretch', padding: '0 14px' })}>發送</button>
                </div>
              </div>
            )}
          </div>

          {/* 右：表格 */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '9px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: T.muted }}>共 {listings.length} 條</span>
              {selected.size > 0 && <span style={{ fontSize: 13, color: T.gold }}>已選 {selected.size}</span>}
              {listings.length > 0 && <button onClick={() => { if (confirm('清除全部？')) { setListings([]); setSelected(new Set()) } }} style={btnS('#2a1010', T.red, { marginLeft: 'auto' })}>🗑 清除</button>}
            </div>
            {listings.length === 0
              ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, flexDirection: 'column', gap: 10 }}><div style={{ fontSize: 40 }}>📋</div><div>從左側上傳截圖或對話輸入開始</div></div>
              : (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, background: T.panel, zIndex: 1 }}>
                      <tr>{[['', 36], ['大廈', 140], ['地區', 90], ['類型', 60], ['叫價(萬)', 90, true], ['呎價', 80, true], ['面積(呎)', 80, true], ['房', 40], ['信心', 60], ['操作', 100]].map(([h, w, r]) => (
                        <th key={String(h)} style={{ padding: '9px 8px', textAlign: r ? 'right' : 'left', fontWeight: 600, fontSize: 12, color: T.muted, width: Number(w) }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {listings.map((l, idx) => (
                        <tr key={l.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)', borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '7px 8px', width: 36 }}><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                          <td style={{ padding: '7px 8px', width: 140 }}>
                            {editId === l.id
                              ? <input defaultValue={l.building_name ?? ''} onBlur={e => { setListings(p => p.map(x => x.id === l.id ? { ...x, building_name: e.target.value } : x)); setEditId(null) }} style={{ background: 'rgba(255,255,255,0.1)', border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 6px', color: T.text, fontSize: 13, width: 130 }} autoFocus />
                              : <span style={{ cursor: 'pointer' }} onClick={() => setEditId(l.id)}>{l.building_name || <em style={{ color: T.muted }}>點擊編輯</em>}</span>}
                          </td>
                          <td style={{ padding: '7px 8px', width: 90, fontSize: 12 }}>{l.district || '-'}</td>
                          <td style={{ padding: '7px 8px', width: 60 }}><span style={{ padding: '2px 6px', borderRadius: 8, fontSize: 11, background: l.listing_type === 'sale' ? 'rgba(245,200,66,0.12)' : 'rgba(96,165,250,0.12)', color: l.listing_type === 'sale' ? T.gold : T.blue }}>{l.listing_type === 'sale' ? '買賣' : l.listing_type === 'rent' ? '租賃' : '-'}</span></td>
                          <td style={{ padding: '7px 8px', width: 90, textAlign: 'right' }}>{l.price ? <strong style={{ color: T.gold }}>{l.price}</strong> : '-'}</td>
                          <td style={{ padding: '7px 8px', width: 80, textAlign: 'right' }}>{l.price_per_sqft ?? '-'}</td>
                          <td style={{ padding: '7px 8px', width: 80, textAlign: 'right' }}>{l.gross_area_sqft ?? '-'}</td>
                          <td style={{ padding: '7px 8px', width: 40 }}>{l.bedrooms ?? '-'}</td>
                          <td style={{ padding: '7px 8px', width: 60 }}>{l.confidence != null ? <span style={{ color: l.confidence > 0.8 ? T.green : l.confidence > 0.5 ? T.gold : T.red }}>{Math.round(l.confidence * 100)}%</span> : '-'}</td>
                          <td style={{ padding: '7px 8px', width: 100 }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => { navigator.clipboard.writeText(toWhatsApp(l)); setCopied(l.id); setTimeout(() => setCopied(null), 2000) }} style={iconBtn} title="複製 WhatsApp">{copied === l.id ? '✅' : '📋'}</button>
                              <button onClick={() => setEditId(editId === l.id ? null : l.id)} style={iconBtn} title="編輯">✏️</button>
                              <button onClick={() => setListings(p => p.filter(x => x.id !== l.id))} style={{ ...iconBtn, color: T.red }} title="刪除">🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}

      {/* ══ 客戶跟進 ═══════════════════════════════════════════════════════════ */}
      {mainTab === 'clients' && (
        <div style={{ padding: 24, height: 'calc(100vh - 109px)', overflowY: 'auto' }}>

          {/* 新增/編輯表單 */}
          {showClientForm && (
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, marginBottom: 24, maxWidth: 700 }}>
              <div style={{ fontWeight: 700, marginBottom: 16, color: T.gold }}>{editClientId ? '✏️ 編輯客戶' : '+ 新增客戶'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, color: T.muted }}>姓名 *</label><input value={clientForm.name ?? ''} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} style={{ ...inputS, marginTop: 4 }} placeholder="客戶姓名" /></div>
                <div><label style={{ fontSize: 12, color: T.muted }}>WhatsApp</label><input value={clientForm.whatsapp ?? ''} onChange={e => setClientForm(p => ({ ...p, whatsapp: e.target.value }))} style={{ ...inputS, marginTop: 4 }} placeholder="853XXXXXXXX" /></div>
                <div><label style={{ fontSize: 12, color: T.muted }}>電話</label><input value={clientForm.phone ?? ''} onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))} style={{ ...inputS, marginTop: 4 }} placeholder="電話號碼" /></div>
                <div><label style={{ fontSize: 12, color: T.muted }}>類型</label>
                  <select value={clientForm.listing_type ?? 'sale'} onChange={e => setClientForm(p => ({ ...p, listing_type: e.target.value }))} style={{ ...inputS, marginTop: 4 }}>
                    <option value="sale">買樓</option><option value="rent">租樓</option>
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: T.muted }}>預算下限（萬MOP）</label><input type="number" value={clientForm.budget_min ?? ''} onChange={e => setClientForm(p => ({ ...p, budget_min: Number(e.target.value) }))} style={{ ...inputS, marginTop: 4 }} /></div>
                <div><label style={{ fontSize: 12, color: T.muted }}>預算上限（萬MOP）</label><input type="number" value={clientForm.budget_max ?? ''} onChange={e => setClientForm(p => ({ ...p, budget_max: Number(e.target.value) }))} style={{ ...inputS, marginTop: 4 }} /></div>
                <div><label style={{ fontSize: 12, color: T.muted }}>優先地區（逗號分隔）</label><input value={(clientForm.preferred_districts || []).join('、')} onChange={e => setClientForm(p => ({ ...p, preferred_districts: e.target.value.split(/[,、]/).map(s => s.trim()).filter(Boolean) }))} style={{ ...inputS, marginTop: 4 }} placeholder="例：氹仔、新口岸" /></div>
                <div><label style={{ fontSize: 12, color: T.muted }}>緊急程度</label>
                  <select value={clientForm.urgency ?? 'warm'} onChange={e => setClientForm(p => ({ ...p, urgency: e.target.value as Client['urgency'] }))} style={{ ...inputS, marginTop: 4 }}>
                    <option value="hot">🔥 緊急（本月要定）</option>
                    <option value="warm">🌤 積極（1-3個月）</option>
                    <option value="cold">❄️ 慢慢睇</option>
                  </select>
                </div>
                <div><label style={{ fontSize: 12, color: T.muted }}>下次跟進</label><input type="date" value={clientForm.next_followup_at?.slice(0, 10) ?? ''} onChange={e => setClientForm(p => ({ ...p, next_followup_at: e.target.value }))} style={{ ...inputS, marginTop: 4 }} /></div>
                <div><label style={{ fontSize: 12, color: T.muted }}>來源</label><input value={clientForm.source ?? ''} onChange={e => setClientForm(p => ({ ...p, source: e.target.value }))} style={{ ...inputS, marginTop: 4 }} placeholder="Facebook / 介紹 / 路過" /></div>
              </div>
              <div style={{ marginTop: 12 }}><label style={{ fontSize: 12, color: T.muted }}>備註</label><textarea value={clientForm.notes ?? ''} onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inputS, marginTop: 4, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={saveClient} style={btnS('rgba(52,211,153,0.12)', T.green)}>💾 儲存</button>
                <button onClick={() => { setShowClientForm(false); setEditClientId(null) }} style={btnS('rgba(255,255,255,0.05)', T.muted)}>取消</button>
              </div>
            </div>
          )}

          {/* 客戶列表 */}
          {clientLoading
            ? <div style={{ color: T.muted, padding: 40, textAlign: 'center' }}>載入中...</div>
            : clients.length === 0
              ? <div style={{ color: T.muted, padding: 60, textAlign: 'center', fontSize: 15 }}>👤 還沒有客戶記錄，點右上角「新增客戶」</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                  {clients.map(c => (
                    <div key={c.id} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{c.source || '來源未填'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <span style={{ padding: '3px 9px', borderRadius: 10, fontSize: 11, background: `${URGENCY_COLOR[c.urgency || 'warm']}20`, color: URGENCY_COLOR[c.urgency || 'warm'], border: `1px solid ${URGENCY_COLOR[c.urgency || 'warm']}40` }}>
                            {c.urgency === 'hot' ? '🔥 緊急' : c.urgency === 'cold' ? '❄️ 慢慢睇' : '🌤 積極'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 12 }}>
                        <div><span style={{ color: T.muted }}>類型：</span>{c.listing_type === 'sale' ? '買樓' : '租樓'}</div>
                        <div><span style={{ color: T.muted }}>預算：</span>{c.budget_min || c.budget_max ? `${c.budget_min ?? '?'}-${c.budget_max ?? '?'}萬` : '未填'}</div>
                        {c.phone && <div><span style={{ color: T.muted }}>電話：</span>{c.phone}</div>}
                        {c.whatsapp && <div><span style={{ color: T.muted }}>WA：</span>{c.whatsapp}</div>}
                        {(c.preferred_districts || []).length > 0 && <div style={{ gridColumn: '1/-1' }}><span style={{ color: T.muted }}>偏好：</span>{c.preferred_districts!.join('、')}</div>}
                        {c.next_followup_at && <div style={{ gridColumn: '1/-1' }}><span style={{ color: T.muted }}>下次跟進：</span><span style={{ color: T.gold }}>{new Date(c.next_followup_at).toLocaleDateString('zh-HK')}</span></div>}
                      </div>
                      {c.notes && <div style={{ fontSize: 12, color: T.muted, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10 }}>{c.notes}</div>}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select value={c.status || 'active'} onChange={e => updateClientField(c.id, 'status', e.target.value)} style={{ ...inputS, fontSize: 12, padding: '5px 8px', flex: 1 }}>
                          <option value="active">跟進中</option>
                          <option value="closed_deal">✅ 成交</option>
                          <option value="lost">❌ 流失</option>
                        </select>
                        <button onClick={() => { setClientForm(c); setEditClientId(c.id); setShowClientForm(true) }} style={iconBtn}>✏️</button>
                        <button onClick={() => deleteClient(c.id)} style={{ ...iconBtn, color: T.red }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      )}

      {/* ══ 睇樓記錄 ═══════════════════════════════════════════════════════════ */}
      {mainTab === 'visits' && (
        <div style={{ display: 'grid', gridTemplateColumns: activeVisit ? '1fr 420px' : '1fr', height: 'calc(100vh - 109px)', overflow: 'hidden' }}>

          {/* 左：列表 */}
          <div style={{ padding: 24, overflowY: 'auto', borderRight: activeVisit ? `1px solid ${T.border}` : 'none' }}>

            {/* 新增表單 */}
            {showVisitForm && (
              <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 20, maxWidth: 600 }}>
                <div style={{ fontWeight: 700, marginBottom: 14, color: T.purple }}>+ 新增睇樓記錄</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: T.muted }}>盤源（樓盤名稱）</label><input value={visitForm.listing_ref ?? ''} onChange={e => setVisitForm(p => ({ ...p, listing_ref: e.target.value }))} style={{ ...inputS, marginTop: 4 }} placeholder="例：濠景花園22/F A座" /></div>
                  <div><label style={{ fontSize: 12, color: T.muted }}>客戶名稱</label><input value={visitForm.client_name ?? ''} onChange={e => setVisitForm(p => ({ ...p, client_name: e.target.value }))} style={{ ...inputS, marginTop: 4 }} placeholder="陪同客戶" /></div>
                  <div><label style={{ fontSize: 12, color: T.muted }}>睇樓日期時間</label><input type="datetime-local" value={visitForm.visit_date?.slice(0, 16) ?? new Date().toISOString().slice(0, 16)} onChange={e => setVisitForm(p => ({ ...p, visit_date: e.target.value }))} style={{ ...inputS, marginTop: 4 }} /></div>
                  <div><label style={{ fontSize: 12, color: T.muted }}>歷時（分鐘）</label><input type="number" value={visitForm.duration_minutes ?? ''} onChange={e => setVisitForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} style={{ ...inputS, marginTop: 4 }} /></div>
                  <div><label style={{ fontSize: 12, color: T.muted }}>客戶反應</label>
                    <select value={visitForm.client_reaction ?? 'considering'} onChange={e => setVisitForm(p => ({ ...p, client_reaction: e.target.value }))} style={{ ...inputS, marginTop: 4 }}>
                      <option value="very_interested">🔥 非常感興趣</option>
                      <option value="considering">🤔 考慮中</option>
                      <option value="not_interested">❌ 不感興趣</option>
                      <option value="offer_ready">💰 準備出價</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                    <input type="checkbox" id="followup" checked={visitForm.followup_needed ?? true} onChange={e => setVisitForm(p => ({ ...p, followup_needed: e.target.checked }))} />
                    <label htmlFor="followup" style={{ fontSize: 13 }}>需要跟進</label>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}><label style={{ fontSize: 12, color: T.muted }}>現場筆記</label><textarea value={visitForm.notes ?? ''} onChange={e => setVisitForm(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...inputS, marginTop: 4, resize: 'vertical' }} placeholder="裝修狀況、景觀、瑕疵、客戶意見..." /></div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={saveVisit} style={btnS('rgba(167,139,250,0.12)', T.purple)}>💾 儲存記錄</button>
                  <button onClick={() => setShowVisitForm(false)} style={btnS('rgba(255,255,255,0.05)', T.muted)}>取消</button>
                </div>
              </div>
            )}

            {/* 睇樓列表 */}
            {visitLoading
              ? <div style={{ color: T.muted, padding: 40, textAlign: 'center' }}>載入中...</div>
              : visits.length === 0
                ? <div style={{ color: T.muted, padding: 60, textAlign: 'center' }}>📸 還沒有睇樓記錄，點右上角「新增睇樓」</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {visits.map(v => (
                      <div key={v.id} onClick={() => setActiveVisit(activeVisit?.id === v.id ? null : v)}
                        style={{ background: T.panel, border: `1px solid ${activeVisit?.id === v.id ? T.purple : T.border}`, borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{v.listing_ref || '（未填盤源）'}</div>
                            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
                              {v.client_name && <span>👤 {v.client_name} · </span>}
                              {new Date(v.visit_date).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {v.duration_minutes && <span> · {v.duration_minutes}分鐘</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {v.client_reaction && <span style={{ fontSize: 12 }}>{REACTION_LABEL[v.client_reaction] || v.client_reaction}</span>}
                            <button onClick={e => { e.stopPropagation(); deleteVisit(v.id) }} style={{ ...iconBtn, color: T.red, fontSize: 14 }}>🗑</button>
                          </div>
                        </div>
                        {v.notes && <div style={{ fontSize: 12, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>{v.notes}</div>}
                        {(v.property_visit_photos || []).length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                            {(v.property_visit_photos || []).slice(0, 5).map(p => (
                              <div key={p.id} style={{ position: 'relative' }}>
                                <img src={p.image_url} alt={p.ai_caption || ''} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: p.is_defect ? `2px solid ${T.red}` : `1px solid ${T.border}` }} />
                                {p.is_defect && <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 10 }}>⚠️</span>}
                              </div>
                            ))}
                            {(v.property_visit_photos || []).length > 5 && <div style={{ width: 64, height: 48, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: T.muted }}>+{(v.property_visit_photos || []).length - 5}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
            }
          </div>

          {/* 右：睇樓詳情 + 圖片上傳 */}
          {activeVisit && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.panel }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: T.purple }}>📸 {activeVisit.listing_ref || '睇樓記錄'}</div>
                <button onClick={() => setActiveVisit(null)} style={iconBtn}>✕</button>
              </div>

              {/* 上傳圖片 */}
              <div style={{ padding: 16, borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>上傳現場圖片（AI 自動分類）</div>
                <div onClick={() => photoRef.current?.click()}
                  style={{ border: `2px dashed ${T.border}`, borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', fontSize: 13 }}>
                  {photoUploading ? '⏳ 上傳中...' : '📷 點擊上傳（可多張）'}
                </div>
                <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => { if (e.target.files && activeVisit) uploadVisitPhoto(e.target.files, activeVisit.id) }} />
              </div>

              {/* 圖片 Grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {(activeVisit.property_visit_photos || []).length === 0
                  ? <div style={{ color: T.muted, textAlign: 'center', paddingTop: 40 }}>還沒有圖片</div>
                  : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {(activeVisit.property_visit_photos || []).map(p => (
                        <div key={p.id} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${p.is_defect ? T.red : T.border}` }}>
                          <img src={p.image_url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                          <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: p.is_defect ? `${T.red}20` : 'rgba(255,255,255,0.06)', color: p.is_defect ? T.red : T.muted }}>
                                {ROOM_LABEL[p.room_type || 'other'] || '其他'}
                              </span>
                              {p.is_defect && <span style={{ fontSize: 11, color: T.red }}>⚠️ 瑕疵</span>}
                            </div>
                            {p.ai_caption && <div style={{ fontSize: 12, color: T.text, marginTop: 5, lineHeight: 1.4 }}>{p.ai_caption}</div>}
                            {(p.ai_tags || []).length > 0 && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                                {p.ai_tags!.map((tag, i) => <span key={i} style={{ fontSize: 11, padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, color: T.muted }}>{tag}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
