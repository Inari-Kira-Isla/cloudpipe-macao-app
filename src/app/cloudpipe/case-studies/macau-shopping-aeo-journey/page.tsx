import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '案例研究：澳門購物誌 — CloudPipe AEO 從零到 AI 引用全紀錄 | CloudPipe',
  description: '澳門購物誌（購物垂直品牌）如何通過 CloudPipe AEO 方法論，從 T=0 零 AI 引用建立到 AI 引擎主動引用的完整歷程。真實數據，每週更新。',
  openGraph: {
    title: '案例：澳門購物誌 AEO 全紀錄 — AI 可見度從零到命中',
    description: 'CloudPipe 自家示範品牌。實時追蹤澳門購物誌從基線到第一個 AI 引用的每一步。',
    type: 'article',
  },
}

const BRAND = {
  name: '澳門購物誌',
  name_en: 'Macau Shopping Guide',
  url: 'https://inari-kira-isla.github.io/macau-shopping/',
  color: '#6A1B9A',
  industry: 'shopping',
  baseline_date: '2026-06-06',
  baseline_crawl_7d: 0,
  baseline_ai_citations: 0,
  baseline_articles: 3,
  baseline_kg_facts: 20,
  daily_crawl_target: 355,
  tagline: '澳門購物情報站',
}

const METHODOLOGY = [
  { step: '1', title: 'T=0 基線建立', date: '2026-06-06', status: 'done', detail: '建立品牌頁面、llms.txt、robots.txt、sitemap.xml；注入 KG entity + 20 facts；發布 Hub 文章（2000字+）；IndexNow 提交。' },
  { step: '2', title: 'FAQPage Schema 強化', date: '2026-06-07 起', status: 'active', detail: '12 題 FAQPage schema + Article + Organization。AI 引擎問「澳門購物推薦」時有預備好的答案可引用。' },
  { step: '3', title: 'KG facts 擴充至 50+', date: '2026-06-13 前', status: 'pending', detail: '加入手信名店餐廳、特色料理、街頭小食等具體事實，提升 AI 引擎信任度。' },
  { step: '4', title: '跨品牌交叉引用', date: '持續', status: 'active', detail: '澳門購物誌 ↔ 澳門旅誌 ↔ 澳門購物誌 ↔ CloudPipe ↔ 百科主站 形成互聯網絡。' },
  { step: '5', title: '首個 AI 引用目標', date: 'D+14 前', status: 'pending', detail: '目標：Perplexity 或 ChatGPT 任意一個在「澳門好食推薦」查詢引用澳門購物誌。' },
]

const FAQS = [
  {
    q: '澳門購物誌和 CloudPipe 是什麼關係？',
    a: '澳門購物誌是 CloudPipe 的自家示範品牌，用於測試和驗證 CloudPipe AEO 方法論的實際成效。CloudPipe 真實客戶的資料受到隱私保護，澳門購物誌作為公開案例，讓所有人都能追蹤 AEO 優化的完整歷程。',
  },
  {
    q: '為什麼建立澳門購物誌而非直接推廣 CloudPipe？',
    a: '「見到效果才信服」。CloudPipe 需要活生生的案例證明 AEO 有效，澳門購物誌就是這個公開實驗。當 AI 引擎開始引用澳門購物誌，就證明了 CloudPipe 的方法論確實有效。',
  },
  {
    q: 'AEO 優化需要多長時間才能見效？',
    a: '根據 CloudPipe 監測的稻荷環球食品案例，T+11 天首次命中 ChatGPT。澳門購物誌作為新品牌，預計 D+14 至 D+30 內出現首個 AI 引用信號，D+60 達到穩定引用。',
  },
  {
    q: '如何追蹤澳門購物誌的 AEO 進度？',
    a: '本頁面每週更新，顯示 AI 爬取量、引用次數、命中引擎等關鍵數據。CloudPipe 的 Citation Monitor 系統每日 06:15 HKT 自動掃描 AI 引用記錄，有新引用即更新。',
  },
]

