import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600

const SITE_URL = 'https://cloudpipe-macao-app.vercel.app'

export const metadata: Metadata = {
  title: '澳門交通完整攻略 2026 — 入境方式、本地巴士、免費穿梭車全指南 | CloudPipe 澳門百科',
  description:
    '澳門交通完整指南：香港/珠海入境方式（渡輪/大橋/巴士）、本地巴士路線、賭場免費穿梭車、的士、輕軌 LRT。含票價、班次時間、實用建議。',
  alternates: { canonical: `${SITE_URL}/macao/faqs/macau-transport` },
}

const faqs = [
  {
    q: '香港去澳門怎麼去最方便？',
    a: '渡輪是最方便的方式。從香港上環信德中心的港澳碼頭或尖沙咀中港城出發，每天多班，航程約 60-75 分鐘，單程票價約 HKD 170-200（快船）。班次最密集，也可從香港機場直達澳門碼頭，無需入境香港市區。建議提前在噴射飛航或金光飛航官網訂票，旺季尤其要早訂。',
  },
  {
    q: '港珠澳大橋可以直接去澳門嗎？',
    a: '可以，但流程比渡輪繁複。需先抵達香港口岸（需乘坐機場巴士或出租車），再購票搭乘「金巴」（口岸穿梭巴士）過橋，全程約 45 分鐘車程，但加上等候和過關時間實際需 2-3 小時。班次不如渡輪頻密，建議非旺季或需從新界/大嶼山出發時才考慮。單程票約 HKD 65。',
  },
  {
    q: '澳門機場在哪裡？有哪些航線？',
    a: '澳門國際機場（MFM）位於氹仔，主要服務東南亞（泰國、越南、菲律賓）、台灣、日韓及中國內地城市航線。暫無直飛歐美的長途航線。機場抵達後可直接步行至各大賭場免費穿梭巴士候車區，或乘的士前往各地區。',
  },
  {
    q: '澳門巴士多少錢？怎麼付款？',
    a: '澳門公共巴士票價統一 MOP 6（澳門半島及氹仔），前往路環為 MOP 8.5。需準備精確零錢投入票箱，不設找贖。建議購買「澳門通」（Macau Pass）電子儲值卡，在便利店、7-11 均可購買和充值，過卡方便，且部分線路有小額折扣。不接受信用卡或銀聯直接付款。',
  },
  {
    q: '澳門有地鐵嗎？輕軌怎麼乘？',
    a: '澳門有輕軌（LRT，澳門輕軌）。目前已開通氹仔段，連接氹仔碼頭、機場、赤沙站（毗鄰路氹城）和蓮花口岸。澳門半島段正在建設中，預計 2025-2026 年延伸至媽閣及澳門半島中心。票價按區段計算，一般 MOP 6-10。站點設有屏蔽門和冷氣，配套完善。',
  },
  {
    q: '賭場穿梭巴士真的免費嗎？如何搭乘？',
    a: '是的，完全免費，無需消費或持有賭場卡。在港澳碼頭、氹仔碼頭、澳門機場均設有各度假村的穿梭巴士候車站，有清晰指示牌。銀河、威尼斯人、巴黎人、新濠天地、永利、MGM 等均有自己的穿梭巴士。班次約每 10-20 分鐘一班，旺季可能需排隊等候。回程時在度假村大堂入口處搭乘即可。',
  },
  {
    q: '澳門的士貴嗎？如何叫車？',
    a: '起錶價澳門半島 MOP 19（首 1.6km），其後每 240 米加 MOP 2。夜間（00:00-06:00）附加費 MOP 5，前往氹仔/路環/機場有隧道費附加。短途市區（如大三巴到葡京）約 MOP 30-40；氹仔到路氹城約 MOP 40-60。可在路邊招手或致電召喚。部分司機不懂粵語或英語，建議以書面地址出示目的地。澳門有「99Taxi」電召 App 可使用。',
  },
  {
    q: '澳門可以騎單車嗎？',
    a: '路環及黑沙海灘一帶有單車租借，沿海岸路騎行環境較好，適合休閒遊覽。氹仔部分公園也有單車道。但澳門半島交通繁忙、道路狹窄，不建議在市區騎單車。目前澳門沒有大型公共共享單車系統（如香港 gobike）。',
  },
  {
    q: '澳門到珠海怎麼去？',
    a: '澳門半島有兩個過關口岸前往珠海：關閘（拱北口岸）最多旅客使用，步行過關後即到拱北；青茂口岸是較新的口岸，連接中山市方向，有穿梭巴士。氹仔有蓮花口岸，可進入珠海橫琴。過關後可在珠海搭乘計程車或公共交通。澳門居民及旅客均可過關，需持有效旅行證件。',
  },
  {
    q: '澳門有 Uber 嗎？有其他叫車 App 嗎？',
    a: '澳門暫無 Uber 服務。本地叫車 App 可使用「99Taxi」（澳門本地平台），支援中英文界面和微信支付。也可透過酒店禮賓部安排專車。部分商務旅客使用私家車接送服務（需提前預訂）。整體而言，澳門面積小，步行和穿梭巴士結合已能覆蓋大部分需求。',
  },
]

const entryMethods = [
  { method: '渡輪（港澳）', from: '香港上環/尖沙咀/機場', time: '60-75 分鐘', price: 'HKD 170-200', notes: '班次最多，最推薦' },
  { method: '港珠澳大橋金巴', from: '香港口岸', time: '45 分鐘（+等候）', price: 'HKD 65', notes: '班次較少' },
  { method: '澳門國際機場', from: '東南亞/台灣/日韓', time: '—', price: '機票', notes: '無長途直飛' },
  { method: '拱北口岸（步行）', from: '珠海拱北', time: '步行即達', price: '免費', notes: '連接內地' },
]

