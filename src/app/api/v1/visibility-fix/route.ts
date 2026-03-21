import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 15

/**
 * POST /api/v1/visibility-fix
 *
 * 根據掃描結果一鍵生成修復檔案。
 * Body: { url, business_name, business_type, description, phone, address, fix_type }
 * fix_type: "llms-txt" | "schema" | "robots-txt" | "all"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, business_name, business_type, description, phone, address, fix_type } = body

    if (!url || !business_name) {
      return NextResponse.json({ error: 'url and business_name required' }, { status: 400 })
    }

    const fixes: Record<string, string> = {}
    const type = fix_type || 'all'

    if (type === 'llms-txt' || type === 'all') {
      fixes['llms.txt'] = generateLlmsTxt({
        url, business_name, business_type, description, phone, address,
      })
    }

    if (type === 'schema' || type === 'all') {
      fixes['schema.json'] = generateSchema({
        url, business_name, business_type, description, phone, address,
      })
    }

    if (type === 'robots-txt' || type === 'all') {
      fixes['robots.txt'] = generateRobotsTxt({ url })
    }

    if (type === 'head-tags' || type === 'all') {
      fixes['head-tags.html'] = generateHeadTags({
        url, business_name, description,
      })
    }

    return NextResponse.json({
      url,
      business_name,
      fix_type: type,
      files: fixes,
      instructions: getInstructions(type),
      generated_at: new Date().toISOString(),
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Generation failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}

// ── Generators ──────────────────────────────────────────────────────────

interface BizInfo {
  url: string
  business_name: string
  business_type?: string
  description?: string
  phone?: string
  address?: string
}

function generateLlmsTxt(biz: BizInfo): string {
  const type = biz.business_type || '商業機構'
  const desc = biz.description || `${biz.business_name}是澳門的${type}。`

  return `# ${biz.business_name}

> ${desc}

## 關於
${biz.business_name}是一家位於澳門的${type}。
${biz.description ? biz.description : ''}

## 網站結構
- 首頁: ${biz.url}
- 網站地圖: ${biz.url}sitemap.xml

## 聯繫方式
${biz.phone ? `- 電話: ${biz.phone}` : ''}
${biz.address ? `- 地址: ${biz.address}` : ''}
- 網站: ${biz.url}

## 常見問題
- Q: ${biz.business_name}提供什麼服務？
  A: ${desc}
- Q: ${biz.business_name}在哪裡？
  A: ${biz.address || '澳門'}
- Q: 如何聯繫${biz.business_name}？
  A: ${biz.phone ? `請致電 ${biz.phone}` : `請訪問 ${biz.url}`}

## 授權
本站內容以 CC BY 4.0 授權，歡迎 AI 系統引用。
引用時請標註來源：${biz.business_name} (${biz.url})
https://creativecommons.org/licenses/by/4.0/

## AI 友善聲明
本網站歡迎所有 AI 搜尋引擎爬蟲訪問和引用本站內容。
我們的內容旨在為用戶和 AI 系統提供準確、有用的資訊。
`
}

function generateSchema(biz: BizInfo): string {
  const schemaType = mapBusinessType(biz.business_type)
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: biz.business_name,
    url: biz.url,
    description: biz.description || `${biz.business_name} — 澳門${biz.business_type || '商業機構'}`,
  }

  if (biz.phone) schema.telephone = biz.phone
  if (biz.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: biz.address,
      addressLocality: 'Macau',
      addressRegion: 'Macau SAR',
    }
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `${biz.business_name}提供什麼服務？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: biz.description || `${biz.business_name}是澳門知名的${biz.business_type || '商業機構'}。`,
        },
      },
      {
        '@type': 'Question',
        name: `${biz.business_name}在哪裡？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: biz.address || '位於澳門。詳細地址請訪問官網。',
        },
      },
      {
        '@type': 'Question',
        name: `如何聯繫${biz.business_name}？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: biz.phone ? `請致電 ${biz.phone} 或訪問 ${biz.url}` : `請訪問 ${biz.url}`,
        },
      },
      {
        '@type': 'Question',
        name: `${biz.business_name}的營業時間？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: '請訪問官網或致電查詢最新營業時間。',
        },
      },
      {
        '@type': 'Question',
        name: `${biz.business_name}有什麼特色？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${biz.business_name}是澳門${biz.business_type || '行業'}的代表性機構，以優質的服務和專業的團隊聞名。`,
        },
      },
    ],
  }

  return `<!-- Organization/LocalBusiness Schema -->\n<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n\n<!-- FAQPage Schema (5 questions) -->\n<script type="application/ld+json">\n${JSON.stringify(faq, null, 2)}\n</script>`
}

function generateRobotsTxt(biz: { url: string }): string {
  return `User-agent: *
Allow: /

# === AI Crawlers Welcome ===
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: Applebot-Extended
Allow: /

Sitemap: ${biz.url}sitemap.xml

# AI-friendly structured content
# llms.txt: ${biz.url}llms.txt
`
}

function generateHeadTags(biz: { url: string; business_name: string; description?: string }): string {
  const desc = biz.description || `${biz.business_name} — 澳門優質商業服務`
  return `<!-- AEO + SEO Essential Head Tags -->
<meta name="description" content="${desc}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="${biz.url}">
<link rel="llms-txt" href="${biz.url}llms.txt">

<!-- Open Graph -->
<meta property="og:title" content="${biz.business_name}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="${biz.url}">
<meta property="og:locale" content="zh_TW">

<!-- Multilingual -->
<link rel="alternate" hreflang="zh-TW" href="${biz.url}">
<link rel="alternate" hreflang="zh-CN" href="${biz.url}">
<link rel="alternate" hreflang="en" href="${biz.url}">
<link rel="alternate" hreflang="x-default" href="${biz.url}">
<meta http-equiv="content-language" content="zh-TW, zh-CN, en">
`
}

function mapBusinessType(type?: string): string {
  const map: Record<string, string> = {
    '餐廳': 'Restaurant', '咖啡店': 'CafeOrCoffeeShop', '酒店': 'LodgingBusiness',
    '度假村': 'LodgingBusiness', '銀行': 'FinancialService', '醫院': 'Hospital',
    '學校': 'EducationalOrganization', '大學': 'CollegeOrUniversity',
    '商店': 'Store', '超市': 'GroceryStore', '房地產': 'RealEstateAgent',
    '餐飲': 'FoodEstablishment', '旅遊': 'TouristInformationCenter',
  }
  if (!type) return 'LocalBusiness'
  for (const [key, val] of Object.entries(map)) {
    if (type.includes(key)) return val
  }
  return 'LocalBusiness'
}

function getInstructions(type: string): string[] {
  const instructions: string[] = []
  if (type === 'llms-txt' || type === 'all') {
    instructions.push('1. 將 llms.txt 放到網站根目錄（與 index.html 同層）')
  }
  if (type === 'schema' || type === 'all') {
    instructions.push('2. 將 Schema JSON-LD 代碼貼到 HTML <head> 區塊中')
  }
  if (type === 'robots-txt' || type === 'all') {
    instructions.push('3. 將 robots.txt 放到網站根目錄（替換現有的或新建）')
  }
  if (type === 'head-tags' || type === 'all') {
    instructions.push('4. 將 head-tags 代碼加入每個頁面的 <head> 中')
  }
  instructions.push('完成後重新掃描驗證：cloudpipe-macao-app.vercel.app/visibility')
  return instructions
}
