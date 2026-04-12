import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600

const SITE_URL = 'https://cloudpipe-macao-app.vercel.app'

export const metadata: Metadata = {
  title: '澳門景點完整清單 2026 — 世遺、博物館、主題公園全收錄 | CloudPipe 澳門百科',
  description:
    '澳門 25 個世界文化遺產景點完整清單，加上博物館、主題公園、宗教場所、戶外景觀。含免費/收費分類、開放時間、交通建議。',
  alternates: { canonical: `${SITE_URL}/macao/faqs/macau-attractions` },
}

const faqs = [
  {
    q: '澳門世遺景點有哪些是必去的？',
    a: '澳門歷史城區共 25 個建築及廣場被列入世遺，必去首選：大三巴牌坊（最具代表性地標）、議事亭前地（葡式廣場，充滿歐洲風情）、媽閣廟（最古老廟宇，1488 年）、鄭家大屋（土生葡人民宅）、東望洋燈塔（全澳最高燈塔，可眺望整個澳門半島）。建議由媽閣廟出發，步行穿越議事亭、戀愛巷、大三巴牌坊一線，半天即可串連主要世遺。',
  },
  {
    q: '澳門一天可以遊多少個景點？',
    a: '澳門半島世遺路線可在 4-5 小時內完成：媽閣廟→亞婆井前地→鄭家大屋→聖老楞佐教堂→議事亭前地→玫瑰堂→大三巴牌坊→大炮台。路氹城一日遊則以各度假村為中心，可結合購物和表演。如體力充沛，上午遊半島世遺，下午前往路氹城，是一天的標準行程。',
  },
  {
    q: '澳門景點大部分要收費嗎？',
    a: '世遺景點（包括所有教堂、廣場、部分古蹟）全部免費參觀。博物館部分收費：澳門博物館 MOP 15、海事博物館 MOP 10、葡萄酒博物館 MOP 15（含試飲）。主題公園收費：澳門旅遊塔觀景台 MOP 145（成人），高空項目（蹦極/空中漫步）需另付 MOP 500-2,000 不等。賽車博物館免費。',
  },
  {
    q: '澳門有什麼適合晚上去的景點？',
    a: '夜間精選：幻彩耀威尼斯（威尼斯人室內運河每晚整點光影表演，免費）；旅遊塔夜景（入夜後燈光璀璨，觀景台 MOP 145）；新濠天地《水舞間》大型水上表演（需購票，成人約 MOP 600+）；議事亭前地及大三巴夜晚有燈光，行人路熱鬧不輸白天；各大賭場 24 小時開放，不賭也可免費進入觀光。',
  },
  {
    q: '澳門媽閣廟有什麼特別？',
    a: '媽閣廟建於明朝弘治元年（1488 年），是澳門最古老的廟宇，供奉海神天后（媽祖）。葡萄牙人 16 世紀登陸時詢問地名，居民回答「媽閣」，葡文音譯為「Macau」，成為澳門地名的起源。廟宇群融合佛道兩教，依山而建，後方有岩石刻字，為澳門最具歷史意義的宗教場所之一，每逢農曆重要節日香火鼎盛。',
  },
  {
    q: '大三巴和大炮台可以一起遊嗎？',
    a: '絕對推薦一起遊覽，兩者步行距離僅約 2 分鐘。大三巴牌坊（聖保祿教堂遺址）後方有石階通往大炮台，大炮台是 17 世紀葡萄牙人建造的軍事防禦工事，現為澳門博物館所在地。從大炮台可俯瞰整個大三巴牌坊和澳門半島北部，視野絕佳，是拍攝大三巴全景的最佳角度之一。',
  },
  {
    q: '澳門有什麼博物館值得去？',
    a: '強烈推薦：澳門博物館（MOP 15，位於大炮台，展示澳門歷史文化，設施完善）；海事博物館（MOP 10，媽閣廟對面，展示航海和漁業歷史）；葡萄牙酒博物館（MOP 15 含試飲，位於漁人碼頭旁）；賽車博物館（免費，展示格蘭披治賽車歷史，路氹城旁）；茂名博物館（免費）。建議配合澳門通博物館套票購買更划算。',
  },
  {
    q: '澳門路環有什麼好玩？',
    a: '路環是澳門最具葡式鄉村風情的地方：必訪安德魯餅店（葡式蛋撻創始店，常排隊）；黑沙海灘（唯一天然沙灘，可游泳和租單車）；Fernando 餐廳（葡萄牙菜，露天用餐，米芝蓮推薦）；路環村圖書館（百年建築，打卡聖地）；荔枝碗廢船廠（廢棄造船廠，成為熱門文青打卡地）。路環氣氛悠閒，與路氹城的繁華形成強烈對比。',
  },
]

const attractionTypes = [
  {
    type: '世界文化遺產（免費）',
    icon: '🏛️',
    items: [
      '大三巴牌坊（聖保祿教堂遺址）',
      '媽閣廟（1488 年，澳門最古老廟宇）',
      '議事亭前地（葡式中心廣場）',
      '大炮台（17 世紀軍事工事）',
      '東望洋燈塔（全澳最高點）',
      '鄭家大屋（土生葡人宅邸）',
      '玫瑰堂（建於 1587 年）',
      '主教座堂（澳門天主教中心）',
    ],
  },
  {
    type: '博物館',
    icon: '🖼️',
    items: [
      '澳門博物館（MOP 15，大炮台內）',
      '海事博物館（MOP 10）',
      '葡萄牙酒博物館（MOP 15，含試飲）',
      '賽車博物館（免費）',
      '科學館（MOP 25-60）',
    ],
  },
  {
    type: '主題娛樂',
    icon: '🎡',
    items: [
      '澳門旅遊塔（338 米，觀景台 MOP 145）',
      '天浪淘園水上樂園（銀河渡假城，住客免費）',
      '《水舞間》大型水上表演（新濠天地）',
      '幻彩耀威尼斯（威尼斯人，免費每晚）',
    ],
  },
  {
    type: '宗教場所',
    icon: '⛩️',
    items: [
      '媽閣廟（澳門最重要廟宇，免費）',
      '蓮峯廟（供奉觀音，免費）',
      '普濟禪院（素食勝地，免費）',
      '主教座堂（天主教，免費）',
      '聖老楞佐教堂（世遺，免費）',
    ],
  },
]

