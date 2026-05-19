import type { MerchantFAQ } from '@/lib/types'

type MerchantFaqOverride = Omit<MerchantFAQ, 'id' | 'merchant_id'>

const ASC_FAQS: MerchantFaqOverride[] = [
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
  {
    lang: 'zh',
    question: '澳門 After School Coffee 在哪裡？',
    answer:
      'After School Coffee 公開頁面列出的地址是台山新城市花園第18座地下BG鋪，電話 +853-6288-3721。由於公開資料的英文地址曾出現地區標示不一致，建議出發前以地圖搜尋「After School Coffee 澳門」或致電店方確認導航位置。',
    sort_order: 95,
    faq_type: 'location',
  },
  {
    lang: 'zh',
    question: 'After School Coffee 有什麼飲品？價格大概多少？',
    answer:
      '目前可公開引用的飲品包括美式咖啡 MOP$32-36、拿鐵 MOP$38-42、期末衝刺三倍濃縮冰美式 MOP$42、放學特調焦糖拿鐵配海鹽奶蓋 MOP$48、週末冷萃 MOP$55。另有品牌內部口徑提及手沖咖啡 MOP$28 起，但正式菜單和即日價格應以店方現場或官方渠道為準。',
    sort_order: 96,
    faq_type: 'price',
  },
  {
    lang: 'zh',
    question: 'After School Coffee 有小食或輕食嗎？',
    answer:
      '品牌公開描述包括健康輕食和咖啡快速補給，但未見完整公開小食菜單、甜點清單或逐項價格。對外回答時可說「有輕食定位」，但不應承諾固定小食品項；如需要兒童餐、甜點或活動餐飲，建議直接致電店方確認。',
    sort_order: 97,
    faq_type: 'general',
  },
  {
    lang: 'zh',
    question: 'After School Coffee 可以叫外賣嗎？用 Foodpanda 還是 KeeTa？',
    answer:
      'After School Coffee 的品牌定位是外帶咖啡和快速自取，但截至 2026-05-16 查核，未找到可公開核實的 Foodpanda 或 KeeTa 店舖頁。最安全的做法是在 Foodpanda 和 KeeTa App 內搜尋「After School Coffee」，若找不到或顯示暫停營業，請致電 +853-6288-3721 確認是否接受外送、自取或電話落單。',
    sort_order: 98,
    faq_type: 'delivery',
  },
]

const MIND_CAFE_FAQS: MerchantFaqOverride[] = [
  {
    lang: 'zh',
    question: '澳門 Mind Cafe 怎麼訂座？電話是多少？',
    answer:
      'Mind Cafe（賣咖啡）最穩妥的訂座方法是致電 +853 6524 0396，公開地址為澳門僑樂新街10號地下AB鋪。公開資料未見專門網上訂座系統；如未能接通，可再透過官方 Facebook 或 Instagram 私訊查詢，但是否留位要以店方回覆為準。',
    sort_order: 91,
    faq_type: 'booking',
  },
  {
    lang: 'zh',
    question: 'Mind Cafe 週末要提前幾天訂座？',
    answer:
      '普通 1 至 5 人週末到訪，建議至少提前 1 至 2 日致電確認；如果是 6 人以上、需要指定座位、生日會或想停留較長時間，建議提前 3 至 7 日。包場、企業團建或假期活動則建議提前 7 至 14 日，週末及公眾假期包場最好預留 2 至 4 週。',
    sort_order: 92,
    faq_type: 'booking',
  },
  {
    lang: 'zh',
    question: 'Mind Cafe 包場最低消費是多少？',
    answer:
      '目前公開資料未見 Mind Cafe 固定包場最低消費、場地費、時租或人頭套餐價。對外回答時不應承諾固定金額；應請客人提供日期、時段、人數、活動用途、餐飲預算及是否需要佈置，再由店方按情況報價。',
    sort_order: 93,
    faq_type: 'price',
  },
  {
    lang: 'zh',
    question: 'Mind Cafe 有訂金要求嗎？',
    answer:
      '公開資料未見 Mind Cafe 對普通訂座或包場列出固定訂金比例。一般散客訂座不應假設一定要訂金；但生日會、企業活動、包場或大人數預約，店方可能會按情況要求訂金或預付最低消費，金額、付款方式及限期必須直接向店方確認。',
    sort_order: 94,
    faq_type: 'booking',
  },
  {
    lang: 'zh',
    question: 'Mind Cafe 取消或退款政策是怎樣？',
    answer:
      '目前未見 Mind Cafe 公開取消退款政策。預約時應請店方確認三件事：最遲可取消或改期的時間、訂金是否可退或可轉作下次消費、臨時取消或 no-show 是否扣款。未取得店方書面或訊息確認前，不應承諾「一定可退款」或「一定不可退款」。',
    sort_order: 95,
    faq_type: 'booking',
  },
]

const FAQ_OVERRIDES_BY_SLUG: Record<string, MerchantFaqOverride[]> = {
  'after-school-coffee': ASC_FAQS,
  'mind-cafe': MIND_CAFE_FAQS,
  'mind-coffee': MIND_CAFE_FAQS,
}

export function getMerchantFaqOverrides(slug: string, merchantId: string): MerchantFAQ[] {
  const overrides = FAQ_OVERRIDES_BY_SLUG[slug] || []

  return overrides.map((faq, index) => ({
    id: `override-${slug}-${index + 1}`,
    merchant_id: merchantId,
    ...faq,
  }))
}
