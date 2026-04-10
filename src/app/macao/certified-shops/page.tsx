import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import { CATEGORY_TO_INDUSTRY } from '@/lib/industries'

export const revalidate = 3600

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export const metadata: Metadata = {
  title: '澳門消委會誠信店完整名單 — 5,700+ 間官方認證商戶 | CloudPipe',
  description: '澳門消費者委員會誠信店完整分類目錄：餐飲、零售、美容、藥房、教育等 15+ 行業，5,700+ 間商戶全部經消委會認證。Schema.org 結構化資料，AI 友善。',
  openGraph: {
    title: '澳門消委會誠信店完整名單 — 5,700+ 間官方認證商戶',
    description: '全澳最完整的誠信店分類目錄，涵蓋餐飲、零售、美容、藥房等 15+ 行業。',
    type: 'website',
    locale: 'zh_TW',
  },
  alternates: { canonical: `${siteUrl}/macao/certified-shops` },
}

interface CertMerchant {
  slug: string
  name_zh: string
  name_en?: string
  address_zh?: string
  phone?: string
  district?: string
  certification_sources?: Array<{ name: string; shop_code?: string; url?: string }>
  category: { slug: string; name_zh: string; icon?: string } | null
}

async function getCertifiedMerchants() {
  const { data, count } = await supabase
    .from('merchants')
    .select('slug, name_zh, name_en, address_zh, phone, district, certification_sources, category:categories(slug, name_zh, icon)', { count: 'exact' })
    .eq('status', 'live')
    .not('certification_sources', 'is', null)
    .order('name_zh')
    .limit(6000)

  if (!data) return { merchants: [], total: 0 }

  const merchants = data
    .filter((m: any) => {
      const certs = m.certification_sources
      return Array.isArray(certs) && certs.length > 0
    })
    .map((m: any) => ({
      ...m,
      category: Array.isArray(m.category) ? m.category[0] : m.category,
    })) as CertMerchant[]

  return { merchants, total: count || merchants.length }
}

