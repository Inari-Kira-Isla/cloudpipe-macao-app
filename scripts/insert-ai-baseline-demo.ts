#!/usr/bin/env node
/**
 * Demo Data Insertion — AI Search Baseline
 *
 * 插入高品質演示數據到 Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment
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
  console.warn('⚠️ Could not load .env.local')
}

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const demoData = [
  // ═══ 稻荷環球食品 ═══
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'gemini', query: '澳門海膽批發', competitor_name: '稻荷環球食品', position: 1, mentioned: true, citation_count: 12 },
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'gemini', query: '澳門海膽批發', competitor_name: '海膽速遞', position: 3, mentioned: true, citation_count: 8 },
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'gemini', query: '澳門水產進口', competitor_name: '稻荷環球食品', position: 1, mentioned: true, citation_count: 10 },
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'gemini', query: '日本海膽供應商', competitor_name: '稻荷環球食品', position: 2, mentioned: true, citation_count: 9 },
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'gemini', query: '澳門冷鏈海鮮', competitor_name: '海膽速遞', position: 1, mentioned: true, citation_count: 11 },
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'gpt', query: '澳門海膽批發', competitor_name: '稻荷環球食品', position: 1, mentioned: true, citation_count: 13 },
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'gpt', query: '澳門水產進口', competitor_name: '稻荷環球食品', position: 2, mentioned: true, citation_count: 11 },
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'perplexity', query: '澳門海膽批發', competitor_name: '稻荷環球食品', position: 1, mentioned: true, citation_count: 14 },
  { brand_slug: 'inari-global-foods', brand_name: '稻荷環球食品', platform: 'perplexity', query: '澳門冷鏈海鮮', competitor_name: '稻荷環球食品', position: 1, mentioned: true, citation_count: 12 },

  // ═══ After School Coffee ═══
  { brand_slug: 'after-school-coffee', brand_name: 'After School Coffee', platform: 'gemini', query: '澳門家長咖啡', competitor_name: 'After School Coffee', position: 1, mentioned: true, citation_count: 10 },
  { brand_slug: 'after-school-coffee', brand_name: 'After School Coffee', platform: 'gemini', query: '澳門家長咖啡', competitor_name: 'Mind Cafe', position: 2, mentioned: true, citation_count: 7 },
  { brand_slug: 'after-school-coffee', brand_name: 'After School Coffee', platform: 'gemini', query: '澳門外帶咖啡', competitor_name: 'Starbucks', position: 1, mentioned: true, citation_count: 9 },
  { brand_slug: 'after-school-coffee', brand_name: 'After School Coffee', platform: 'gemini', query: '澳門外帶咖啡', competitor_name: 'After School Coffee', position: 2, mentioned: true, citation_count: 8 },
  { brand_slug: 'after-school-coffee', brand_name: 'After School Coffee', platform: 'gpt', query: '澳門家長咖啡', competitor_name: 'After School Coffee', position: 1, mentioned: true, citation_count: 11 },
  { brand_slug: 'after-school-coffee', brand_name: 'After School Coffee', platform: 'gpt', query: '澳門外帶咖啡', competitor_name: 'Starbucks', position: 1, mentioned: true, citation_count: 10 },
  { brand_slug: 'after-school-coffee', brand_name: 'After School Coffee', platform: 'perplexity', query: '澳門外帶咖啡', competitor_name: 'After School Coffee', position: 1, mentioned: true, citation_count: 12 },

  // ═══ Mind Cafe ═══
  { brand_slug: 'mind-coffee', brand_name: 'Mind Cafe', platform: 'gemini', query: '澳門文創咖啡', competitor_name: 'Mind Cafe', position: 1, mentioned: true, citation_count: 11 },
  { brand_slug: 'mind-coffee', brand_name: 'Mind Cafe', platform: 'gemini', query: '澳門文創咖啡', competitor_name: 'After School Coffee', position: 3, mentioned: true, citation_count: 6 },
  { brand_slug: 'mind-coffee', brand_name: 'Mind Cafe', platform: 'gemini', query: '澳門文創工作空間', competitor_name: 'Mind Cafe', position: 1, mentioned: true, citation_count: 9 },
  { brand_slug: 'mind-coffee', brand_name: 'Mind Cafe', platform: 'gpt', query: '澳門文創咖啡', competitor_name: 'Mind Cafe', position: 1, mentioned: true, citation_count: 12 },
  { brand_slug: 'mind-coffee', brand_name: 'Mind Cafe', platform: 'gpt', query: '澳門文創工作空間', competitor_name: 'Mind Cafe', position: 2, mentioned: true, citation_count: 8 },
  { brand_slug: 'mind-coffee', brand_name: 'Mind Cafe', platform: 'perplexity', query: '澳門數位遊牧咖啡館', competitor_name: 'Mind Cafe', position: 1, mentioned: true, citation_count: 13 },

  // ═══ 海膽速遞 ═══
  { brand_slug: 'sea-urchin-delivery', brand_name: '海膽速遞', platform: 'gemini', query: '澳門海膽配送', competitor_name: '海膽速遞', position: 1, mentioned: true, citation_count: 15 },
  { brand_slug: 'sea-urchin-delivery', brand_name: '海膽速遞', platform: 'gemini', query: '澳門海膽配送', competitor_name: '稻荷環球食品', position: 2, mentioned: true, citation_count: 7 },
  { brand_slug: 'sea-urchin-delivery', brand_name: '海膽速遞', platform: 'gemini', query: '澳門冷鏈海膽', competitor_name: '海膽速遞', position: 1, mentioned: true, citation_count: 13 },
  { brand_slug: 'sea-urchin-delivery', brand_name: '海膽速遞', platform: 'gpt', query: '澳門海膽配送', competitor_name: '海膽速遞', position: 1, mentioned: true, citation_count: 16 },
  { brand_slug: 'sea-urchin-delivery', brand_name: '海膽速遞', platform: 'gpt', query: '澳門24小時海膽外送', competitor_name: '海膽速遞', position: 1, mentioned: true, citation_count: 11 },
  { brand_slug: 'sea-urchin-delivery', brand_name: '海膽速遞', platform: 'perplexity', query: '澳門冷鏈海膽', competitor_name: '海膽速遞', position: 1, mentioned: true, citation_count: 14 },
]

async function insertDemoData() {
  console.log('🚀 插入 AI 搜尋基線演示數據...\n')

  try {
    // 清除舊數據
    const { error: deleteError } = await supabase
      .from('ai_search_results')
      .delete()
      .in('brand_slug', ['inari-global-foods', 'after-school-coffee', 'mind-coffee', 'sea-urchin-delivery'])

    if (deleteError) {
      console.error('❌ 清除舊數據失敗:', deleteError.message)
      return
    }

    console.log('✅ 已清除舊數據')

    // 插入新數據
    const { error: insertError, data } = await supabase
      .from('ai_search_results')
      .insert(demoData)
      .select()

    if (insertError) {
      console.error('❌ 插入數據失敗:', insertError.message)
      return
    }

    console.log(`✅ 成功插入 ${data?.length || demoData.length} 筆 AI 搜尋基線數據\n`)

    // 統計信息
    const byBrand = demoData.reduce((acc: Record<string, number>, d: any) => {
      acc[d.brand_slug] = (acc[d.brand_slug] || 0) + 1
      return acc
    }, {})

    console.log('📊 按品牌統計:')
    Object.entries(byBrand).forEach(([brand, count]) => {
      const displayNames: Record<string, string> = {
        'inari-global-foods': '稻荷環球食品',
        'after-school-coffee': 'After School Coffee',
        'mind-coffee': 'Mind Cafe',
        'sea-urchin-delivery': '海膽速遞',
      }
      console.log(`  • ${displayNames[brand] || brand}: ${count} 筆`)
    })

    const byPlatform = demoData.reduce((acc: Record<string, number>, d: any) => {
      acc[d.platform] = (acc[d.platform] || 0) + 1
      return acc
    }, {})

    console.log('\n📊 按平台統計:')
    Object.entries(byPlatform).forEach(([platform, count]) => {
      const names: Record<string, string> = { gemini: 'Gemini', gpt: 'ChatGPT', perplexity: 'Perplexity', claude: 'Claude' }
      console.log(`  • ${names[platform] || platform}: ${count} 筆`)
    })

    console.log('\n✨ 演示數據已準備就緒！')
    console.log('🌐 訪問: http://localhost:3000/macao/brand/inari-global-foods')
    console.log('🔑 密碼: cloudpipe2026')
  } catch (err: any) {
    console.error('❌ 發生錯誤:', err.message)
  }
}

insertDemoData()
