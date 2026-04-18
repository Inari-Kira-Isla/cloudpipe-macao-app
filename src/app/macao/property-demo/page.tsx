'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ─── 類型 ────────────────────────────────────────────────────────────────────
interface Listing {
  id: string
  building_name: string | null
  district: string | null
  sub_district: string | null
  address: string | null
  unit: string | null
  listing_type: 'sale' | 'rent' | null
  price: number | null
  price_per_sqft: number | null
  gross_area_sqft: number | null
  usable_area_sqft: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: string | null
  has_parking: boolean | null
  condition: string | null
  features: string[]
  source_agency: string | null
  source_contact: string | null
  notes: string | null
  confidence: number | null
  added_at: string
  source_method: 'upload' | 'chat' | 'manual'
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

// ─── 工具函式 ─────────────────────────────────────────────────────────────────
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function toCSV(listings: Listing[]): string {
  const headers = ['大廈名稱','地區','子區域','地址','單位','類型','叫價(萬MOP)','呎價','建築面積(呎)','實用面積(呎)','房','廁','樓層','車位','裝修','特點','來源代理行','備註','信心','錄入方式','錄入時間']
  const rows = listings.map(l => [
    l.building_name ?? '', l.district ?? '', l.sub_district ?? '', l.address ?? '',
    l.unit ?? '', l.listing_type === 'sale' ? '買賣' : l.listing_type === 'rent' ? '租賃' : '',
    l.price ?? '', l.price_per_sqft ?? '', l.gross_area_sqft ?? '', l.usable_area_sqft ?? '',
    l.bedrooms ?? '', l.bathrooms ?? '', l.floor ?? '',
    l.has_parking == null ? '' : l.has_parking ? '有' : '無',
    l.condition ?? '', (l.features || []).join(' / '), l.source_agency ?? '', l.notes ?? '',
    l.confidence != null ? Math.round(l.confidence * 100) + '%' : '',
    l.source_method === 'upload' ? '截圖上傳' : l.source_method === 'chat' ? '對話輸入' : '手動',
    new Date(l.added_at).toLocaleString('zh-HK'),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`))
  return [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n')
}

function toWhatsApp(l: Listing): string {
  const type  = l.listing_type === 'sale' ? '出售' : l.listing_type === 'rent' ? '出租' : ''
  const price = l.price ? `MOP ${l.price}萬` : '價格待議'
  const area  = [l.gross_area_sqft && `建${l.gross_area_sqft}呎`, l.usable_area_sqft && `實${l.usable_area_sqft}呎`].filter(Boolean).join(' / ')
  const rooms = [l.bedrooms && `${l.bedrooms}房`, l.bathrooms && `${l.bathrooms}廁`, l.has_parking === true && '有車位'].filter(Boolean).join(' ')
  const feats = (l.features || []).slice(0, 3).join('・')
  return `🏢 *${l.building_name || '澳門樓盤'} ${type}*
📍 ${[l.district, l.sub_district].filter(Boolean).join(' ')}${l.unit ? `  ${l.unit}` : ''}
💰 ${price}${l.price_per_sqft ? `（呎價 ${l.price_per_sqft}）` : ''}
📐 ${area || '-'}  ${rooms}
${feats ? `✨ ${feats}` : ''}${l.notes ? `\n📝 ${l.notes}` : ''}`.trim()
}

// ─── 顏色常數 ──────────────────────────────────────────────────────────────────
const T = {
  bg:     '#08111F',
  panel:  '#0D1B2E',
  border: 'rgba(255,255,255,0.07)',
  gold:   '#F5C842',
  muted:  'rgba(255,255,255,0.45)',
  text:   'rgba(255,255,255,0.9)',
  green:  '#34D399',
  red:    '#F87171',
  blue:   '#60A5FA',
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────
export default function PropertyDemoPage() {
  const [listings, setListings]     = useState<Listing[]>([])
  const [tab, setTab]               = useState<'upload' | 'chat'>('upload')
  const [uploading, setUploading]   = useState(false)
  const [uploadMsg, setUploadMsg]   = useState('')
  const [chatMsgs, setChatMsgs]     = useState<ChatMsg[]>([{ role: 'assistant', content: '你好！請描述要記錄的樓盤資料，或者貼上文字，我幫你整理入庫。' }])
  const [chatInput, setChatInput]   = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [editId, setEditId]         = useState<string | null>(null)
  const [copied, setCopied]         = useState<string | null>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const chatRef  = useRef<HTMLDivElement>(null)
  const pasteRef = useRef<HTMLTextAreaElement>(null)

  // localStorage 持久化
  useEffect(() => {
    const saved = localStorage.getItem('cp_property_listings')
    if (saved) try { setListings(JSON.parse(saved)) } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    localStorage.setItem('cp_property_listings', JSON.stringify(listings))
  }, [listings])

  // 聊天自動捲底
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatMsgs])

  const addListing = useCallback((data: Record<string, unknown>, method: Listing['source_method']) => {
    const l: Listing = {
      id:              newId(),
      building_name:   (data.building_name as string) || null,
      district:        (data.district as string) || null,
      sub_district:    (data.sub_district as string) || null,
      address:         (data.address as string) || null,
      unit:            (data.unit as string) || null,
      listing_type:    (data.listing_type as 'sale' | 'rent') || null,
      price:           (data.price as number) || null,
      price_per_sqft:  (data.price_per_sqft as number) || null,
      gross_area_sqft: (data.gross_area_sqft as number) || null,
      usable_area_sqft:(data.usable_area_sqft as number) || null,
      bedrooms:        (data.bedrooms as number) || null,
      bathrooms:       (data.bathrooms as number) || null,
      floor:           (data.floor as string) || null,
      has_parking:     data.has_parking != null ? Boolean(data.has_parking) : null,
      condition:       (data.condition as string) || null,
      features:        Array.isArray(data.features) ? data.features : [],
      source_agency:   (data.source_agency as string) || null,
      source_contact:  (data.source_contact as string) || null,
      notes:           (data.notes as string) || null,
      confidence:      (data.confidence as number) || null,
      added_at:        new Date().toISOString(),
      source_method:   method,
    }
    setListings(prev => [l, ...prev])
    return l
  }, [])

  // ── 截圖上傳 ──────────────────────────────────────────────
  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    setUploading(true)
    setUploadMsg(`正在分析 ${arr.length} 張圖片...`)
    let done = 0

    for (const file of arr) {
      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res((r.result as string).split(',')[1])
          r.onerror = rej
          r.readAsDataURL(file)
        })
        const resp = await fetch('/api/property/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        })
        const json = await resp.json()
        if (json.ok && json.data) { addListing(json.data, 'upload'); done++ }
      } catch { /* 繼續下一張 */ }
      setUploadMsg(`已完成 ${++done} / ${arr.length}`)
    }

    setUploadMsg(`✅ 成功入庫 ${done} 條盤源`)
    setUploading(false)
    setTimeout(() => setUploadMsg(''), 3000)
  }

  // ── 文字貼上提取 ──────────────────────────────────────────
  async function handlePasteExtract() {
    const text = pasteRef.current?.value?.trim()
    if (!text) return
    setUploading(true)
    setUploadMsg('分析中...')
    try {
      const resp = await fetch('/api/property/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const json = await resp.json()
      if (json.ok && json.data) {
        addListing(json.data, 'upload')
        setUploadMsg('✅ 已入庫')
        if (pasteRef.current) pasteRef.current.value = ''
      } else {
        setUploadMsg('❌ 提取失敗，請檢查內容')
      }
    } catch { setUploadMsg('❌ 網路錯誤') }
    setUploading(false)
    setTimeout(() => setUploadMsg(''), 3000)
  }

  // ── MiniMax 聊天 ──────────────────────────────────────────
  async function sendChat() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    const newMsgs: ChatMsg[] = [...chatMsgs, { role: 'user', content: msg }]
    setChatMsgs(newMsgs)
    setChatInput('')
    setChatLoading(true)

    try {
      const resp = await fetch('/api/property/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs.slice(-10) }),
      })
      const json = await resp.json()
      const reply = json.reply || '抱歉，請重試。'
      setChatMsgs(prev => [...prev, { role: 'assistant', content: reply }])
      if (json.extracted) {
        addListing(json.extracted, 'chat')
        setChatMsgs(prev => [...prev, {
          role: 'assistant',
          content: `✅ 已成功入庫！可在右側表格查看。`,
        }])
      }
    } catch {
      setChatMsgs(prev => [...prev, { role: 'assistant', content: '網路錯誤，請重試。' }])
    }
    setChatLoading(false)
  }

  // ── 匯出 ─────────────────────────────────────────────────
  function exportCSV() {
    const target = selected.size > 0 ? listings.filter(l => selected.has(l.id)) : listings
    const blob = new Blob(['\uFEFF' + toCSV(target)], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `盤源_${new Date().toLocaleDateString('zh-HK').replace(/\//g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyWhatsApp(l: Listing) {
    navigator.clipboard.writeText(toWhatsApp(l))
    setCopied(l.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  // ── 行內編輯 ────────────────────────────────────────────
  function updateField(id: string, field: keyof Listing, value: unknown) {
    setListings(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  function deleteListing(id: string) {
    setListings(prev => prev.filter(l => l.id !== id))
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  // ── 拖放 ────────────────────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏢</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: T.gold }}>澳門地產盤源管理</span>
            <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(245,200,66,0.15)', border: `1px solid ${T.gold}`, borderRadius: 10, color: T.gold }}>DEMO</span>
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>上傳截圖或對話輸入 → AI 自動整理 → 隨時匯出</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={btnStyle('#1e3a5f', T.blue)}>⬇ CSV 匯出{selected.size > 0 ? ` (${selected.size})` : ''}</button>
          {listings.length > 0 && (
            <button onClick={() => { if (confirm('確定清除所有盤源？')) { setListings([]); setSelected(new Set()) } }}
              style={btnStyle('#3b1a1a', T.red)}>🗑 清除全部</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>

        {/* ── 左側輸入面板 ── */}
        <div style={{ borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab 切換 */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
            {(['upload', 'chat'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
                color: tab === t ? T.gold : T.muted, fontWeight: tab === t ? 700 : 400, fontSize: 14,
                borderBottom: tab === t ? `2px solid ${T.gold}` : '2px solid transparent',
              }}>
                {t === 'upload' ? '📸 截圖上傳' : '💬 對話輸入'}
              </button>
            ))}
          </div>

          {/* 上傳 Tab */}
          {tab === 'upload' && (
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

              {/* 拖放區 */}
              <div
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${T.border}`, borderRadius: 12, padding: 32,
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
                  background: 'rgba(255,255,255,0.02)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = T.gold)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{uploading ? '⏳' : '📷'}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{uploading ? uploadMsg : '拖入或點擊上傳截圖'}</div>
                <div style={{ fontSize: 12, color: T.muted }}>支援 JPG / PNG / WebP，可同時上傳多張</div>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => e.target.files && handleFiles(e.target.files)} />
              </div>

              {/* 文字貼上 */}
              <div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>或貼上文字（WhatsApp 轉發、盤源描述）</div>
                <textarea ref={pasteRef} rows={5} placeholder="貼上中原/利嘉閣的盤源文字..." style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: 10, color: T.text, fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                }} />
                <button onClick={handlePasteExtract} disabled={uploading} style={{ ...btnStyle('#1a3a1a', T.green), marginTop: 8, width: '100%' }}>
                  {uploading ? uploadMsg : '🤖 AI 提取入庫'}
                </button>
              </div>

              {uploadMsg && !uploading && (
                <div style={{ fontSize: 13, color: uploadMsg.startsWith('✅') ? T.green : T.red, textAlign: 'center' }}>
                  {uploadMsg}
                </div>
              )}

              {/* 使用提示 */}
              <div style={{ fontSize: 12, color: T.muted, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: T.text }}>💡 使用提示</div>
                <div>• 支援中原、利嘉閣、美聯截圖</div>
                <div>• 可貼 WhatsApp 轉發的盤源文字</div>
                <div>• AI 自動提取地區、面積、呎價</div>
                <div>• 低信心欄位會標記，可手動修改</div>
              </div>
            </div>
          )}

          {/* 聊天 Tab */}
          {tab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {chatMsgs.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                      background: m.role === 'user' ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${m.role === 'user' ? 'rgba(245,200,66,0.3)' : T.border}`,
                      color: T.text, whiteSpace: 'pre-wrap',
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, fontSize: 13, color: T.muted }}>
                      ⏳ 正在整理...
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                  placeholder="描述樓盤... 例：氹仔廣場旁3房，700呎，580萬"
                  rows={2}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: 13, resize: 'none',
                  }}
                />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{
                  ...btnStyle('rgba(245,200,66,0.15)', T.gold), padding: '0 16px', alignSelf: 'stretch',
                }}>發送</button>
              </div>
              <div style={{ padding: '4px 16px 8px', fontSize: 11, color: T.muted }}>
                說「確認」或「儲存」即可入庫 · Enter 發送 · Shift+Enter 換行
              </div>
            </div>
          )}
        </div>

        {/* ── 右側表格 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* 表格工具列 */}
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: T.muted }}>共 {listings.length} 條盤源</span>
            {selected.size > 0 && <span style={{ fontSize: 13, color: T.gold }}>已選 {selected.size} 條</span>}
            {selected.size > 0 && (
              <button onClick={() => { listings.filter(l => selected.has(l.id)).forEach(l => copyWhatsApp(l)); setCopied('all') }}
                style={btnStyle('#1a2a1a', T.green)}>📋 批量複製 WhatsApp</button>
            )}
          </div>

          {/* 表格 */}
          {listings.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <div>還沒有盤源記錄</div>
              <div style={{ fontSize: 13 }}>從左側上傳截圖或對話輸入開始</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: T.panel, zIndex: 1 }}>
                  <tr>
                    <Th w={36}><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(listings.map(l => l.id)) : new Set())} /></Th>
                    <Th w={140}>大廈名稱</Th>
                    <Th w={80}>地區</Th>
                    <Th w={60}>類型</Th>
                    <Th w={90}>叫價（萬）</Th>
                    <Th w={80}>呎價</Th>
                    <Th w={80}>建築面積</Th>
                    <Th w={50}>房</Th>
                    <Th w={60}>樓層</Th>
                    <Th w={80}>裝修</Th>
                    <Th w={60}>信心</Th>
                    <Th w={80}>來源</Th>
                    <Th w={110}>操作</Th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l, idx) => (
                    <tr key={l.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', borderBottom: `1px solid ${T.border}` }}>
                      <Td w={36}><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} /></Td>
                      <Td w={140}>
                        {editId === l.id
                          ? <input defaultValue={l.building_name ?? ''} onBlur={e => updateField(l.id, 'building_name', e.target.value)} style={inlineInput} autoFocus />
                          : <span style={{ cursor: 'pointer' }} onClick={() => setEditId(l.id)}>{l.building_name || <em style={{ color: T.muted }}>-</em>}</span>
                        }
                      </Td>
                      <Td w={80}>{l.district || '-'}{l.sub_district ? ` · ${l.sub_district}` : ''}</Td>
                      <Td w={60}>
                        <span style={{ padding: '2px 7px', borderRadius: 10, fontSize: 11, background: l.listing_type === 'sale' ? 'rgba(245,200,66,0.15)' : 'rgba(96,165,250,0.15)', color: l.listing_type === 'sale' ? T.gold : T.blue }}>
                          {l.listing_type === 'sale' ? '買賣' : l.listing_type === 'rent' ? '租賃' : '-'}
                        </span>
                      </Td>
                      <Td w={90} right>{l.price ? <strong style={{ color: T.gold }}>{l.price}</strong> : '-'}</Td>
                      <Td w={80} right>{l.price_per_sqft ?? '-'}</Td>
                      <Td w={80} right>{l.gross_area_sqft ? `${l.gross_area_sqft}呎` : '-'}</Td>
                      <Td w={50}>{l.bedrooms ?? '-'}</Td>
                      <Td w={60}>{l.floor || '-'}</Td>
                      <Td w={80}>{l.condition || '-'}</Td>
                      <Td w={60}>
                        {l.confidence != null
                          ? <span style={{ color: l.confidence > 0.8 ? T.green : l.confidence > 0.5 ? T.gold : T.red }}>{Math.round(l.confidence * 100)}%</span>
                          : '-'}
                      </Td>
                      <Td w={80}>
                        <span style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
                          {l.source_method === 'upload' ? '📸截圖' : l.source_method === 'chat' ? '💬對話' : '✏️手動'}
                        </span>
                      </Td>
                      <Td w={110}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => copyWhatsApp(l)} title="複製 WhatsApp" style={iconBtn}>
                            {copied === l.id ? '✅' : '📋'}
                          </button>
                          <button onClick={() => setEditId(editId === l.id ? null : l.id)} title="編輯" style={iconBtn}>✏️</button>
                          <button onClick={() => deleteListing(l.id)} title="刪除" style={{ ...iconBtn, color: T.red }}>🗑</button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 小組件 ───────────────────────────────────────────────────────────────────
function Th({ children, w, right }: { children: React.ReactNode; w: number; right?: boolean }) {
  return (
    <th style={{ padding: '10px 8px', textAlign: right ? 'right' : 'left', fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', width: w, minWidth: w }}>
      {children}
    </th>
  )
}
function Td({ children, w, right }: { children: React.ReactNode; w: number; right?: boolean }) {
  return (
    <td style={{ padding: '8px 8px', textAlign: right ? 'right' : 'left', whiteSpace: 'nowrap', width: w }}>
      {children}
    </td>
  )
}

function btnStyle(bg: string, color: string) {
  return {
    padding: '7px 14px', background: bg, border: `1px solid ${color}40`, borderRadius: 8,
    color, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
  } as React.CSSProperties
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 5px',
}

const inlineInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6, padding: '2px 6px', color: 'white', fontSize: 13, width: 130,
}
