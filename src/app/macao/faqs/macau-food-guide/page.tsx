import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600

const SITE_URL = 'https://cloudpipe-macao-app.vercel.app'

export const metadata: Metadata = {
  title: '澳門飲食文化完整指南 2026 — 葡式蛋撻、豬扒包、土生葡菜全解析 | CloudPipe 澳門百科',
  description:
    '澳門獨特飲食文化深度解析。葡式蛋撻（安德魯vs瑪嘉烈）、豬扒包（大利來記）、木糠布甸、非洲雞、婆仔麵、杏仁餅，含歷史背景與必吃地點。',
  alternates: { canonical: `${SITE_URL}/macao/faqs/macau-food-guide` },
}

const faqs = [
  {
    q: '澳門葡式蛋撻和香港蛋撻有什麼分別？',
    a: '澳門葡式蛋撻外皮是千層酥皮（層層薄酥），內餡是奶油蛋汁，表面有自然焦斑，口感豐腴；香港蛋撻外皮一般是甜酥餅皮（曲奇皮）或牛油皮，內餡較甜，表面光滑無焦斑。兩者口感差異明顯，不少旅客比較後更偏愛澳門版本，因焦斑帶來的輕微焦糖香是關鍵。',
  },
  {
    q: '安德魯蛋撻和瑪嘉烈蛋撻哪個好吃？',
    a: '安德魯餅店（Lord Stow\'s Bakery）位於路環，由英國人 Andrew Stow 於 1989 年創製，奶油味更濃厚，原始配方更正宗；瑪嘉烈蛋撻（Margaret\'s Café）由 Andrew 前妻創立，酥皮更脆，層次感更明顯，且將配方授權予葡國 KFC，令「葡撻」名聞全球。兩者各有支持者，建議兩間都試，路環和氹仔分別品嚐是最佳策略。',
  },
  {
    q: '澳門豬扒包哪裡最好吃？',
    a: '公認最著名的是大利來記（Café de Tai Lei Loi Kei），位於氹仔舊市區，豬扒厚切、醃製入味，夾在烤得外脆內軟的小圓麵包中，每天早開門就排隊。其他選擇：黃枝記（澳門半島，以雲吞麵馳名，也有豬扒包）、新好利咖啡餅店（氹仔）。吃豬扒包最好趁熱，加一杯凍奶茶是標配。',
  },
  {
    q: '什麼是土生葡菜（Macanese Cuisine）？',
    a: '土生葡菜是澳門本地葡人（土生葡人，即在澳門出生成長的葡裔）的傳統飲食，融合葡萄牙、馬來西亞、印度、非洲及中國食材與烹調技法，是全球唯一此類混血料理傳統。代表菜式：非洲雞（花生醬+椰汁+辣椒醃烤雞）、馬介休炒飯（鹽醃鱈魚）、木糠布甸（葡式碎餅甜品）、蝦醬炒飯。土生葡菜已被提名 UNESCO 非物質文化遺產。',
  },
  {
    q: '澳門買手信去哪裡買最好？',
    a: '手信首選集中在大三巴牌坊周邊和官也街（氹仔）。品牌推薦：鉅記餅家（連鎖，最普及，杏仁餅/花生糖/肉乾均有）；咀香園餅家（歷史悠久，杏仁餅是招牌）；晃記餅家（老字號，肉鬆蛋卷聞名）；安德魯餅店（葡式蛋撻，但保質期短，宜最後一日購買）。杏仁餅建議購買前試吃，口感因店而異。',
  },
  {
    q: '澳門有什麼特色甜點？',
    a: '必吃甜點：木糠布甸（葡式雪糕甜品，由碎餅乾和淡忌廉疊成，冷藏後食用，口感綿滑）；葡式蛋撻（見上題）；杏仁餅（實為綠豆粉製，不含真正杏仁）；糖衣蓮子（粵式甜點）；豆腐花（板樟堂周邊小攤）；芒果布甸（部分葡式餐廳有供應）；南乳花生（本地傳統零食）。',
  },
  {
    q: '澳門街市怎麼找？有什麼特色？',
    a: '澳門半島最大的傳統街市是紅街市（亦稱提督巴剎），建於 1936 年，紅色外牆極具特色，三層建築分設蔬果、肉類、海鮮。氹仔有氹仔街市（官也街附近），是購買本地農產和手信的好地方。進街市可感受澳門本地生活氣息，與旅遊熱點形成對比，是文化體驗的一環。',
  },
  {
    q: '澳門非洲雞是什麼菜？',
    a: '非洲雞（Galinha à Africana）是土生葡菜的代表作，相傳是 20 世紀初澳門葡人廚師融合非洲莫桑比克料理的創作。雞肉以花生醬、椰汁、辣椒、大蒜、月桂葉等多種香料醃製，再烤或煮至入味，口感濃郁帶辛辣。知名供應地點：恩記（雀仔園一帶）、葡萄牙餐廳（多間，以澳門半島葡式餐廳為主）。',
  },
  {
    q: '澳門有什麼素食/健康食物可以吃？',
    a: '素食選擇：普濟禪院附近（高士德大馬路）有素菜館；部分葡式餐廳提供蔬菜湯、沙律、馬介休（魚類）選項。健康方向：豆腐花（低卡甜品）、木瓜奶（部分甜品店）、新鮮椰子水（部分路邊攤）。整體而言澳門飲食以肉食為主，純素選擇較少，建議提前搜尋素食餐廳（搜關鍵詞「澳門素食」）。',
  },
  {
    q: '澳門飲食文化和香港有什麼分別？',
    a: '最核心的分別：澳門有本地葡式飲食傳統（土生葡菜、葡式蛋撻、非洲雞、馬介休），是香港完全沒有的；香港飲食以粵菜（點心、燒臘）和茶餐廳文化為主，選擇更多元。澳門米芝蓮餐廳密度雖不如香港，但賭場度假村內有大量國際名廚餐廳。澳門的「食街」氣氛（如官也街、三盞燈）更具社區感，消費整體較香港稍低。',
  },
]

