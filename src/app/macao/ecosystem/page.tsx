'use client'

import { useEffect, useState } from 'react'

// DESIGN.md tokens
const C = {
  bg: '#fafbfc', fg: '#1a1a2e', accent: '#0f4c81', accentLight: '#e8f0fe',
  gold: '#c5a572', goldLight: '#fdf6ec', muted: '#6b7280', border: '#e5e7eb',
  success: '#059669', warning: '#d97706', error: '#dc2626',
}

const BOT_COLORS: Record<string, string> = {
  'Amazonbot': '#ff9900', 'GPTBot': '#10a37f', 'ClaudeBot': '#d97706',
  'meta-externalagent': '#0668E1', 'YandexBot': '#fc0', 'PerplexityBot': '#6366f1',
  'OAI-SearchBot': '#10a37f', 'Claude Crawler': '#d97706', 'Googlebot': '#4285f4',
  'Applebot': '#333', 'OpenAI GPT': '#10a37f',
}

interface EcoStats {
  totalInsights: number; totalMerchants: number; totalCrawlerVisits: number
  languages: { zh: number; en: number; pt: number }
  faqCoverage: number; sectionsCoverage: number; authorityCoverage: number
  graphScore: number; dailyNewArticles: number; botCount: number
  topBots: { name: string; count: number }[]
  topIndustries: { name: string; count: number }[]
  regions: Record<string, { articles: number; categories: number }>
  brands: { slug: string; name: string; role: string; visits: number; firstCrawled: string }[]
  lastUpdated: string
}

