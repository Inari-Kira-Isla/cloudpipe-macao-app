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
const AUDIT_URL = '/cloudpipe/audit'

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
      <section className="cp-hero" style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 60%, #162848 100%)',
        color: '#fff',
        padding: '80px 24px 72px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'radial-gradient(circle at 20% 50%, #C9A961 1px, transparent 1px), radial-gradient(circle at 80% 20%, #C9A961 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div className="cp-stat-strip" style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 40, flexWrap: 'wrap' }}>
          {STATS.map((s, i) => (
            <div key={i} className="cp-stat" style={{
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
          fontSize: 'clamp(24px, 5vw, 48px)',
          fontWeight: 900,
          lineHeight: 1.25,
          maxWidth: 780,
          margin: '0 auto 20px',
          letterSpacing: '-0.02em',
        }}>
          當客人用 AI 搜<span style={{ color: '#C9A961' }}>「澳門 [你的行業]」</span>，<br className="cp-br-hide" />
          出現的是你的對手，不是你。
        </h1>

        <p style={{ fontSize: 'clamp(15px, 2.5vw, 20px)', color: 'rgba(255,255,255,0.8)', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
          稻荷環球食品用 <strong style={{ color: '#C9A961' }}>90 天</strong> 從 AI 不知道 → <strong style={{ color: '#C9A961' }}>Perplexity #1</strong><br />
          CloudPipe 讓你成為 AI 引用的源頭
        </p>

        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block',
          background: '#25D366',
          color: '#fff',
          padding: '16px 36px',
          borderRadius: 50,
          fontSize: 'clamp(15px, 3.5vw, 18px)',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(37,211,102,0.4)',
        }}>
          📱 免費 AI 診斷（30 分鐘）
        </a>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 12 }}>完全免費，無銷售壓力</p>
      </section>

      {/* ── S2 PROBLEM ── */}
      <section className="cp-section" style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            AI 搜尋正在重寫競爭規則
          </h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 40, fontSize: 'clamp(14px, 3vw, 16px)' }}>
            你的客人正在問 AI，AI 正在回答——只是不是你
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {PAIN_POINTS.map((p, i) => (
              <div key={i} style={{
                background: '#fff',
                borderRadius: 16,
                padding: '24px 20px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                borderTop: '3px solid #C9A961',
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{p.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{p.title}</h3>
                <p style={{ color: '#555', lineHeight: 1.7, fontSize: 14, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S3 CASE STUDY ── */}
      <section className="cp-section" style={{ background: '#0A1628', color: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,169,97,0.15)', border: '1px solid rgba(201,169,97,0.4)', borderRadius: 20, padding: '4px 16px', fontSize: 13, color: '#C9A961', marginBottom: 20 }}>
            真實案例
          </div>
          <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            稻荷環球食品 × CloudPipe
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 40, fontSize: 'clamp(13px, 3vw, 16px)' }}>
            澳門 B2B 海膽供應商，70% 本地市場佔有率
          </p>

          <div className="cp-timeline" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 40 }}>
            {TIMELINE.map((t, i) => (
              <div key={i} style={{ position: 'relative', padding: '20px 14px', background: i === TIMELINE.length - 1 ? 'rgba(201,169,97,0.15)' : 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: '#C9A961', fontWeight: 700, marginBottom: 6 }}>{t.week}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
            {[['#1', 'Perplexity 首推'], ['113', '條語義事實注入'], ['90', '天達成']].map(([n, l], i) => (
              <div key={i}>
                <div style={{ fontSize: 'clamp(32px, 8vw, 44px)', fontWeight: 900, color: '#C9A961' }}>{n}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{l}</div>
              </div>
            ))}
          </div>

          <blockquote className="cp-blockquote" style={{ borderLeft: '3px solid #C9A961', paddingLeft: 20, textAlign: 'left', maxWidth: 560, margin: '0 auto', fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontSize: 'clamp(13px, 3vw, 15px)' }}>
            「以前客人問 AI 澳門海膽，出現嘅係日本、香港嘅競爭對手。家依 Perplexity 係推薦我哋。」
            <footer style={{ marginTop: 12, fontStyle: 'normal', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              — 稻荷環球食品
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ── S4 SERVICE ── */}
      <section className="cp-section" style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            三步讓 AI 認識你的生意
          </h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 40, fontSize: 'clamp(13px, 3vw, 16px)' }}>
            不需要改網站，不需要 IT 團隊
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: '#0A1628', color: '#C9A961', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                  {s.n}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>{s.title}</h3>
                  <p style={{ color: '#555', lineHeight: 1.7, fontSize: 14, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S5 SOCIAL PROOF ── */}
      <section className="cp-section" style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(18px, 3vw, 32px)', fontWeight: 800, marginBottom: 40 }}>
            背後的基礎設施
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 40 }}>
            {[
              ['1M+', 'FAQ 條目'],
              ['18,774', 'AI 爬蟲訪問 / 日'],
              ['1,876', '核實澳門商戶'],
              ['43K+', '語義知識 Facts'],
            ].map(([n, l], i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '24px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: '#0A1628' }}>{n}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 14 }}>已被以下 AI 平台爬取與引用</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, fontWeight: 600, color: '#444' }}>
            {['ChatGPT', 'Perplexity', 'Claude', 'Gemini', 'Apple Intelligence', 'Bing AI'].map(name => (
              <span key={name} style={{ background: '#fff', padding: '6px 14px', borderRadius: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── S6 PRICING ── */}
      <section className="cp-pricing-section" style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            按需選擇，從免費開始
          </h2>
          <p style={{ color: '#666', marginBottom: 48, fontSize: 'clamp(13px, 3vw, 16px)' }}>
            先免費了解你的 AI 能見度，再決定下一步
          </p>

          {/* Free tier — full width highlight */}
          <div className="cp-free-tier" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #162848 100%)', borderRadius: 20, padding: '36px 32px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, textAlign: 'left' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>免費入門</div>
              <h3 style={{ color: '#fff', fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800, margin: '0 0 8px' }}>AI 能見度自助審計</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(13px, 3vw, 15px)', margin: 0, maxWidth: 480 }}>
                輸入品牌名稱，即時掃描你喺 ChatGPT、Perplexity、Gemini 的引用狀態——找出 AI 係唔係認識你，競品係唔係比你強。
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                {['ChatGPT 引用報告', 'Perplexity 排名', '競品對標', 'AI Visibility Score'].map(f => (
                  <span key={f} style={{ fontSize: 12, color: '#C9A961', display: 'flex', gap: 4, alignItems: 'center' }}>✓ {f}</span>
                ))}
              </div>
            </div>
            <div className="cp-free-tier-cta" style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A961', lineHeight: 1 }}>MOP 0</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>完全免費，即時出結果</div>
              <a href={AUDIT_URL} style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '13px 32px', borderRadius: 50, fontWeight: 700, fontSize: 'clamp(14px, 3.5vw, 16px)', textDecoration: 'none', boxShadow: '0 8px 24px rgba(37,211,102,0.4)' }}>
                立即免費審計 →
              </a>
            </div>
          </div>

          {/* 3 paid tiers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
            {[
              {
                name: '中級方案',
                sub: 'AEO 搜尋優化',
                price: 'MOP 499',
                per: '/月',
                highlight: false,
                badge: null,
                features: ['月度 Citation 監測報告', '5 條優先 FAQ 優化', 'Citation playbook', 'AI Visibility Score 追蹤'],
                cta: '了解詳情',
                href: WHATSAPP_URL,
                external: true,
              },
              {
                name: '高級方案',
                sub: 'AEO + 行業研究 + KG',
                price: 'MOP 1,499',
                per: '/月',
                highlight: true,
                badge: '最受歡迎',
                features: ['你的事實進入行業知識圖譜', 'AI 答案直接引用你最新數字', 'Verified KG entity 建立', '定制 Insight 文章', '月度 absorption lift 報告'],
                cta: '立即咨詢',
                href: WHATSAPP_URL,
                external: true,
              },
              {
                name: '定制方案',
                sub: '全方位戰略部署',
                price: 'MOP 3,999+',
                per: '/月 or 項目制',
                highlight: false,
                badge: null,
                features: ['企業年度 AI 戰略', '競品 entity 全面對標', '行業 Citation Gap 分析', '季度 absorption 審計', '政府/機構白皮書（可選）'],
                cta: '預約策略會議',
                href: WHATSAPP_URL,
                external: true,
              },
            ].map((plan, i) => (
              <div key={i} className="cp-plan-card" style={{
                border: plan.highlight ? '2px solid #C9A961' : '1px solid #e8e8e8',
                borderRadius: 20,
                padding: '28px 20px',
                position: 'relative',
                background: plan.highlight ? 'rgba(201,169,97,0.04)' : '#fff',
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#C9A961', color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{plan.sub}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: '#0A1628' }}>{plan.name}</h3>
                <div style={{ marginBottom: 18 }}>
                  <span style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 900, color: '#0A1628' }}>{plan.price}</span>
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>{plan.per}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', textAlign: 'left' }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13, color: '#444', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: plan.highlight ? '#C9A961' : '#0A1628', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.href} {...(plan.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{
                  display: 'block',
                  background: plan.highlight ? '#C9A961' : '#0A1628',
                  color: '#fff',
                  padding: '13px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  textAlign: 'center',
                }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          {/* Government track */}
          <div className="cp-gov-track" style={{ background: '#f8f9fc', border: '1px solid #e0e0e0', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', textAlign: 'left' }}>
            <div style={{ fontSize: 28 }}>🏛️</div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 800, fontSize: 'clamp(14px, 3.5vw, 16px)', color: '#0A1628', marginBottom: 4 }}>政府 / 機構方案 — 地區 AI 能見度白皮書</div>
              <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#666', lineHeight: 1.6 }}>
                面向旅遊局、工業局、行業協會——分析整個地區產業在 AI 引擎的引用現況，提供戰略部署建議。
                MOP 50,000+ / 項目
              </div>
            </div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, background: '#0A1628', color: '#fff', padding: '11px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              聯絡我們
            </a>
          </div>
        </div>
      </section>

      {/* ── S7 FAQ ── */}
      <section className="cp-section" style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 40 }}>
            常見問題
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 'clamp(14px, 3.5vw, 17px)', fontWeight: 700, marginBottom: 8, marginTop: 0, color: '#0A1628' }}>
                  Q: {faq.q}
                </h3>
                <p style={{ color: '#555', lineHeight: 1.7, fontSize: 'clamp(13px, 3vw, 15px)', margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S8 FINAL CTA ── */}
      <section className="cp-hero" style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 100%)',
        color: '#fff',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 42px)', fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>
          你的競爭對手<span style={{ color: '#C9A961' }}>已在行動</span><br />
          你準備好了嗎？
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(14px, 3vw, 17px)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
          免費診斷，30 分鐘了解你的品牌在 AI 世界的位置。
          無需準備，無銷售壓力。
        </p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block',
          background: '#25D366',
          color: '#fff',
          padding: '18px 48px',
          borderRadius: 50,
          fontSize: 'clamp(16px, 3.5vw, 20px)',
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

      <style>{`
        @media (max-width: 600px) {
          .cp-hero { padding: 52px 16px 44px !important; }
          .cp-section { padding: 44px 16px !important; }
          .cp-pricing-section { padding: 44px 16px !important; }
          .cp-stat-strip { flex-direction: column !important; align-items: center !important; }
          .cp-stat { border-right: none !important; border-bottom: 1px solid rgba(201,169,97,0.2) !important; min-width: auto !important; width: 100% !important; padding: 10px 0 !important; }
          .cp-stat:last-child { border-bottom: none !important; }
          .cp-br-hide { display: none !important; }
          .cp-free-tier { flex-direction: column !important; padding: 24px 20px !important; text-align: center !important; }
          .cp-free-tier-cta { width: 100% !important; }
          .cp-timeline { grid-template-columns: 1fr 1fr !important; }
          .cp-blockquote { padding-left: 12px !important; }
          .cp-plan-card { padding: 24px 16px !important; }
          .cp-gov-track { padding: 18px 16px !important; }
        }
      `}</style>
    </div>
  )
}
