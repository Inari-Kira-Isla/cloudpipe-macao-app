/**
 * Standalone test for Originality Algorithm (no DB required)
 * Run: npx tsx scripts/test-originality-standalone.ts
 */

// Types (duplicated to avoid import)
interface ContentSource {
  type: 'google_places' | 'manual_verification' | 'official_website' | 'social_media' | 'third_party' | 'ai_analysis' | 'gov_portal' | 'gov_authority'
  url?: string
  verified_at?: string
  confidence: number
}

interface FactCheckResult {
  score?: number
  verified_count?: number
  contested_count?: number
}

interface OriginalitySignals {
  trust_score: number | null
  verification_sources: ContentSource[]
  fact_check: FactCheckResult | null
  created_at: string
  updated_at: string
  content_length: number
  has_schema: boolean
  has_faq: boolean
  is_exclusive: boolean
}

interface OriginalityResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  citation_worthy: boolean
  breakdown: {
    trust_weight: number
    verification_weight: number
    fact_check_weight: number
    freshness_weight: number
    uniqueness_weight: number
  }
  recommendations: string[]
}

const WEIGHTS = {
  trust: 0.35,
  verification: 0.25,
  fact_check: 0.20,
  freshness: 0.10,
  uniqueness: 0.10
}

function calculateVerificationPoints(sources: ContentSource[]): number {
  if (!sources || sources.length === 0) return 0
  let points = 0
  for (const source of sources) {
    let sourcePoints = 10
    switch (source.type) {
      case 'google_places': sourcePoints += 5; break
      case 'manual_verification': sourcePoints += 8; break
      case 'official_website': sourcePoints += 7; break
      case 'social_media': sourcePoints += 3; break
      case 'third_party': sourcePoints += 2; break
      case 'ai_analysis': sourcePoints += 1; break
      case 'gov_portal': sourcePoints += 8; break
      case 'gov_authority': sourcePoints += 8; break
    }
    sourcePoints = sourcePoints * (source.confidence / 100)
    if (source.verified_at) {
      const daysSinceVerification = (Date.now() - new Date(source.verified_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceVerification < 30) sourcePoints *= 1.2
      else if (daysSinceVerification > 180) sourcePoints *= 0.7
    }
    points += sourcePoints
  }
  return Math.min(points, 25)
}

function calculateFactCheckPoints(factCheck: FactCheckResult | null): number {
  if (!factCheck) return 0
  let points = ((factCheck.score ?? 0) / 100) * WEIGHTS.fact_check * 100
  if ((factCheck.verified_count ?? 0) > 0) {
    points += Math.min((factCheck.verified_count ?? 0) * 2, 10)
  }
  if ((factCheck.contested_count ?? 0) > 0) {
    points -= (factCheck.contested_count ?? 0) * 3
  }
  return Math.max(0, Math.min(points, 20))
}

function calculateFreshnessPoints(updatedAt: string): number {
  const daysSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate <= 7) return 10
  if (daysSinceUpdate <= 30) return 8
  if (daysSinceUpdate <= 90) return 5
  if (daysSinceUpdate <= 180) return 3
  return 1
}

function calculateUniquenessPoints(signals: OriginalitySignals): number {
  let points = 5
  if (signals.has_schema) points += 2
  if (signals.has_faq) points += 2
  if (signals.is_exclusive) points += 1
  if (signals.content_length > 2000) points += 1
  return Math.min(points, 10)
}

function calculateOriginalityScore(signals: OriginalitySignals): OriginalityResult {
  const trustScore = signals.trust_score ?? 0
  const trustPoints = (trustScore / 100) * WEIGHTS.trust * 100
  const verificationPoints = calculateVerificationPoints(signals.verification_sources)
  const factCheckPoints = calculateFactCheckPoints(signals.fact_check)
  const freshnessPoints = calculateFreshnessPoints(signals.updated_at)
  const uniquenessPoints = calculateUniquenessPoints(signals)

  const totalScore = Math.round(trustPoints + verificationPoints + factCheckPoints + freshnessPoints + uniquenessPoints)

  // Grade thresholds
  const GRADE_THRESHOLDS = { A: 75, B: 65, C: 50, D: 35 }
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F'
  if (totalScore >= GRADE_THRESHOLDS.A) grade = 'A'
  else if (totalScore >= GRADE_THRESHOLDS.B) grade = 'B'
  else if (totalScore >= GRADE_THRESHOLDS.C) grade = 'C'
  else if (totalScore >= GRADE_THRESHOLDS.D) grade = 'D'

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

  return {
    score: totalScore,
    grade,
    citation_worthy: totalScore >= 60,
    breakdown: {
      trust_weight: Math.round(trustPoints),
      verification_weight: Math.round(verificationPoints),
      fact_check_weight: Math.round(factCheckPoints),
      freshness_weight: freshnessPoints,
      uniqueness_weight: uniquenessPoints
    },
    recommendations
  }
}

