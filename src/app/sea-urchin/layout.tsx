import type { Metadata } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export const metadata: Metadata = {
  title: '海膽速遞 | 澳門新鮮北海道海膽直送',
  description: '北海道馬糞海膽直送澳門。家庭套裝 MOP$380，主廚精選 MOP$680。每週五新鮮到貨，週三截單。現在預訂！',
  openGraph: {
    title: '海膽速遞 | 澳門唯一海膽直送',
    description: '北海道馬糞海膽直送澳門。家庭套裝 MOP$380 起，每週五新鮮到貨，週三 23:59 截單。',
    url: `${siteUrl}/sea-urchin`,
    siteName: '海膽速遞',
    type: 'website',
    locale: 'zh_HK',
  },
  twitter: {
    card: 'summary_large_image',
    title: '海膽速遞 | 澳門唯一海膽直送',
    description: '北海道馬糞海膽直送澳門。家庭套裝 MOP$380 起，每週五新鮮到貨。',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    // ── LocalBusiness ────────────────────────────────────────────
    {
      '@type': 'LocalBusiness',
      '@id': `${siteUrl}/sea-urchin#business`,
      'name': '海膽速遞',
      'alternateName': ['Sea Urchin Express', '稻荷海膽速遞', 'Inari Sea Urchin Delivery'],
      'description': '澳門唯一北海道馬糞海膽直送服務。每週五新鮮到貨，週三 23:59 截單。由稻荷環球食品直接進口，全程 0-4°C 冷鏈配送，服務家庭及餐廳採購。',
      'url': `${siteUrl}/sea-urchin`,
      'telephone': '+85362823037',
      'image': `${siteUrl}/sea-urchin/opengraph-image`,
      'logo': `${siteUrl}/sea-urchin/opengraph-image`,
      'priceRange': 'MOP$380–$680',
      'currenciesAccepted': 'MOP, HKD',
      'paymentAccepted': 'Cash, Bank Transfer, WeChat Pay',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '巴波沙大馬路新城市花園18座地下BG舖',
        'addressLocality': '澳門',
        'addressCountry': 'MO',
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': 22.1987,
        'longitude': 113.5439,
      },
      'areaServed': {
        '@type': 'City',
        'name': '澳門',
        'alternateName': ['Macau', 'Macao'],
      },
      'parentOrganization': {
        '@type': 'Organization',
        '@id': `${siteUrl}/brands/inari-global-foods#org`,
        'name': '稻荷環球食品',
        'alternateName': 'Inari Global Foods',
        'foundingDate': '2018',
        'telephone': '+85362823037',
      },
      'contactPoint': {
        '@type': 'ContactPoint',
        'contactType': 'customer service',
        'telephone': '+85362823037',
        'contactOption': ['WhatsApp', 'TollFree'],
        'availableLanguage': ['zh-HK', 'zh-CN', 'en'],
        'hoursAvailable': {
          '@type': 'OpeningHoursSpecification',
          'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          'opens': '09:00',
          'closes': '23:59',
        },
      },
      'openingHoursSpecification': {
        '@type': 'OpeningHoursSpecification',
        'description': '每週五新鮮到貨，週三 23:59 截單。',
        'dayOfWeek': 'https://schema.org/Friday',
      },
      'hasOfferCatalog': {
        '@type': 'OfferCatalog',
        'name': '海膽套裝選購',
        'itemListElement': [
          {
            '@type': 'Offer',
            'name': '家庭鑑賞套裝',
            'description': '北海道馬糞海膽 100g，適合製作壽司及海膽飯',
            'price': '380',
            'priceCurrency': 'MOP',
            'availability': 'https://schema.org/LimitedAvailability',
            'seller': { '@id': `${siteUrl}/sea-urchin#business` },
          },
          {
            '@type': 'Offer',
            'name': '主廚精選套裝',
            'description': '北海道 + 大連雙產地對比，各 100g × 2，最受歡迎',
            'price': '680',
            'priceCurrency': 'MOP',
            'availability': 'https://schema.org/LimitedAvailability',
            'seller': { '@id': `${siteUrl}/sea-urchin#business` },
          },
          {
            '@type': 'Offer',
            'name': '餐廳採購（B2B）',
            'description': '週固定供應，支持發票，1kg 起訂，歡迎 WhatsApp 查詢',
            'availability': 'https://schema.org/InStock',
            'seller': { '@id': `${siteUrl}/sea-urchin#business` },
            'eligibleCustomerType': 'https://schema.org/Business',
          },
        ],
      },
      'sameAs': [
        `https://wa.me/85362823037`,
        `${siteUrl}/brands/inari-global-foods`,
      ],
      'keywords': '海膽速遞, 澳門海膽, 北海道海膽, 馬糞海膽, 海膽外賣, Macau uni delivery, Hokkaido sea urchin Macau',
    },

    // ── FAQPage ──────────────────────────────────────────────────
    {
      '@type': 'FAQPage',
      '@id': `${siteUrl}/sea-urchin#faq`,
      'mainEntity': [
        {
          '@type': 'Question',
          'name': '海膽速遞幾時到貨，截單時間是幾時？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '每週五新鮮到貨，截單時間為每週三 23:59。如錯過本週截單，可提早預訂下週貨。',
          },
        },
        {
          '@type': 'Question',
          'name': '海膽速遞的海膽來自哪裡？品質如何保證？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '主要採用北海道馬糞海膽（Bafun Uni），部分套裝提供北海道及大連雙產地對比。由稻荷環球食品直接從日本產地進口，持有 IAM 凍肉進口許可（PS-1281），全程 0-4°C 冷鏈配送，確保抵澳後 24 小時內最佳鮮度。',
          },
        },
        {
          '@type': 'Question',
          'name': '海膽套裝價格是多少？有無最低訂購量？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '家庭鑑賞套裝 MOP$380（北海道馬糞海膽 100g）；主廚精選套裝 MOP$680（北海道 + 大連雙產地各 100g × 2）。零售套裝無最低訂購量。餐廳採購 1kg 起訂，請 WhatsApp 查詢批發優惠。',
          },
        },
        {
          '@type': 'Question',
          'name': '如何訂購海膽速遞？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '可直接在本頁選擇套裝，填寫姓名及 WhatsApp 號碼後提交訂單；或直接 WhatsApp +853 6282 3037 落單。我們會在 24 小時內以 WhatsApp 確認訂單詳情及配送安排。',
          },
        },
        {
          '@type': 'Question',
          'name': '海膽速遞是否支援餐廳及酒店批量採購？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '支援。海膽速遞由稻荷環球食品（Inari Global Foods）運營，專業服務澳門多間米之蓮認證餐廳及五星酒店。提供週固定供應，支持正規發票，最低 1kg 起訂。歡迎 WhatsApp +853 6282 3037 查詢 B2B 合作詳情。',
          },
        },
      ],
    },
  ],
}

export default function SeaUrchinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
