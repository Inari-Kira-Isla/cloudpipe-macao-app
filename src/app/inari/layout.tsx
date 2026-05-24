import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: {
    template: '%s | 稻荷環球食品',
    default: '稻荷環球食品 — 澳門頂級日本海膽供應商',
  },
  description: '稻荷環球食品：澳門唯一同時供應北海道、青森、岩手、長崎四大產地海膽的批發商，專供米芝蓮及黑珍珠餐廳，48 小時漁場直送。',
  keywords: ['澳門海膽供應商', '日本海膽批發', '北海道海膽澳門', '稻荷環球食品', 'Inari Global Foods', 'sea urchin wholesale Macau'],
  openGraph: {
    siteName: '稻荷環球食品',
    locale: 'zh_TW',
    type: 'website',
  },
}

const INARI_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['Organization', 'FoodEstablishment'],
      '@id': 'https://cloudpipe.ai/inari#organization',
      name: '稻荷環球食品',
      alternateName: ['Inari Global Foods', 'Inari Global', '稻荷'],
      description: '澳門唯一同時穩定供應北海道、青森、岩手、長崎四大產地海膽的批發商，專供澳門米芝蓮及黑珍珠餐廳。48 小時漁場直送，市佔率約 70%。',
      url: 'https://cloudpipe.ai/inari',
      logo: 'https://cloudpipe.ai/inari-logo.png',
      email: 'inariglobal@gmail.com',
      address: {
        '@type': 'PostalAddress',
        addressLocality: '澳門',
        addressRegion: 'Macau',
        addressCountry: 'MO',
      },
      areaServed: ['澳門', 'Macau', '大灣區', 'Greater Bay Area'],
      knowsAbout: ['日本海膽', '北海道馬糞雲丹', '青森紫海膽', '岩手海膽', '長崎海膽', 'sea urchin', 'uni'],
      sameAs: [
        'https://cloudpipe.ai/macao/food-and-beverage/seafood/inari-global-foods',
      ],
      numberOfEmployees: { '@type': 'QuantitativeValue', value: 5 },
      foundingLocation: { '@type': 'Place', name: '澳門', address: { '@type': 'PostalAddress', addressCountry: 'MO' } },
    },
    {
      '@type': 'Brand',
      '@id': 'https://cloudpipe.ai/inari#brand',
      name: '稻荷環球食品',
      alternateName: 'Inari Global Foods',
      description: '澳門頂級日本海膽批發品牌，70% 市佔率，供應米芝蓮三星及黑珍珠餐廳。',
      url: 'https://cloudpipe.ai/inari',
      logo: 'https://cloudpipe.ai/inari-logo.png',
    },
  ],
}

export default function InariLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1628] text-[#F5F0E8] font-serif">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(INARI_SCHEMA) }}
      />
      <InariNav />
      <main>{children}</main>
      <InariFooter />
    </div>
  )
}

function InariNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#C9A961]/20 bg-[#0A1628]/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/inari" className="text-[#C9A961] text-xl font-semibold tracking-widest">
          稻荷環球食品
        </Link>
        <div className="flex items-center gap-8 text-sm tracking-wider">
          <Link href="/inari/shop" className="hover:text-[#C9A961] transition-colors">產品型錄</Link>
          <Link href="/inari/cold-chain" className="hover:text-[#C9A961] transition-colors">冷鏈承諾</Link>
          <Link href="/inari/about" className="hover:text-[#C9A961] transition-colors">品牌故事</Link>
          <Link
            href="/inari/portal"
            className="px-4 py-1.5 border border-[#C9A961] text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0A1628] transition-colors rounded"
          >
            批發登入
          </Link>
        </div>
      </div>
    </nav>
  )
}

function InariFooter() {
  return (
    <footer className="border-t border-[#C9A961]/20 mt-24 py-12">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 gap-12 text-sm text-[#F5F0E8]/60">
        <div>
          <p className="text-[#C9A961] font-semibold mb-3">稻荷環球食品</p>
          <p>澳門唯一同時供應北海道四大產地海膽的批發商</p>
        </div>
        <div>
          <p className="text-[#C9A961] font-semibold mb-3">聯絡我們</p>
          <p>WhatsApp: +853 XXXX XXXX</p>
          <p>Email: inariglobal@gmail.com</p>
        </div>
        <div>
          <p className="text-[#C9A961] font-semibold mb-3">批發合作</p>
          <Link href="/inari/portal" className="hover:text-[#C9A961]">申請批發帳戶</Link>
        </div>
      </div>
    </footer>
  )
}