// Test Cases
console.log('=== Originality Algorithm Test Suite ===\n')

// Test 1: High Quality Content (should be A grade, citation worthy)
const highQuality: OriginalitySignals = {
  trust_score: 90,
  verification_sources: [
    { type: 'google_places', confidence: 95, verified_at: '2026-08-01' },
    { type: 'official_website', confidence: 90 }
  ],
  fact_check: { score: 85, verified_count: 5, contested_count: 0 },
  created_at: '2026-08-01',
  updated_at: '2026-08-15',
  content_length: 3000,
  has_schema: true,
  has_faq: true,
  is_exclusive: true
}

const result1 = calculateOriginalityScore(highQuality)
console.log('Test 1: High Quality Content')
console.log('  Score:', result1.score, '/ 100')
console.log('  Grade:', result1.grade)
console.log('  Citation Worthy:', result1.citation_worthy)
console.log('  Breakdown:', result1.breakdown)
console.log('  ✓ PASS:', result1.citation_worthy && result1.grade === 'A' ? 'YES' : 'NO')

// Test 2: Low Quality Content (should be F, not citation worthy)
const lowQuality: OriginalitySignals = {
  trust_score: 30,
  verification_sources: [],
  fact_check: null,
  created_at: '2025-01-01',
  updated_at: '2025-06-01',
  content_length: 500,
  has_schema: false,
  has_faq: false,
  is_exclusive: false
}

const result2 = calculateOriginalityScore(lowQuality)
console.log('\nTest 2: Low Quality Content')
console.log('  Score:', result2.score, '/ 100')
console.log('  Grade:', result2.grade)
console.log('  Citation Worthy:', result2.citation_worthy)
console.log('  Breakdown:', result2.breakdown)
console.log('  ✓ PASS:', !result2.citation_worthy && result2.grade === 'F' ? 'YES' : 'NO')

// Test 3: AI-Generated Content (should be low, not citation worthy)
const aiContent: OriginalitySignals = {
  trust_score: 50,
  verification_sources: [{ type: 'ai_analysis', confidence: 50 }],
  fact_check: { score: 40, verified_count: 0, contested_count: 0 },
  created_at: '2026-08-10',
  updated_at: '2026-08-10',
  content_length: 1500,
  has_schema: false,
  has_faq: false,
  is_exclusive: false
}

const result3 = calculateOriginalityScore(aiContent)
console.log('\nTest 3: AI-Generated Content')
console.log('  Score:', result3.score, '/ 100')
console.log('  Grade:', result3.grade)
console.log('  Citation Worthy:', result3.citation_worthy)
console.log('  Breakdown:', result3.breakdown)
console.log('  ✓ PASS:', !result3.citation_worthy ? 'YES' : 'NO')

// Test 4: Borderline (60 points = C grade, citation worthy)
const borderline: OriginalitySignals = {
  trust_score: 60,
  verification_sources: [{ type: 'third_party', confidence: 60 }],
  fact_check: { score: 50 },
  created_at: '2026-07-01',
  updated_at: '2026-08-01',
  content_length: 1000,
  has_schema: false,
  has_faq: false,
  is_exclusive: false
}

const result4 = calculateOriginalityScore(borderline)
console.log('\nTest 4: Borderline Content (60 points)')
console.log('  Score:', result4.score, '/ 100')
console.log('  Grade:', result4.grade)
console.log('  Citation Worthy:', result4.citation_worthy)
console.log('  Breakdown:', result4.breakdown)
console.log('  ✓ PASS:', result4.citation_worthy && result4.grade === 'C' ? 'YES' : 'NO')

console.log('\n=== All Tests Complete ===')
