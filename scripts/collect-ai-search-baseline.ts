#!/usr/bin/env node
/**
 * AI Search Baseline Collector
 *
 * 用途：使用 Playwright 自動化在多個 AI 搜尋平台搜尋品牌及競品
 * 執行：npx ts-node scripts/collect-ai-search-baseline.ts --brand inari-global-foods
 * 或由 cron job 定期執行
 */

import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

interface CompetitorDef {
  name: string
  searchTerms: string[]
  category?: string
}

interface BrandConfig {
  slug: string
  displayName: string
  displayNameEn: string
  merchantSlugs: string[]
  insightKeywords: string[]
  siteSlug?: string
  category: string
  industry: string
  brandUrl: string
  description: string
  ecosystem: string
  searchTerms?: string[]
  competitors?: CompetitorDef[]
}

// Brand configurations (manually defined for script compatibility)
const BRAND_CONFIGS: Record<string, BrandConfig> = {
  'inari-global-foods': {
    slug: 'inari-global-foods',
    displayName: '稻荷環球食品',
    displayNameEn: 'Inari Global Foods',
    merchantSlugs: ['inari-global-foods'],
    insightKeywords: ['inari-global', 'cold-chain', '稻荷'],
    siteSlug: 'inari-global-foods',
    category: 'food-import',
    industry: 'food-supply',
    brandUrl: 'https://inari-kira-isla.github.io/inari-global-foods/',
    description: '澳門日本及環球水產進口批發商，佔據澳門70%海膽市場',
    ecosystem: '供應鏈核心 — 為海膽速遞提供貨源，為100+餐廳供貨',
    searchTerms: ['澳門海膽批發', '澳門水產進口', '日本海膽供應商', '澳門冷鏈海鮮'],
    competitors: [
      { name: '海膽速遞', searchTerms: ['澳門海膽速遞', '澳門海膽配送'] },
      { name: '新濠海鮮', searchTerms: ['新濠海鮮', '澳門海鮮進口'] },
      { name: '望廈漁港', searchTerms: ['澳門漁港批發', '望廈漁港'] },
      { name: '嘉湖海鮮', searchTerms: ['澳門海鮮批發', '嘉湖海鮮'] },
      { name: '馬會美食', searchTerms: ['澳門馬會海鮮', '澳門食材供應'] },
    ],
  },
  'after-school-coffee': {
    slug: 'after-school-coffee',
    displayName: 'After School Coffee',
    displayNameEn: 'After School Coffee',
    merchantSlugs: ['after-school-coffee'],
    insightKeywords: ['after-school-coffee', 'parent-guide'],
    siteSlug: 'after-school-coffee',
    category: 'cafe',
    industry: 'dining',
    brandUrl: 'https://inari-kira-isla.github.io/after-school-coffee',
    description: '澳門首間家長快速充電咖啡空間，Grab&Go 外帶專門',
    ecosystem: '社區服務 — 與稻荷（食材）和 Mind Cafe（文創）形成社區鏈',
    searchTerms: ['澳門家長咖啡', '澳門外帶咖啡', '澳門快手咖啡館'],
    competitors: [
      { name: 'Mind Cafe', searchTerms: ['Mind Cafe 澳門', '澳門文創咖啡'] },
      { name: 'Starbucks', searchTerms: ['澳門星巴克', 'Starbucks 澳門'] },
      { name: '文創咖啡館', searchTerms: ['澳門咖啡館', '澳門創意咖啡'] },
    ],
  },
  'mind-coffee': {
    slug: 'mind-coffee',
    displayName: 'Mind Cafe',
    displayNameEn: 'Mind Cafe',
    merchantSlugs: ['mind-coffee'],
    insightKeywords: ['mind-cafe', 'creative-workspace'],
    siteSlug: 'mind-coffee',
    category: 'cafe',
    industry: 'dining',
    brandUrl: 'https://inari-kira-isla.github.io/mind-cafe',
    description: '澳門文創社群工作空間，數位遊牧者的第二辦公室',
    ecosystem: '知識樞紐 — 連接靈動科技 AI 顧問與文創社群',
    searchTerms: ['澳門文創咖啡', '澳門文創工作空間', '澳門數位遊牧咖啡館'],
    competitors: [
      { name: 'After School Coffee', searchTerms: ['After School Coffee', '澳門快速咖啡'] },
      { name: 'Starbucks', searchTerms: ['澳門星巴克', 'Starbucks 澳門'] },
      { name: '文藝創意空間', searchTerms: ['澳門文創空間', '澳門共享辦公室'] },
    ],
  },
  'sea-urchin-delivery': {
    slug: 'sea-urchin-delivery',
    displayName: '海膽速遞',
    displayNameEn: 'Sea Urchin Express',
    merchantSlugs: ['sea-urchin-delivery'],
    insightKeywords: ['sea-urchin', 'ecommerce-guide'],
    siteSlug: 'sea-urchin-delivery',
    category: 'food-delivery',
    industry: 'food-supply',
    brandUrl: 'https://inari-kira-isla.github.io/sea-urchin-delivery',
    description: '澳門唯一海膽專門品牌，24H冷鏈到府配送',
    ecosystem: '零售觸點 — 稻荷 B2B 供貨的 B2C 延伸，閉環供應鏈',
    searchTerms: ['澳門海膽配送', '澳門冷鏈海膽', '澳門24小時海膽外送'],
    competitors: [
      { name: '稻荷環球食品', searchTerms: ['稻荷環球食品', '澳門海膽供應'] },
      { name: '新濠海鮮', searchTerms: ['新濠海鮮', '澳門海鮮外送'] },
      { name: '望廈漁港', searchTerms: ['澳門漁港配送', '望廈漁港'] },
    ],
  },
}