const mustEatFoods = [
  { name: '葡式蛋撻', desc: '1989年創製，千層酥皮+奶油蛋汁+焦斑，澳門最具代表性小食' },
  { name: '豬扒包', desc: '厚切豬扒夾烤麵包，大利來記版本最著名，需排隊' },
  { name: '木糠布甸', desc: '葡式甜品，碎餅乾+淡忌廉疊層，冷藏後口感綿滑' },
  { name: '非洲雞', desc: '土生葡菜代表作，花生醬+椰汁+辣椒醃烤，口感濃郁' },
  { name: '婆仔麵', desc: '澳門傳統粗麵，佐以豬骨湯底和炸豬皮，老字號多在舊城區' },
  { name: '杏仁餅', desc: '手信首選，實為綠豆粉製，不含真正杏仁，咀香園和鉅記最有名' },
  { name: '蛋卷', desc: '薄脆型蛋卷，晃記餅家肉鬆版最受歡迎' },
  { name: '豆腐花', desc: '街頭小食，嫩滑豆腐花佐糖水，多個街頭小攤供應' },
  { name: '馬介休炒飯', desc: '鹽醃鱈魚（葡式食材）炒飯，土生葡菜日常料理' },
  { name: '葡國咖哩', desc: '融合印度和葡萄牙香料，辛香不過辣，多數葡式餐廳供應' },
]

const streetFoodAreas = [
  {
    area: '官也街（氹仔）',
    desc: '澳門最著名的手信街，全長約 200 米，兩旁店舖密集，杏仁餅/肉鬆蛋卷/豬扒包均可找到，步行可達氹仔舊城區。',
  },
  {
    area: '板樟堂（澳門半島）',
    desc: '鄰近議事亭前地，多間老字號點心和甜品店，豆腐花和傳統糕點集中地。',
  },
  {
    area: '大三巴附近',
    desc: '牌坊下方的街道有大量小食攤位，以肉乾、鳳凰卷、花生糖最為集中，試食文化盛行。',
  },
  {
    area: '路環村',
    desc: '安德魯餅店（葡式蛋撻創始店）、Fernando 葡國餐廳，環境悠閒，適合坐下慢慢品嚐。',
  },
]