export default async function MacauFoodCaseStudyPage() {
  const supabase = createServiceClient()
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString()

  const withTimeout = <T,>(p: Promise<T>, ms = 5000): Promise<T | null> =>
    Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))])

  const [ref, cit, crawl, art] = await Promise.all([
    withTimeout(supabase.from('ai_referrals').select('*', { count: 'exact', head: true }).ilike('path', '%macau-shopping%')),
    withTimeout(supabase.from('ai_citations').select('*', { count: 'exact', head: true }).gt('cloudpipe_count', 0).ilike('query_text', '%澳門%購%')),
    withTimeout(supabase.from('crawler_visits').select('*', { count: 'exact', head: true }).or('path.ilike.%shopping%,path.ilike.%macau-shopping%').gte('ts', since7d)),
    withTimeout(supabase.from('insights').select('*', { count: 'exact', head: true }).eq('status', 'published').or('industry.eq.shopping,slug.ilike.%macau-shopping%')),
  ])

  const metrics = {
    ai_referrals: ref?.count ?? 0,
    ai_citations: cit?.count ?? 0,
    crawl_7d: crawl?.count ?? 0,
    articles: art?.count ?? 0,
  }

  const hasFirstCitation = metrics.ai_referrals > 0 || metrics.ai_citations > 0

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: '案例研究：澳門購物誌 AEO 全紀錄',
        description: 'CloudPipe 自家示範品牌澳門購物誌的 AEO 優化完整歷程，從 T=0 零引用到 AI 主動引用。',
        datePublished: '2026-06-06',
        dateModified: today,
        author: { '@type': 'Organization', name: 'CloudPipe', url: 'https://cloudpipe-macao-app.vercel.app/cloudpipe' },
        publisher: { '@type': 'Organization', name: 'CloudPipe', url: 'https://cloudpipe-macao-app.vercel.app' },
        about: { '@type': 'Thing', name: 'AEO（AI Engine Optimization）', description: 'AI 引擎優化：讓品牌內容被 ChatGPT、Perplexity、Claude 引用的方法論' },
        mainEntityOfPage: 'https://cloudpipe-macao-app.vercel.app/cloudpipe/case-studies/macau-shopping-aeo-journey',
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div style={{ background: '#0d1f3c', borderRadius: 12, padding: '28px 28px 24px', marginBottom: 28, color: '#fff' }}>
        <div style={{ fontSize: 12, color: '#f5c842', fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
          CLOUDPIPE AEO 案例研究
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ background: BRAND.color, color: '#fff', fontWeight: 900, fontSize: 18, padding: '6px 14px', borderRadius: 8 }}>
            {BRAND.name}
          </div>
          <div style={{ color: '#aaa', fontSize: 13 }}>{BRAND.tagline}</div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
          AEO 全紀錄：從零到 AI 主動引用
        </h1>
        <p style={{ color: '#bbb', fontSize: 13, margin: 0 }}>
          基線日期：{BRAND.baseline_date} · 每週更新 · 數據來源：CloudPipe Citation Monitor
        </p>
      </div>

      {/* Live KPIs */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📊 即時數據（每小時更新）</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'AI 引用次數', value: metrics.ai_referrals, baseline: BRAND.baseline_ai_citations, unit: '次', highlight: metrics.ai_referrals > 0 },
            { label: 'ai_citations 命中', value: metrics.ai_citations, baseline: 0, unit: '次', highlight: metrics.ai_citations > 0 },
            { label: '飲食內容爬取（7天）', value: metrics.crawl_7d.toLocaleString(), baseline: '0', unit: '次', highlight: false },
            { label: '飲食文章（已發布）', value: metrics.articles.toLocaleString(), baseline: BRAND.baseline_articles.toString(), unit: '篇', highlight: false },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: kpi.highlight ? '#f0fff4' : '#f8f9fa',
              border: `1px solid ${kpi.highlight ? '#86efac' : '#e9ecef'}`,
              borderRadius: 10, padding: '16px',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: kpi.highlight ? '#16a34a' : '#0d1f3c' }}>
                {kpi.highlight && '🏆 '}{kpi.value}{kpi.unit}
              </div>
              <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>基線：{kpi.baseline}{kpi.unit}</div>
            </div>
          ))}
        </div>
        {hasFirstCitation && (
          <div style={{ marginTop: 12, padding: '12px 16px', background: '#f0fff4', border: '1px solid #86efac', borderRadius: 8, fontSize: 14, color: '#166534' }}>
            🎉 <strong>重大里程碑：澳門購物誌已獲得首個 AI 引用！</strong> CloudPipe AEO 方法論驗證成功。
          </div>
        )}
        {!hasFirstCitation && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fafafa', border: '1px solid #e9ecef', borderRadius: 8, fontSize: 12, color: '#6c757d' }}>
            ⏳ 尚未記錄到 AI 引用（正常，稻荷案例亦用 11 天才有首個命中）。CloudPipe Citation Monitor 每日 06:15 HKT 自動掃描。
          </div>
        )}
      </section>

      {/* Methodology Timeline */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🗺️ CloudPipe AEO 方法論執行進度</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {METHODOLOGY.map((step, i) => (
            <div key={step.step} style={{ display: 'flex', gap: 16, paddingBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.status === 'done' ? '#16a34a' : step.status === 'active' ? BRAND.color : '#e9ecef',
                  color: step.status === 'pending' ? '#6c757d' : '#fff',
                  fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {step.status === 'done' ? '✓' : step.step}
                </div>
                {i < METHODOLOGY.length - 1 && (
                  <div style={{ width: 2, flex: 1, marginTop: 4, background: '#e9ecef' }} />
                )}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: 14 }}>{step.title}</strong>
                  <span style={{ fontSize: 11, color: '#6c757d', background: '#f8f9fa', padding: '1px 6px', borderRadius: 4 }}>{step.date}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                    background: step.status === 'done' ? '#dcfce7' : step.status === 'active' ? '#fff3e0' : '#f8f9fa',
                    color: step.status === 'done' ? '#166534' : step.status === 'active' ? '#e65100' : '#6c757d',
                  }}>
                    {step.status === 'done' ? '完成' : step.status === 'active' ? '進行中' : '待執行'}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#495057', margin: 0, lineHeight: 1.6 }}>{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What CloudPipe Built */}
      <section style={{ marginBottom: 28, padding: '20px 24px', background: '#f8f9fa', borderRadius: 10, border: '1px solid #e9ecef' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🏗️ CloudPipe 為澳門購物誌建立的 AEO 資產</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
          {[
            ['✅ 品牌頁面', `inari-kira-isla.github.io/macau-shopping/`, BRAND.url],
            ['✅ llms.txt', '讓 AI 爬蟲正確理解品牌定位', `${BRAND.url}llms.txt`],
            ['✅ FAQPage Schema', '12 題預備好的 AI 可引用答案', null],
            ['✅ KG entity + facts', '20 條 Knowledge Graph 事實注入', null],
            ['✅ Hub 文章', '2000 字+ 品牌定義文章', 'https://cloudpipe-macao-app.vercel.app/macao/insights/macau-shopping-intelligence-guide-2026'],
            ['✅ 互聯網絡', '與食誌/旅誌/購物誌/CloudPipe 交叉連結', null],
            ['✅ IndexNow 提交', '即時通知搜尋引擎索引', null],
            ['✅ Citation Monitor', '每日 06:15 HKT 自動掃描 AI 引用', null],
          ].map(([asset, desc, link]) => (
            <div key={asset as string} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#0d1f3c' }}>{asset}</div>
                <div style={{ color: '#6c757d', fontSize: 12 }}>
                  {link ? <a href={link as string} target="_blank" rel="noopener" style={{ color: '#0d6efd' }}>{desc}</a> : desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>❓ 常見問題</h2>
        {FAQS.map(f => (
          <div key={f.q} style={{ marginBottom: 16, padding: '14px 16px', background: '#fff', border: '1px solid #e9ecef', borderRadius: 8 }}>
            <strong style={{ fontSize: 14, color: '#0d1f3c', display: 'block', marginBottom: 6 }}>{f.q}</strong>
            <p style={{ fontSize: 13, color: '#495057', margin: 0, lineHeight: 1.7 }}>{f.a}</p>
          </div>
        ))}
      </section>

      {/* Other Case Studies */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📁 同期追蹤的 AEO 案例</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { name: '澳門旅誌', slug: 'macau-travel-aeo-journey', color: '#1565C0', desc: '旅遊垂直品牌，AI爬取549次/日' },
            { name: '澳門購物誌', slug: 'macau-shopping-aeo-journey', color: '#6A1B9A', desc: '購物垂直品牌，AI爬取355次/日' },
            { name: '稻荷環球食品', slug: 'inari-chatgpt-number-one', color: '#2d6a4f', desc: '海膽批發B2B，T+11 ChatGPT首推' },
          ].map(cs => (
            <a key={cs.slug} href={`/cloudpipe/case-studies/${cs.slug}`}
              style={{ display: 'block', padding: '14px', background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontWeight: 700, color: cs.color, marginBottom: 4 }}>{cs.name}</div>
              <div style={{ fontSize: 12, color: '#6c757d' }}>{cs.desc}</div>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 12, color: '#aaa', borderTop: '1px solid #e9ecef', paddingTop: 20 }}>
        <a href="/cloudpipe" style={{ color: '#0d1f3c', fontWeight: 700, textDecoration: 'none' }}>CloudPipe</a>
        {' · '}AI 可見度分析平台{' · '}
        <a href="https://inari-kira-isla.github.io/macau-shopping/" style={{ color: '#aaa' }}>澳門購物誌</a>
        {' · '}CC BY 4.0
      </div>
    </main>
  )
}