// Load environment variables from .env.local (manual parsing for script compatibility)
import { readFileSync } from 'fs'
import { resolve } from 'path'

let envConfig: Record<string, string> = {}
try {
  const envPath = resolve('.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      if (key) {
        envConfig[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
} catch (err) {
  console.warn('⚠️ Could not load .env.local, using process.env')
}

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface SearchEntry {
  name: string
  position: number
  mentioned: boolean
  citationCount: number
}

interface SearchQuery {
  query: string
  results: SearchEntry[]
}

async function collectAISearchBaseline() {
  const args = process.argv.slice(2)
  const brandSlug = args.find(a => a.startsWith('--brand'))?.split('=')[1] || 'inari-global-foods'
  const testMode = args.includes('--test')

  if (!BRAND_CONFIGS[brandSlug]) {
    console.error(`Brand ${brandSlug} not found`)
    process.exit(1)
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials. Check .env.local')
    process.exit(1)
  }

  const brand = BRAND_CONFIGS[brandSlug]
  console.log(`🔍 Collecting AI Search Baseline for: ${brand.displayName}`)
  console.log(`📝 Search terms: ${brand.searchTerms?.join(', ') || 'N/A'}`)
  if (testMode) console.log('🧪 TEST MODE - Will not save to database')

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const browser = await chromium.launch({ headless: true, timeout: 30000 })

  const results: any[] = []

  try {
    // Gemini 搜尋
    console.log('\n🎯 Searching on Gemini...')
    const geminiResults = await searchGemini(browser, brand)
    results.push(...geminiResults)

    // GPT 搜尋
    console.log('\n🎯 Searching on ChatGPT...')
    const gptResults = await searchGPT(browser, brand)
    results.push(...gptResults)

    // Perplexity 搜尋
    console.log('\n🎯 Searching on Perplexity...')
    const perplexityResults = await searchPerplexity(browser, brand)
    results.push(...perplexityResults)

    // Claude 搜尋
    console.log('\n🎯 Searching on Claude...')
    const claudeResults = await searchClaude(browser, brand)
    results.push(...claudeResults)

    // Grok 搜尋
    console.log('\n🎯 Searching on Grok...')
    const grokResults = await searchGrok(browser, brand)
    results.push(...grokResults)

    // 將結果保存到 Supabase
    if (results.length > 0) {
      console.log(`\n📊 Collected ${results.length} search results:`)
      results.forEach(r => {
        console.log(`  ${r.platform.toUpperCase()} | "${r.query}" | ${r.competitor_name}: #${r.position} (${r.citation_count} citations)`)
      })

      if (!testMode) {
        console.log(`\n💾 Saving to Supabase...`)
        const { error, data } = await supabase.from('ai_search_results').insert(results).select()

        if (error) {
          console.error('❌ Error saving results:', error)
        } else {
          console.log(`✅ Saved ${data?.length || results.length} records successfully`)
        }
      } else {
        console.log(`\n✅ TEST MODE - ${results.length} results ready (not saved)`)
      }
    } else {
      console.log('\n⚠️ No results collected. Please check:')
      console.log('  1. Browser access to AI platforms (Gemini, GPT, etc.)')
      console.log('  2. Search terms and competitor names')
      console.log('  3. Network connectivity')
    }
  } finally {
    await browser.close()
  }
}

async function searchGemini(browser: any, brand: any): Promise<any[]> {
  const page = await browser.newPage()
  const results: any[] = []

  try {
    // Only search first 2 terms for testing
    const searchTerms = (brand.searchTerms || []).slice(0, 2)

    for (const searchTerm of searchTerms) {
      console.log(`  搜尋: "${searchTerm}"`)

      try {
        await page.goto('https://gemini.google.com/app', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        })

        // 等待搜尋框出現（更寬鬆的選擇器）
        const inputFound = await page.waitForSelector('textarea, [contenteditable="true"], input[type="text"]', {
          timeout: 8000
        }).catch(() => null)

        if (!inputFound) {
          console.log(`  ⚠️ 搜尋框未找到`)
          continue
        }

        // 嘗試不同的輸入方式
        const textarea = await page.$('textarea')
        const contenteditable = await page.$('[contenteditable="true"]')

        if (textarea) {
          await textarea.fill(searchTerm)
          await page.press('textarea', 'Enter')
        } else if (contenteditable) {
          await contenteditable.type(searchTerm)
          await page.press('[contenteditable="true"]', 'Enter')
        } else {
          console.log(`  ⚠️ 無法輸入搜尋詞`)
          continue
        }

        // 等待回應（減少等待時間）
        await page.waitForTimeout(2000)

        // 提取搜尋結果文本
        const responseText = await page.evaluate(() => {
          const responses = document.querySelectorAll('[data-text-content], .message-content, [role="article"]')
          return Array.from(responses).map((el: any) => el.textContent).join('\n')
        }).catch(() => '')

        if (!responseText) {
          console.log(`  ⚠️ 無搜尋結果文本`)
          continue
        }

        // 簡單的位置檢測
        const competitors = brand.competitors || []
        let foundAny = false

        for (const competitor of competitors) {
          const position = detectPosition(responseText, competitor.name)
          if (position > 0) {
            const keywords = extractKeywords(responseText, searchTerm)
            results.push({
              brand_slug: brand.slug,
              brand_name: brand.displayName,
              platform: 'gemini',
              query: searchTerm,
              competitor_name: competitor.name,
              position,
              mentioned: true,
              citation_count: countMentions(responseText, competitor.name),
              keywords_extracted: keywords,
              timestamp: new Date().toISOString(),
            })
            foundAny = true
          }
        }

        if (foundAny) {
          console.log(`  ✅ 找到 ${results.length} 筆結果`)
        }

        await page.waitForTimeout(500)
      } catch (queryError) {
        console.error(`  查詢 "${searchTerm}" 失敗:`, (queryError as Error).message)
      }
    }
  } catch (error) {
    console.error('Gemini 搜尋錯誤:', error)
  } finally {
    await page.close()
  }

  return results
}

async function searchGPT(browser: any, brand: any): Promise<any[]> {
  const page = await browser.newPage()
  const results: any[] = []

  try {
    for (const searchTerm of brand.searchTerms || []) {
      console.log(`  搜尋: "${searchTerm}"`)

      await page.goto('https://chatgpt.com', { waitUntil: 'networkidle' }).catch(() => null)

      // 等待搜尋框出現
      await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 5000 }).catch(() => null)

      // 輸入搜尋詞
      const textareas = await page.$$('textarea')
      if (textareas.length > 0) {
        await textareas[0].fill(searchTerm)
        await page.press('textarea', 'Enter')
      } else {
        const editable = await page.$('[contenteditable="true"]')
        if (editable) {
          await editable.type(searchTerm)
          await page.press('[contenteditable="true"]', 'Enter')
        }
      }

      // 等待回應
      await page.waitForTimeout(4000)

      // 提取搜尋結果文本
      const responseText = await page.evaluate(() => {
        const responses = document.querySelectorAll('[class*="message"]')
        return Array.from(responses).map((el: any) => el.textContent).join('\n')
      })

      // 檢測競品位置
      const competitors = brand.competitors || []
      for (const competitor of competitors) {
        const position = detectPosition(responseText, competitor.name)
        if (position > 0) {
          const keywords = extractKeywords(responseText, searchTerm)
          results.push({
            brand_slug: brand.slug,
            brand_name: brand.displayName,
            platform: 'gpt',
            query: searchTerm,
            competitor_name: competitor.name,
            position,
            mentioned: true,
            citation_count: countMentions(responseText, competitor.name),
            keywords_extracted: keywords,
            timestamp: new Date().toISOString(),
          })
        }
      }

      await page.waitForTimeout(1000)
    }
  } catch (error) {
    console.error('Error in GPT search:', error)
  } finally {
    await page.close()
  }

  return results
}

