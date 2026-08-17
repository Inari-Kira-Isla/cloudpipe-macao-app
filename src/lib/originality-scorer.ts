/**
 * originality-scorer.ts — 原創資訊識別機制
 * 
 * 識別「值得被引用」原創內容的演算法
 * 
 * 評估維度:
 *   1. Trust Score - 內容可信度
 *   2. Verification Sources - 來源驗證數量與品質
 *   3. Fact Check - 事實核查結果
 *   4. Content Freshness - 內容新舊
 *   5. Source Uniqueness - 來源是否原創/獨家
 */

import { createServiceClient } from './supabase'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ContentSource {
  type: 'google_places' | 'manual_verification' | 'official_website' | 'social_media' | 'third_party' | 'ai_analysis' | 'gov_portal' | 'gov_authority'
  url?: string
  verified_at?: string
  confidence: number // 0-100
}

export interface FactClaim {
  claim: string
  verified: boolean
  source?: string
}

export interface FactCheckResult {
  claims?: FactClaim[]
  verified_count?: number
  contested_count?: number
  score?: number // 0-100
  dimensions?: {
    authority?: number
    cross_ref?: number
    citation_hit?: number
    schema_complete?: number
  }
}

export interface OriginalitySignals {
  trust_score: number | null           // 0-100
  verification_sources: ContentSource[]
  fact_check: FactCheckResult | null
  created_at: string
  updated_at: string
  content_length: number
  has_schema: boolean
  has_faq: boolean
  is_exclusive: boolean                // 是否獨家內容
}

export interface OriginalityResult {
  score: number                        // 0-100 總分
  grade: 'A' | 'B' | 'C' | 'D' | 'F'  // 等級
  citation_worthy: boolean             // 是否值得引用
  signals: OriginalitySignals
  breakdown: {
    trust_weight: number
    verification_weight: number
    fact_check_weight: number
    freshness_weight: number
    uniqueness_weight: number
  }
  recommendations: string[]
}

// ── Weights Configuration ─────────────────────────────────────────────────

const WEIGHTS = {
  trust: 0.35,           // Trust Score 權重
  verification: 0.25,    // 驗證來源權重
  fact_check: 0.20,     // 事實核查權重
  freshness: 0.10,       // 新鮮度權重
  uniqueness: 0.10       // 獨家性權重
}

// ── Core Algorithm ───────────────────────────────────────────────────────

/**
 * 計算內容原創性分數
 */
export function calculateOriginalityScore(signals: OriginalitySignals): OriginalityResult {
  // 1. Trust Score (0-35 points)
  const trustScore = signals.trust_score ?? 0
  const trustPoints = (trustScore / 100) * WEIGHTS.trust * 100

  // 2. Verification Sources (0-25 points)
  const verificationPoints = calculateVerificationPoints(signals.verification_sources)

  // 3. Fact Check (0-20 points)
  const factCheckPoints = calculateFactCheckPoints(signals.fact_check)

  // 4. Freshness (0-10 points)
  const freshnessPoints = calculateFreshnessPoints(signals.updated_at)

  // 5. Uniqueness/Exclusivity (0-10 points)
  const uniquenessPoints = calculateUniquenessPoints(signals)

  // Calculate total
  const totalScore = Math.round(
    trustPoints + 
    verificationPoints + 
    factCheckPoints + 
    freshnessPoints + 
    uniquenessPoints
  )

  // Determine grade
  const grade = getGrade(totalScore)

  // Citation worthy threshold
  const citationWorthy = totalScore >= 60

  // Generate recommendations
  const recommendations = generateRecommendations(signals, totalScore)

  return {
    score: totalScore,
    grade,
    citation_worthy: citationWorthy,
    signals,
    breakdown: {
      trust_weight: Math.round(trustPoints),
      verification_weight: Math.round(verificationPoints),
      fact_check_weight: Math.round(factCheckPoints),
      freshness_weight: Math.round(freshnessPoints),
      uniqueness_weight: Math.round(uniquenessPoints)
    },
    recommendations
  }
}

/**
 * 計算驗證來源分數
 */