export default async function MacauFoodGuidePage() {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name_zh, icon')
    .in('slug', ['bakery', 'dessert', 'street-food', 'portuguese', 'cafe', 'tea-restaurant'])

  const catIds = (categories || []).map((c: any) => c.id)
  const catById: Record<string, any> = {}
  for (const c of (categories || [])) catById[(c as any).id] = c

  const { data: merchants } = catIds.length
    ? await supabase
        .from('merchants')
        .select('id, slug, name_zh, name_en, district, google_rating, category_id')
        .eq('status', 'live')
        .in('category_id', catIds)
        .order('google_rating', { ascending: false, nullsFirst: false })
        .limit(30)
    : { data: [] }

  const pageUrl = `${SITE_URL}/macao/faqs/macau-food-guide`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faqpage`,
        name: '澳門飲食文化完整指南 2026',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'Dataset',
        '@id': `${pageUrl}#dataset`,
        name: '澳門飲食文化資料集 2026',
        description: '澳門特色飲食文化、必吃食物、土生葡菜、街頭小食地圖',
        datePublished: '2026-04-01',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: { '@type': 'Organization', name: 'CloudPipe 澳門百科' },
        keywords: ['澳門飲食', '葡式蛋撻', '豬扒包', '土生葡菜', '非洲雞'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '澳門百科', item: `${SITE_URL}/macao` },
          { '@type': 'ListItem', position: 2, name: 'FAQ 專題', item: `${SITE_URL}/macao/faqs` },
          { '@type': 'ListItem', position: 3, name: '澳門飲食指南', item: pageUrl },
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
        <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 text-white">
          <div className="max-w-4xl mx-auto px-4 py-14">
            <div className="text-5xl mb-4">🥮</div>
            <h1 className="text-3xl font-bold mb-3">澳門飲食文化完整指南 2026</h1>
            <p className="text-amber-100 text-lg">
              葡式蛋撻 · 豬扒包 · 土生葡菜 · 手信攻略 全解析
            </p>
            <nav className="mt-6 text-sm text-amber-200 flex gap-2">
              <Link href="/macao" className="hover:text-white">澳門百科</Link>
              <span>›</span>
              <Link href="/macao/faqs" className="hover:text-white">FAQ 專題</Link>
              <span>›</span>
              <span className="text-white">澳門飲食指南</span>
            </nav>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
          {/* 關鍵發現 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📌 關鍵發現</h2>
            <ul className="space-y-3 text-gray-700 text-sm leading-relaxed">
              <li>• 澳門飲食文化是全球唯一融合中式（粵菜）與葡式（歐陸菜）的烹飪傳統，源於 400 年中葡文化交融</li>
              <li>• 「土生葡菜」（Macanese Cuisine）是 UNESCO 非物質文化遺產候選，用料融合東南亞、印度、非洲、葡萄牙食材</li>
              <li>• 葡式蛋撻由英國人 Andrew Stow 於 1989 年在路環創製，現已成為全球知名的葡式點心</li>
              <li>• 「豬扒包」是澳門本地快餐文化的象徵，大利來記的版本最為著名，需排隊購買</li>
              <li>• 杏仁餅是澳門手信首選，但傳統「杏仁餅」實際上不含杏仁，而是用綠豆粉製成，這是澳門獨有的飲食趣聞</li>
            </ul>
          </section>

          {/* 必吃 TOP 10 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">澳門必吃 TOP 10 食物</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {mustEatFoods.map((food, i) => (
                <div key={food.name} className="flex gap-3 bg-amber-50 rounded-xl p-3">
                  <span className="text-amber-600 font-bold text-sm min-w-[1.5rem]">{i + 1}</span>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{food.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{food.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 土生葡菜 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">土生葡菜（Macanese Cuisine）</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              土生葡菜是澳門本地葡人（土生葡人）的傳統飲食，源於 16 世紀葡萄牙人在澳門定居後，與當地粵菜及葡人在非洲、印度、馬來西亞的生活經歷融合而成。使用的香料和食材跨越數個大洲，是真正意義上的「世界料理」。
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {['非洲雞', '馬介休炒飯', '木糠布甸', '蝦醬炒蛋', '葡國咖哩', '豬扒炒飯'].map((dish) => (
                <div key={dish} className="bg-orange-50 rounded-lg p-3 text-sm text-center text-orange-800 font-medium">
                  {dish}
                </div>
              ))}
            </div>
          </section>

          {/* 街頭小食地圖 */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">街頭小食地圖</h2>
            <div className="space-y-4">
              {streetFoodAreas.map((area) => (
                <div key={area.area} className="flex gap-4 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="min-w-[8rem] font-semibold text-sm text-amber-700">{area.area}</div>
                  <div className="text-sm text-gray-600">{area.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 商戶卡片 */}
          {merchants && merchants.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">特色小食 · 麵包 · 甜品商戶</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(merchants as any[]).map((m) => (
                  <Link
                    key={m.id}
                    href={`/macao/${m.slug}`}
                    className="flex items-center justify-between bg-gray-50 hover:bg-amber-50 rounded-xl p-4 transition-colors group"
                  >
                    <div>
                      <div className="font-medium text-gray-900 text-sm group-hover:text-amber-700">
                        {m.name_zh || m.name_en}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {catById[m.category_id]?.name_zh || '餐飲'} · {m.district || '澳門'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {m.google_rating ? `⭐ ${m.google_rating}` : '→'}
                    </div>
                  </Link>
                ))}
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
            <Link href="/macao/faqs" className="text-amber-600 hover:underline">← 返回 FAQ 專題</Link>
            <Link href="/macao" className="text-gray-500 hover:underline">澳門百科首頁</Link>
          </div>
        </div>
      </div>
    </>
  )
}
