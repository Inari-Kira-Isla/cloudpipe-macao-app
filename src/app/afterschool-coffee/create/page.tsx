'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Mode = 'overlay' | 'ai_gen'
type StylePref = 'warm' | 'fun' | 'minimal'
type Step = 1 | 2

interface Template {
  id: string
  caption_zh?: string
  hashtags?: string
  source_customer_name?: string
  source_created_at?: string
}

export default function CreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [mode, setMode] = useState<Mode>('overlay')
  const [stylePref, setStylePref] = useState<StylePref>('warm')
  const [customerName, setCustomerName] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Template state
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // Fetch templates
  useEffect(() => {
    async function fetchTemplates() {
      setTemplatesLoading(true)
      try {
        const res = await fetch('/api/afterschool/templates')
        const data = await res.json() as { templates?: Template[] }
        if (data.templates) setTemplates(data.templates)
      } catch (e) {
        console.error('Failed to load templates', e)
      }
      setTemplatesLoading(false)
    }
    fetchTemplates()
  }, [])

  function handleFile(f: File) {
    if (f.size > 10 * 1024 * 1024) { setError('圖片不可超過10MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setError('只接受 JPEG / PNG / WebP'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }

  async function handleSubmit() {
    setError('')
    if (!customerMessage.trim()) { setError('請填寫你的心情或訊息'); return }
    if (mode === 'overlay' && !file) { setError('疊加模式請上傳相片'); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('mode', mode)
      fd.append('customer_name', customerName)
      fd.append('customer_message', customerMessage)
      fd.append('style_pref', stylePref)
      if (file) fd.append('file', file)
      if (selectedTemplate) fd.append('template_id', selectedTemplate)

      const res = await fetch('/api/afterschool/upload', { method: 'POST', body: fd })
      const data = await res.json() as { success?: boolean; job_id?: string; error?: string }

      if (!res.ok || !data.success) throw new Error(data.error || '提交失敗')
      router.push(`/afterschool-coffee/preview/${data.job_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失敗，請再試')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)' }}>

      <div className="w-full max-w-sm">
        <Link href="/afterschool-coffee" className="text-amber-300/70 text-sm mb-4 inline-block">← 返回</Link>
        <h1 className="text-2xl font-bold text-amber-200 mb-1">創作品牌故事 ✨</h1>
        <p className="text-amber-100/60 text-sm mb-6">讓 AI 幫你生成 After School Coffee 風格圖文</p>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? 'bg-amber-400' : 'bg-white/20'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-amber-200 font-medium mb-3 text-sm">選擇生成方式</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'overlay', icon: '🖼️', label: '加上品牌框架', desc: '疊加在你的相片上' },
                  { value: 'ai_gen', icon: '🎨', label: 'AI 全新生成', desc: '根據你的描述創作' },
                ] as { value: Mode; icon: string; label: string; desc: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      mode === opt.value
                        ? 'border-amber-400 bg-amber-400/10'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="text-amber-200 text-sm font-medium">{opt.label}</div>
                    <div className="text-amber-100/50 text-xs mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {mode === 'overlay' && (
              <div>
                <p className="text-amber-200 font-medium mb-2 text-sm">上傳相片 <span className="text-amber-100/40 font-normal">（必填）</span></p>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center ${
                    preview ? 'border-amber-400/60' : 'border-white/20 hover:border-amber-400/40'
                  }`}
                >
                  {preview ? (
                    <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-lg" />
                  ) : (
                    <div className="py-6">
                      <div className="text-3xl mb-2">📷</div>
                      <p className="text-amber-100/60 text-sm">點擊上傳相片</p>
                      <p className="text-amber-100/30 text-xs mt-1">JPEG / PNG / WebP，最大 10MB</p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={mode === 'overlay' && !file}
              className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(90deg, #c47c1a, #e6a22e)' }}
            >
              下一步 →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-amber-200 font-medium text-sm block mb-2">你叫咩名？<span className="text-amber-100/40 font-normal">（選填）</span></label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="例：小美"
                maxLength={20}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-100/30 text-sm outline-none focus:border-amber-400/60"
              />
            </div>

            <div>
              <label className="text-amber-200 font-medium text-sm block mb-2">你想分享咩？ <span className="text-red-400">*</span></label>
              <textarea
                value={customerMessage}
                onChange={e => setCustomerMessage(e.target.value)}
                placeholder="例：今日帶囡囡嚟享用早餐，Latte 超好飲！最喜歡呢個溫馨角落…"
                maxLength={200}
                rows={4}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-100/30 text-sm outline-none focus:border-amber-400/60 resize-none"
              />
              <div className="text-right text-amber-100/30 text-xs mt-1">{customerMessage.length}/200</div>
            </div>

            {/* Template Selection */}
            {templates.length > 0 && (
              <div>
                <p className="text-amber-200 font-medium text-sm mb-2">
                  參考範本 <span className="text-amber-100/40 font-normal">（可選）</span>
                </p>
                <select
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-amber-100 text-sm outline-none focus:border-amber-400/60 appearance-none cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23fbbf24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                >
                  <option value="" className="bg-slate-800">不使用範本</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-800">
                      {t.name || t.caption_zh?.slice(0, 30) || t.id.slice(0, 8)}
                      {t.source_customer_name ? ` · ${t.source_customer_name}` : ''}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <div className="mt-2 p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg">
                    {templates.find(t => t.id === selectedTemplate)?.caption_zh && (
                      <p className="text-amber-100/80 text-xs">
                        <span className="text-amber-400">Caption:</span> {templates.find(t => t.id === selectedTemplate)?.caption_zh}
                      </p>
                    )}
                    {templates.find(t => t.id === selectedTemplate)?.hashtags && (
                      <p className="text-amber-100/60 text-xs mt-1">
                        <span className="text-amber-400">Hashtags:</span> {templates.find(t => t.id === selectedTemplate)?.hashtags}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-amber-200 font-medium text-sm mb-2">圖文風格</p>
              <div className="flex gap-2">
                {([
                  { value: 'warm', label: '☕ 溫馨' },
                  { value: 'fun', label: '🎉 輕快' },
                  { value: 'minimal', label: '✨ 簡約' },
                ] as { value: StylePref; label: string }[]).map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStylePref(s.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      stylePref === s.value
                        ? 'bg-amber-400 text-amber-900'
                        : 'bg-white/10 text-amber-200 border border-white/20'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl font-medium text-amber-200 border border-white/20 bg-white/5"
              >
                ← 返回
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(90deg, #c47c1a, #e6a22e)' }}
              >
                {loading ? '提交中…' : '提交 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
