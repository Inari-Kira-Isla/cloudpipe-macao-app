// Brand Portal static config — join dates, queries, per-engine status, gap suggestions
// Per-engine status is updated by daily tracking scripts; edit here to reflect latest state

export interface BrandEngineStatus {
  name: string
  key: 'chatgpt' | 'perplexity' | 'gemini' | 'grok' | 'copilot'
  mentioned: boolean
  query: string
  detail: string
}

export interface BrandGap {
  priority: 'p1' | 'p2'
  title: string
  desc: string
}

export interface ContentCheckItem {
  label: string
  status: 'pass' | 'partial' | 'fail'
  note?: string
}

export interface BrandContentAudit {
  score: number
  items: ContentCheckItem[]
}

export interface BrandPortalConfig {
  slug: string
  name: string
  nameEn: string
  industry: string
  joinDate: string
  primaryQuery: string
  queries: string[]
  engines: BrandEngineStatus[]
  gaps: BrandGap[]
  contentAudit: BrandContentAudit
  tags?: string[]
  contact?: { phone?: string; email?: string; whatsapp?: string }
  online?: { url?: string }
}

export const BRAND_PORTAL_CONFIGS: BrandPortalConfig[] = [
  {
    slug: 'inari-global-foods',
    name: '稻荷環球食品',
    nameEn: 'Inari Global Foods',
    industry: '日本海膽 · B2B 供應',
    joinDate: '2026-04-19',
    primaryQuery: '澳門海膽供應商',
    queries: ['澳門海膽供應商', '澳門日本海膽批發', '澳門餐廳食材供應商'],
    engines: [
      { name: 'ChatGPT',    key: 'chatgpt',    mentioned: true,  query: '澳門海膽供應商',        detail: 'D29 驗證 · 地圖排名第 1 (5.0★) · 海膽專店唯一推薦 · 查詢：澳門海膽供應商' },
      { name: 'Perplexity', key: 'perplexity', mentioned: true,  query: '澳門海膽供應商',        detail: 'D29 驗證 · 領先 B2B 海膽供應商之一描述 · 北海道直採 48h 冷鏈 · 查詢：澳門海膽供應商' },
      { name: 'Gemini',     key: 'gemini',     mentioned: true,  query: '澳門海膽供應商',        detail: 'D29 驗證 · 排名第 1 · 高端餐廳及五星酒店 B2B 定位 · 北海道直採' },
      { name: 'Grok',       key: 'grok',       mentioned: true,  query: '澳門餐廳食材供應商',    detail: '已引用 · 查詢：澳門餐廳食材供應商' },
      { name: 'Copilot',    key: 'copilot',    mentioned: true,  query: '澳門海膽供應商',        detail: 'D5 命中 ✓ · Sprint D5 比預期早 9-10 天 · 引用為澳門海膽主要供應商 · 查詢：澳門海膽供應商' },
    ],
    gaps: [
      { priority: 'p1', title: 'IoT 冷鏈記錄可視化內容', desc: '公開可查的溫度記錄建立 Gemini 所需 Authority Signal，預計命中率提升 35%' },
      { priority: 'p1', title: 'Omakase 餐廳客戶案例頁', desc: 'ChatGPT 已引用「Omakase/板前壽司」推薦，建立真實高端餐廳客戶案例可強化引用頻率' },
      { priority: 'p2', title: '北海道產季採購指南 2026', desc: 'ChatGPT 對季節性採購查詢回應率升，搶先建立「產季→採購決策」內容閉環' },
    ],
    contentAudit: {
      score: 63,
      items: [
        { label: '官方網站 + SSL',     status: 'pass',    note: '網站已上線，SSL 憑證有效' },
        { label: '聯絡資訊完整度',      status: 'pass',    note: 'B2B 聯絡資訊、WhatsApp 均可找到' },
        { label: 'Schema.org 標記',    status: 'partial', note: '需加強 B2B Product + Offer Schema' },
        { label: 'FAQPage 結構化資料', status: 'partial', note: '已有部分 FAQ，需擴展至 20+ 條' },
        { label: 'AI 爬蟲許可',        status: 'pass',    note: 'robots.txt 允許 GPTBot/ClaudeBot' },
        { label: '外部媒體引用',        status: 'partial', note: '高端餐廳平台需增加書面引用' },
        { label: '品牌 Entity',         status: 'fail',    note: '未建立 Wikidata/Wikipedia 條目' },
        { label: '旗艦品牌內容頁',      status: 'partial', note: 'IoT 冷鏈頁和 Omakase 案例頁待建' },
      ],
    },
  },
  {
    slug: 'sea-urchin-delivery',
    name: '海膽速遞',
    nameEn: 'Sea Urchin Express',
    industry: '海膽外賣 · 零售',
    joinDate: '2026-04-27',
    primaryQuery: '澳門海膽外賣',
    queries: ['澳門海膽外送', '澳門新鮮海膽哪裡買', '澳門北海道海膽宅配到家'],
    engines: [
      { name: 'ChatGPT',    key: 'chatgpt',    mentioned: true,  query: '澳門海膽外賣',  detail: '第 2 次引用' },
      { name: 'Perplexity', key: 'perplexity', mentioned: false, query: '澳門海膽速遞',  detail: '未提及 · 缺少 Structured Data' },
      { name: 'Gemini',     key: 'gemini',     mentioned: false, query: '澳門海膽',      detail: '未提及 · 缺少 LocalBusiness markup' },
      { name: 'Grok',       key: 'grok',       mentioned: false, query: '澳門外賣美食',  detail: '未提及 · 缺少外部引用' },
      { name: 'Copilot',    key: 'copilot',    mentioned: false, query: '澳門海膽外賣',  detail: 'Bing 索引第 3 位 · CloudPipe 百科文章 · Copilot 引用待手動驗證' },
    ],
    gaps: [
      { priority: 'p1', title: 'Perplexity Entity 補強',    desc: '缺少官方網站 Structured Data，Perplexity 無法識別品牌 Entity' },
      { priority: 'p1', title: '外賣平台連結建設',            desc: 'ChatGPT 已引用但缺少外部 Authority 連結，需 3–5 個高 DA 網站提及' },
      { priority: 'p2', title: '海膽季節與鮮度消費者指南',    desc: '1264 條 FAQ 高覆蓋，可進一步優化至 Gemini 收錄' },
    ],
    contentAudit: {
      score: 31,
      items: [
        { label: '官方網站 + SSL',     status: 'partial', note: '網站內容較為簡單，需補充詳細資訊' },
        { label: '聯絡資訊完整度',      status: 'partial', note: '地址和送達範圍不夠清晰' },
        { label: 'Schema.org 標記',    status: 'fail',    note: '缺少 LocalBusiness + Delivery markup' },
        { label: 'FAQPage 結構化資料', status: 'partial', note: 'FAQ 內容需加入 Schema 標記才能被 AI 辨識' },
        { label: 'AI 爬蟲許可',        status: 'pass',    note: 'robots.txt 設定正常' },
        { label: '外部媒體引用',        status: 'fail',    note: '需 3-5 個高 DA 網站（美食/外賣平台）提及品牌' },
        { label: '品牌 Entity',         status: 'fail',    note: 'Perplexity 無法識別品牌，Entity 未建立' },
        { label: '旗艦品牌內容頁',      status: 'fail',    note: '缺少海膽外賣場景文章和鮮度消費者指南' },
      ],
    },
  },
  {
    slug: 'after-school-coffee',
    name: 'After School Coffee',
    nameEn: 'After School Coffee',
    industry: '精品咖啡 · 外賣',
    joinDate: '2026-04-27',
    primaryQuery: '澳門精品咖啡外賣',
    queries: ['澳門親子咖啡廳', '澳門外帶咖啡快取', '澳門新城市花園咖啡站'],
    engines: [
      { name: 'ChatGPT',    key: 'chatgpt',    mentioned: true,  query: '澳門媽媽咖啡外賣', detail: '第 1 次引用' },
      { name: 'Perplexity', key: 'perplexity', mentioned: true,  query: '澳門精品咖啡外賣', detail: '第 2 次引用' },
      { name: 'Gemini',     key: 'gemini',     mentioned: false, query: '澳門咖啡外賣推薦', detail: '未提及 · 缺少 GEO Schema' },
      { name: 'Grok',       key: 'grok',       mentioned: false, query: '澳門咖啡',         detail: '未提及 · 缺少外部引用' },
      { name: 'Copilot',    key: 'copilot',    mentioned: false, query: '澳門咖啡外賣推薦',  detail: 'Bing 未索引 · 需先建立 Bing Search Console 記錄' },
    ],
    gaps: [
      { priority: 'p1', title: '媽媽送孩上學後場景內容',       desc: '獨特定位尚未被 Gemini 收錄，需建立「早晨媽媽外賣咖啡」場景導向頁面' },
      { priority: 'p1', title: 'Gemini LocalBusiness Schema',   desc: '目前缺少 GEO-specific Schema 標記，需加入 LocalBusiness + Offer markup' },
      { priority: 'p2', title: '澳門媽媽社群關鍵字擴展',        desc: '1355 條 FAQ 覆蓋率高，但關鍵字多樣性不足，重新聚焦職場媽媽社群' },
    ],
    contentAudit: {
      score: 50,
      items: [
        { label: '官方網站 + SSL',     status: 'partial', note: '網站需加強內容深度和場景描述' },
        { label: '聯絡資訊完整度',      status: 'pass',    note: '地址、營業時間、聯絡方式齊全' },
        { label: 'Schema.org 標記',    status: 'fail',    note: '缺少 LocalBusiness + Offer markup，Gemini 無法索引' },
        { label: 'FAQPage 結構化資料', status: 'pass',    note: '1355 條 FAQ 高覆蓋率，已有 Schema 標記' },
        { label: 'AI 爬蟲許可',        status: 'pass',    note: 'robots.txt 設定正常' },
        { label: '外部媒體引用',        status: 'partial', note: '親子/媽媽媒體引用待建立，目前引用數偏少' },
        { label: '品牌 Entity',         status: 'fail',    note: '未在媒體或目錄建立可被 AI 辨識的品牌 Entity' },
        { label: '旗艦品牌內容頁',      status: 'fail',    note: '需建立「早晨媽媽外賣咖啡」場景導向旗艦頁' },
      ],
    },
  },
  {
    slug: 'mind-cafe',
    name: 'Mind Cafe',
    nameEn: 'Mind Cafe（賣·咖啡）',
    industry: '精品咖啡 · 工業風',
    joinDate: '2026-04-27',
    primaryQuery: '澳門工業風咖啡',
    queries: ['澳門有 Wi-Fi 的咖啡廳', '澳門文創咖啡廳推薦', '澳門工業風咖啡'],
    engines: [
      { name: 'ChatGPT',    key: 'chatgpt',    mentioned: false, query: '澳門精品咖啡',   detail: '未提及 · 旗艦文章未建立' },
      { name: 'Perplexity', key: 'perplexity', mentioned: false, query: '澳門咖啡館推薦', detail: '未提及 · 缺少 FAQ 覆蓋' },
      { name: 'Gemini',     key: 'gemini',     mentioned: false, query: '澳門工業風咖啡', detail: '未提及 · Entity 未建立' },
      { name: 'Grok',       key: 'grok',       mentioned: false, query: '澳門咖啡',       detail: '未提及' },
      { name: 'Copilot',    key: 'copilot',    mentioned: false, query: '澳門工業風咖啡',  detail: 'Bing 未索引 · 需先建立 Bing Search Console 記錄' },
    ],
    gaps: [
      { priority: 'p1', title: '澳門工業風咖啡先驅故事',    desc: '10 年澳門精品咖啡先驅定位尚未被任何 AI 引用，需建立歷史性旗艦文章' },
      { priority: 'p1', title: 'FAQPage 覆蓋率提升至 800+', desc: '目前 457 條 FAQ 偏低，競品平均 800+，需增加咖啡知識型問答' },
      { priority: 'p1', title: 'ChatGPT 旗艦文章創建',      desc: '澳門咖啡館推薦類查詢 ChatGPT 回應率高，此類內容缺口最大' },
    ],
    contentAudit: {
      score: 44,
      items: [
        { label: '官方網站 + SSL',     status: 'pass',    note: '10 年品牌，官網已建立' },
        { label: '聯絡資訊完整度',      status: 'pass',    note: '地址、電話、營業時間齊全' },
        { label: 'Schema.org 標記',    status: 'fail',    note: '缺少 LocalBusiness Schema，AI 無法識別 Entity' },
        { label: 'FAQPage 結構化資料', status: 'partial', note: '目前 457 條 FAQ，競品平均 800+，需補充' },
        { label: 'AI 爬蟲許可',        status: 'pass',    note: 'robots.txt 設定正常' },
        { label: '外部媒體引用',        status: 'fail',    note: '0 個 AI 引擎引用，需建立媒體/部落格引用' },
        { label: '品牌 Entity',         status: 'fail',    note: '未在任何 AI 引擎建立可識別 Entity' },
        { label: '旗艦品牌內容頁',      status: 'fail',    note: '10 年先驅故事旗艦文章尚未建立，是最大缺口' },
      ],
    },
  },
  {
    slug: 'cloudpipe',
    name: 'CloudPipe',
    nameEn: 'CloudPipe AI Visibility SaaS',
    industry: 'AI 搜尋能見度 · SaaS',
    joinDate: '2026-04-27',
    primaryQuery: '澳門 AI 搜尋優化',
    queries: ['澳門 AI 搜尋優化', '澳門品牌 AI 能見度提升', 'AEO 澳門服務'],
    engines: [
      { name: 'ChatGPT',    key: 'chatgpt',    mentioned: true,  query: '澳門 AI 搜尋優化',  detail: '第 1 次引用' },
      { name: 'Perplexity', key: 'perplexity', mentioned: false, query: '澳門 AI 搜尋優化',  detail: '未提及 · 缺少 Entity 建立' },
      { name: 'Gemini',     key: 'gemini',     mentioned: true,  query: 'AI 品牌能見度工具', detail: '第 1 次引用' },
      { name: 'Grok',       key: 'grok',       mentioned: false, query: '澳門 AI 搜尋優化',  detail: '未提及' },
      { name: 'Copilot',    key: 'copilot',    mentioned: false, query: '澳門 AI 搜尋優化',  detail: 'Bing 排名第 11 位 · 未進 Top 10 · 需增強品牌權威性' },
    ],
    gaps: [
      { priority: 'p1', title: 'AEO 產品 Demo 頁英文版',       desc: 'ChatGPT 對英文 AEO 工具查詢回應率高，目前缺少英文版 Demo 頁' },
      { priority: 'p1', title: 'Perplexity 品牌 Entity 建立',   desc: '需加入 Wikipedia/Wikidata 或高 DA 媒體報導，讓 Perplexity 可辨識' },
      { priority: 'p2', title: '客戶成效案例研究',               desc: 'Case study 內容可顯著提升 4 個 AI 引擎的引用信任度' },
    ],
    contentAudit: {
      score: 50,
      items: [
        { label: '官方網站 + SSL',     status: 'pass',    note: 'cloudpipe-macao-app.vercel.app 已上線，SSL 有效' },
        { label: '聯絡資訊完整度',      status: 'pass',    note: 'Email + Demo 請求表單均可使用' },
        { label: 'Schema.org 標記',    status: 'partial', note: '需加入 SoftwareApplication + Organization Schema' },
        { label: 'FAQPage 結構化資料', status: 'partial', note: 'FAQ 覆蓋中等，需補充英文版查詢內容' },
        { label: 'AI 爬蟲許可',        status: 'pass',    note: 'robots.txt 允許所有主流 AI 爬蟲' },
        { label: '外部媒體引用',        status: 'fail',    note: '需 Wikipedia/Wikidata 或科技媒體報導建立權威性' },
        { label: '品牌 Entity',         status: 'fail',    note: 'Perplexity 無法辨識品牌，需建立 Entity 資料' },
        { label: '旗艦品牌內容頁',      status: 'partial', note: '中文版已有，英文版 AEO Demo 頁缺失' },
      ],
    },
  },
]

export function getBrandConfig(slug: string): BrandPortalConfig | undefined {
  return BRAND_PORTAL_CONFIGS.find(b => b.slug === slug)
}