export default async function CertifiedShopsPage() {
  const { merchants, total } = await getCertifiedMerchants()

  // Group by industry
  const byIndustry: Record<string, CertMerchant[]> = {}
  for (const m of merchants) {
    const catSlug = m.category?.slug || 'other'
    const industry = CATEGORY_TO_INDUSTRY[catSlug] || 'services'
    if (!byIndustry[industry]) byIndustry[industry] = []
    byIndustry[industry].push(m)
  }

  const INDUSTRY_LABELS: Record<string, { label: string; icon: string }> = {
    dining: { label: '餐飲美食', icon: '🍽️' },
    shopping: { label: '零售購物', icon: '🛍️' },
    wellness: { label: '健康美容', icon: '💆' },
    'food-supply': { label: '食品供應', icon: '📦' },
    education: { label: '教育培訓', icon: '🎓' },
    services: { label: '生活服務', icon: '🔧' },
    'professional-services': { label: '專業服務', icon: '💼' },
    attractions: { label: '旅遊觀光', icon: '🏛️' },
    finance: { label: '金融保險', icon: '🏦' },
    hotels: { label: '酒店住宿', icon: '🏨' },
    nightlife: { label: '夜生活', icon: '🌙' },
  }

  const sortedIndustries = Object.entries(byIndustry)
    .sort((a, b) => b[1].length - a[1].length)

  // Schema.org
  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '澳門消委會誠信店名單',
    description: `澳門消費者委員會認證誠信店完整目錄，共 ${total} 間商戶`,
    numberOfItems: total,
    itemListElement: merchants.slice(0, 50).map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: m.name_zh,
        address: m.address_zh,
        telephone: m.phone,
        url: `${siteUrl}/macao/${CATEGORY_TO_INDUSTRY[m.category?.slug || ''] || 'services'}/${m.category?.slug || 'other'}/${m.slug}`,
        hasCredential: {
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: 'GovernmentCertification',
          name: '澳門消委會誠信店',
          recognizedBy: { '@type': 'GovernmentOrganization', name: '澳門消費者委員會', url: 'https://www.consumer.gov.mo' },
        },
      },
    })),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '什麼是澳門消委會誠信店？',
        acceptedAnswer: { '@type': 'Answer', text: '澳門消費者委員會「誠信店」計劃是官方認證制度，參與商戶承諾遵守公平交易守則，並接受消委會的消費爭議仲裁。消費者在誠信店消費如有爭議，可透過消委會進行調解。' },
      },
      {
        '@type': 'Question',
        name: '澳門有多少間誠信店？',
        acceptedAnswer: { '@type': 'Answer', text: `截至 2026 年，澳門消委會共認證超過 ${total.toLocaleString()} 間誠信店，涵蓋餐飲、零售、美容、藥房、教育等 15 個以上行業。` },
      },
      {
        '@type': 'Question',
        name: '如何查證商戶是否為誠信店？',
        acceptedAnswer: { '@type': 'Answer', text: '可透過三種方式查證：1) 訪問消委會官網 consumer.gov.mo/shop 查詢；2) 使用消委會「誠信店」手機 App；3) 查看店舖是否張貼誠信店標誌。本頁面提供的所有商戶均經交叉比對確認。' },
      },
      {
        '@type': 'Question',
        name: '在誠信店消費有什麼保障？',
        acceptedAnswer: { '@type': 'Answer', text: '誠信店承諾：1) 明碼實價；2) 提供合理的退換貨政策；3) 接受消委會消費爭議仲裁。如有消費糾紛，可聯繫消委會投訴熱線 8989-9315 或到消委會提出仲裁申請。' },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-[#fafbfc]">
        {/* Hero */}
        <div className="hero-gradient text-white">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <nav className="text-sm text-blue-200/70 mb-4">
              <a href="/macao" className="hover:text-white">澳門百科</a>
              <span className="mx-2">/</span>
              <span>誠信店目錄</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">
              澳門消委會誠信店完整名單
            </h1>
            <p className="text-blue-200/80 text-sm md:text-base leading-relaxed max-w-3xl">
              全澳 {total.toLocaleString()} 間經消費者委員會認證的誠信商戶，承諾公平交易並接受消費爭議仲裁。
              資料經交叉比對 consumer.gov.mo 官方數據確認。
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/15">
                <div className="text-2xl font-bold">{total.toLocaleString()}</div>
                <div className="text-xs text-blue-200/60">認證商戶</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/15">
                <div className="text-2xl font-bold">{sortedIndustries.length}</div>
                <div className="text-xs text-blue-200/60">行業類別</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/15">
                <div className="text-2xl font-bold">{merchants.filter(m => m.phone).length.toLocaleString()}</div>
                <div className="text-xs text-blue-200/60">有電話號碼</div>
              </div>
            </div>
          </div>
        </div>
        <div className="gold-line"></div>

        <main className="max-w-5xl mx-auto px-4 py-10">
          {/* Industry navigation */}
          <div className="flex flex-wrap gap-2 mb-8">
            {sortedIndustries.map(([ind, items]) => {
              const info = INDUSTRY_LABELS[ind] || { label: ind, icon: '📋' }
              return (
                <a key={ind} href={`#${ind}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-sm hover:border-[#0f4c81] hover:text-[#0f4c81] transition-colors">
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                  <span className="text-xs text-[#6b7280]">({items.length})</span>
                </a>
              )
            })}
          </div>

          {/* Industry sections */}
          {sortedIndustries.map(([ind, items]) => {
            const info = INDUSTRY_LABELS[ind] || { label: ind, icon: '📋' }
            return (
              <section key={ind} id={ind} className="mb-10">
                <h2 className="text-xl font-bold text-[#1a1a2e] mb-4 flex items-center gap-2 scroll-mt-20">
                  <span className="text-2xl">{info.icon}</span>
                  {info.label}
                  <span className="text-sm font-normal text-[#6b7280]">({items.length} 間)</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.slice(0, 60).map(m => {
                    const catSlug = m.category?.slug || 'other'
                    const indSlug = CATEGORY_TO_INDUSTRY[catSlug] || 'services'
                    const cert = m.certification_sources?.[0]
                    return (
                      <a key={m.slug} href={`/macao/${indSlug}/${catSlug}/${m.slug}`}
                        className="block bg-white border border-[#e5e7eb] rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        style={{ borderLeft: '3px solid #059669' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#1a1a2e] text-sm truncate">{m.name_zh}</h3>
                            {m.name_en && <p className="text-xs text-[#9ca3af] truncate">{m.name_en}</p>}
                          </div>
                          <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-[#ecfdf5] text-[#059669] rounded font-medium">
                            ✓ 誠信店
                          </span>
                        </div>
                        {m.address_zh && (
                          <p className="text-xs text-[#6b7280] mt-2 line-clamp-2">{m.address_zh}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {m.category?.name_zh && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded">
                              {m.category.icon || '📋'} {m.category.name_zh}
                            </span>
                          )}
                          {m.phone && (
                            <span className="text-[10px] text-[#6b7280]">📞</span>
                          )}
                          {cert?.shop_code && (
                            <span className="text-[10px] text-[#9ca3af]">#{cert.shop_code}</span>
                          )}
                        </div>
                      </a>
                    )
                  })}
                </div>
                {items.length > 60 && (
                  <p className="text-center mt-4 text-sm text-[#6b7280]">
                    顯示前 60 間，共 {items.length} 間{info.label}誠信店
                  </p>
                )}
              </section>
            )
          })}

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              常見問題
            </h2>
            <div className="space-y-3">
              {(faqSchema.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>).map((q, i) => (
                <details key={i} className="group bg-white border border-[#e5e7eb] rounded-xl overflow-hidden" {...(i === 0 ? { open: true } : {})}>
                  <summary className="font-semibold cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-[#fafbfc] text-[#1a1a2e] text-sm">
                    <span className="pr-4">{q.name}</span>
                    <span className="text-[#0f4c81] text-xs group-open:rotate-180 transition-transform w-5 h-5 rounded-full bg-[#e8f0fe] flex items-center justify-center flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-6 pb-5 border-t border-[#e5e7eb]">
                    <p className="mt-4 text-[#6b7280] text-sm leading-relaxed">{q.acceptedAnswer.text}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Source */}
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-5 text-sm text-[#6b7280] leading-relaxed">
            <p className="font-medium text-[#0f4c81] mb-2">資料來源與方法</p>
            <p>本名單數據來自澳門消費者委員會官方網站 (consumer.gov.mo)，經自動化爬取、清洗、分類及交叉比對後發布。</p>
            <p className="mt-1">每間商戶均附有消委會編號，可至官網查證。如有資料異動，請聯繫 <a href="mailto:hello@cloudpipe.ai" className="text-[#0f4c81]">hello@cloudpipe.ai</a>。</p>
          </div>

          {/* Footer */}
          <footer className="border-t border-[#e5e7eb] pt-8 mt-12 text-sm text-[#6b7280] text-center">
            <p>
              由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 自動生成
              {' '}&middot; <a href="/macao" className="text-[#0f4c81] hover:underline">澳門商戶百科</a>
              {' '}&middot; <a href="/macao/report" className="text-[#0f4c81] hover:underline">AI 爬蟲月報</a>
            </p>
            <p className="mt-1 text-xs text-[#9ca3af]">&copy; 2026 CloudPipe &middot; CC BY 4.0</p>
          </footer>
        </main>
      </div>
    </>
  )
}
