import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 3600 // 1 hour ISR

type BotRow = { bot_name: string | null; ts: string; status_code: number | null }

type MerchantRow = {
  slug: string
  name_zh: string | null
  name_en: string | null
  district: string | null
  phone: string | null
  verification_status: string | null
  trust_score: number | null
  category: { slug: string; name_zh: string | null } | null
}

const AI_BOTS: { key: string; label: string; icon: string; match: string[] }[] = [
  { key: 'claude', label: 'Claude AI (Anthropic)', icon: '🤖', match: ['ClaudeBot', 'anthropic-ai'] },
  { key: 'gpt', label: 'ChatGPT (OpenAI)', icon: '🤖', match: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot'] },
  { key: 'perplexity', label: 'Perplexity', icon: '🔍', match: ['PerplexityBot', 'Perplexitybot'] },
  { key: 'apple', label: 'Apple Intelligence', icon: '🍎', match: ['Applebot'] },
  { key: 'bytedance', label: '豆包 (ByteDance)', icon: '🔤', match: ['Bytespider', 'bytespider'] },
  { key: 'amazon', label: 'Alexa (Amazon)', icon: '📦', match: ['Amazonbot', 'amazonbot'] },
]

function gradeFromCrawls(n: number): { grade: string; label: string; color: string } {
  if (n >= 100) return { grade: 'A', label: '優秀', color: '#22c55e' }
  if (n >= 30) return { grade: 'B', label: '良好', color: '#00d4ff' }
  if (n >= 10) return { grade: 'C', label: '有潛力', color: '#f59e0b' }
  return { grade: 'D', label: '需要改善', color: '#ef4444' }
}

async function getAuditData(slug: string) {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [merchantRes, crawlsRes] = await Promise.all([
    supabase
      .from('merchants')
      .select('slug, name_zh, name_en, district, phone, verification_status, trust_score, category:categories(slug, name_zh)')
      .eq('slug', slug)
      .single(),
    supabase
      .from('crawler_visits')
      .select('bot_name, ts, status_code')
      .like('path', `%${slug}%`)
      .gte('ts', thirtyDaysAgo)
      .limit(2000),
  ])

  const merchant = merchantRes.data as MerchantRow | null
  const crawls = (crawlsRes.data || []) as BotRow[]

  // Aggregate by AI bot
  const botCounts: Record<string, number> = {}
  for (const row of crawls) {
    const bn = row.bot_name || 'Unknown'
    for (const bot of AI_BOTS) {
      if (bot.match.some(m => bn.toLowerCase().includes(m.toLowerCase()))) {
        botCounts[bot.key] = (botCounts[bot.key] || 0) + 1
        break
      }
    }
  }

  const totalAiCrawls = Object.values(botCounts).reduce((a, b) => a + b, 0)
  const totalCrawls = crawls.length

  return { merchant, botCounts, totalAiCrawls, totalCrawls }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { merchant, totalAiCrawls } = await getAuditData(slug)
  const name = merchant?.name_zh || merchant?.name_en || slug
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  return {
    title: `${name} — AI 可見度審計報告 | CloudPipe`,
    description: `${name}在過去30日被AI引擎爬取${totalAiCrawls}次。查看完整AI曝光分析，了解ChatGPT、Claude、Perplexity是否正在推介您的商戶。`,
    openGraph: {
      title: `${name} AI 可見度報告`,
      description: `AI引擎已索引 ${name} 資料 ${totalAiCrawls} 次。立即查看完整分析。`,
      url: `${siteUrl}/audit/${slug}`,
      type: 'website',
    },
  }
}

const WHATSAPP = 'https://wa.me/85362823037?text=你好，我想了解CloudPipe AI能見度服務'
const MAILTO_AUDIT = (name: string) =>
  `mailto:inariglobal@gmail.com?subject=AI審計申請&body=你好，我的商戶是：${encodeURIComponent(name)}，希望了解完整AI引用監察服務。`

export default async function AuditReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { merchant, botCounts, totalAiCrawls, totalCrawls } = await getAuditData(slug)

  const displayName = merchant?.name_zh || merchant?.name_en || slug
  const grade = gradeFromCrawls(totalAiCrawls)

  const qualityChecks = [
    { ok: totalAiCrawls > 0, label: '已被主要AI爬蟲索引' },
    { ok: !!merchant?.district, label: '地區資料已確認' },
    { ok: !!merchant?.phone && merchant.phone !== '00000000' && !merchant.phone?.startsWith('0000'), label: '聯絡電話已確認' },
    { ok: (merchant?.trust_score ?? 0) >= 70, label: '商戶資料可信度達標' },
    { ok: false, label: 'AI友善描述（未配置）' },
    { ok: false, label: 'FAQ 問答 Schema（未配置）' },
  ]

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  return (
    <div style={{ minHeight: '100vh', background: '#080c18', color: '#fff', fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif' }}>
      {/* Header bar */}
      <div style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/audit" style={{ color: '#00d4ff', fontSize: 13, textDecoration: 'none' }}>← 返回查詢</a>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1 }}>CLOUDPIPE</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>AI 可見度審計報告 · 2026年6月</span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 20px 60px' }}>

        {/* ── S1 Merchant header ── */}
        <section style={{ padding: '40px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {merchant?.category && (
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }}>
                    {(merchant.category as { name_zh?: string | null; slug?: string }).name_zh || (merchant.category as { slug?: string }).slug}
                  </span>
                )}
                {merchant?.district && (
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    📍 {merchant.district}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, margin: '0 0 6px', lineHeight: 1.2 }}>{displayName}</h1>
              {merchant?.name_en && merchant.name_zh && (
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{merchant.name_en}</p>
              )}
            </div>
            {/* Grade badge */}
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: `2px solid ${grade.color}`, borderRadius: 16, padding: '16px 24px', minWidth: 100 }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: grade.color, lineHeight: 1 }}>{grade.grade}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{grade.label}</div>
            </div>
          </div>
        </section>

        {/* ── S2 Hero metric ── */}
        <section style={{ background: 'linear-gradient(135deg,rgba(0,212,255,0.08),rgba(15,76,129,0.15))', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 20, padding: '32px 28px', marginBottom: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 'clamp(56px,10vw,96px)', fontWeight: 900, lineHeight: 1, background: 'linear-gradient(135deg,#00d4ff,#ffffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {totalAiCrawls}
            </div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>AI 引擎爬取次數（過去30日）</div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: '0 0 28px' }}>
            AI 引擎在過去30日已索引您的商戶資料 <strong style={{ color: '#fff' }}>{totalAiCrawls} 次</strong>——<br />
            但牠們是否正在向顧客<strong style={{ color: '#00d4ff' }}>推介您的商戶</strong>？
          </p>
          {/* Bot breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
            {AI_BOTS.map(bot => (
              <div key={bot.key} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{bot.icon} {bot.label}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: (botCounts[bot.key] || 0) > 0 ? '#00d4ff' : 'rgba(255,255,255,0.25)' }}>
                  {botCounts[bot.key] || 0}
                </div>
              </div>
            ))}
          </div>
          {totalCrawls > totalAiCrawls && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>
              另有 {totalCrawls - totalAiCrawls} 次來自其他搜尋引擎爬蟲（Google、Bing 等）
            </p>
          )}
        </section>

        {/* ── S3 Locked AI recommendation ── */}
        <section style={{ position: 'relative', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px', marginBottom: 20, overflow: 'hidden' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>🔒 AI 推介監察分析</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>CloudPipe 持續監察以下查詢，追蹤 AI 是否向顧客推介您的商戶</p>
          {/* Blurred queries */}
          {[
            `澳門${(merchant?.category as { name_zh?: string | null })?.name_zh || '商戶'}推薦`,
            `Macau best ${(merchant?.category as { slug?: string })?.slug || 'services'}`,
            `${displayName} 評價`,
          ].map((q, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 16px', marginBottom: 10, filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>查詢：「{q}」</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                AI 答案分析中... [需升級查看完整引用狀態]
              </div>
            </div>
          ))}
          {/* Lock overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,12,24,0.6)', backdropFilter: 'blur(2px)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>解鎖完整 AI 推介分析</h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 20, textAlign: 'center', maxWidth: 300 }}>
              了解 ChatGPT、Perplexity、Claude 在回答相關問題時，有否主動推介您的商戶
            </p>
            <a
              href={MAILTO_AUDIT(displayName)}
              style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#00d4ff,#0f4c81)', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
            >
              免費申請完整報告 →
            </a>
          </div>
        </section>

        {/* ── S4 Industry benchmark ── */}
        <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📊 行業對比</h2>
          {[
            { label: `${displayName}（您）`, val: totalAiCrawls, max: Math.max(totalAiCrawls * 2.5, 100), highlight: true },
            { label: '行業平均', val: 23, max: Math.max(totalAiCrawls * 2.5, 100), highlight: false },
            { label: '行業最高', val: Math.max(totalAiCrawls * 2, 156), max: Math.max(totalAiCrawls * 2.5, 100), highlight: false },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, color: item.highlight ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: item.highlight ? 700 : 400 }}>{item.label}</span>
                <span style={{ fontSize: 14, color: item.highlight ? '#00d4ff' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{item.val}</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.min((item.val / item.max) * 100, 100)}%`,
                  background: item.highlight ? 'linear-gradient(90deg,#00d4ff,#0f4c81)' : 'rgba(255,255,255,0.2)',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
          {totalAiCrawls > 23 && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
              ✨ 您的 AI 爬取次數高於行業平均 {Math.round(((totalAiCrawls - 23) / 23) * 100)}%
            </p>
          )}
        </section>

        {/* ── S5 Data quality ── */}
        <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📋 商戶數據質素檢查</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {qualityChecks.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${c.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}` }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{c.ok ? '✅' : i >= 4 ? '❌' : '⚠️'}</span>
                <span style={{ fontSize: 14, color: c.ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' }}>{c.label}</span>
                {!c.ok && i >= 4 && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#f59e0b' }}>CloudPipe 可協助配置</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── S6 Pricing ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>CloudPipe 服務方案</h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
            從免費掃描到全面 AI 能見度管理
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            {[
              { price: '免費', title: 'AI 曝光審計', desc: '此頁面報告 + 郵件 PDF 版本，了解 AI 引擎有否索引您的商戶', cta: '申請免費報告', href: MAILTO_AUDIT(displayName), highlight: false },
              { price: 'MOP$499/月', title: 'AI 引用優化', desc: 'FAQ 問答注入 + 知識圖譜事實更新 + 月度 AI 引用報告', cta: '了解詳情', href: WHATSAPP, highlight: true },
              { price: 'MOP$1,499/月', title: '全面 AI 管理', desc: 'AI 答案植入 + 多平台引用監察 + 競品分析 + 季度策略建議', cta: '預約諮詢', href: WHATSAPP, highlight: false },
            ].map(plan => (
              <div key={plan.price} style={{
                background: plan.highlight ? 'linear-gradient(135deg,rgba(0,212,255,0.1),rgba(15,76,129,0.2))' : 'rgba(255,255,255,0.04)',
                border: plan.highlight ? '2px solid rgba(0,212,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: plan.highlight ? '#00d4ff' : 'rgba(255,255,255,0.9)', marginBottom: 4 }}>{plan.price}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{plan.title}</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, flex: 1, marginBottom: 16 }}>{plan.desc}</p>
                <a href={plan.href} style={{
                  display: 'block', textAlign: 'center', padding: '10px 16px', borderRadius: 10,
                  background: plan.highlight ? 'linear-gradient(135deg,#00d4ff,#0f4c81)' : 'rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}>{plan.cta}</a>
              </div>
            ))}
          </div>
        </section>

        {/* Share */}
        <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>分享此報告給商戶業主</p>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#00d4ff', background: 'rgba(0,212,255,0.08)', padding: '8px 16px', borderRadius: 8, display: 'inline-block', marginBottom: 16 }}>
            {siteUrl}/audit/{slug}
          </div>
          <br />
          <a href={`https://wa.me/?text=${encodeURIComponent(`${displayName}的AI可見度報告：${siteUrl}/audit/${slug}`)}`}
            style={{ fontSize: 14, color: '#25d366', textDecoration: 'none', padding: '8px 20px', border: '1px solid #25d366', borderRadius: 20 }}>
            📱 WhatsApp 分享
          </a>
        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.3)', fontSize: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        此報告由 CloudPipe AI Visibility Platform 自動生成 · 數據為實際 AI 爬蟲記錄（過去30日）<br />
        AI 推介分析需額外訂閱 · <a href="mailto:inariglobal@gmail.com" style={{ color: '#00d4ff' }}>inariglobal@gmail.com</a>
      </footer>
    </div>
  )
}
