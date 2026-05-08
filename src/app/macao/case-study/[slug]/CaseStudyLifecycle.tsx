'use client'

import { useState } from 'react'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CP = {
  navy:       '#08111F',
  navyLight:  '#0D1B2E',
  gold:       '#F5C842',
  goldDim:    'rgba(245,200,66,0.15)',
  goldBorder: 'rgba(245,200,66,0.3)',
  glass:      'rgba(255,255,255,0.04)',
  glassBorder:'rgba(255,255,255,0.09)',
  muted:      'rgba(255,255,255,0.5)',
  faint:      'rgba(255,255,255,0.25)',
  green:      '#4ADE80',
  greenBg:    'rgba(74,222,128,0.08)',
  greenBorder:'rgba(74,222,128,0.2)',
  red:        '#F87171',
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlatformRank { position: number; mentioned: boolean }
interface CrawlerPoint {
  label: string | null; date: string | null
  crawler24h: number; faqCount: number; lifecycleArticles: number
  gptbot: number; claudebot: number; perplexitybot: number
}
interface LifecycleData {
  brand: {
    nameZh: string; joinDate: string; primaryQuery: string
    uniqueFacts: string[]; description: string; category: string
  }
  slug: string; currentDay: number
  platformSnapshots: Record<string, Record<string, PlatformRank>>
  articles: { slug: string; title: string; published_at: string; tags: string[] }[]
  articleCount: number; lifecycleFaqCount: number
  crawlerTimeline: CrawlerPoint[]
  themes: Record<number, string>
}

// ─── Platform icons & colors ──────────────────────────────────────────────────
const PLATFORMS: Record<string, { label: string; color: string; icon: string }> = {
  perplexity: { label: 'Perplexity', color: '#20B2AA', icon: '🔍' },
  gemini:     { label: 'Gemini',     color: '#4285F4', icon: '✨' },
  chatgpt:    { label: 'ChatGPT',    color: '#10A37F', icon: '💬' },
  grok:       { label: 'Grok',       color: '#E5E7EB', icon: '𝕏' },
}

function RankBadge({ platform, data }: { platform: string; data?: PlatformRank }) {
  const meta = PLATFORMS[platform] || { label: platform, color: '#999', icon: '•' }
  if (!data) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <span style={{ fontSize:20 }}>{meta.icon}</span>
      <span style={{ fontSize:11, color: CP.faint }}>{meta.label}</span>
      <span style={{ fontSize:13, color: CP.faint }}>—</span>
    </div>
  )
  const mentioned = data.mentioned && data.position > 0
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <span style={{ fontSize:20 }}>{meta.icon}</span>
      <span style={{ fontSize:11, color: CP.faint }}>{meta.label}</span>
      {mentioned
        ? <span style={{ fontSize:15, fontWeight:700, color: CP.green }}>#{data.position}</span>
        : <span style={{ fontSize:13, color: CP.red }}>❌</span>
      }
    </div>
  )
}

