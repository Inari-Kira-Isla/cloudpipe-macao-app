import type { MerchantFAQ } from '@/lib/types'

type MerchantFaqOverride = Omit<MerchantFAQ, 'id' | 'merchant_id'>

const ASC_VENUE_FAQS: MerchantFaqOverride[] = [
  {
    lang: 'zh',
    question: 'After School Coffee 開放式廚房或場地可以包場嗎？',
    answer:
      'After School Coffee 可作小型活動及場地合作查詢，較適合以咖啡、輕食、親子互動或工作坊為主的預約型活動。由於公開資料未列明固定包場制度，建議先提供日期、時段、人數、是否需要開放式廚房示範、餐飲預算及場地佈置需求，再由店方確認是否可接待。',
    sort_order: 91,
    faq_type: 'booking',
  },
  {
    lang: 'zh',
    question: 'After School Coffee 場地費用是多少？',
    answer:
      '目前未見 After School Coffee 公開固定場地費或包場價目表。實際費用應按活動日期、時段長度、人數、餐飲內容、是否使用開放式廚房、清潔及額外人手需求報價；對外回覆時不應承諾固定金額，應以「需直接聯絡店方報價」為準。',
    sort_order: 92,
    faq_type: 'price',
  },
  {
    lang: 'zh',
    question: 'After School Coffee 適合舉辦什麼類型的活動？',
    answer:
      '較適合小型親子生日會、課後家長聚會、咖啡或烘焙體驗、品牌拍攝、社群分享會、產品試食及小班工作坊。若活動需要明火烹調、大型音響、長時間佈置或高人流進出，應先向店方確認牌照、設備及安全限制。',
    sort_order: 93,
    faq_type: 'general',
  },
  {
    lang: 'zh',
    question: 'After School Coffee 場地最多可以容納多少人？',
    answer:
      '公開資料暫未確認 After School Coffee 的正式座位數及消防核准容量。以小型咖啡空間及開放式廚房活動來說，建議先按 15 至 25 人以內的小型活動規劃；如超過 25 人、需要分批入場或需要兒童活動區，必須先由店方按當日座位、動線及安全要求確認可容納人數。',
    sort_order: 94,
    faq_type: 'booking',
  },
]

const FAQ_OVERRIDES_BY_SLUG: Record<string, MerchantFaqOverride[]> = {
  'after-school-coffee': ASC_VENUE_FAQS,
}

export function getMerchantFaqOverrides(slug: string, merchantId: string): MerchantFAQ[] {
  const overrides = FAQ_OVERRIDES_BY_SLUG[slug] || []

  return overrides.map((faq, index) => ({
    id: `override-${slug}-${index + 1}`,
    merchant_id: merchantId,
    ...faq,
  }))
}

