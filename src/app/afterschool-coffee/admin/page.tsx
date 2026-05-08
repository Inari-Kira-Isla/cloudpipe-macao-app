'use client'
import { useState, useEffect, useCallback } from 'react'

type Job = {
  id: string
  status: string
  mode: string
  customer_name?: string
  customer_message?: string
  original_image_url?: string
  generated_image_url?: string
  caption_zh?: string
  caption_en?: string
  hashtags?: string
  platforms?: string[]
  social_post_ids?: Record<string, string | null>
  created_at: string
}

const PLATFORMS = ['facebook', 'threads', 'instagram']

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [filter, setFilter] = useState('ready')
  const [selected, setSelected] = useState<Job | null>(null)
  const [editCaptionZh, setEditCaptionZh] = useState('')
  const [editCaptionEn, setEditCaptionEn] = useState('')
  const [editHashtags, setEditHashtags] = useState('')
  const [selPlatforms, setSelPlatforms] = useState<string[]>(['facebook', 'threads'])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchJobs = useCallback(async (s: string) => {
    const res = await fetch(`/api/afterschool/jobs?status=${s}`, {
      headers: { 'x-admin-secret': secret },
    })
    if (res.ok) {
      const data = await res.json() as { jobs: Job[] }
      setJobs(data.jobs || [])
    }
  }, [secret])

  function handleAuth() {
    if (secret.trim()) { setAuthed(true) }
  }

  useEffect(() => {
    if (authed) fetchJobs(filter)
  }, [authed, filter, fetchJobs])

  function openJob(job: Job) {
    setSelected(job)
    setEditCaptionZh(job.caption_zh || '')
    setEditCaptionEn(job.caption_en || '')
    setEditHashtags(job.hashtags || '')
    setSelPlatforms(job.platforms || ['facebook', 'threads'])
    setMsg('')
  }

  async function saveEdits() {
    if (!selected) return
    setLoading(true)
    await fetch(`/api/afterschool/jobs/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({
        caption_zh: editCaptionZh,
        caption_en: editCaptionEn,
        hashtags: editHashtags,
        platforms: selPlatforms,
      }),
    })
    setLoading(false)
    setMsg('已儲存')
  }

  async function rejectJob() {
    if (!selected || !confirm('確認拒絕此工作？')) return
    setLoading(true)
    await fetch(`/api/afterschool/jobs/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ status: 'rejected' }),
    })
    setSelected(null)
    await fetchJobs(filter)
    setLoading(false)
  }

  async function approveAndPost() {
    if (!selected || !confirm(`確認發佈到 ${selPlatforms.join(', ')}？`)) return
    setLoading(true)
    setMsg('')
    // Save edits first
    await fetch(`/api/afterschool/jobs/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ caption_zh: editCaptionZh, caption_en: editCaptionEn, hashtags: editHashtags, platforms: selPlatforms, status: 'approved' }),
    })
    // Trigger posting
    const res = await fetch(`/api/afterschool/approve/${selected.id}`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
    })
    const data = await res.json() as { success?: boolean; error?: string; post_ids?: Record<string, string | null> }
    if (data.success) {
      setMsg(`✅ 已發佈！${JSON.stringify(data.post_ids)}`)
      await fetchJobs(filter)
      setSelected(null)
    } else {
      setMsg(`❌ 發佈失敗：${data.error}`)
    }
    setLoading(false)
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#1a0a00' }}>
        <div className="w-full max-w-xs bg-white/10 rounded-2xl p-6 text-center border border-amber-400/20">
          <div className="text-3xl mb-3">🔐</div>
          <h1 className="text-amber-200 font-bold text-lg mb-4">管理員後台</h1>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            placeholder="輸入管理員密碼"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-amber-100 placeholder-amber-100/30 text-sm outline-none focus:border-amber-400/60 mb-3"
          />
          <button
            onClick={handleAuth}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #c47c1a, #e6a22e)' }}
          >
            進入
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: '#1a0a00' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-amber-200 font-bold text-xl">☕ ASC 內容審核</h1>
          <button onClick={() => fetchJobs(filter)} className="text-amber-400/60 text-sm hover:text-amber-400">↻ 刷新</button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {['pending', 'generating', 'ready', 'posted', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); setSelected(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === s ? 'bg-amber-400 text-amber-900' : 'bg-white/10 text-amber-200/70'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {selected ? (
          /* Detail view */
          <div className="space-y-4">
            <button onClick={() => setSelected(null)} className="text-amber-400/70 text-sm">← 返回列表</button>

            <div className="grid grid-cols-2 gap-3">
              {selected.original_image_url && (
                <div>
                  <p className="text-amber-400/60 text-xs mb-1">原圖</p>
                  <img src={selected.original_image_url} alt="Original" className="w-full rounded-xl" />
                </div>
              )}
              {selected.generated_image_url && (
                <div>
                  <p className="text-amber-400/60 text-xs mb-1">生成圖</p>
                  <img src={selected.generated_image_url} alt="Generated" className="w-full rounded-xl" />
                </div>
              )}
            </div>

            <div className="bg-white/5 rounded-xl p-3 text-sm">
              <p className="text-amber-400/60 text-xs mb-1">客人訊息</p>
              <p className="text-amber-100">{selected.customer_message}</p>
              <p className="text-amber-100/40 text-xs mt-1">by {selected.customer_name || '匿名'} · {selected.mode}</p>
            </div>

            <div>
              <label className="text-amber-200 text-sm block mb-1">繁中文案</label>
              <textarea value={editCaptionZh} onChange={e => setEditCaptionZh(e.target.value)} rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-amber-100 text-sm outline-none focus:border-amber-400/60 resize-none" />
            </div>
            <div>
              <label className="text-amber-200 text-sm block mb-1">English Caption</label>
              <textarea value={editCaptionEn} onChange={e => setEditCaptionEn(e.target.value)} rows={2}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-amber-100 text-sm outline-none focus:border-amber-400/60 resize-none" />
            </div>
            <div>
              <label className="text-amber-200 text-sm block mb-1">Hashtags</label>
              <input value={editHashtags} onChange={e => setEditHashtags(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-amber-100 text-sm outline-none focus:border-amber-400/60" />
            </div>

            {/* Platform checkboxes */}
            <div>
              <p className="text-amber-200 text-sm mb-2">發佈平台</p>
              <div className="flex gap-3">
                {PLATFORMS.map(p => (
                  <label key={p} className="flex items-center gap-1.5 text-amber-100/80 text-sm cursor-pointer">
                    <input type="checkbox" checked={selPlatforms.includes(p)}
                      onChange={e => setSelPlatforms(e.target.checked ? [...selPlatforms, p] : selPlatforms.filter(x => x !== p))}
                      className="accent-amber-400"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            {msg && <p className="text-sm bg-white/10 rounded-xl px-3 py-2 text-amber-200">{msg}</p>}

            <div className="flex gap-3">
              <button onClick={rejectJob} disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-red-300 border border-red-400/30 bg-red-400/10">
                拒絕
              </button>
              <button onClick={saveEdits} disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-amber-200 border border-amber-400/30 bg-white/5">
                儲存草稿
              </button>
              <button onClick={approveAndPost} disabled={loading || selPlatforms.length === 0}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(90deg, #c47c1a, #e6a22e)' }}>
                {loading ? '發佈中…' : '批准發佈'}
              </button>
            </div>
          </div>
        ) : (
          /* List view */
          <div className="space-y-3">
            {jobs.length === 0 && <p className="text-amber-100/40 text-sm text-center py-8">暫無 {filter} 工作</p>}
            {jobs.map(job => (
              <div key={job.id}
                onClick={() => openJob(job)}
                className="bg-white/5 border border-amber-400/10 rounded-xl p-4 cursor-pointer hover:border-amber-400/30 transition-all flex gap-3">
                {(job.generated_image_url || job.original_image_url) && (
                  <img src={job.generated_image_url || job.original_image_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-amber-200 font-medium text-sm">{job.customer_name || '匿名'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                      job.status === 'ready' ? 'bg-green-500/20 text-green-300' :
                      job.status === 'posted' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-white/10 text-amber-100/60'
                    }`}>{job.status}</span>
                    <span className="text-amber-100/30 text-xs">{job.mode}</span>
                  </div>
                  <p className="text-amber-100/70 text-xs truncate">{job.customer_message}</p>
                  <p className="text-amber-100/30 text-xs mt-0.5">{new Date(job.created_at).toLocaleString('zh-HK')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