function SnapshotRow({ label, snapshot }: { label: string; snapshot?: Record<string, PlatformRank> }) {
  const platforms = ['perplexity', 'gemini', 'chatgpt', 'grok']
  const mentionedCount = snapshot
    ? platforms.filter(p => snapshot[p]?.mentioned && snapshot[p]?.position > 0).length : 0

  return (
    <div style={{
      background: CP.glass, border: `1px solid ${CP.glassBorder}`,
      borderRadius: 12, padding: '16px 20px',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span style={{ color: CP.gold, fontWeight:700, fontSize:13 }}>{label}</span>
        <span style={{ color: CP.muted, fontSize:12 }}>{mentionedCount}/4 平台提及</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {platforms.map(p => <RankBadge key={p} platform={p} data={snapshot?.[p]} />)}
      </div>
    </div>
  )
}

const DAY_EMOJIS: Record<number, string> = {
  1:'🌱',2:'📦',3:'❓',4:'🌍',5:'⚖️',6:'📊',7:'📈',
  8:'👤',9:'📍',10:'🔬',11:'📱',12:'🌸',13:'🧠',14:'🏆',
}

function DayTimeline({ day, theme, article, isCompleted, isCurrent }: {
  day: number; theme: string
  article?: { title: string; slug: string }
  isCompleted: boolean; isCurrent: boolean
}) {
  return (
    <div style={{
      display:'flex', gap:12, alignItems:'flex-start',
      opacity: isCompleted || isCurrent ? 1 : 0.4,
    }}>
      <div style={{
        width:36, height:36, borderRadius:'50%', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: isCurrent ? CP.gold : isCompleted ? CP.greenBg : CP.glass,
        border: `2px solid ${isCurrent ? CP.gold : isCompleted ? CP.green : CP.glassBorder}`,
        fontSize: 16,
      }}>
        {isCompleted ? '✓' : DAY_EMOJIS[day] || day}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:2 }}>
          <span style={{
            fontSize:11, color: isCurrent ? CP.gold : CP.muted,
            fontWeight: isCurrent ? 700 : 400
          }}>
            Day {day} {isCurrent ? '← 今天' : ''}
          </span>
          <span style={{
            fontSize:11, padding:'1px 6px', borderRadius:4,
            background: CP.glass, color: CP.faint,
          }}>{theme}</span>
        </div>
        {article && (
          <p style={{ fontSize:13, color:'white', lineHeight:1.4, margin:0 }}>
            {article.title}
          </p>
        )}
        {!article && isCompleted && (
          <p style={{ fontSize:12, color: CP.faint, margin:0 }}>文章生成中...</p>
        )}
        {!article && !isCompleted && (
          <p style={{ fontSize:12, color: CP.faint, margin:0 }}>待生成</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CaseStudyLifecycle({ data }: { data: LifecycleData }) {
  const { brand, slug, currentDay, platformSnapshots, articles, articleCount,
          lifecycleFaqCount, crawlerTimeline, themes } = data

  const [activeTab, setActiveTab] = useState<'journey' | 'rankings' | 'data'>('journey')

  // Find the relevant snapshots
  const w0Label = Object.keys(platformSnapshots).find(k => k.startsWith('W0') || k.startsWith('D0'))
  const d7Label = Object.keys(platformSnapshots).find(k => k.startsWith('D7') || k.includes('T+7'))
  const d14Label = Object.keys(platformSnapshots).find(k => k.startsWith('D14'))

  // Build article map by day
  const articlesByDay: Record<number, { title: string; slug: string }> = {}
  for (const a of articles) {
    const dayTag = a.tags?.find(t => t.startsWith('day'))
    if (dayTag) {
      const d = parseInt(dayTag.replace('day', ''))
      if (d) articlesByDay[d] = { title: a.title, slug: a.slug }
    }
  }

  const countMentioned = (label: string | undefined) =>
    label ? Object.values(platformSnapshots[label] || {}).filter(r => r.mentioned && r.position > 0).length : 0

  const mentionedPlatforms = countMentioned(d7Label) || countMentioned(w0Label)

  return (
    <div style={{ background: CP.navy, minHeight:'100vh', color:'white', fontFamily:'system-ui, sans-serif' }}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${CP.navyLight} 0%, #0a1628 100%)`,
        borderBottom: `1px solid ${CP.glassBorder}`, padding:'48px 24px 36px',
      }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <span style={{
              padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
              background: CP.goldDim, color: CP.gold, border:`1px solid ${CP.goldBorder}`,
            }}>CloudPipe 商業案例</span>
            <span style={{
              padding:'3px 10px', borderRadius:20, fontSize:11,
              background: CP.glass, color: CP.muted, border:`1px solid ${CP.glassBorder}`,
            }}>{brand.category}</span>
          </div>

          <h1 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:800, margin:'0 0 12px', lineHeight:1.2 }}>
            {brand.nameZh}
            <span style={{ display:'block', color: CP.gold, fontSize:'70%' }}>
              14日 AI 能見度成長紀錄
            </span>
          </h1>
          <p style={{ color: CP.muted, fontSize:15, margin:'0 0 24px', maxWidth:600 }}>
            {brand.description}
          </p>

          {/* Progress bar */}
          <div style={{ marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, color: CP.muted }}>生命週期進度</span>
              <span style={{ fontSize:12, color: CP.gold, fontWeight:700 }}>Day {currentDay} / 14</span>
            </div>
            <div style={{ height:6, background: CP.glass, borderRadius:3, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:3,
                width:`${(currentDay / 14) * 100}%`,
                background: `linear-gradient(90deg, ${CP.gold}, #F97316)`,
                transition:'width 0.6s ease',
              }} />
            </div>
          </div>

          {/* 3 unique facts */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:20 }}>
            {brand.uniqueFacts.map((f, i) => (
              <div key={i} style={{
                padding:'6px 12px', borderRadius:8, fontSize:12,
                background: CP.glass, border:`1px solid ${CP.glassBorder}`,
                color:'white', maxWidth:280,
              }}>
                <span style={{ color: CP.gold, marginRight:4 }}>▸</span>{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Data Wall ─────────────────────────────────────────────── */}
      <div style={{ background: CP.goldDim, borderBottom:`1px solid ${CP.goldBorder}`, padding:'24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {[
            {
              value: articleCount > 0 ? `${articleCount}篇` : `${currentDay}天`,
              label: articleCount > 0 ? '旗艦文章已生成' : '生命週期天數',
              sub: `目標 14 篇`,
            },
            {
              value: lifecycleFaqCount > 0 ? `${lifecycleFaqCount}條` : `${currentDay * 5}條`,
              label: 'AI 優化 FAQ',
              sub: `每天新增 5 條`,
            },
            {
              value: mentionedPlatforms > 0 ? `${mentionedPlatforms}/4` : '進行中',
              label: 'AI 平台首推',
              sub: mentionedPlatforms > 0 ? `${Math.round(mentionedPlatforms/4*100)}% 主流平台` : '持續建設中',
            },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:800, color: CP.gold }}>{stat.value}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'white', margin:'4px 0 2px' }}>{stat.label}</div>
              <div style={{ fontSize:11, color: CP.muted }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Nav ───────────────────────────────────────────────── */}
      <div style={{ borderBottom:`1px solid ${CP.glassBorder}`, padding:'0 24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', gap:0 }}>
          {([
            { id:'journey', label:'14日旅程' },
            { id:'rankings', label:'AI 排名快照' },
            { id:'data',    label:'爬蟲數據' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding:'14px 20px', fontSize:13, fontWeight:600, cursor:'pointer',
              background:'transparent', border:'none', outline:'none',
              color: activeTab === tab.id ? CP.gold : CP.muted,
              borderBottom: activeTab === tab.id ? `2px solid ${CP.gold}` : '2px solid transparent',
              transition:'all 0.2s',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 24px 64px' }}>

        {/* Journey Tab */}
        {activeTab === 'journey' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <h2 style={{ fontSize:18, fontWeight:700, margin:'0 0 16px', color:'white' }}>
              每日旗艦文章生成記錄
            </h2>
            {Array.from({ length: 14 }, (_, i) => i + 1).map(day => (
              <DayTimeline
                key={day}
                day={day}
                theme={themes[day] || ''}
                article={articlesByDay[day]}
                isCompleted={day < currentDay}
                isCurrent={day === currentDay}
              />
            ))}
          </div>
        )}

        {/* Rankings Tab */}
        {activeTab === 'rankings' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <h2 style={{ fontSize:18, fontWeight:700, margin:'0 0 4px', color:'white' }}>
              AI 平台排名快照
            </h2>
            <p style={{ color: CP.muted, fontSize:13, margin:'0 0 16px' }}>
              查詢詞：「{brand.primaryQuery}」｜驗證節點：D0 / D7 / D14
            </p>

            {w0Label
              ? <SnapshotRow label={`W0 基線（${w0Label}）`} snapshot={platformSnapshots[w0Label]} />
              : <SnapshotRow label="W0 基線（待驗證）" snapshot={undefined} />
            }
            {d7Label
              ? <SnapshotRow label={`D7 重測（${d7Label}）`} snapshot={platformSnapshots[d7Label]} />
              : <div style={{
                  background: CP.glass, border:`1px solid ${CP.glassBorder}`,
                  borderRadius:12, padding:'16px 20px', color: CP.muted, fontSize:13,
                }}>
                  D7 驗證（{new Date(new Date(brand.joinDate).getTime() + 6*86400000).toLocaleDateString('zh-HK')}）待完成
                </div>
            }
            {d14Label
              ? <SnapshotRow label={`D14 最終（${d14Label}）`} snapshot={platformSnapshots[d14Label]} />
              : <div style={{
                  background: CP.glass, border:`1px solid ${CP.glassBorder}`,
                  borderRadius:12, padding:'16px 20px', color: CP.muted, fontSize:13,
                }}>
                  D14 最終驗收（{new Date(new Date(brand.joinDate).getTime() + 13*86400000).toLocaleDateString('zh-HK')}）待完成
                </div>
            }

            <div style={{
              background: CP.greenBg, border:`1px solid ${CP.greenBorder}`,
              borderRadius:12, padding:'16px 20px', marginTop:8,
            }}>
              <p style={{ color: CP.green, fontWeight:600, fontSize:13, margin:'0 0 6px' }}>
                📋 驗證方法說明
              </p>
              <p style={{ color: CP.muted, fontSize:12, margin:0, lineHeight:1.6 }}>
                AI 排名由 MCP Playwright 人工驗證（D0 / D7 / D14 三個節點）。
                Perplexity 和 Gemini 為即時索引，可在14天內見效；
                ChatGPT 受訓練數據截止限制，完整效果需 6-12 個月。
              </p>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <h2 style={{ fontSize:18, fontWeight:700, margin:'0 0 4px', color:'white' }}>
              AI 爬蟲訪問數據
            </h2>
            <p style={{ color: CP.muted, fontSize:13, margin:'0 0 16px' }}>
              每日自動記錄，爬蟲訪問 = AI 引擎正在學習你的內容
            </p>

            {crawlerTimeline.length > 0 ? (
              crawlerTimeline.map((point, i) => (
                <div key={i} style={{
                  background: CP.glass, border:`1px solid ${CP.glassBorder}`,
                  borderRadius:12, padding:'14px 18px',
                  display:'grid', gridTemplateColumns:'auto 1fr', gap:16, alignItems:'center',
                }}>
                  <div>
                    <div style={{ color: CP.gold, fontWeight:700, fontSize:12 }}>{point.label}</div>
                    <div style={{ color: CP.faint, fontSize:11 }}>{point.date}</div>
                  </div>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    {[
                      { label:'總爬蟲', value:point.crawler24h },
                      { label:'GPTBot', value:point.gptbot },
                      { label:'ClaudeBot', value:point.claudebot },
                      { label:'PerplexityBot', value:point.perplexitybot },
                      { label:'FAQ累計', value:point.faqCount },
                      { label:'旗艦文章', value:point.lifecycleArticles },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign:'center' }}>
                        <div style={{ fontSize:15, fontWeight:700, color:'white' }}>{m.value}</div>
                        <div style={{ fontSize:10, color: CP.faint }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                background: CP.glass, border:`1px solid ${CP.glassBorder}`,
                borderRadius:12, padding:'24px', textAlign:'center', color: CP.muted,
              }}>
                <p style={{ margin:0 }}>爬蟲數據將從今天開始記錄，每天 UTC 11:30 更新</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <div style={{
        background:`linear-gradient(135deg, rgba(245,200,66,0.08), rgba(245,200,66,0.02))`,
        borderTop:`1px solid ${CP.goldBorder}`, padding:'48px 24px',
        textAlign:'center',
      }}>
        <h2 style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:800, margin:'0 0 12px' }}>
          你的品牌也能在 14 天內被 AI 認識
        </h2>
        <p style={{ color: CP.muted, margin:'0 0 24px', maxWidth:500, marginLeft:'auto', marginRight:'auto' }}>
          CloudPipe 將你的品牌知識注入 AI 引擎，每天自動生成優化內容，
          讓 Perplexity、Gemini、ChatGPT 主動推薦你。
        </p>
        <a
          href="/macao/case-studies"
          style={{
            display:'inline-block', padding:'14px 32px', borderRadius:8, fontWeight:700, fontSize:15,
            background: CP.gold, color: CP.navy, textDecoration:'none',
            transition:'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          查看所有品牌案例 →
        </a>
        <div style={{ marginTop:12 }}>
          <a href="/macao/pricing" style={{ color: CP.gold, fontSize:13, textDecoration:'underline' }}>
            了解 CloudPipe 定價方案
          </a>
        </div>
      </div>

    </div>
  )
}
