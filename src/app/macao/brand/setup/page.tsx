'use client'

import { useState, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Category { id: string; slug: string; name_zh: string; name_en: string }
interface MarketQuestion {
  id: string
  question_text: string
  lang: 'zh' | 'en'
  intent: string
  competition_gap: string
  ai_citation_score: number
  occupied_by: string | null
  relevance_score?: number
}
interface SelectedFAQ {
  question: string
  answer: string
  lang: string
  market_question_id?: string
}
interface BrandInfo {
  name_zh: string
  name_en: string
  category_slug: string
  district: string
  address_zh: string
  phone: string
  website: string
  usp: string
  services: string
}

// ── Constants ────────────────────────────────────────────────────────────────
const STEPS = ['品牌資料', '問題匹配', '完善答案', '確認發布']
const DISTRICTS = ['澳門半島', '氹仔', '路環', '路氹城']
const LANG_LABELS: Record<string, string> = { zh: '中', en: 'EN' }
const INTENT_LABELS: Record<string, string> = {
  informational: '知識型', commercial: '商業型', navigational: '導航型'
}
const GAP_COLORS: Record<string, string> = {
  high: '#10a37f', medium: '#f59e0b', low: '#9ca3af'
}
const GAP_LABELS: Record<string, string> = { high: '高空白', medium: '中空白', low: '低空白' }

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    maxWidth: 820,
    margin: '0 auto',
    padding: '32px 16px 80px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#111',
  } as React.CSSProperties,
  heading: { fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: '#0f4c81' } as React.CSSProperties,
  sub: { fontSize: 14, color: '#666', margin: '0 0 32px' } as React.CSSProperties,
  stepper: {
    display: 'flex', gap: 0, marginBottom: 36, borderRadius: 12,
    overflow: 'hidden', border: '1px solid #e5e7eb',
  } as React.CSSProperties,
  step: (active: boolean, done: boolean) => ({
    flex: 1, padding: '10px 6px', textAlign: 'center' as const,
    fontSize: 12, fontWeight: done || active ? 700 : 400,
    background: active ? '#0f4c81' : done ? '#e8f0f8' : '#fafafa',
    color: active ? '#fff' : done ? '#0f4c81' : '#9ca3af',
    borderRight: '1px solid #e5e7eb',
    transition: 'all 0.2s',
    cursor: done ? 'pointer' : 'default',
  } as React.CSSProperties),
  card: {
    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
    padding: '24px', marginBottom: 16,
  } as React.CSSProperties,
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 } as React.CSSProperties,
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  textarea: {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' as const,
    resize: 'vertical' as const, minHeight: 80,
  } as React.CSSProperties,
  select: {
    width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 } as React.CSSProperties,
  btn: (variant: 'primary' | 'ghost' | 'success') => ({
    padding: '11px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
    background: variant === 'primary' ? '#0f4c81' : variant === 'success' ? '#10a37f' : 'transparent',
    color: variant === 'ghost' ? '#374151' : '#fff',
    border: variant === 'ghost' ? '1px solid #d1d5db' : 'none',
  } as React.CSSProperties),
  tag: (color: string) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11,
    fontWeight: 600, background: color + '18', color: color,
  } as React.CSSProperties),
  faqCard: (selected: boolean) => ({
    border: `2px solid ${selected ? '#0f4c81' : '#e5e7eb'}`,
    borderRadius: 10, padding: '14px 16px', marginBottom: 10,
    cursor: 'pointer', transition: 'all 0.15s',
    background: selected ? '#f0f5fb' : '#fff',
    position: 'relative' as const,
  } as React.CSSProperties),
  answerBox: {
    background: '#f8fafb', borderRadius: 8, border: '1px solid #e5e7eb',
    padding: '14px 16px', marginBottom: 12,
  } as React.CSSProperties,
  progressBar: (pct: number) => ({
    height: 4, borderRadius: 99, background: '#e5e7eb', marginBottom: 20, overflow: 'hidden',
  } as React.CSSProperties),
  progress: (pct: number) => ({
    height: '100%', width: `${pct}%`, background: '#0f4c81',
    borderRadius: 99, transition: 'width 0.4s ease',
  } as React.CSSProperties),
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function BrandSetupPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  // Data state
  const [categories, setCategories] = useState<Category[]>([])
  const [brandInfo, setBrandInfo] = useState<BrandInfo>({
    name_zh: '', name_en: '', category_slug: 'cafe',
    district: '氹仔', address_zh: '', phone: '', website: '', usp: '', services: '',
  })
  const [existingSlug, setExistingSlug] = useState('')
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [matchedQuestions, setMatchedQuestions] = useState<MarketQuestion[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedFAQs, setSelectedFAQs] = useState<SelectedFAQ[]>([])
  const [generatedAnswers, setGeneratedAnswers] = useState<Record<string, string>>({})
  const [filterLang, setFilterLang] = useState<'all' | 'zh' | 'en'>('all')
  const [filterGap, setFilterGap] = useState<'all' | 'high' | 'medium'>('high')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Load categories on first step
  const loadCategories = useCallback(async () => {
    if (categories.length > 0) return
    const res = await fetch('/api/v1/brand-setup?action=categories')
    const { data } = await res.json()
    setCategories(data || [])
  }, [categories.length])

  // Load existing merchant
  const loadExisting = async () => {
    if (!existingSlug.trim()) return
    setLoading(true)
    setLoadingMsg('載入商戶資料...')
    try {
      const res = await fetch(`/api/v1/brand-setup?action=merchant&slug=${existingSlug}`)
      if (!res.ok) { setError('找不到商戶，請確認 Slug'); setLoading(false); return }
      const { merchant, faqs } = await res.json()
      setBrandInfo({
        name_zh: merchant.name_zh || '',
        name_en: merchant.name_en || '',
        category_slug: merchant.categories?.slug || 'cafe',
        district: merchant.district || '氹仔',
        address_zh: merchant.address_zh || '',
        phone: merchant.phone || '',
        website: merchant.website || '',
        usp: '',
        services: '',
      })
      setMerchantId(merchant.id)
      setError('')
    } catch {
      setError('載入失敗')
    }
    setLoading(false)
    setLoadingMsg('')
  }

  // Step 1 → 2: Match questions
  const matchQuestions = async () => {
    setLoading(true)
    setLoadingMsg('AI 分析品牌資料，匹配最適合問題...')
    try {
      const res = await fetch('/api/v1/brand-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match_questions',
          data: {
            category_slug: brandInfo.category_slug,
            district: brandInfo.district,
            name_zh: brandInfo.name_zh,
            usp_keywords: brandInfo.usp.split(/[，,、\s]+/).filter(Boolean),
          },
        }),
      })
      const { questions } = await res.json()
      setMatchedQuestions(questions || [])
      // Auto-select top 10 high-gap questions
      const topIds = new Set<string>(
        (questions || []).filter((q: MarketQuestion) => q.competition_gap === 'high')
          .slice(0, 10).map((q: MarketQuestion) => q.id)
      )
      setSelectedIds(topIds)
      setStep(1)
    } catch {
      setError('匹配失敗，請重試')
    }
    setLoading(false)
    setLoadingMsg('')
  }

  // Step 2 → 3: Generate answers for selected questions
  const generateAnswers = async () => {
    const selected = matchedQuestions.filter(q => selectedIds.has(q.id))
    if (selected.length === 0) { setError('請至少選擇一條問題'); return }

    setLoading(true)
    setLoadingMsg(`AI 為 ${selected.length} 條問題生成精準答案...`)
    setError('')

    try {
      const res = await fetch('/api/v1/brand-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_answers',
          data: { brand_info: brandInfo, questions: selected.slice(0, 10) },
        }),
      })
      const { answers } = await res.json()
      setGeneratedAnswers(answers || {})

      // Build selected FAQs list
      const faqs: SelectedFAQ[] = selected.map(q => ({
        question: q.question_text,
        answer: answers?.[q.id] || '',
        lang: q.lang,
        market_question_id: q.id,
      }))
      setSelectedFAQs(faqs)
      setStep(2)
    } catch {
      setError('答案生成失敗，你可以手動填寫')
      const faqs: SelectedFAQ[] = matchedQuestions
        .filter(q => selectedIds.has(q.id))
        .map(q => ({ question: q.question_text, answer: '', lang: q.lang, market_question_id: q.id }))
      setSelectedFAQs(faqs)
      setStep(2)
    }
    setLoading(false)
    setLoadingMsg('')
  }

  // Step 3 → 4: Save
  const saveFAQs = async () => {
    if (!merchantId) {
      // Create merchant first
      setLoading(true)
      setLoadingMsg('建立商戶檔案...')
      try {
        const res = await fetch('/api/v1/brand-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_merchant', data: brandInfo }),
        })
        const { merchant, error: merr } = await res.json()
        if (merr) { setError(merr); setLoading(false); return }
        setMerchantId(merchant.id)
      } catch {
        setError('建立商戶失敗'); setLoading(false); return
      }
    }

    setLoadingMsg('儲存 FAQ 到資料庫...')
    const validFAQs = selectedFAQs.filter(f => f.answer.trim().length > 0)

    try {
      const res = await fetch('/api/v1/brand-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_faqs',
          data: { merchant_id: merchantId, faqs: validFAQs },
        }),
      })
      const result = await res.json()
      if (result.error) { setError(result.error); setLoading(false); return }
      setSaved(true)
      setStep(3)
    } catch {
      setError('儲存失敗')
    }
    setLoading(false)
    setLoadingMsg('')
  }

  // Toggle question selection
  const toggleQuestion = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 20) next.add(id)
      return next
    })
  }

  // Filter questions
  const filteredQuestions = matchedQuestions.filter(q => {
    if (filterLang !== 'all' && q.lang !== filterLang) return false
    if (filterGap !== 'all' && q.competition_gap !== filterGap) return false
    return true
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ fontSize: 36, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⚙️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f4c81' }}>{loadingMsg || '處理中...'}</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={S.page} onClick={() => !categories.length && loadCategories()}>
      {/* Header */}
      <h1 style={S.heading}>品牌 FAQ 設定中心</h1>
      <p style={S.sub}>輸入品牌資料，AI 自動為你匹配市場高競爭力問題集，搶佔 Perplexity / ChatGPT 引用位置</p>

      {/* Progress bar */}
      <div style={S.progressBar(step / 3 * 100)}>
        <div style={S.progress(step / 3 * 100)} />
      </div>

      {/* Step indicator */}
      <div style={S.stepper}>
        {STEPS.map((s, i) => (
          <div key={i} style={S.step(step === i, step > i)}
               onClick={() => step > i && setStep(i)}>
            {step > i ? '✓ ' : ''}{s}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14, color: '#dc2626' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Step 0: Brand Info ─────────────────────────────────────────────── */}
      {step === 0 && (
        <div>
          {/* Existing merchant lookup */}
          <div style={{ ...S.card, background: '#f8faff', borderColor: '#bfdbfe' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 10 }}>
              🔍 已有商戶？輸入 Slug 快速載入
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...S.input, flex: 1 }}
                placeholder="e.g. inari-global-foods"
                value={existingSlug}
                onChange={e => setExistingSlug(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadExisting()}
              />
              <button style={S.btn('ghost')} onClick={loadExisting}>載入</button>
            </div>
          </div>

          <div style={{ ...S.card }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>基本商戶資料</div>

            <div style={S.row}>
              <div>
                <label style={S.label}>品牌中文名稱 *</label>
                <input style={S.input} placeholder="e.g. 稻荷環球食品" value={brandInfo.name_zh}
                  onChange={e => setBrandInfo(p => ({ ...p, name_zh: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>品牌英文名稱</label>
                <input style={S.input} placeholder="e.g. Inari Global Foods" value={brandInfo.name_en}
                  onChange={e => setBrandInfo(p => ({ ...p, name_en: e.target.value }))} />
              </div>
            </div>

            <div style={S.row}>
              <div>
                <label style={S.label}>行業類別 *</label>
                <select style={S.select} value={brandInfo.category_slug}
                  onChange={e => setBrandInfo(p => ({ ...p, category_slug: e.target.value }))}>
                  {categories.length === 0 && (
                    <>
                      <option value="cafe">咖啡廳</option>
                      <option value="restaurant">餐廳</option>
                      <option value="food-import">食品進口</option>
                      <option value="food-delivery">食品外送</option>
                      <option value="retail">零售</option>
                      <option value="hotel">酒店</option>
                      <option value="education">教育</option>
                      <option value="wellness">健康/美容</option>
                    </>
                  )}
                  {categories.map(c => (
                    <option key={c.id} value={c.slug}>{c.name_zh} ({c.slug})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>地區 *</label>
                <select style={S.select} value={brandInfo.district}
                  onChange={e => setBrandInfo(p => ({ ...p, district: e.target.value }))}>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>地址</label>
              <input style={S.input} placeholder="e.g. 台山新城市花園第18座地下BG鋪" value={brandInfo.address_zh}
                onChange={e => setBrandInfo(p => ({ ...p, address_zh: e.target.value }))} />
            </div>

            <div style={S.row}>
              <div>
                <label style={S.label}>聯絡電話</label>
                <input style={S.input} placeholder="+853-XXXX-XXXX" value={brandInfo.phone}
                  onChange={e => setBrandInfo(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>官網 / 社交媒體 URL</label>
                <input style={S.input} placeholder="https://" value={brandInfo.website}
                  onChange={e => setBrandInfo(p => ({ ...p, website: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* USP & Services */}
          <div style={S.card}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>品牌獨特賣點（越詳細越好）</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
              AI 會根據這裡的資訊匹配最精準的 FAQ 問題集
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>核心 USP / 競爭優勢</label>
              <textarea style={S.textarea}
                placeholder="e.g. 澳門專業日本海膽B2B批發商，北海道產地經豐洲市場直送，48小時冷鏈直送，IoT溫控系統"
                value={brandInfo.usp}
                onChange={e => setBrandInfo(p => ({ ...p, usp: e.target.value }))} />
            </div>

            <div>
              <label style={S.label}>主要產品 / 服務</label>
              <textarea style={S.textarea}
                placeholder="e.g. 北海道馬糞海膽、紫海膽批發；B2B採購帳戶；24小時緊急配送"
                value={brandInfo.services}
                onChange={e => setBrandInfo(p => ({ ...p, services: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={S.btn('primary')}
              onClick={matchQuestions}
              disabled={!brandInfo.name_zh || !brandInfo.category_slug}>
              分析品牌 → 匹配問題集 →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Question Selection ─────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                已匹配 {matchedQuestions.length} 條問題
                <span style={{ fontSize: 13, fontWeight: 400, color: '#666', marginLeft: 8 }}>
                  已選 {selectedIds.size}/20
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                ✅ 綠色 = 高競爭空白（AI 沒有好答案）　⚠️ 橙色 = 有競爭者　🔵 灰色 = 已被佔領
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Lang filter */}
              {(['all', 'zh', 'en'] as const).map(l => (
                <button key={l} onClick={() => setFilterLang(l)}
                  style={{ ...S.btn(filterLang === l ? 'primary' : 'ghost'), padding: '6px 14px', fontSize: 12 }}>
                  {l === 'all' ? '全部' : l.toUpperCase()}
                </button>
              ))}
              <div style={{ width: 1, background: '#e5e7eb' }} />
              {(['all', 'high', 'medium'] as const).map(g => (
                <button key={g} onClick={() => setFilterGap(g)}
                  style={{ ...S.btn(filterGap === g ? 'primary' : 'ghost'), padding: '6px 14px', fontSize: 12 }}>
                  {g === 'all' ? '全部空白度' : GAP_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick select */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button style={{ ...S.btn('ghost'), padding: '6px 14px', fontSize: 12 }}
              onClick={() => {
                const topIds = new Set(filteredQuestions.filter(q => q.competition_gap === 'high').slice(0, 10).map(q => q.id))
                setSelectedIds(topIds)
              }}>
              ✨ 自動選高空白前10
            </button>
            <button style={{ ...S.btn('ghost'), padding: '6px 14px', fontSize: 12 }}
              onClick={() => setSelectedIds(new Set())}>
              清除選擇
            </button>
          </div>

          {/* Question list */}
          <div style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
            {filteredQuestions.map(q => {
              const isSelected = selectedIds.has(q.id)
              const gapColor = GAP_COLORS[q.competition_gap] || '#9ca3af'
              return (
                <div key={q.id} style={S.faqCard(isSelected)} onClick={() => toggleQuestion(q.id)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                      border: `2px solid ${isSelected ? '#0f4c81' : '#d1d5db'}`,
                      background: isSelected ? '#0f4c81' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                    }}>
                      {isSelected ? '✓' : ''}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
                        {q.question_text}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={S.tag(gapColor)}>{GAP_LABELS[q.competition_gap] || q.competition_gap}</span>
                        <span style={S.tag('#6366f1')}>{LANG_LABELS[q.lang] || q.lang}</span>
                        {q.intent && <span style={S.tag('#64748b')}>{INTENT_LABELS[q.intent] || q.intent}</span>}
                        {q.occupied_by && (
                          <span style={S.tag('#f59e0b')}>⚠️ 已有競爭者</span>
                        )}
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
                          AI引用分: {q.relevance_score || q.ai_citation_score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button style={S.btn('ghost')} onClick={() => setStep(0)}>← 返回</button>
            <button style={S.btn('primary')} onClick={generateAnswers}
              disabled={selectedIds.size === 0}>
              AI 生成答案 ({selectedIds.size} 條) →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Answer Review & Edit ──────────────────────────────────── */}
      {step === 2 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            完善 FAQ 答案 — {selectedFAQs.length} 條
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
            AI 已根據你的品牌資料生成答案草稿，請檢查並補充具體資訊（電話、地址、價格等）
          </div>

          <div style={{ maxHeight: 560, overflowY: 'auto', paddingRight: 4 }}>
            {selectedFAQs.map((faq, i) => (
              <div key={i} style={S.answerBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', flex: 1 }}>
                    Q{i + 1}. {faq.question}
                  </div>
                  <span style={{ ...S.tag('#6366f1'), marginLeft: 8, flexShrink: 0 }}>
                    {LANG_LABELS[faq.lang] || faq.lang}
                  </span>
                </div>
                <textarea
                  style={{ ...S.textarea, minHeight: 90, background: '#fff' }}
                  placeholder={faq.answer ? '' : '請填寫答案（包含品牌名稱、地址、電話、價格等具體資訊，60-120字）'}
                  value={faq.answer}
                  onChange={e => {
                    const updated = [...selectedFAQs]
                    updated[i] = { ...updated[i], answer: e.target.value }
                    setSelectedFAQs(updated)
                  }}
                />
                {!faq.answer && (
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                    ⚠️ 未填答案的問題不會被儲存
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button style={S.btn('ghost')} onClick={() => setStep(1)}>← 返回選題</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666', alignSelf: 'center' }}>
                {selectedFAQs.filter(f => f.answer.trim()).length}/{selectedFAQs.length} 條已填寫
              </span>
              <button style={S.btn('primary')} onClick={saveFAQs}
                disabled={selectedFAQs.filter(f => f.answer.trim()).length === 0}>
                儲存並發布 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Success ────────────────────────────────────────────────── */}
      {step === 3 && saved && (
        <div style={{ ...S.card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#10a37f', margin: '0 0 8px' }}>
            FAQ 已成功發布！
          </h2>
          <p style={{ color: '#666', fontSize: 14, margin: '0 0 24px' }}>
            {selectedFAQs.filter(f => f.answer.trim()).length} 條精準 FAQ 已寫入資料庫，<br />
            Perplexity / ChatGPT 爬蟲將在 24-72 小時內索引並開始引用
          </p>

          <div style={{ background: '#f0faf5', borderRadius: 10, padding: '16px 24px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#10a37f' }}>📋 下一步行動</div>
            {[
              'T+7 天：使用 Playwright 腳本驗收 Perplexity 引用率',
              '每週三 10:00：自動化 FAQ 引用追蹤 (cron 已設定)',
              '若引用率 < 30%：回到步驟2補充更多問題',
              '發現空白問題：從市場問題庫選補充 FAQ',
            ].map((item, i) => (
              <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 6, display: 'flex', gap: 8 }}>
                <span style={{ color: '#10a37f', fontWeight: 700 }}>{i + 1}.</span>
                {item}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button style={S.btn('ghost')}
              onClick={() => { setStep(0); setSaved(false); setSelectedFAQs([]); setSelectedIds(new Set()); }}>
              設定另一個品牌
            </button>
            <button style={S.btn('success')}
              onClick={() => window.open(`/macao/brand/${existingSlug || 'inari-global-foods'}`, '_blank')}>
              查看品牌頁面 →
            </button>
          </div>
        </div>
      )}

      {/* ── Footer info ───────────────────────────────────────────────────── */}
      {step < 3 && (
        <div style={{ marginTop: 32, padding: '16px', background: '#f8faff', borderRadius: 10, fontSize: 12, color: '#6b7280' }}>
          <strong style={{ color: '#0f4c81' }}>💡 CloudPipe FAQ 市場空白地圖</strong> —
          資料庫現有 <strong>150+</strong> 條高競爭空白問題 × 3 個行業。
          被選中且答案填寫完整的 FAQ 將被標記為「已佔領」，競爭者無法再搶佔同一問題。
          <br /><br />
          每週三自動向 Perplexity 發出查詢，驗收你的 FAQ 是否被 AI 引用，結果發送至 Telegram。
        </div>
      )}
    </div>
  )
}
