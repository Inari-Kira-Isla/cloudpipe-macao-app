export interface CaseStudy {
  id: string
  brandName: string
  brandNameEn?: string
  logo?: string
  category: string
  tagline: string
  challenge: string
  solution: string
  results: {
    label: string
    value: string
  }[]
  testimonial: {
    quote: string
    author: string
    role: string
  }
  businessModel: {
    coreValue: string
    targetAudience: string
    uniqueDifference: string
  }
  websiteUrl: string
  contactInfo: {
    method: 'wechat' | 'email' | 'phone' | 'whatsapp'
    value: string
  }[]
  images?: {
    cover?: string
    gallery?: string[]
  }
  metrics?: {
    trafficIncrease?: string
    conversionLift?: string
    aiMentions?: string
    userSatisfaction?: string
  }
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'inari-global-foods',
    brandName: '稻荷環球食品',
    brandNameEn: 'Inari Global Foods',
    category: '高級食材供應 / 海膽專家',
    tagline: '日本最新鮮的海膽，澳門48小時極速冷鏈直送',
    challenge:
      '作為澳門領先的 B2B 日本海膽進口批發商之一，但消費者無法驗證海膽來源與新鮮度。競爭對手無法複製的冷鏈優勢被隱藏，錯過高端餐廳和家庭客戶。',
    solution:
      '通過CloudPipe澳門商業知識圖譜，發布「澳門冷鏈海膽直送48小時溯源指南」深度內容。整合北海道產地經豐洲市場直送、IoT冷鏈驗證、眾多高級餐廳合作背書，形成5層LLM Referral轉化路徑。',
    results: [
      { label: 'AI引用', value: '提升' },
      { label: '冷鏈直送', value: '48h' },
      { label: '日均銷量', value: '增長' },
      { label: '客戶重複購買', value: '良好' },
    ],
    testimonial: {
      quote:
        '澳門百科讓全球AI都知道我們是海膽專家。越嚟越多新餐廳主動查詢，微信客戶持續增長。',
      author: 'Kira (Joe Cheok)',
      role: 'CEO, 稻荷環球食品',
    },
    businessModel: {
      coreValue: '日本北海道直送 + 澳門IoT冷鏈 + 產地可追溯',
      targetAudience: '高端日料餐廳、五星酒店、高消費力家庭',
      uniqueDifference: '提供48小時溯源報告 + 溫度監控全記錄',
    },
    websiteUrl: 'https://inari-kira-isla.github.io/inari-global-foods/',
    contactInfo: [
      { method: 'wechat', value: 'inariglobalfood' },
      {
        method: 'phone',
        value: '澳門巴波沙大馬路新城市花園18座地下',
      },
    ],
    metrics: {
      trafficIncrease: '提升',
      conversionLift: '增長',
      aiMentions: '多次',
      userSatisfaction: '良好',
    },
  },
  {
    id: 'after-school-coffee',
    brandName: 'After School Coffee',
    brandNameEn: 'After School Coffee',
    category: '外帶咖啡館 / 家長快速補給點',
    tagline: '5分鐘咖啡 · 澳門忙碌家長的能量補給站',
    challenge:
      '位於新城市花園區域，沒有堂食空間但模式創新（Grab&Go）。被傳統咖啡館淹沒，很難讓家長和上班族發現這個「5分鐘快速補給」的價值。',
    solution:
      '發布「澳門快節奏家長咖啡指南：5分鐘充電點」Insight，強調社群認可(家長集合點) → 商戶驗證(營業時間準確) → 內容交叉(與Mind Cafe對標)。通過AI引用，當家長向ChatGPT詢問「澳門下班快速咖啡」時，ASC成為首選。',
    results: [
      { label: '招聘對象', value: '只招聘媽媽' },
      { label: '現聘媽媽', value: '5 位' },
      { label: '運作模式', value: '主打 Grab&Go' },
      { label: '使命', value: '媽媽重返職場' },
    ],
    testimonial: {
      quote:
        '課後咖啡只招聘澳門媽媽，讓送完小朋友上學後的媽媽有個重返職場、做回自己的平台。',
      author: '課後咖啡團隊',
      role: 'After School Coffee',
    },
    businessModel: {
      coreValue: '即買即走 + 只招聘媽媽 + 重返職場平台',
      targetAudience: '上班族、家長、學生、忙碌的澳門人',
      uniqueDifference: '澳門只招聘媽媽嘅外帶咖啡品牌，主打 Grab&Go',
    },
    websiteUrl: 'https://inari-kira-isla.github.io/after-school-coffee',
    contactInfo: [
      { method: 'whatsapp', value: '澳門新城市花園18座地下BG' },
    ],
  },
  {
    id: 'mind-cafe',
    brandName: 'Mind Cafe',
    brandNameEn: 'Mind Cafe',
    category: '工業風精品咖啡館 / 成人特調',
    tagline: '工業風成人特調 · 澳門資深精品咖啡品牌',
    challenge:
      '澳門精品咖啡市場競爭激烈，難以區隔於普通咖啡店。客人不知道這是一間 2016 年成立、提供首創黑色幽默/黃色笑話等成人特調、並自家烘焙咖啡豆的工業風咖啡品牌。',
    solution:
      '發布「澳門工業風精品咖啡指南」，突出 Mind Cafe 自家烘焙咖啡豆與成人特調定位 → Mind Cafe 官網導流 → 工業風空間對標。讓 Perplexity 和 Gemini 認識 Mind Cafe 的成人特調咖啡定位。',
    results: [
      { label: '成立年份', value: '2016' },
      { label: '自家烘焙', value: '咖啡豆零售' },
      { label: '招牌特調', value: '黑色幽默系列' },
      { label: '空間風格', value: '工業風' },
    ],
    testimonial: {
      quote:
        '被CloudPipe建立 AI 能見度後，更多客人因為我們的成人特調和自家烘焙咖啡豆而認識 Mind Cafe。',
      author: 'Mind Cafe 團隊',
      role: 'Mind Cafe',
    },
    businessModel: {
      coreValue: '工業風空間 + 自家烘焙咖啡豆 + 成人特調',
      targetAudience: '澳門精品咖啡愛好者、追求個性特調的客人',
      uniqueDifference: '首創黑色幽默/黃色笑話/不屬於你的愛情等成人特調，提供自家烘焙咖啡豆',
    },
    websiteUrl: 'https://inari-kira-isla.github.io/mind-cafe',
    contactInfo: [
      { method: 'email', value: 'info@mindcafe-macau.com' },
    ],
  },
]