function calculateVerificationPoints(sources: ContentSource[]): number {
  if (!sources || sources.length === 0) return 0

  let points = 0
  
  for (const source of sources) {
    // 基礎分數
    let sourcePoints = 10
    
    // 根據來源類型加分
    switch (source.type) {
      case 'google_places':
        sourcePoints += 5  // Google 驗證最有公信力
        break
      case 'manual_verification':
        sourcePoints += 8  // 人工驗證高分
        break
      case 'official_website':
        sourcePoints += 7  // 官方網站
        break
      case 'social_media':
        sourcePoints += 3  // 社交媒體
        break
      case 'third_party':
        sourcePoints += 2  // 第三方來源
        break
      case 'ai_analysis':
        sourcePoints += 1  // AI 分析最低
        break
      case 'gov_portal':
        sourcePoints += 8  // 政府入口網站高分
        break
      case 'gov_authority':
        sourcePoints += 8  // 政府 authority 高分
        break
    }

    // 根據 confidence 調整 (預設為 100)
    sourcePoints = sourcePoints * ((source.confidence ?? 100) / 100)

    // 根據是否已驗證時間調整
    if (source.verified_at) {
      const daysSinceVerification = (Date.now() - new Date(source.verified_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceVerification < 30) {
        sourcePoints *= 1.2 // 30天內驗證加分
      } else if (daysSinceVerification > 180) {
        sourcePoints *= 0.7 // 過期來源扣分
      }
    }

    points += sourcePoints
  }

  // 上限 25 分
  return Math.min(points, 25)
}

/**
 * 計算事實核查分數
 */
function calculateFactCheckPoints(factCheck: FactCheckResult | null): number {
  if (!factCheck) return 0

  // 新格式: { dimensions: { authority, cross_ref, ... } }
  if (factCheck.dimensions && typeof factCheck.dimensions.authority === 'number') {
    const { authority, cross_ref, citation_hit, schema_complete } = factCheck.dimensions
    // authority 是主要分數 (权重 12/20)
    // cross_ref 增加公信力 (权重 4/20)
    // citation_hit 表示被引用 (权重 2/20)
    // schema_complete 表示結構化 (权重 2/20)
    const points = 
      (authority / 100) * 12 +
      Math.min(cross_ref, 10) * 0.4 +
      Math.min(citation_hit / 50, 1) * 2 +
      Math.min((schema_complete || 0) / 10, 1) * 2
    return Math.max(0, Math.min(points, 20))
  }

  // 舊格式: { score, verified_count, contested_count }
  // 檢查是否有有效的 fact_check 結構
  if (typeof factCheck.score !== 'number') return 0

  const { score, verified_count, contested_count } = factCheck

  // 基礎分數 = fact_check.score
  let points = (score / 100) * WEIGHTS.fact_check * 100

  // 已驗證聲明加分
  if (verified_count > 0) {
    points += Math.min(verified_count * 2, 10) // 最多加 10 分
  }

  // 有爭議聲明扣分
  if (contested_count > 0) {
    points -= contested_count * 3
  }

  return Math.max(0, Math.min(points, 20))
}

/**
 * 計算新鮮度分數
 */
function calculateFreshnessPoints(updatedAt: string): number {
  const now = new Date()
  const updated = new Date(updatedAt)
  const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)

  // 7天內 = 10分, 30天內 = 8分, 90天內 = 5分, 180天內 = 3分, 更久 = 1分
  if (daysSinceUpdate <= 7) return 10
  if (daysSinceUpdate <= 30) return 8
  if (daysSinceUpdate <= 90) return 5
  if (daysSinceUpdate <= 180) return 3
  return 1
}

/**
 * 計算獨家性分數
 */
function calculateUniquenessPoints(signals: OriginalitySignals): number {
  let points = 5 // 基礎分數

  // 有 Schema.org 結構化數據
  if (signals.has_schema) points += 2

  // 有 FAQ
  if (signals.has_faq) points += 2

  // 獨家內容
  if (signals.is_exclusive) points += 1

  // 內容長度（越長通常越詳細）
  if (signals.content_length > 2000) points += 1

  return Math.min(points, 10)
}

/**
 * 根據分數獲取等級
 */
function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

/**
 * 生成改善建議
 */
