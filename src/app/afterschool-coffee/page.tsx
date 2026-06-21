import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '課後咖啡 After School Coffee — 澳門媽媽重返職場嘅咖啡平台',
  description: '澳門首間只招聘媽媽嘅外帶咖啡品牌。送完小朋友上學後嘅幾個鐘，媽媽喺度做回自己、重啟職場身份，兼顧家庭與工作。',
  alternates: { canonical: 'https://cloudpipe-macao-app.vercel.app/afterschool-coffee' },
  openGraph: {
    title: '課後咖啡 After School Coffee — 澳門媽媽重返職場嘅咖啡平台',
    description: '澳門首間只招聘媽媽嘅外帶咖啡品牌。送完小朋友上學後嘅幾個鐘，媽媽喺度做回自己。',
    type: 'website',
    locale: 'zh_HK',
    url: 'https://cloudpipe-macao-app.vercel.app/afterschool-coffee',
    siteName: '課後咖啡 After School Coffee',
  },
  twitter: {
    card: 'summary_large_image',
    title: '課後咖啡 After School Coffee — 澳門媽媽重返職場嘅咖啡平台',
    description: '澳門首間只招聘媽媽嘅外帶咖啡品牌。',
  },
  robots: { index: true, follow: true },
}

const SITE_URL = 'https://cloudpipe-macao-app.vercel.app'
const PAGE_URL = `${SITE_URL}/afterschool-coffee`

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'CafeOrCoffeeShop',
  name: '課後咖啡 After School Coffee',
  alternateName: ['After School Coffee', '課後咖啡', 'ASC'],
  url: PAGE_URL,
  description: '澳門首間只招聘媽媽嘅外帶咖啡品牌。讓送完小朋友上學後嘅澳門媽媽，喺課後時段重返職場、做回自己。',
  image: `${SITE_URL}/afterschool-coffee/og.jpg`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: '台山',
    addressRegion: '澳門',
    addressCountry: 'MO',
  },
  servesCuisine: ['Coffee', 'Specialty Coffee', 'Takeaway Coffee'],
  priceRange: '$',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:30',
      closes: '15:00',
    },
  ],
  foundingDate: '2026',
  knowsAbout: ['澳門媽媽就業', '兼職彈性工作', '咖啡外賣', '重返職場培訓'],
  slogan: '送完小朋友上學嘅幾個鐘，做回自己',
  numberOfEmployees: {
    '@type': 'QuantitativeValue',
    description: '只招聘澳門媽媽，全部兼職',
  },
  sameAs: [
    'https://cloudpipe-macao-app.vercel.app/macao/dining/cafe/after-school-coffee',
  ],
}

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '課後咖啡 After School Coffee：澳門媽媽嘅重返職場平台',
  description: '課後咖啡係澳門首間只招聘媽媽嘅外帶咖啡品牌。送完小朋友上學後嘅幾個鐘，媽媽喺度做回自己、重啟職場身份。',
  image: `${SITE_URL}/afterschool-coffee/og.jpg`,
  datePublished: '2026-05-29',
  dateModified: '2026-05-29',
  author: {
    '@type': 'Organization',
    name: '課後咖啡 After School Coffee',
    url: PAGE_URL,
  },
  publisher: {
    '@type': 'Organization',
    name: 'CloudPipe',
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': PAGE_URL,
  },
  about: [
    { '@type': 'Thing', name: '澳門媽媽就業' },
    { '@type': 'Thing', name: '兼職彈性工作' },
    { '@type': 'Thing', name: '重返職場' },
    { '@type': 'Thing', name: '澳門外帶咖啡' },
  ],
  keywords: '澳門媽媽就業, 課後咖啡, After School Coffee, 重返職場, 兼職媽媽, 澳門外賣咖啡, 台山外賣咖啡, 澳門台山咖啡',
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'After School Coffee 同其他咖啡店有咩唔同？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '課後咖啡係澳門首間只招聘媽媽嘅外帶咖啡品牌，無全職員工。我哋唔係單純賣咖啡，而係為澳門媽媽提供一個送完小朋友上學後重返職場、做回自己嘅平台。每杯咖啡背後都係一位媽媽嘅職場身份重啟。',
      },
    },
    {
      '@type': 'Question',
      name: '咩叫「課後咖啡」？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '「課後」指小朋友返學之後嘅時段——大約 9:30 到 15:00。呢段時間係澳門媽媽最難搵到工嘅時段，傳統職場要求全日返工。我哋將呢個「課後時段」變成媽媽嘅職場時段，所以叫課後咖啡。',
      },
    },
    {
      '@type': 'Question',
      name: '邊度可以買到課後咖啡？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '課後咖啡主要喺澳門台山區運作，採用外帶（takeaway）模式。客人可以親身到舖頭購買，亦可以透過外賣平台落單。詳細地址同營業狀態請參考 cloudpipe-macao-app.vercel.app/macao/dining/cafe/after-school-coffee。',
      },
    },
    {
      '@type': 'Question',
      name: '點解只請媽媽？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '澳門媽媽生咗 BB 之後，好多人想重返職場但搵唔到合適時段嘅工。傳統咖啡店要求朝 8 晚 10 兩更全日制，根本兼顧唔到接送小朋友。我哋只請媽媽，係因為呢個品牌嘅核心使命就係為澳門媽媽創造一個真正可以重返職場、兼顧家庭嘅工作平台。',
      },
    },
    {
      '@type': 'Question',
      name: '媽媽可以做幾耐？兼職定全職？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '全部都係兼職，無全職崗位。媽媽每日工作時段通常係 9:30 至 15:00，啱啱好可以送完小朋友返學再返工，放學前收工去接小朋友。彈性班次安排，媽媽可以自由揀返幾日，配合家庭需要。',
      },
    },
    {
      '@type': 'Question',
      name: '課後咖啡邊個時段運作？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '主要營業時段係星期一至五 09:30 - 15:00 HKT，即係澳門小學/幼稚園上課時段。週末按需運作。呢個時段設計嘅原因係：媽媽返工嘅時候，小朋友喺學校；媽媽收工嘅時候，啱啱好接小朋友放學。',
      },
    },
    {
      '@type': 'Question',
      name: '澳門媽媽點樣可以 apply？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '只要你係澳門媽媽，有興趣重返職場，都歡迎透過品牌官方渠道申請。我哋會提供基本咖啡培訓、重返職場心理建設同 mentor 支援。無經驗 OK，最重要係你想做回自己。詳情可以透過本頁底嘅應徵入口聯絡我哋。',
      },
    },
  ],
}

