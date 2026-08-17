import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface InsightRow {
  slug: string
  title: string | null
  trust_score: number | null
  verification_sources: unknown[] | null
  fact_check: unknown | null
  created_at: string
  updated_at: string
  content: string | null
}

function hasSchema(content: string | null): boolean {
  if (!content) return false
  return content.includes('application/ld+json') || content.includes('"@context"')
}

function hasFaq(content: string | null): boolean {
  if (!content) return false
  return content.toLowerCase().includes('faq')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const { data: insights, error } = await supabase
      .from('insights')
      .select('slug, title, trust_score, verification_sources, fact_check, created_at, updated_at, content')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to fetch insights:', error)
      return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
    }

    // Calculate originality scores for each insight
    const results = (insights || []).map((insight: InsightRow) => {
      const content = insight.content || ''
      const trustScore = insight.trust_score ?? 0
      const verificationSources = insight.verification_sources || []
      const factCheck = insight.fact_check as { score?: number; verified_count?: number; contested_count?: number } | null

      // Weights
      const WEIGHTS = {
        trust: 0.35,
        verification: 0.25,
        fact_check: 0.20,
        freshness: 0.10,
        uniqueness: 0.10
      }

      // 1. Trust Score (0-35 points)
      const trustPoints = (trustScore / 100) * WEIGHTS.trust * 100

      // 2. Verification Sources (0-25 points)
      let verificationPoints = 0
      for (const source of verificationSources as Array<{ type: string; confidence: number; verified_at?: string }>) {
        let sourcePoints = 10
        switch (source.type) {
          case 'google_places': sourcePoints += 5; break
          case 'manual_verification': sourcePoints += 8; break
          case 'official_website': sourcePoints += 7; break
          case 'social_media': sourcePoints += 3; break
          case 'third_party': sourcePoints += 2; break
          case 'ai_analysis': sourcePoints += 1; break
        }
        sourcePoints = sourcePoints * (source.confidence / 100)
        if (source.verified_at) {
          const daysSinceVerification = (Date.now() - new Date(source.verified_at).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceVerification < 30) sourcePoints *= 1.2
          else if (daysSinceVerification > 180) sourcePoints *= 0.7
        }
        verificationPoints += sourcePoints
      }
      verificationPoints = Math.min(verificationPoints, 25)

      // 3. Fact Check (0-20 points)
      let factCheckPoints = 0
      if (factCheck) {
        factCheckPoints = ((factCheck.score ?? 0) / 100) * WEIGHTS.fact_check * 100
        if ((factCheck.verified_count ?? 0) > 0) {
          factCheckPoints += Math.min((factCheck.verified_count ?? 0) * 2, 10)
        }
        if ((factCheck.contested_count ?? 0) > 0) {
          factCheckPoints -= (factCheck.contested_count ?? 0) * 3
        }
      }
      factCheckPoints = Math.max(0, Math.min(factCheckPoints, 20))

      // 4. Freshness (0-10 points)
      const daysSinceUpdate = (Date.now() - new Date(insight.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      let freshnessPoints = 1
      if (daysSinceUpdate <= 7) freshnessPoints = 10
      else if (daysSinceUpdate <= 30) freshnessPoints = 8
      else if (daysSinceUpdate <= 90) freshnessPoints = 5
      else if (daysSinceUpdate <= 180) freshnessPoints = 3

      // 5. Uniqueness (0-10 points)
      let uniquenessPoints = 5
      if (hasSchema(content)) uniquenessPoints += 2
      if (hasFaq(content)) uniquenessPoints += 2
      if (content.length > 2000) uniquenessPoints += 1
      uniquenessPoints = Math.min(uniquenessPoints, 10)

      // Total
      const totalScore = Math.round(trustPoints + verificationPoints + factCheckPoints + freshnessPoints + uniquenessPoints)

      // Grade
      let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F'
      if (totalScore >= 85) grade = 'A'
      else if (totalScore >= 75) grade = 'B'
      else if (totalScore >= 60) grade = 'C'
      else if (totalScore >= 40) grade = 'D'

      const citationWorthy = totalScore >= 60

      return {
        slug: insight.slug,
        title: insight.title,
        score: totalScore,
        grade,
        citation_worthy: citationWorthy,
        trust_score: insight.trust_score,
        verification_sources_count: verificationSources.length,
        has_schema: hasSchema(content),
        has_faq: hasFaq(content),
        fact_check_score: factCheck?.score ?? null,
        updated_at: insight.updated_at,
        breakdown: {
          trust: Math.round(trustPoints),
          verification: Math.round(verificationPoints),
          fact_check: Math.round(factCheckPoints),
          freshness: freshnessPoints,
          uniqueness: uniquenessPoints
        }
      }
    })

    // Calculate summary stats
    const total = results.length
    const citationWorthy = results.filter(r => r.citation_worthy).length
    const gradeA = results.filter(r => r.grade === 'A').length
    const gradeB = results.filter(r => r.grade === 'B').length
    const gradeC = results.filter(r => r.grade === 'C').length
    const gradeD = results.filter(r => r.grade === 'D').length
    const gradeF = results.filter(r => r.grade === 'F').length
    const avgScore = total > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / total) : 0

    return NextResponse.json({
      summary: {
        total,
        citation_worthy: citationWorthy,
        grade_distribution: { A: gradeA, B: gradeB, C: gradeC, D: gradeD, F: gradeF },
        avg_score: avgScore
      },
      insights: results
    })
  } catch (error) {
    console.error('Originality list API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