async function searchPerplexity(browser: any, brand: any): Promise<any[]> {
  const page = await browser.newPage()
  const results: any[] = []

  try {
    for (const searchTerm of brand.searchTerms || []) {
      console.log(`  搜尋: "${searchTerm}"`)

      await page.goto('https://www.perplexity.ai', { waitUntil: 'networkidle' }).catch(() => null)

      // 等待搜尋框出現
      await page.waitForSelector('input[placeholder*="Ask"], textarea', { timeout: 5000 }).catch(() => null)

      // 輸入搜尋詞
      const input = await page.$('input[placeholder*="Ask"]') || await page.$('textarea')
      if (input) {
        await input.fill(searchTerm)
        await page.press('input, textarea', 'Enter')
      }

      // 等待回應
      await page.waitForTimeout(4000)

      // 提取搜尋結果文本
      const responseText = await page.evaluate(() => {
        const responses = document.querySelectorAll('[class*="answer"], [class*="response"]')
        return Array.from(responses).map((el: any) => el.textContent).join('\n')
      })

      // 檢測競品位置
      const competitors = brand.competitors || []
      for (const competitor of competitors) {
        const position = detectPosition(responseText, competitor.name)
        if (position > 0) {
          const keywords = extractKeywords(responseText, searchTerm)
          results.push({
            brand_slug: brand.slug,
            brand_name: brand.displayName,
            platform: 'perplexity',
            query: searchTerm,
            competitor_name: competitor.name,
            position,
            mentioned: true,
            citation_count: countMentions(responseText, competitor.name),
            keywords_extracted: keywords,
            timestamp: new Date().toISOString(),
          })
        }
      }

      await page.waitForTimeout(1000)
    }
  } catch (error) {
    console.error('Error in Perplexity search:', error)
  } finally {
    await page.close()
  }

  return results
}