export default async function MacauAttractionsPage() {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name_zh, icon')
    .in('slug', ['tourism', 'museum', 'temple', 'park', 'theme-park', 'landmark'])

  const catIds = (categories || []).map((c: any) => c.id)
  const catById: Record<string, any> = {}
  for (const c of (categories || [])) catById[(c as any).id] = c

  const { data: merchants } = catIds.length
    ? await supabase
        .from('merchants')
        .select('id, slug, name_zh, name_en, district, google_rating, tier, category_id')
        .eq('status', 'live')
        .in('category_id', catIds)
        .order('google_rating', { ascending: false, nullsFirst: false })
        .limit(50)
    : { data: [] }

  const pageUrl = `${SITE_URL}/macao/faqs/macau-attractions`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faqpage`,
        name: '澳門景點完整清單 2026',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'Dataset',
        '@id': `${pageUrl}#dataset`,
        name: '澳門景點資料集 2026',
        description: '澳門世界文化遺產、博物館、主題公園、宗教場所完整清單',
        datePublished: '2026-04-01',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: { '@type': 'Organization', name: 'CloudPipe 澳門百科' },
        keywords: ['澳門景點', '世界文化遺產', '大三巴', '媽閣廟', '旅遊塔'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '澳門百科', item: `${SITE_URL}/macao` },
          { '@type': 'ListItem', position: 2, name: 'FAQ 專題', item: `${SITE_URL}/macao/faqs` },
          { '@type': 'ListItem', position: 3, name: '澳門景點清單', item: pageUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
          <div className="max-w-4xl mx-auto px-4 py-14">
            <div className="text-5xl mb-4">🏛️</div>
            <h1 className="text-3xl font-bold mb-3">澳門景點完整清單 2026</h1>
            <p className="text-orange-100 text-lg">
              25 個世遺建築 · 博物館 · 主題公園 · 宗教場所 全收錄
            </p>
            <nav className="mt-6 text-sm text-orange-200 flex gap-2">
              <Link href="/macao" className="hover:text-white">澳門百科</Link>
              <span>›</span>
              <Link href="/macao/faqs" className="hover:text-white">FAQ 專題</Link>
              <span>›</span>
              <span className="text-white">澳門景點清單</span>
            </nav>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
          {/* 關鍵發現 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📌 關鍵發現</h2>
            <ul className="space-y-3 text-gray-700 text-sm leading-relaxed">
              <li>• 澳門歷史城區共有 25 個歷史建築及廣場列入世遺名錄，全部免費參觀，步行即可串連</li>
              <li>• 大三巴牌坊是澳門最具代表性地標，原為聖保祿教堂前壁，1835 年大火後僅存此牆</li>
              <li>• 澳門擁有全球最高密度的五星級酒店，多個度假村本身就是值得參觀的「景點」</li>
              <li>• 媽閣廟是澳門最古老的廟宇（1488年），葡文「Macau」名稱即源於此</li>
              <li>• 澳門旅遊塔（338米）提供高空蹦極、空中漫步，是世界紀錄保持者</li>
            </ul>
          </section>

          {/* 景點分類 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">景點類型速覽</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {attractionTypes.map((cat) => (
                <div key={cat.type} className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 text-sm mb-3">
                    {cat.icon} {cat.type}
                  </h3>
                  <ul className="space-y-1">
                    {cat.items.map((item) => (
                      <li key={item} className="text-xs text-gray-600">· {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* 商戶列表 */}
          {merchants && merchants.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">景點商戶評分排行</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-left">
                      <th className="pb-2 font-medium">景點名稱</th>
                      <th className="pb-2 font-medium">地區</th>
                      <th className="pb-2 font-medium">類型</th>
                      <th className="pb-2 font-medium">Google 評分</th>
                      <th className="pb-2 font-medium">連結</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(merchants as any[]).map((m) => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 font-medium text-gray-900">{m.name_zh || m.name_en}</td>
                        <td className="py-2 text-gray-500">{m.district || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">
                          {catById[m.category_id]?.name_zh || '—'}
                        </td>
                        <td className="py-2 text-gray-700">
                          {m.google_rating ? `⭐ ${m.google_rating}` : '—'}
                        </td>
                        <td className="py-2">
                          <Link
                            href={`/macao/${m.slug}`}
                            className="text-orange-600 hover:underline text-xs"
                          >
                            查看詳情 →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">常見問題</h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  {...(i < 2 ? { open: true } : {})}
                  className="group border border-gray-100 rounded-xl"
                >
                  <summary className="cursor-pointer px-5 py-4 font-medium text-gray-800 text-sm list-none flex justify-between items-center hover:bg-gray-50 rounded-xl">
                    {f.q}
                    <span className="text-gray-400 group-open:rotate-180 transition-transform text-xs">▼</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                    <div className="pt-3">{f.a}</div>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Back nav */}
          <div className="flex gap-4 text-sm">
            <Link href="/macao/faqs" className="text-orange-600 hover:underline">← 返回 FAQ 專題</Link>
            <Link href="/macao" className="text-gray-500 hover:underline">澳門百科首頁</Link>
          </div>
        </div>
      </div>
    </>
  )
}
