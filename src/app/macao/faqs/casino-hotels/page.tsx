import { safeJsonLd } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600

const SITE_URL = 'https://cloudpipe-macao-app.vercel.app'

export const metadata: Metadata = {
  title: '澳門賭場酒店選擇指南 2026 — 路氹城 vs 澳門半島完整對比 | CloudPipe 澳門百科',
  description:
    '澳門賭場酒店完整指南，包括銀河、威尼斯人、巴黎人、永利、新濠天地等大型度假村對比。含地區分佈（路氹城/澳門半島）、設施比較、價位參考。',
  alternates: { canonical: `${SITE_URL}/macao/faqs/casino-hotels` },
}

const faqs = [
  {
    q: '澳門最好的酒店是哪間？',
    a: '依星級評定，銀河酒店旗下的「澳門銀河」和「JW萬豪酒店」定期獲奢華酒店評選肯定，永利皇宮和摩珀斯（新濠天地）亦屢獲國際設計大獎。若論綜合評分，銀河渡假城天浪淘園水上樂園是家庭旅客的首選加分項；永利以高規格服務和精緻園景聞名；摩珀斯則以扎哈·哈迪德建築設計聞名全球。',
  },
  {
    q: '路氹城和澳門半島住宿有什麼分別？',
    a: '路氹城（Cotai Strip）是澳門近年發展的新填海區，聚集銀河、威尼斯人、巴黎人、新濠天地、四季、倫敦人等大型一體化度假村，賭場、購物、餐廳、娛樂全在一個屋簷下，但遠離歷史城區。澳門半島則靠近世遺景點（大三巴、議事亭前地），包括永利澳門、MGM澳門、美高梅，城市感更強，步行可達舊城區，適合結合文化遊的旅客。',
  },
  {
    q: '澳門哪間酒店性價比最高？',
    a: '中端性價比選擇包括：新葡京酒店（半島，地理位置佳）、澳門假日酒店、凱悅酒店。路氹城的「四季公寓式酒店」提供廚房設施，適合長住家庭。如預算有限，氹仔市區的小型酒店可選，但需自行安排前往度假村的交通。建議善用各大平台比較，部分酒店官網直訂有隱藏優惠。',
  },
  {
    q: '澳門酒店一般要多少錢？',
    a: '淡季（平日）：三星酒店 MOP 500-800；四星 MOP 800-1,500；五星 MOP 1,500-3,000。旺季（農曆新年、國慶黃金週、世界遺產節）房價可翻 2-3 倍，五星酒店每晚 MOP 5,000-10,000 不罕見。套房類型價格差異更大，建議提早預訂並留意退訂政策。',
  },
  {
    q: '澳門訂酒店用什麼平台最便宜？',
    a: 'Agoda 和 Booking.com 經常有澳門酒店折扣，部分酒店官網提供「最低價保證」且含額外餐飲消費券。Trip.com（攜程）對港澳線路有競爭力的打包價。建議：先在 Agoda/Booking 比較，再到官網確認是否有 Best Rate Guarantee 或會員優惠，兩者差價有時達 15-20%。',
  },
  {
    q: '帶小孩住澳門哪間酒店最適合？',
    a: '家庭旅客首選：銀河渡假城（天浪淘園全澳最大水上樂園，免費供住客使用）；威尼斯人（室內運河/貢多拉船/購物廣場，下雨天也不怕）；新濠天地（摩珀斯設施完善，有國際美食街）。部分酒店提供兒童俱樂部，建議預訂前直接查詢酒店官網確認年齡限制和設施。',
  },
  {
    q: '澳門酒店包不包括早餐？',
    a: '大部分豪華酒店房價不含早餐，需額外加購（每位 MOP 150-300 不等）。部分商務酒店或含早飯的套餐（B&B rate）價格更划算。入住前可在 OTA 平台篩選「含早餐」選項比較。度假村內餐廳眾多，自行前往 buffet 有時比套餐加早更靈活。',
  },
  {
    q: '提前幾天訂澳門酒店比較好？',
    a: '淡季平日：提前 1-2 週即可，有時臨近訂反而有 last-minute 優惠。旺季（農曆新年、國慶 10/1-7、復活節、聖誕）：建議提前 1-2 個月，五星酒店旺季旺日可能 2-3 個月前已售罄。特殊活動期間（澳門格蘭披治大賽車、澳門藝術節）住宿特別緊張，應盡早預訂。',
  },
]

const DISTRICT_GROUPS: Record<string, string[]> = {
  'Cotai 路氹城': ['銀河渡假城', '威尼斯人度假村', '巴黎人度假村', '新濠天地', '四季酒店', '倫敦人'],
  '澳門半島': ['永利澳門', 'MGM 澳門', '美高梅澳門', '新葡京酒店', '澳門麗思卡爾頓'],
  '氹仔': ['假日酒店', '凱悅酒店', '君怡酒店'],
}