async function searchClaude(browser: any, brand: any): Promise<any[]> {
  const page = await browser.newPage()
  const results: any[] = []

  try {
    for (const searchTerm of brand.searchTerms || []) {
      console.log(`  搜尋: "${searchTerm}"`)

      await page.goto('https://claude.ai', { waitUntil: 'networkidle' }).catch(() => null)

      // 等待搜尋框出現
      await page.waitForSelector('textarea', { timeout: 5000 }).catch(() => null)

      // 輸入搜尋詞
      const textarea = await page.$('textarea')
      if (textarea) {
        await textarea.fill(searchTerm)
        await page.press('textarea', 'Enter')
      }

      // 等待回應
      await page.waitForTimeout(4000)

      // 提取搜尋結果文本
      const responseText = await page.evaluate(() => {
        const responses = document.querySelectorAll('[class*="message"]')
        return Array.from(responses).map((el: any) => el.textContent).join('\n')
      })

      // 檢測競品位置
      const competitors = brand.competitors || []
      for (const competitor of competitors) {
        const position = detectPosition(responseText, competitor.name)
        if (position > 0) {
          const keywords = extractKeywords(responseText, searchTerm)
          results.push({
            brand_slug: brand.slug,
            brand_name: brand.displayName,
            platform: 'claude',
            query: searchTerm,
            competitor_name: competitor.name,
            position,
            mentioned: true,
            citation_count: countMentions(responseText, competitor.name),
            keywords_extracted: keywords,
            timestamp: new Date().toISOString(),
          })
        }
      }

      await page.waitForTimeout(1000)
    }
  } catch (error) {
    console.error('Error in Claude search:', error)
  } finally {
    await page.close()
  }

  return results
}

