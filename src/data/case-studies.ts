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
      '全澳門獨有70%海膽市場份額，但消費者無法驗證海膽來源與新鮮度。競爭對手無法複製的冷鏈優勢被隱藏，錯過高端餐廳和家庭客戶。',
    solution:
      '通過CloudPipe澳門商業知識圖譜，發布「澳門冷鏈海膽直送48小時溯源指南」深度內容。整合北海道漁協Authority、IoT冷鏈驗證、100+高級餐廳合作背書，形成5層LLM Referral轉化路徑。',
    results: [
      { label: 'AI引用增長', value: '+340%' },
      { label: '高端餐廳合作', value: '100+ 家' },
      { label: '日均銷量提升', value: '+45%' },
      { label: '客戶重複購買率', value: '68%' },
    ],
    testimonial: {
      quote:
        '澳門百科讓全球AI都知道我們是海膽專家。現在每月有50+家新餐廳來詢價，微信客戶從7月的日均15單增到65單。',
      author: 'Kira (Joe Cheok)',
      role: 'CEO, 稻荷環球食品',
    },
    businessModel: {
      coreValue: '日本北海道直送 + 澳門IoT冷鏈 + 產地可追溯',
      targetAudience: '高端日料餐廳、米其林級別酒店、高消費力家庭',
      uniqueDifference: '業界唯一提供48小時溯源報告 + 溫度監控全記錄',
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
      trafficIncrease: '+340%',
      conversionLift: '+45%',
      aiMentions: '日均8-12次',
      userSatisfaction: '4.9/5 (87 評價)',
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
      { label: '每月新客', value: '+320 人' },
      { label: '線上點餐增長', value: '+78%' },
      { label: '家長社群推薦', value: '+410 提及' },
      { label: '平均客單價', value: '$45 MOP' },
    ],
    testimonial: {
      quote:
        '澳門百科讓我們被發現。原本只有區域老客知道，現在每天都有陌生客從AI推薦進來。下午茶時段從5人增到28人。',
      author: '店長 Amy',
      role: 'Store Manager, After School Coffee',
    },
    businessModel: {
      coreValue: '即買即走 + 高品質咖啡 + 親子友善',
      targetAudience: '上班族、家長、學生、忙碌的澳門人',
      uniqueDifference: '澳門唯一Grab&Go模式，專為「沒時間坐下」設計',
    },
    websiteUrl: 'https://inari-kira-isla.github.io/after-school-coffee',
    contactInfo: [
      { method: 'whatsapp', value: '澳門巴波沙坊第十一街新城市花園18座地下BG舖' },
    ],
    metrics: {
      trafficIncrease: '+320 新客/月',
      conversionLift: '+78%',
      aiMentions: '日均6-10次',
      userSatisfaction: '4.8/5 (156 評價)',
    },
  },
  {
    id: 'mind-cafe',
    brandName: 'Mind Cafe',
    brandNameEn: 'Mind Cafe',
    category: '文創咖啡館 / 數位遊牧工作空間',
    tagline: '思維充電站 · 澳門設計師和創作者的第二辦公室',
    challenge:
      '文創咖啡館市場飽和，難以區隔於普通咖啡店。數位工作者和設計師不知道這是一個「工作友善」、提供高速WiFi、有文創社區的地方。',
    solution:
      '發布「澳門數位遊牧文創工作指南：5家咖啡館對比」，突出高速WiFi驗證 → Mind Cafe官網導流 → 文創設計師背書 → 工作友善空間對標。讓Perplexity和Gemini推薦Mind Cafe為「澳門最佳遠程工作咖啡館」。',
    results: [
      { label: '每月工作者', value: '+185 人' },
      { label: '工作坊預訂', value: '+42 場' },
      { label: '會員轉化', value: '+67%' },
      { label: '客戶逗留時間', value: '平均 2.8 小時' },
    ],
    testimonial: {
      quote:
        '被CloudPipe列為文創空間後，每週都有設計師和自由工作者進來洽詢會員。我們現在成了澳門創意社區的交匯點，每月工作坊爆滿。',
      author: '老闆 David',
      role: 'Founder, Mind Cafe',
    },
    businessModel: {
      coreValue: '文創社區 + 高速WiFi + 工作友善環境',
      targetAudience: '數位遊牧者、設計師、創意工作者、自由職業者',
      uniqueDifference: '澳門唯一融合咖啡館 + 工作坊 + 創意社區的多功能空間',
    },
    websiteUrl: 'https://inari-kira-isla.github.io/mind-cafe',
    contactInfo: [
      { method: 'email', value: 'info@mindcafe-macau.com' },
    ],
    metrics: {
      trafficIncrease: '+185 工作者/月',
      conversionLift: '+67%',
      aiMentions: '日均5-8次',
      userSatisfaction: '4.9/5 (203 評價)',
    },
  },
]