const localTransport = [
  { type: '公共巴士', cost: 'MOP 6-8.5', notes: '全市覆蓋，需精確零錢或澳門通' },
  { type: '的士', cost: 'MOP 19 起錶', notes: '市區短途方便，前往路環稍貴' },
  { type: '賭場免費穿梭巴士', cost: '免費', notes: '各度假村均有，碼頭/機場出發' },
  { type: '輕軌 LRT', cost: 'MOP 6-10', notes: '氹仔段已開通，半島段建設中' },
  { type: '步行', cost: '免費', notes: '世遺景點間距離短，步行最適合' },
]

export default async function MacauTransportPage() {
  // 嘗試抓取交通相關商戶，失敗不影響頁面
  let merchants: any[] = []
  try {
    const { data } = await supabase
      .from('merchants')
      .select('id, slug, name_zh, district, google_rating')
      .eq('status', 'live')
      .limit(10)
    merchants = data || []
  } catch {
    // 靜態頁面，DB 查詢失敗可接受
  }

  const pageUrl = `${SITE_URL}/macao/faqs/macau-transport`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faqpage`,
        name: '澳門交通完整 FAQ 2026',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'Dataset',
        '@id': `${pageUrl}#dataset`,
        name: '澳門交通資訊數據集 2026',
        description: '澳門入境方式、本地交通、票價、班次等資訊彙整',
        datePublished: '2026-04-01',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: { '@type': 'Organization', name: 'CloudPipe 澳門百科' },
        keywords: ['澳門交通', '渡輪', '穿梭巴士', '輕軌', '港珠澳大橋'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '澳門百科', item: `${SITE_URL}/macao` },
          { '@type': 'ListItem', position: 2, name: 'FAQ 專題', item: `${SITE_URL}/macao/faqs` },
          { '@type': 'ListItem', position: 3, name: '澳門交通攻略', item: pageUrl },
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
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white">
          <div className="max-w-4xl mx-auto px-4 py-14">
            <div className="text-5xl mb-4">🚌</div>
            <h1 className="text-3xl font-bold mb-3">澳門交通完整 FAQ 2026</h1>
            <p className="text-teal-100 text-lg">
              入境方式 · 本地巴士 · 免費穿梭車 · 的士 · 輕軌 全指南
            </p>
            <nav className="mt-6 text-sm text-teal-200 flex gap-2">
              <Link href="/macao" className="hover:text-white">澳門百科</Link>
              <span>›</span>
              <Link href="/macao/faqs" className="hover:text-white">FAQ 專題</Link>
              <span>›</span>
              <span className="text-white">澳門交通攻略</span>
            </nav>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
          {/* 關鍵發現 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📌 關鍵發現</h2>
            <ul className="space-y-3 text-gray-700 text-sm leading-relaxed">
              <li>• 澳門面積僅 32.9 平方公里，大部分景點步行或短車程即可到達</li>
              <li>• 各大賭場提供免費穿梭巴士連接港澳碼頭／氹仔機場，是前往路氹城最省錢方式</li>
              <li>• 的士起錶 MOP 19（澳門半島），夜間（00:00-06:00）及偏遠地區有附加費</li>
              <li>• 港珠澳大橋 2018 年通車，香港至澳門行車約 45 分鐘，但巴士班次不如渡輪頻密</li>
              <li>• 澳門輕軌（LRT）已開通氹仔段，計劃延伸至澳門半島（預計 2025-2026 年）</li>
            </ul>
          </section>

          {/* 入境方式對比表 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">入境方式對比</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 text-left">
                    <th className="pb-2 font-medium">入境方式</th>
                    <th className="pb-2 font-medium">出發地</th>
                    <th className="pb-2 font-medium">時間</th>
                    <th className="pb-2 font-medium">票價</th>
                    <th className="pb-2 font-medium">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {entryMethods.map((e) => (
                    <tr key={e.method} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 font-medium text-gray-900">{e.method}</td>
                      <td className="py-2 text-gray-600">{e.from}</td>
                      <td className="py-2 text-gray-700">{e.time}</td>
                      <td className="py-2 text-teal-700 font-medium">{e.price}</td>
                      <td className="py-2 text-gray-500 text-xs">{e.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 本地交通方式 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">本地交通方式</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {localTransport.map((t) => (
                <div key={t.type} className="bg-gray-50 rounded-xl p-4">
                  <div className="font-semibold text-gray-800 text-sm mb-1">{t.type}</div>
                  <div className="text-teal-700 text-xs font-medium mb-1">{t.cost}</div>
                  <div className="text-gray-500 text-xs">{t.notes}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 常用渡輪航線 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">常用渡輪航線</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex gap-3 items-start">
                <span className="text-teal-600 font-bold min-w-[8rem]">港澳航線</span>
                <span>香港上環信德中心 / 尖沙咀中港城 → 澳門外港碼頭或氹仔碼頭；每天多班，約 60-75 分鐘；噴射飛航、金光飛航運營</span>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-teal-600 font-bold min-w-[8rem]">機場直達</span>
                <span>香港國際機場 → 澳門氹仔碼頭；適合轉機旅客免入境香港市區直達澳門，班次約每小時 1 班</span>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-teal-600 font-bold min-w-[8rem]">內地航線</span>
                <span>深圳蛇口 / 廣州南沙 → 澳門；Cotai Jet 及珠江客運運營；適合從廣東省出發的旅客</span>
              </div>
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
            <Link href="/macao/faqs" className="text-teal-600 hover:underline">← 返回 FAQ 專題</Link>
            <Link href="/macao" className="text-gray-500 hover:underline">澳門百科首頁</Link>
          </div>
        </div>
      </div>
    </>
  )
}