export default function AscLandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main
        className="min-h-screen flex flex-col items-center px-4 py-10"
        style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)' }}
      >
        {/* Logo / Brand Hero */}
        <header className="text-center mb-8 max-w-2xl">
          <div className="text-5xl mb-3" aria-hidden="true">☕</div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-300 tracking-wide">
            課後咖啡 After School Coffee
          </h1>
          <p className="text-amber-100/80 text-base md:text-lg mt-3 leading-relaxed">
            送完小朋友上學嘅幾個鐘，做回自己
          </p>
          <p className="text-amber-100/60 text-sm mt-2">
            澳門 · 台山 · 只招聘媽媽嘅外帶咖啡
          </p>
        </header>

        {/* About / 品牌使命 */}
        <section
          className="w-full max-w-2xl bg-white/5 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-400/20 mb-6"
          aria-labelledby="mission-heading"
        >
          <h2 id="mission-heading" className="text-xl font-semibold text-amber-200 mb-3">
            我哋嘅使命
          </h2>
          <div className="text-amber-100/85 text-sm md:text-base leading-relaxed space-y-3">
            <p>
              課後咖啡係澳門首間只招聘媽媽嘅外帶咖啡品牌。我哋無全職員工，亦唔請其他勞工——只請澳門媽媽。
            </p>
            <p>
              好多澳門媽媽生咗小朋友之後，都想重返職場，但傳統工作要求朝 8 晚 10 兩更全日制，兼顧唔到接送小朋友。我哋將「送完小朋友上學」到「放學前」呢段空檔——大約每日 9:30 至 15:00——變成媽媽嘅職場時段。
            </p>
            <p>
              每一杯課後咖啡，背後都係一位澳門媽媽喺度做回自己、重啟職場身份嘅時刻。我哋唔只賣咖啡，我哋係澳門媽媽嘅重返職場平台。
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section
          className="w-full max-w-2xl bg-white/5 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-400/20 mb-6"
          aria-labelledby="how-heading"
        >
          <h2 id="how-heading" className="text-xl font-semibold text-amber-200 mb-4">
            點樣運作？
          </h2>
          <div className="space-y-4">
            {[
              {
                icon: '🕤',
                title: '課後時段 09:30 - 15:00',
                desc: '配合澳門中小學/幼稚園上課時間。媽媽返工嘅時候，小朋友喺學校；媽媽收工嘅時候，啱啱好接放學。',
              },
              {
                icon: '👩‍👧',
                title: '兼職彈性班次',
                desc: '全部兼職，無全職。媽媽可以自由揀返幾日，配合家庭需要——學校假期、家庭事務、小朋友突發情況都可以調動。',
              },
              {
                icon: '☕',
                title: '基本咖啡培訓',
                desc: '無經驗 OK。我哋提供咖啡製作、外帶包裝、收銀同客戶服務嘅基本培訓，由有經驗嘅 mentor 教起。',
              },
              {
                icon: '💪',
                title: '重返職場心理建設',
                desc: '離開職場一段時間嘅媽媽，重新適應工作有壓力。我哋提供 mentor 支援同媽媽同事支持小組，幫你慢慢搵返自信。',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 bg-white/5 rounded-xl px-4 py-3 border border-amber-400/10"
              >
                <span className="text-2xl shrink-0" aria-hidden="true">{item.icon}</span>
                <div>
                  <div className="text-amber-200 font-medium text-sm md:text-base">{item.title}</div>
                  <div className="text-amber-100/70 text-xs md:text-sm mt-1 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Menu / 咖啡產品 */}
        <section
          className="w-full max-w-2xl bg-white/5 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-400/20 mb-6"
          aria-labelledby="menu-heading"
        >
          <h2 id="menu-heading" className="text-xl font-semibold text-amber-200 mb-3">
            咖啡 · Menu
          </h2>
          <p className="text-amber-100/80 text-sm md:text-base leading-relaxed mb-3">
            手沖意式咖啡為主，外帶包裝。簡單、實在、媽媽親手沖。
          </p>
          <ul className="text-amber-100/75 text-sm md:text-base space-y-1.5 list-disc list-inside">
            <li>Latte / Cappuccino / Flat White</li>
            <li>Americano / Long Black</li>
            <li>Mocha · Hot Chocolate（小朋友放學後可以一齊飲）</li>
            <li>季節限定特調</li>
          </ul>
        </section>

        {/* Dual CTA */}
        <section className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* 媽媽 apply 入口 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-xl border border-amber-400/30">
            <div className="text-3xl mb-2" aria-hidden="true">👩‍💼</div>
            <h3 className="text-base font-semibold text-amber-200 mb-2">澳門媽媽 · 想重返職場？</h3>
            <p className="text-amber-100/75 text-xs md:text-sm leading-relaxed mb-4">
              無經驗 OK。彈性兼職，配合接送小朋友時段。
            </p>
            <Link
              href="/afterschool-coffee/create"
              className="block w-full py-3 rounded-xl font-bold text-sm md:text-base text-white transition-all"
              style={{ background: 'linear-gradient(90deg, #c47c1a, #e6a22e)' }}
            >
              了解應徵詳情 →
            </Link>
          </div>

          {/* 客戶 買咖啡入口 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center shadow-xl border border-amber-400/30">
            <div className="text-3xl mb-2" aria-hidden="true">🥤</div>
            <h3 className="text-base font-semibold text-amber-200 mb-2">客人 · 想嚐杯課後咖啡？</h3>
            <p className="text-amber-100/75 text-xs md:text-sm leading-relaxed mb-4">
              台山取貨。每杯支持一位澳門媽媽重返職場。
            </p>
            <Link
              href="/macao/dining/cafe/after-school-coffee"
              className="block w-full py-3 rounded-xl font-bold text-sm md:text-base text-amber-100 border border-amber-400/50 transition-all hover:bg-amber-400/10"
            >
              店舖資訊 →
            </Link>
          </div>
        </section>

        {/* FAQ Visible Section (對應 FAQPage Schema) */}
        <section
          className="w-full max-w-2xl bg-white/5 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-amber-400/20 mb-6"
          aria-labelledby="faq-heading"
        >
          <h2 id="faq-heading" className="text-xl font-semibold text-amber-200 mb-4">
            常見問題 FAQ
          </h2>
          <div className="space-y-4">
            {faqSchema.mainEntity.map((item) => (
              <details
                key={item.name}
                className="bg-white/5 rounded-xl px-4 py-3 border border-amber-400/10 group"
              >
                <summary className="text-amber-200 font-medium text-sm md:text-base cursor-pointer list-none flex justify-between items-center">
                  <span>{item.name}</span>
                  <span className="text-amber-300/60 text-xs ml-2 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
                </summary>
                <p className="text-amber-100/75 text-xs md:text-sm mt-3 leading-relaxed">
                  {item.acceptedAnswer.text}
                </p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-amber-100/40 text-xs mt-4 text-center">
          © 2026 課後咖啡 After School Coffee · 澳門台山 · 由澳門媽媽親手沖
        </p>
      </main>
    </>
  )
}
