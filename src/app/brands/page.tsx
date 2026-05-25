import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'
import { BRAND_PORTAL_CONFIGS } from '@/lib/brandPortalConfig'

export const metadata: Metadata = {
  title: 'CloudPipe · 品牌 AI 能見度報告',
  description: '查看各品牌的 AI 引用狀態、AEO 行動進度與每週缺口建議。',
  robots: 'index, follow',
}

export const dynamic = 'force-dynamic'

async function getBrandSummaries() {
  const supabase = createServiceClient()

  const summaries = await Promise.all(
    BRAND_PORTAL_CONFIGS.map(async (cfg) => {
      const joinDate = new Date(cfg.joinDate)
      const dayNumber = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / 86_400_000) + 1)

      // AEO progress
      const { data: actions } = await supabase
        .from('brand_aeo_actions')
        .select('status')
        .eq('brand_slug', cfg.slug)

      const done = (actions || []).filter(a => a.status === 'done').length
      const total = (actions || []).length

      // Recent AI mentions
      const { data: recent } = await supabase
        .from('ai_search_results')
        .select('mentioned, timestamp')
        .eq('brand_slug', cfg.slug)
        .order('timestamp', { ascending: false })
        .limit(10)

      const recentMentions = (recent || []).filter(r => r.mentioned).length
      const mentionedEngines = cfg.engines.filter(e => e.mentioned).length

      return {
        ...cfg,
        dayNumber,
        aeo: { done, total },
        mentionedEngines,
        recentMentions,
      }
    })
  )

  return summaries
}

export default async function BrandsIndexPage() {
  const brands = await getBrandSummaries()

  return (
    <div style={{ background: '#08111F', minHeight: '100vh', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,17,31,0.94)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 26, height: 26, background: '#F5C842', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7C2 4.23858 4.23858 2 7 2C9.76142 2 12 4.23858 12 7" stroke="#08111F" strokeWidth="2" strokeLinecap="round"/>
                <path d="M7 12V7" stroke="#08111F" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="7" cy="7" r="1.5" fill="#08111F"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>CloudPipe</span>
          </Link>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(220,230,244,0.4)' }}>
            AI 能見度報告
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.5)' }} />
            <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)' }}>即時數據</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#DCE6F4', letterSpacing: '-0.01em', marginBottom: 6 }}>
            品牌 AI 能見度概覽
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(220,230,244,0.45)' }}>
            選擇品牌，查看詳細 AI 引用狀態、競品分析與每週缺口建議
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {brands.map((b) => {
            const aeoPercent = b.aeo.total > 0 ? Math.round(b.aeo.done / b.aeo.total * 100) : 0
            const mentionColor = b.mentionedEngines >= 3 ? '#4ADE80' : b.mentionedEngines >= 2 ? '#FBBF24' : b.mentionedEngines >= 1 ? '#F5C842' : '#F87171'

            return (
              <Link
                key={b.slug}
                href={`/brands/${b.slug}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{
                  background: '#0C1B32',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 13,
                  padding: 22,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, transform 0.15s',
                }}>
                  {/* Brand header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(220,230,244,0.4)', marginBottom: 3 }}>
                        {b.industry}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 600, color: '#DCE6F4', letterSpacing: '-0.01em' }}>
                        {b.name}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(245,200,66,0.07)',
                      border: '1px solid rgba(245,200,66,0.12)',
                      color: '#F5C842',
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: 10, fontWeight: 500,
                      padding: '2px 8px', borderRadius: 20,
                      flexShrink: 0,
                    }}>
                      D{b.dayNumber}
                    </div>
                  </div>

                  {/* AI Engine dots */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    {b.engines.map(e => (
                      <div key={e.key} style={{
                        flex: 1, padding: '7px 0',
                        background: e.mentioned ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${e.mentioned ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: 7,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      }}>
                        <div style={{ fontSize: 11, color: e.mentioned ? '#4ADE80' : 'rgba(220,230,244,0.35)', fontWeight: 700 }}>
                          {e.mentioned ? '✓' : '–'}
                        </div>
                        <div style={{ fontSize: 9, color: 'rgba(220,230,244,0.4)' }}>{e.name}</div>
                      </div>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 16, fontWeight: 500, color: mentionColor, lineHeight: 1 }}>
                        {b.mentionedEngines}/4
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(220,230,244,0.4)', marginTop: 2 }}>AI 引用</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 16, fontWeight: 500, color: '#DCE6F4', lineHeight: 1 }}>
                        {aeoPercent}%
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(220,230,244,0.4)', marginTop: 2 }}>AEO 完成</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '8px 10px' }}>
                      <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 16, fontWeight: 500, color: '#DCE6F4', lineHeight: 1 }}>
                        {b.aeo.done}/{b.aeo.total || '—'}
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(220,230,244,0.4)', marginTop: 2 }}>行動完成</div>
                    </div>
                  </div>

                  {/* AEO progress bar */}
                  {b.aeo.total > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${aeoPercent}%`, background: 'linear-gradient(90deg, #F5C842 0%, #FFD96A 100%)', borderRadius: 2 }} />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(220,230,244,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    查看完整報告
                    <span>→</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