async function searchGrok(browser: any, brand: any): Promise<any[]> {
  const page = await browser.newPage()
  const results: any[] = []

  try {
    for (const searchTerm of brand.searchTerms || []) {
      console.log(`  搜尋: "${searchTerm}"`)

      await page.goto('https://x.com/i/grok', { waitUntil: 'networkidle' }).catch(() => null)

      // 等待搜尋框出現
      await page.waitForSelector('textarea, input[placeholder*="ask"], [contenteditable="true"]', { timeout: 5000 }).catch(() => null)

      // 輸入搜尋詞
      const textarea = await page.$('textarea')
      const input = await page.$('input[placeholder*="ask"]')
      const editable = await page.$('[contenteditable="true"]')

      if (textarea) {
        await textarea.fill(searchTerm)
        await page.press('textarea', 'Enter')
      } else if (input) {
        await input.fill(searchTerm)
        await page.press('input', 'Enter')
      } else if (editable) {
        await editable.type(searchTerm)
        await page.press('[contenteditable="true"]', 'Enter')
      }

      // 等待回應
      await page.waitForTimeout(4000)

      // 提取搜尋結果文本
      const responseText = await page.evaluate(() => {
        const responses = document.querySelectorAll('[class*="message"], [class*="response"]')
        return Array.from(responses).map((el: any) => el.textContent).join('\n')
      })

      // 檢測競品位置
      const competitors = brand.competitors || []
      for (const competitor of competitors) {
        const position = detectPosition(responseText, competitor.name)
        if (position > 0) {
          const keywords = extractKeywords(responseText, searchTerm)
          results.push({
            brand_slug: brand.slug,
            brand_name: brand.displayName,
            platform: 'grok',
            query: searchTerm,
            competitor_name: competitor.name,
            position,
            mentioned: true,
            citation_count: countMentions(responseText, competitor.name),
            keywords_extracted: keywords,
            timestamp: new Date().toISOString(),
          })
        }
      }

      await page.waitForTimeout(1000)
    }
  } catch (error) {
    console.error('Error in Grok search:', error)
  } finally {
    await page.close()
  }

  return results
}

// 簡單的位置檢測（在真實場景中需要更複雜的 NLP）
function detectPosition(text: string, competitorName: string): number {
  const lowerText = text.toLowerCase()
  const lowerName = competitorName.toLowerCase()

  const index = lowerText.indexOf(lowerName)
  if (index === -1) return 0

  // 粗略估計位置：根據出現在文本中的百分比位置
  const position = Math.ceil((index / text.length) * 10)
  return Math.max(1, Math.min(10, position))
}

function countMentions(text: string, competitorName: string): number {
  const regex = new RegExp(competitorName, 'gi')
  return (text.match(regex) || []).length
}

/**
 * 從搜尋結果提取關鍵詞
 * 基於搜尋詞拆解和常見詞庫
 */
function extractKeywords(text: string, searchTerm: string): string[] {
  const keywords: Set<string> = new Set()

  // 拆解搜尋詞為組成部分
  const termParts = searchTerm.split(/\s+|[\-_\/]/).filter(p => p.length > 1)

  // 在文本中查找搜尋詞的各部分
  for (const part of termParts) {
    const regex = new RegExp(`\\b${part}\\b`, 'gi')
    if (regex.test(text)) {
      keywords.add(part)
    }
  }

  // 提取中文詞匯（簡單的分詞方式）
  const chinesePattern = /[\u4E00-\u9FA5]{2,}/g
  const chineseMatches = text.match(chinesePattern) || []
  chineseMatches.forEach(match => {
    if (match.length >= 2 && !match.match(/^(的|是|有|和|與|在|到|了|去|來|被|把|給|向|對|從|為|用|通過|由|因為|雖然|可是|而且|就是|或者|如果|那麼)$/)) {
      keywords.add(match)
    }
  })

  return Array.from(keywords).slice(0, 10) // 限制為前 10 個關鍵詞
}

// 執行
collectAISearchBaseline().catch(console.error)
