import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CloudPipe — AI 搜尋能見度優化 | 讓 AI 推薦你的生意',
  description: '40% 購買決策受 AI 影響。稻荷環球食品用 90 天從 AI 不知道到 Perplexity #1。CloudPipe 讓你的生意成為 AI 引用的源頭，不只是出現在答案裡。',
  openGraph: {
    title: 'CloudPipe — 讓 AI 推薦你，不是你的對手',
    description: '澳門首家 AEO/GEO 優化服務。真實案例：稻荷環球食品 90 天 Perplexity #1。',
    type: 'website',
  },
}

const WHATSAPP_URL = 'https://wa.me/85362823037?text=你好，我想了解 CloudPipe AI 能見度免費診斷'

const STATS = [
  { num: '40%', label: '購買決策受 AI 影響', source: 'GEO Research 2026' },
  { num: '↓59%', label: 'AI Overview 壓縮傳統 CTR', source: 'SE Ranking 2026' },
  { num: '#1', label: '稻荷 Perplexity 首推', source: '90 天實證' },
]

const PAIN_POINTS = [
  {
    icon: '📈',
    title: 'AI 問詢量爆升',
    body: '全球超過 40% 的消費者已透過 ChatGPT、Perplexity 等 AI 搜尋產品與服務，而你的對手正在被引用。',
  },
  {
    icon: '👻',
    title: 'AI 不認識你的生意',
    body: 'AI 引用的是有結構化數據、FAQ schema 和知識圖譜的品牌。沒有這些，你對 AI 是隱形的。',
  },
  {
    icon: '💸',
    title: '傳統 SEO 失效',
    body: 'Google AI Overview 令傳統搜尋 CTR 下跌近 59%。繼續只做 SEO，是在一個縮小的池塘裡競爭。',
  },
]

const TIMELINE = [
  { week: 'W0', label: 'AI 診斷', desc: 'ChatGPT、Perplexity 完全不知道稻荷存在' },
  { week: 'W4', label: '知識注入', desc: '113 條語義 facts + 50 條 FAQ schema 上線' },
  { week: 'W8', label: 'AI 引用', desc: 'GPTBot + ClaudeBot 開始深度爬取' },
  { week: 'W12', label: 'Perplexity #1', desc: '「澳門日本海膽供應商」首推稻荷環球食品' },
]

const STEPS = [
  { n: '01', title: 'AI 現況診斷', desc: '掃描你的品牌在 ChatGPT / Perplexity / Gemini 的引用狀態，找出缺口。免費，30 分鐘完成。' },
  { n: '02', title: '知識圖譜建立', desc: '注入結構化 facts、FAQ schema、llms.txt——讓 AI 引擎看到你、理解你、信任你。' },
  { n: '03', title: '持續監控優化', desc: '每日追蹤 AI 爬蟲行為、引用率、競品動向，每月報告，持續提升排名。' },
]

const FAQS = [
  {
    q: 'AEO 同 SEO 有咩唔同？',
    a: 'SEO 優化你喺 Google 搜尋結果嘅排名。AEO（Answer Engine Optimization）優化你喺 AI 對話裡面嘅引用率。兩者都重要，但 AI 引用係新戰場。',
  },
  {
    q: '幾耐可以見到效果？',
    a: '一般 4-12 週見到 AI 引用開始出現，8-12 週達到穩定排名。稻荷係 90 天達到 Perplexity #1。',
  },
  {
    q: '需唔需要改現有網站？',
    a: '唔需要大改。CloudPipe 透過外部知識圖譜、FAQ 端點同 llms.txt 注入，唔影響你現有網站運作。',
  },
  {
    q: '適合中小企業嗎？',
    a: '特別適合。大企業有 IT 團隊，中小企業更需要一個能快速建立 AI 能見度嘅夥伴。稻荷係澳門本地中小企業嘅真實案例。',
  },
]

