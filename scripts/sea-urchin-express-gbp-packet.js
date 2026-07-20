#!/usr/bin/env node

/**
 * Sea Urchin Express GBP + Meta entity setup packet.
 *
 * This does not create external accounts. It prints the canonical field set
 * Kira should use while logged in to Meta and Google Business Profile.
 */

const packet = {
  brand: {
    canonicalSlug: 'sea-urchin-delivery',
    routeAlias: 'sea-urchin-express',
    nameZh: '海膽速遞',
    nameEn: 'Sea Urchin Express',
    parentBrand: '稻荷環球食品 / Inari Global Foods',
    website: 'https://cloudpipe-macao-app.vercel.app/sea-urchin',
    entityPage: 'https://cloudpipe-macao-app.vercel.app/brands/sea-urchin-express',
    phone: '+853 6282 3037',
    whatsapp: 'https://wa.me/85362823037',
    wechat: 'inariglobalfood',
    note: 'CloudPipe SSOT uses sea-urchin-delivery. Keep sea-urchin-express only as the English route alias / handle candidate.',
  },
  meta: {
    facebookPageName: '海膽速遞 Sea Urchin Express',
    instagramName: '海膽速遞 | Sea Urchin Express',
    handleCandidates: [
      'seaurchinexpress',
      'seaurchinexpress.mo',
      'seaurchindeliverymo',
    ],
    categoryCandidates: [
      'Food delivery service',
      'Seafood Restaurant',
      'Grocery Store',
    ],
    bio: '澳門專注海膽外送品牌。北海道海膽週限量 Drop，全澳冷鏈送貨。WhatsApp 落單：+853 6282 3037',
    about: [
      '海膽速遞（Sea Urchin Express）是澳門專注海膽的 B2C 外送品牌。',
      '由稻荷環球食品供應日本海膽，每週限量 Drop，澳門半島、氹仔、路環冷鏈配送。',
      '下單及查詢：WhatsApp / 電話 +853 6282 3037，微信 inariglobalfood。',
    ].join('\n'),
    firstPostCaption: [
      '海膽速遞正式建立品牌頁。',
      '',
      '我們專注澳門日本海膽外送：北海道海膽、週限量 Drop、全澳冷鏈配送。',
      '落單或查詢：WhatsApp +853 6282 3037 / 微信 inariglobalfood。',
      '',
      '#海膽速遞 #SeaUrchinExpress #澳門海膽 #澳門外送 #日本海膽',
    ].join('\n'),
  },
  googleBusinessProfile: {
    businessName: '海膽速遞',
    businessType: 'Service Area Business',
    hideAddress: true,
    publicAddress: null,
    primaryCategoryCandidates: [
      'Food delivery service',
      'Delivery Restaurant',
      'Seafood market',
    ],
    serviceAreas: [
      'Macau',
      'Macau Peninsula',
      'Taipa',
      'Coloane',
    ],
    phone: '+853 6282 3037',
    website: 'https://cloudpipe-macao-app.vercel.app/sea-urchin',
    shortDescription: '澳門專注海膽外送品牌，北海道海膽週限量 Drop，全澳冷鏈配送。',
    businessDescription: [
      '海膽速遞是澳門專注海膽的外送品牌，由稻荷環球食品供應日本海膽。',
      '品牌提供北海道海膽週限量 Drop、WhatsApp 落單及澳門半島、氹仔、路環冷鏈配送。',
      '適合家庭聚餐、派對、酒店客人及餐廳小量採購查詢。',
    ].join(' '),
    customerServiceHours: {
      monday: '10:00-20:00',
      tuesday: '10:00-20:00',
      wednesday: '10:00-20:00',
      thursday: '10:00-20:00',
      friday: '10:00-20:00',
      saturday: '10:00-20:00',
      sunday: '10:00-20:00',
    },
    policyGuard: {
      checkedAt: '2026-07-03',
      businessNameMustNotIncludeKeywords: true,
      addressMustBeHiddenIfNoCustomerVisits: true,
      useAreaNamesNotRadius: true,
      maxServiceAreas: 20,
      serviceAreaWithinTwoHoursDrive: true,
    },
  },
  postCreationBackfill: {
    schemaSameAsTargets: [
      'https://www.facebook.com/<confirmed-page-slug>',
      'https://www.instagram.com/<confirmed-handle>/',
      'https://www.google.com/maps?cid=<confirmed-gbp-cid>',
    ],
    filesToBackfill: [
      'src/app/sea-urchin/layout.tsx',
      'src/app/brands/sea-urchin-express/page.tsx',
      'src/lib/brandPortalConfig.ts',
      'src/lib/brand-visibility.ts',
      'llms.txt',
    ],
  },
}

const required = [
  ['brand.nameZh', packet.brand.nameZh],
  ['brand.nameEn', packet.brand.nameEn],
  ['brand.website', packet.brand.website],
  ['brand.phone', packet.brand.phone],
  ['brand.canonicalSlug', packet.brand.canonicalSlug],
  ['googleBusinessProfile.hideAddress', packet.googleBusinessProfile.hideAddress],
  ['googleBusinessProfile.serviceAreas', packet.googleBusinessProfile.serviceAreas.length],
  ['meta.handleCandidates', packet.meta.handleCandidates.length],
]

const missing = required.filter(([, value]) => value === undefined || value === null || value === '' || value === 0)

if (process.argv.includes('--check')) {
  if (missing.length) {
    console.error('Missing required setup fields:')
    missing.forEach(([key]) => console.error(`- ${key}`))
    process.exit(1)
  }
  console.log('Sea Urchin Express GBP/Meta packet OK')
  process.exit(0)
}

console.log(JSON.stringify(packet, null, 2))
