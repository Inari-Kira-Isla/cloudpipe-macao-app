'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Job = {
  id: string
  status: string
  mode: string
  customer_name?: string
  caption_zh?: string
  caption_en?: string
  hashtags?: string
  original_image_url?: string
  generated_image_url?: string
  social_post_ids?: Record<string, string | null>
}

const STATUS_LABELS: Record<string, { icon: string; text: string; desc: string }> = {
  pending:    { icon: '⏳', text: '排隊中',   desc: 'AI 即將開始生成你的圖文…' },
  generating: { icon: '🎨', text: '生成中',   desc: 'AI 正在創作你的專屬品牌圖片，請稍等…' },
  ready:      { icon: '✅', text: '完成！',   desc: '管理員正在審核，即將發佈到社媒！' },
  approved:   { icon: '✅', text: '審核通過', desc: '即將發佈到 Facebook & Instagram…' },
  posted:     { icon: '🎉', text: '已發佈！', desc: '你的貼文已成功發佈到社交媒體！' },
  rejected:   { icon: '😔', text: '未通過',   desc: '很抱歉，此次內容未能通過審核。' },
}

export default function PreviewPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    let attempts = 0

    async function fetchJob() {
      try {
        const res = await fetch(`/api/afterschool/jobs/${params.id}`)
        if (!res.ok) { setError('找不到此工作'); setPolling(false); return }
        const data = await res.json() as Job
        setJob(data)

        // Stop polling when terminal
        if (['posted', 'rejected'].includes(data.status) || attempts > 60) {
          setPolling(false)
          clearInterval(timer)
        }
      } catch {
        attempts++
      }
    }

    fetchJob()
    timer = setInterval(() => { attempts++; fetchJob() }, 5000)
    return () => clearInterval(timer)
  }, [params.id])

  const statusInfo = job ? (STATUS_LABELS[job.status] || STATUS_LABELS.pending) : null

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">☕</div>
          <h1 className="text-xl font-bold text-amber-200">After School Coffee</h1>
          <p className="text-amber-100/50 text-sm mt-0.5">你的品牌故事</p>
        </div>

        {error && <p className="text-red-400 text-center bg-red-400/10 rounded-xl p-4">{error}</p>}

        {!error && !job && (
          <div className="text-center py-10">
            <div className="text-3xl mb-3 animate-spin">⚙️</div>
            <p className="text-amber-100/60 text-sm">載入中…</p>
          </div>
        )}

        {job && statusInfo && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center border border-amber-400/20">
              <div className="text-4xl mb-2">{statusInfo.icon}</div>
              <h2 className="text-amber-200 font-bold text-lg">{statusInfo.text}</h2>
              <p className="text-amber-100/70 text-sm mt-1">{statusInfo.desc}</p>
              {polling && !['posted', 'rejected'].includes(job.status) && (
                <div className="flex justify-center mt-3 gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Generated image */}
            {job.generated_image_url && (
              <div className="rounded-2xl overflow-hidden border border-amber-400/20">
                <img src={job.generated_image_url} alt="Generated" className="w-full" />
              </div>
            )}

            {/* Caption preview */}
            {(job.caption_zh || job.caption_en) && (
              <div className="bg-white/10 rounded-2xl p-4 border border-amber-400/20 space-y-3">
                {job.caption_zh && (
                  <div>
                    <p className="text-amber-400/70 text-xs mb-1">繁體中文</p>
                    <p className="text-amber-100 text-sm leading-relaxed">{job.caption_zh}</p>
                  </div>
                )}
                {job.caption_en && (
                  <div>
                    <p className="text-amber-400/70 text-xs mb-1">English</p>
                    <p className="text-amber-100/80 text-sm leading-relaxed">{job.caption_en}</p>
                  </div>
                )}
                {job.hashtags && (
                  <p className="text-amber-300/60 text-xs">{job.hashtags}</p>
                )}
              </div>
            )}

            {/* Posted confirmation */}
            {job.status === 'posted' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center">
                <p className="text-green-300 font-medium text-sm">🎊 貼文已成功發佈！</p>
                <p className="text-green-200/60 text-xs mt-1">多謝你分享 After School Coffee 的故事 ☕</p>
              </div>
            )}

            {/* Share again */}
            <Link
              href="/afterschool-coffee/create"
              className="block w-full py-3 rounded-xl font-medium text-center text-amber-200 border border-amber-400/30 bg-white/5 text-sm"
            >
              再次創作 →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