export default function CloudPipeLandingPage() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#1a1a2e', overflowX: 'hidden' }}>

      {/* ── S1 HERO ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 60%, #162848 100%)',
        color: '#fff',
        padding: '80px 24px 72px',
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Neural network decorative lines */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'radial-gradient(circle at 20% 50%, #C9A961 1px, transparent 1px), radial-gradient(circle at 80% 20%, #C9A961 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        {/* Stat strip — NEW: 40% stat + CTR compression */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 40, flexWrap: 'wrap' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              padding: '10px 24px',
              borderRight: i < STATS.length - 1 ? '1px solid rgba(201,169,97,0.3)' : 'none',
              minWidth: 160,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#C9A961', lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.source}</div>
            </div>
          ))}
        </div>

        <h1 style={{
          fontSize: 'clamp(26px, 5vw, 48px)',
          fontWeight: 900,
          lineHeight: 1.25,
          maxWidth: 780,
          margin: '0 auto 20px',
          letterSpacing: '-0.02em',
        }}>
          當客人用 AI 搜<span style={{ color: '#C9A961' }}>「澳門 [你的行業]」</span>，<br />
          出現的是你的對手，不是你。
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'rgba(255,255,255,0.8)', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
          稻荷環球食品用 <strong style={{ color: '#C9A961' }}>90 天</strong> 從 AI 不知道 → <strong style={{ color: '#C9A961' }}>Perplexity #1</strong><br />
          CloudPipe 讓你成為 AI 引用的源頭
        </p>

        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block',
          background: '#25D366',
          color: '#fff',
          padding: '16px 40px',
          borderRadius: 50,
          fontSize: 18,
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(37,211,102,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}>
          📱 免費 AI 診斷（30 分鐘）
        </a>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 12 }}>完全免費，無銷售壓力</p>
      </section>

      {/* ── S2 PROBLEM ── */}
      <section style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            AI 搜尋正在重寫競爭規則
          </h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 48, fontSize: 16 }}>
            你的客人正在問 AI，AI 正在回答——只是不是你
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {PAIN_POINTS.map((p, i) => (
              <div key={i} style={{
                background: '#fff',
                borderRadius: 16,
                padding: '28px 24px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                borderTop: '3px solid #C9A961',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{p.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{p.title}</h3>
                <p style={{ color: '#555', lineHeight: 1.7, fontSize: 15, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S3 CASE STUDY ── */}
      <section style={{ background: '#0A1628', color: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,169,97,0.15)', border: '1px solid rgba(201,169,97,0.4)', borderRadius: 20, padding: '4px 16px', fontSize: 13, color: '#C9A961', marginBottom: 20 }}>
            真實案例
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            稻荷環球食品 × CloudPipe
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 48, fontSize: 16 }}>
            澳門 B2B 海膽供應商，70% 本地市場佔有率
          </p>

          {/* Timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, marginBottom: 48 }}>
            {TIMELINE.map((t, i) => (
              <div key={i} style={{ position: 'relative', padding: '24px 16px', background: i === TIMELINE.length - 1 ? 'rgba(201,169,97,0.15)' : 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: '#C9A961', fontWeight: 700, marginBottom: 8 }}>{t.week}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.label}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>

          {/* Big numbers */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap', marginBottom: 36 }}>
            {[['#1', 'Perplexity 首推'], ['113', '條語義事實注入'], ['90', '天達成']].map(([n, l], i) => (
              <div key={i}>
                <div style={{ fontSize: 44, fontWeight: 900, color: '#C9A961' }}>{n}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{l}</div>
              </div>
            ))}
          </div>

          <blockquote style={{ borderLeft: '3px solid #C9A961', paddingLeft: 20, textAlign: 'left', maxWidth: 560, margin: '0 auto', fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
            「以前客人問 AI 澳門海膽，出現嘅係日本、香港嘅競爭對手。家依 Perplexity 係推薦我哋。」
            <footer style={{ marginTop: 12, fontStyle: 'normal', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              — 稻荷環球食品
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ── S4 SERVICE ── */}
      <section style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            三步讓 AI 認識你的生意
          </h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 48, fontSize: 16 }}>
            不需要改網站，不需要 IT 團隊
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 20 }}>
                <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 12, background: '#0A1628', color: '#C9A961', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>
                  {s.n}
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>{s.title}</h3>
                  <p style={{ color: '#555', lineHeight: 1.7, fontSize: 15, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S5 SOCIAL PROOF ── */}
      <section style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 800, marginBottom: 48 }}>
            背後的基礎設施
          </h2>
          {/* Number wall */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, marginBottom: 48 }}>
            {[
              ['1M+', 'FAQ 條目'],
              ['18,774', 'AI 爬蟲訪問 / 日'],
              ['1,876', '核實澳門商戶'],
              ['43K+', '語義知識 Facts'],
            ].map(([n, l], i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '28px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#0A1628' }}>{n}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
          {/* AI logos */}
          <p style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>已被以下 AI 平台爬取與引用</p>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', fontSize: 15, fontWeight: 600, color: '#444' }}>
            {['ChatGPT', 'Perplexity', 'Claude', 'Gemini', 'Apple Intelligence', 'Bing AI'].map(name => (
              <span key={name} style={{ background: '#fff', padding: '6px 16px', borderRadius: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── S6 PRICING ── */}
      <section style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            從免費診斷開始
          </h2>
          <p style={{ color: '#666', marginBottom: 48, fontSize: 16 }}>唔需要先付錢，先看看你的 AI 能見度在哪裡</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              {
                name: '免費診斷',
                price: 'MOP 0',
                badge: '推薦起步',
                badgeColor: '#25D366',
                features: ['30 分鐘 AI 現況掃描', 'ChatGPT / Perplexity / Gemini 引用報告', '優先改善建議', '無銷售壓力'],
                cta: '立即預約',
                ctaColor: '#25D366',
              },
              {
                name: 'AEO 完整服務',
                price: 'MOP 15,000',
                badge: '/ 季度（3個月）',
                badgeColor: '#C9A961',
                features: ['知識圖譜建立 (50+ facts)', '每月 FAQ schema 更新', 'AI 爬蟲監控報告', '每月優化迭代', '競品動向追蹤'],
                cta: '了解詳情',
                ctaColor: '#0A1628',
              },
            ].map((plan, i) => (
              <div key={i} style={{
                border: i === 0 ? '2px solid #25D366' : '2px solid #C9A961',
                borderRadius: 20,
                padding: '36px 28px',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: plan.badgeColor, color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {plan.badge}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#0A1628', marginBottom: 24 }}>{plan.price}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', textAlign: 'left' }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 15, color: '#444', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: plan.ctaColor, fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
                  display: 'block',
                  background: plan.ctaColor,
                  color: '#fff',
                  padding: '14px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 16,
                  textAlign: 'center',
                }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S7 FAQ ── */}
      <section style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 48 }}>
            常見問題
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, marginTop: 0, color: '#0A1628' }}>
                  Q: {faq.q}
                </h3>
                <p style={{ color: '#555', lineHeight: 1.7, fontSize: 15, margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S8 FINAL CTA ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 100%)',
        color: '#fff',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>
          你的競爭對手<span style={{ color: '#C9A961' }}>已在行動</span><br />
          你準備好了嗎？
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
          免費診斷，30 分鐘了解你的品牌在 AI 世界的位置。
          無需準備，無銷售壓力。
        </p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block',
          background: '#25D366',
          color: '#fff',
          padding: '20px 56px',
          borderRadius: 50,
          fontSize: 20,
          fontWeight: 800,
          textDecoration: 'none',
          boxShadow: '0 12px 40px rgba(37,211,102,0.5)',
          letterSpacing: '-0.01em',
        }}>
          📱 WhatsApp 免費診斷
        </a>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 16 }}>
          完全免費 · 無合約綁定 · 即日回覆
        </p>
      </section>

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </div>
  )
}