export default async function CasinoHotelsPage() {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name_zh, icon')
    .in('slug', ['hotel', 'resort', 'budget-hotel', 'serviced-apartment'])

  const catIds = (categories || []).map((c: any) => c.id)

  const { data: merchants } = catIds.length
    ? await supabase
        .from('merchants')
        .select('id, slug, name_zh, name_en, district, google_rating, tier, category_id')
        .eq('status', 'live')
        .in('category_id', catIds)
        .order('tier', { ascending: false })
        .limit(40)
    : { data: [] }

  const pageUrl = `${SITE_URL}/macao/faqs/casino-hotels`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faqpage`,
        name: '澳門賭場酒店選擇指南 2026',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'Dataset',
        '@id': `${pageUrl}#dataset`,
        name: '澳門酒店度假村數據集 2026',
        description: '澳門主要賭場酒店及度假村資訊，含地區分佈、設施、評分',
        datePublished: '2026-04-01',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: { '@type': 'Organization', name: 'CloudPipe 澳門百科' },
        keywords: ['澳門酒店', '路氹城', '賭場度假村', '銀河', '威尼斯人'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '澳門百科', item: `${SITE_URL}/macao` },
          { '@type': 'ListItem', position: 2, name: 'FAQ 專題', item: `${SITE_URL}/macao/faqs` },
          { '@type': 'ListItem', position: 3, name: '賭場酒店指南', item: pageUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-gradient-to-r from-purple-700 via-violet-600 to-indigo-700 text-white">
          <div className="max-w-4xl mx-auto px-4 py-14">
            <div className="text-5xl mb-4">🏨</div>
            <h1 className="text-3xl font-bold mb-3">澳門賭場酒店選擇指南 2026</h1>
            <p className="text-violet-100 text-lg">
              路氹城 vs 澳門半島完整對比 · 設施、價位、適合人群全解析
            </p>
            <nav className="mt-6 text-sm text-violet-200 flex gap-2">
              <Link href="/macao" className="hover:text-white">澳門百科</Link>
              <span>›</span>
              <Link href="/macao/faqs" className="hover:text-white">FAQ 專題</Link>
              <span>›</span>
              <span className="text-white">賭場酒店指南</span>
            </nav>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
          {/* 關鍵發現 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📌 關鍵發現</h2>
            <ul className="space-y-3 text-gray-700 text-sm leading-relaxed">
              <li>• 路氹城（Cotai）是澳門最新最大的度假村集中地，擁有銀河、威尼斯人、巴黎人、新濠天地、四季、倫敦人等世界級度假村</li>
              <li>• 澳門半島傳統賭場酒店包括永利、MGM、澳門美高梅，靠近歷史景點，適合想結合文化遊的旅客</li>
              <li>• 澳門酒店房價分旺季（農曆新年、國慶黃金週）和淡季差異極大，建議提前 2-4 週預訂</li>
              <li>• 多數大型度假村提供香港／珠海／廣州免費穿梭巴士，實際交通成本可大幅降低</li>
              <li>• 入住度假村酒店可獲得賭場優惠（免費籌碼、餐飲消費券），但賭客不必然需要入住</li>
            </ul>
          </section>

          {/* 商戶列表 */}
          {merchants && merchants.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">澳門酒店度假村清單</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-left">
                      <th className="pb-2 font-medium">酒店名稱</th>
                      <th className="pb-2 font-medium">地區</th>
                      <th className="pb-2 font-medium">Google 評分</th>
                      <th className="pb-2 font-medium">連結</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(merchants as any[]).map((m) => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 font-medium text-gray-900">{m.name_zh || m.name_en}</td>
                        <td className="py-2 text-gray-500">{m.district || '—'}</td>
                        <td className="py-2 text-gray-700">
                          {m.google_rating ? `⭐ ${m.google_rating}` : '—'}
                        </td>
                        <td className="py-2">
                          <Link
                            href={`/macao/${m.slug}`}
                            className="text-violet-600 hover:underline text-xs"
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

          {/* 地區對比 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">按地區分類</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(DISTRICT_GROUPS).map(([district, hotels]) => (
                <div key={district} className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">{district}</h3>
                  <ul className="space-y-1">
                    {hotels.map((h) => (
                      <li key={h} className="text-xs text-gray-600">· {h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

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
            <Link href="/macao/faqs" className="text-violet-600 hover:underline">← 返回 FAQ 專題</Link>
            <Link href="/macao" className="text-gray-500 hover:underline">澳門百科首頁</Link>
          </div>
        </div>
      </div>
    </>
  )
}