function generateRecommendations(signals: OriginalitySignals, score: number): string[] {
  const recommendations: string[] = []

  if (!signals.trust_score || signals.trust_score < 50) {
    recommendations.push('提高 trust_score：增加可驗證的事實聲明')
  }

  if (!signals.verification_sources || signals.verification_sources.length < 2) {
    recommendations.push('增加驗證來源：至少需要 2 個以上獨立來源')
  }

  if (!signals.fact_check) {
    recommendations.push('添加事實核查：對內容中的聲明進行驗證')
  }

  const daysSinceUpdate = (Date.now() - new Date(signals.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate > 90) {
    recommendations.push('更新內容：內容超過 90 天未更新')
  }

  if (!signals.has_schema) {
    recommendations.push('添加 Schema.org 結構化數據')
  }

  if (!signals.has_faq) {
    recommendations.push('添加 FAQ 區塊以增強 AI 引用可能性')
  }

  if (score >= 80) {
    recommendations.push('內容質量優秀，可作為 AI 引用的優先候選')
  }

  return recommendations
}

// ── Database Integration ────────────────────────────────────────────────

/**
 * 從資料庫獲取內容信號並計算原創性分數
 */
export async function scoreInsightOriginality(slug: string): Promise<OriginalityResult | null> {
  const supabase = createServiceClient()

  const { data: insight, error } = await supabase
    .from('insights')
    .select('slug, title, trust_score, verification_sources, fact_check, created_at, updated_at, content')
    .eq('slug', slug)
    .single()

  if (error || !insight) {
    console.error('Failed to fetch insight:', error)
    return null
  }

  // 檢測是否有 Schema 和 FAQ
  const content = insight.content || ''
  const hasSchema = content.includes('application/ld+json') || content.includes('"@context"')
  const hasFaq = content.includes('faq') || content.includes('FAQ')

  const signals: OriginalitySignals = {
    trust_score: insight.trust_score,
    verification_sources: insight.verification_sources || [],
    fact_check: insight.fact_check,
    created_at: insight.created_at,
    updated_at: insight.updated_at,
    content_length: content.length,
    has_schema: hasSchema,
    has_faq: hasFaq,
    is_exclusive: false
  }

  return calculateOriginalityScore(signals)
}

/**
 * 計算單一內容信號的原創性分數（不查庫）
 */
export function calculateFromSignals(signals: OriginalitySignals): OriginalityResult {
  return calculateOriginalityScore(signals)
}

/**
 * 批量計算多個內容的原創性分數
 */
export async function batchScoreInsights(slugs: string[]): Promise<Map<string, OriginalityResult>> {
  const supabase = createServiceClient()

  const { data: insights, error } = await supabase
    .from('insights')
    .select('slug, trust_score, verification_sources, fact_check, created_at, updated_at, content')
    .in('slug', slugs)

  if (error || !insights) {
    console.error('Failed to fetch insights:', error)
    return new Map()
  }

  const results = new Map<string, OriginalityResult>()

  for (const insight of insights) {
    const content = insight.content || ''
    const hasSchema = content.includes('application/ld+json') || content.includes('"@context"')
    const hasFaq = content.toLowerCase().includes('faq')

    const signals: OriginalitySignals = {
      trust_score: insight.trust_score,
      verification_sources: insight.verification_sources || [],
      fact_check: insight.fact_check,
      created_at: insight.created_at,
      updated_at: insight.updated_at,
      content_length: content.length,
      has_schema: hasSchema,
      has_faq: hasFaq,
      is_exclusive: false
    }

    results.set(insight.slug, calculateOriginalityScore(signals))
  }

  return results
}

/**
 * 獲取值得引用的內容列表（按原創性分數排序）
 */
export async function getCitationWorthyInsights(limit: number = 10): Promise<Array<{
  slug: string
  title: string
  originality_score: number
  grade: string
  citation_worthy: boolean
}>> {
  const supabase = createServiceClient()

  const { data: insights, error } = await supabase
    .from('insights')
    .select('slug, title, trust_score, verification_sources, fact_check, created_at, updated_at, content')
    .order('trust_score', { ascending: false })
    .limit(limit * 2)

  if (error || !insights) {
    console.error('Failed to fetch insights:', error)
    return []
  }

  const scored = insights.map(insight => {
    const content = insight.content || ''
    const signals: OriginalitySignals = {
      trust_score: insight.trust_score,
      verification_sources: insight.verification_sources || [],
      fact_check: insight.fact_check,
      created_at: insight.created_at,
      updated_at: insight.updated_at,
      content_length: content.length,
      has_schema: content.includes('application/ld+json') || content.includes('"@context"'),
      has_faq: content.toLowerCase().includes('faq'),
      is_exclusive: false
    }
    const result = calculateOriginalityScore(signals)
    return {
      slug: insight.slug,
      title: insight.title,
      originality_score: result.score,
      grade: result.grade,
      citation_worthy: result.citation_worthy
    }
  })

  // 過濾並返回值得引用的內容
  return scored
    .filter(i => i.citation_worthy)
    .sort((a, b) => b.originality_score - a.originality_score)
    .slice(0, limit)
}

// ── Export Configuration ───────────────────────────────────────────────

export const ORIGINALITY_CONFIG = {
  WEIGHTS,
  CITATION_THRESHOLD: 60,
  GRADE_THRESHOLDS: {
    A: 85,
    B: 75,
    C: 60,
    D: 40
  }
}