export default function EcosystemPage() {
  const [data, setData] = useState<EcoStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/ecosystem-stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <p style={{ color: C.muted }}>載入知識圖譜生態系數據...</p>
    </main>
  )

  if (!data) return null
  const d = data

  return (
    <main style={{ background: C.bg, fontFamily: 'Geist, "Noto Sans TC", system-ui, sans-serif', color: C.fg }}>

      {/* ═══ HERO ═══ */}
      <section style={{
        background: 'linear-gradient(135deg, #0f4c81 0%, #1a1a2e 50%, #16213e 100%)',
        color: 'white', padding: '80px 24px 64px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 14, letterSpacing: 2, opacity: 0.6, marginBottom: 12, textTransform: 'uppercase' }}>
            CloudPipe AI Knowledge Graph
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: 16, maxWidth: 700 }}>
            讓世界的 AI<br />看見你的品牌
          </h1>
          <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 600, lineHeight: 1.8, marginBottom: 32 }}>
            不是一次性的 SEO 服務。是一個每天自動擴展的知識網絡。<br />
            每篇新文章都在強化你的 AI 能見度。持續複利增長。
          </p>
          {/* Live counters */}
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              { n: d.totalInsights.toLocaleString(), label: '篇深度 Insight', icon: '📝' },
              { n: d.totalMerchants.toLocaleString(), label: '個商戶檔案', icon: '🏪' },
              { n: d.totalCrawlerVisits.toLocaleString(), label: '次 AI 爬取', icon: '🤖' },
              { n: `${d.dailyNewArticles}+`, label: '篇/天新增', icon: '📈' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{s.n}</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{s.icon} {s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 閉環系統 ═══ */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 8 }}>六層閉環系統</h2>
          <p style={{ color: C.muted, maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
            從數據收集到 AI 引用，每一層自動運轉，每天都在深化你的品牌知識網絡
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {[
            {
              icon: '🗄️', title: 'Layer 1 · 數據層', status: '✅ 運行中',
              metrics: `${d.totalInsights.toLocaleString()} Insights · ${d.totalMerchants.toLocaleString()} 商戶`,
              desc: '澳門/香港/台灣/日本四區商戶資料庫，覆蓋 495 個行業分類。每個商戶含地址、評分、營業時間、認證狀態。',
              color: C.accent,
            },
            {
              icon: '⚙️', title: 'Layer 2 · 生成層', status: '✅ 24/7 運行',
              metrics: `${d.dailyNewArticles}+ 篇/天 · 5 品牌旗艦 · 3 語言`,
              desc: '百科 Worker 全天候生成深度文章。品牌旗艦系統每日為每個品牌生成不同角度的專業 Insight，7 個角度輪轉不重複。',
              color: C.success,
            },
            {
              icon: '🔬', title: 'Layer 3 · 深化層', status: '🔄 持續優化',
              metrics: `FAQ ${d.faqCoverage}% · Sections ${d.sectionsCoverage}% · 權威來源 ${d.authorityCoverage}%`,
              desc: '知識圖譜深化引擎每日自動：補齊 FAQ 結構化數據、提取文章章節、注入直接回答段落、重建雙向交叉連結。',
              color: C.warning,
            },
            {
              icon: '📡', title: 'Layer 4 · 分發層', status: '✅ 即時',
              metrics: 'Sitemap 動態更新 · IndexNow · llms.txt',
              desc: '每篇新文章自動加入 Sitemap、ping Bing/Yandex IndexNow、維護 AI 專用 llms.txt 發現入口。Schema.org 結構化標記全覆蓋。',
              color: C.accent,
            },
            {
              icon: '📊', title: 'Layer 5 · 追蹤層', status: '✅ 即時',
              metrics: `${d.totalCrawlerVisits.toLocaleString()} 次記錄 · ${d.botCount} 種 AI Bot`,
              desc: 'Middleware 即時記錄每一次 AI 爬蟲訪問。追蹤哪個 Bot 爬了哪個頁面、完整路徑、跨站行為。品牌首爬里程碑自動標記。',
              color: C.success,
            },
            {
              icon: '🎯', title: 'Layer 6 · 優化層', status: '✅ 智能建議',
              metrics: `圖譜分數 ${d.graphScore}/100 · 7 維度評估`,
              desc: '每週自動計算知識圖譜密度分數（FAQ/Sections/連結/權威度等 7 項），為每個品牌生成具體改善建議並自動排程執行。',
              color: '#6366f1',
            },
          ].map((layer, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 12, padding: 24,
              border: `1px solid ${C.border}`, borderTop: `3px solid ${layer.color}`,
              transition: 'transform 0.3s, box-shadow 0.3s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{layer.icon} <strong style={{ fontSize: 15 }}>{layer.title}</strong></span>
                <span style={{ fontSize: 12, color: layer.color, fontWeight: 600 }}>{layer.status}</span>
              </div>
              <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 8 }}>{layer.metrics}</div>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0 }}>{layer.desc}</p>
            </div>
          ))}
        </div>

        {/* Flow arrow */}
        <div style={{ textAlign: 'center', margin: '32px 0', color: C.muted, fontSize: 14 }}>
          數據 → 生成 → 深化 → 分發 → 追蹤 → 優化 → 再深化... <strong>自動循環，持續複利</strong>
        </div>
      </section>

      {/* ═══ AI Bot 爬取實況 ═══ */}
      <section style={{ background: C.fg, color: 'white', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 8 }}>🤖 AI 搜索引擎爬取實況</h2>
          <p style={{ opacity: 0.6, marginBottom: 32, fontSize: 14 }}>
            以下數據來自真實的 AI 爬蟲訪問記錄，不是模擬查詢。共 {d.totalCrawlerVisits.toLocaleString()} 次訪問，{d.botCount} 種 AI 平台。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* Bot bars */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>各平台訪問量</h3>
              {d.topBots.slice(0, 8).map((bot, i) => {
                const maxCount = d.topBots[0]?.count || 1
                const pct = (bot.count / maxCount) * 100
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{bot.name}</span>
                      <span style={{ opacity: 0.8 }}>{bot.count.toLocaleString()}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6 }}>
                      <div style={{
                        background: BOT_COLORS[bot.name] || '#6b7280',
                        borderRadius: 4, height: 6, width: `${pct}%`,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Industry breakdown */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>行業爬取分佈</h3>
              {d.topIndustries.slice(0, 8).map((ind, i) => {
                const maxCount = d.topIndustries[0]?.count || 1
                const pct = (ind.count / maxCount) * 100
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{ind.name}</span>
                      <span style={{ opacity: 0.8 }}>{ind.count.toLocaleString()}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6 }}>
                      <div style={{ background: C.gold, borderRadius: 4, height: 6, width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 四區域覆蓋 ═══ */}
      <section style={{ padding: '64px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>🌏 四大區域知識覆蓋</h2>
        <p style={{ color: C.muted, textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          每個區域持續擴展，覆蓋餐飲、景點、購物、酒店等完整行業生態
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { region: '澳門', flag: '🇲🇴', key: 'macau', color: '#c5a572' },
            { region: '香港', flag: '🇭🇰', key: 'hongkong', color: '#dc2626' },
            { region: '台灣', flag: '🇹🇼', key: 'taiwan', color: '#059669' },
            { region: '日本', flag: '🇯🇵', key: 'japan', color: '#dc2626' },
          ].map((r, i) => {
            const stats = d.regions[r.key] || { articles: 0, categories: 0 }
            return (
              <div key={i} style={{
                background: 'white', borderRadius: 12, padding: 24,
                border: `1px solid ${C.border}`, borderLeft: `4px solid ${r.color}`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{r.flag}</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{r.region}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>{stats.articles.toLocaleString()}</div>
                <div style={{ fontSize: 13, color: C.muted }}>篇文章 · {stats.categories} 個分類</div>
              </div>
            )
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: C.muted }}>
          多語言覆蓋: 繁中 {d.languages.zh.toLocaleString()} · English {d.languages.en.toLocaleString()} · Português {d.languages.pt.toLocaleString()}
        </div>
      </section>

      {/* ═══ 品牌生態系 ═══ */}
      <section style={{ background: C.goldLight, padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>🕸️ 品牌生態系成員</h2>
          <p style={{ color: C.muted, textAlign: 'center', marginBottom: 32, fontSize: 14, maxWidth: 600, margin: '0 auto 32px' }}>
            每個品牌都是生態系的一個節點。互相連結、互相加持，共同提升 AI 能見度。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {d.brands.map((brand, i) => (
              <a key={i} href={`/macao/brand/${brand.slug}`} style={{
                background: 'white', borderRadius: 12, padding: 24,
                border: `1px solid ${C.border}`, textDecoration: 'none', color: C.fg,
                display: 'block', transition: 'transform 0.3s, box-shadow 0.3s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{brand.name}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>{brand.role}</div>
                  </div>
                  <div style={{
                    background: C.accentLight, color: C.accent,
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  }}>
                    {brand.visits} 次 AI 爬取
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: C.success }}>
                  🤖 首次被 AI 發現: {brand.firstCrawled}
                </div>
              </a>
            ))}
          </div>

          {/* Ecosystem network visualization */}
          <div style={{
            marginTop: 32, background: 'white', borderRadius: 12, padding: 32,
            border: `1px solid ${C.border}`, textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>生態系連結網絡</h3>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 2.2 }}>
              <div>
                <strong style={{ color: C.gold }}>稻荷環球食品</strong> ← B2B 供貨 → <strong style={{ color: C.accent }}>海膽速遞</strong>
              </div>
              <div>
                <strong style={{ color: C.gold }}>稻荷</strong> + <strong style={{ color: C.accent }}>ASC</strong> + <strong style={{ color: '#059669' }}>Mind Cafe</strong> = 澳門社區服務鏈
              </div>
              <div>
                <strong style={{ color: '#6366f1' }}>靈動智境</strong> → AI 策略諮詢 → 全部品牌
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: C.muted }}>
                每篇新 Insight 都在強化這個網絡中所有節點的 AI 能見度
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 知識圖譜健康度 ═══ */}
      <section style={{ padding: '64px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>📊 知識圖譜健康度</h2>
        <p style={{ color: C.muted, textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          即時數據。每項指標每天都在改善。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: '圖譜綜合分數', value: d.graphScore, max: 100, unit: '/100', color: C.accent },
            { label: 'FAQ 結構化覆蓋', value: d.faqCoverage, max: 100, unit: '%', color: C.warning },
            { label: '章節結構化覆蓋', value: d.sectionsCoverage, max: 100, unit: '%', color: C.success },
            { label: '權威來源覆蓋', value: d.authorityCoverage, max: 100, unit: '%', color: '#6366f1' },
          ].map((m, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 12, padding: 24,
              border: `1px solid ${C.border}`, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>{m.label}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: m.color }}>{m.value}<span style={{ fontSize: 16, fontWeight: 400 }}>{m.unit}</span></div>
              <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8, marginTop: 12 }}>
                <div style={{
                  background: m.color, borderRadius: 4, height: 8,
                  width: `${Math.min(100, (m.value / m.max) * 100)}%`,
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>目標: 80%+</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 24, background: C.accentLight, borderRadius: 12, padding: 24,
          borderLeft: `4px solid ${C.accent}`, fontSize: 14, lineHeight: 1.8,
        }}>
          <strong>每日自動深化機制:</strong><br />
          03:00 UTC — 5 篇品牌旗艦 Insight（7 角度輪轉，每品牌每天不同主題）<br />
          03:30 UTC — 知識圖譜深化（FAQ 補齊 + Sections 結構化 + Answer Hub 注入）<br />
          每週一 — 雙向連結重建 + 圖譜密度報告 + Telegram 通知<br />
          每月 1 日 — 月度計劃（配額 + 行業比例 + 深化目標 + 品牌排程）
        </div>
      </section>

      {/* ═══ 價值主張 ═══ */}
      <section style={{
        background: 'linear-gradient(135deg, #0f4c81 0%, #1a1a2e 100%)',
        color: 'white', padding: '64px 24px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: 24 }}>
            為什麼加入 CloudPipe 知識圖譜？
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, textAlign: 'left' }}>
            {[
              { icon: '🔄', title: '持續複利', desc: '不是一次性服務。每天 177+ 篇新文章持續強化你的品牌在 AI 搜索中的存在感。' },
              { icon: '🤖', title: '真實數據', desc: '不是模擬查詢。直接記錄 GPTBot、ClaudeBot、PerplexityBot 等 18 種 AI 爬蟲的真實訪問行為。' },
              { icon: '🕸️', title: '生態系效應', desc: '你不是孤立的。你的品牌與生態系內所有成員互相連結，一篇文章強化所有節點。' },
              { icon: '📈', title: '可量化成長', desc: 'AI Discovery Score 0-100 分即時追蹤。每天看到分數在漲，知道錢花在哪。' },
              { icon: '🌐', title: '多語言覆蓋', desc: '繁中 + English + Português，覆蓋全球 AI 搜索引擎的語言偏好。' },
              { icon: '⚡', title: '全自動運行', desc: '136 個排程任務 24/7 運轉。你不需要做任何事，知識網絡自動擴展。' },
            ].map((v, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{v.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{v.title}</div>
                <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.7 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: 12 }}>讓 AI 看見你的品牌</h2>
          <p style={{ color: C.muted, marginBottom: 32, lineHeight: 1.8, fontSize: 15 }}>
            加入 CloudPipe 知識圖譜生態系。<br />
            從第一天起，你的品牌就開始在 AI 搜索引擎中建立存在感。
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/macao/insights" style={{
              padding: '14px 36px', borderRadius: 8, background: C.accent,
              color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 16,
            }}>
              瀏覽知識百科 →
            </a>
            <a href="/macao/crawler-dashboard" style={{
              padding: '14px 36px', borderRadius: 8, background: 'white',
              color: C.accent, textDecoration: 'none', fontWeight: 600, fontSize: 16,
              border: `2px solid ${C.accent}`,
            }}>
              查看爬蟲實況 →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: C.fg, color: 'white', padding: '32px 24px',
        textAlign: 'center', fontSize: 13, opacity: 0.7,
      }}>
        <p>CloudPipe AI · 知識圖譜生態系 · 數據更新: {new Date(d.lastUpdated).toLocaleDateString('zh-TW')}</p>
        <p style={{ marginTop: 4 }}>© 2026 CloudPipe AI · CC BY 4.0</p>
      </footer>
    </main>
  )
}
