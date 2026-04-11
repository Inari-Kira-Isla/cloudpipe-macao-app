/**
 * AI Search Baseline — 在多個 AI 搜尋平台上收集排名數據
 *
 * 用途：比對品牌在不同 AI 搜尋平台的排名位置
 * 平台：Gemini, GPT, Perplexity, Claude Search
 * 存儲：Supabase (ai_search_results) + 本地緩存
 */

export interface SearchResult {
  platform: 'gemini' | 'gpt' | 'perplexity' | 'claude'
  query: string
  brandName: string
  position: number // 在搜尋結果中的位置（1 = 最優先）
  mentioned: boolean // 是否在結果中被提及
  citationCount?: number // 被引用次數
  timestamp: string
}

export interface CompetitorSearchData {
  competitor: string
  platform: 'gemini' | 'gpt' | 'perplexity' | 'claude'
  averageRank: number // 平均排名
  citationScore: number // 0-100 引用力度
  visibility: number // 0-100 可見度
  lastUpdated: string
}

export interface AISearchBaseline {
  brandName: string
  category: string
  searchTerms: string[]
  results: {
    gemini: SearchResult[]
    gpt: SearchResult[]
    perplexity: SearchResult[]
    claude: SearchResult[]
  }
  competitorRankings: Record<string, CompetitorSearchData> // {competitorName: data}
  summary: {
    avgRankAllPlatforms: number
    bestPlatform: string
    worstPlatform: string
    overallScore: number // 0-100
  }
}

// 平台特定的選擇器和邏輯
export const PLATFORM_CONFIGS = {
  gemini: {
    url: 'https://gemini.google.com/app',
    searchInputSelector: '[placeholder*="Ask Gemini"], [placeholder*="輸入"]',
    resultsSelector: 'div[data-text-content]',
    delay: 3000,
  },
  gpt: {
    url: 'https://chatgpt.com',
    searchInputSelector: '[id*="prompt"], textarea',
    resultsSelector: 'div[class*="prose"]',
    delay: 3000,
  },
  perplexity: {
    url: 'https://www.perplexity.ai',
    searchInputSelector: 'textarea[placeholder*="Ask"], textarea',
    resultsSelector: 'div[class*="answer"]',
    delay: 2000,
  },
  claude: {
    url: 'https://claude.ai',
    searchInputSelector: 'textarea[placeholder*="Message"]',
    resultsSelector: 'div[class*="assistant"]',
    delay: 2000,
  },
}

// 計算排名權重（第1位權重最高）
export function calculateRankScore(position: number): number {
  if (position === 0) return 0 // 未提及
  if (position <= 3) return 100 // 前3位 100分
  if (position <= 5) return 80 // 4-5位 80分
  if (position <= 10) return 60 // 6-10位 60分
  return Math.max(20, 100 - (position * 5)) // 往後遞減
}

// 計算競品整體評分
export function calculateCompetitorScore(results: SearchResult[]): number {
  if (results.length === 0) return 0
  const scores = results.map(r => calculateRankScore(r.position))
  return Math.round(scores.reduce((a, b) => a + b, 0) / results.length)
}

// 佔有率計算（相對於最高分者）
export function calculateMarketShare(
  brandScore: number,
  allScores: number[]
): number {
  const total = allScores.reduce((a, b) => a + b, 0) || 1
  return Math.round((brandScore / total) * 100)
}
