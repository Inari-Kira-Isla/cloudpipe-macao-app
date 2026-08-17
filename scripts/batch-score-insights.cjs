/**
 * Batch Score Insights Script
 * Run: node scripts/batch-score-insights.cjs
 */

const { readFileSync } = require('fs')
const { parse } = require('dotenv')

// Load env vars first
const envConfig = parse(readFileSync('.env.local'))
for (const key in envConfig) {
  process.env[key] = envConfig[key]
}

const { createServiceClient } = require('../src/lib/supabase')

// Import the scorer - need to use require for ESM interop
const { calculateOriginalityScore } = require('../src/lib/originality-scorer')

async function main() {
  const supabase = createServiceClient()

  console.log('=== Fetching all insights ===\n')

  // Fetch all insights with required fields
  const { data: insights, error } = await supabase
    .from('insights')
    .select('slug, title, trust_score, verification_sources, fact_check, created_at, updated_at, body_html, faqs')

  if (error) {
    console.error('Failed to fetch insights:', error)
    return
  }

  console.log(`Found ${insights?.length || 0} insights\n`)

  if (!insights || insights.length === 0) {
    console.log('No insights to score')
    return
  }

  // Score each insight
  const results = []

  for (const insight of insights) {
    const content = insight.body_html || ''
    const hasSchema = content.includes('application/ld+json') || content.includes('"@context"')
    const hasFaq = (insight.faqs && Array.isArray(insight.faqs) && insight.faqs.length > 0) || content.toLowerCase().includes('faq')

    const signals = {
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

    const result = calculateOriginalityScore(signals)

    results.push({
      slug: insight.slug,
      title: insight.title || insight.slug,
      score: result.score,
      grade: result.grade,
      citation_worthy: result.citation_worthy
    })

    // Update the insight with the score
    await supabase
      .from('insights')
      .update({
        originality_score: result.score,
        originality_grade: result.grade,
        citation_worthy: result.citation_worthy
      })
      .eq('slug', insight.slug)

    process.stdout.write('.')
  }

  console.log('\n')

  // Summary
  console.log('=== Scoring Complete ===\n')

  const citationWorthy = results.filter(r => r.citation_worthy)
  const byGrade = {
    A: results.filter(r => r.grade === 'A').length,
    B: results.filter(r => r.grade === 'B').length,
    C: results.filter(r => r.grade === 'C').length,
    D: results.filter(r => r.grade === 'D').length,
    F: results.filter(r => r.grade === 'F').length,
  }

  console.log(`Total: ${results.length}`)
  console.log(`Citation Worthy: ${citationWorthy.length}`)
  console.log(`Grades: A=${byGrade.A}, B=${byGrade.B}, C=${byGrade.C}, D=${byGrade.D}, F=${byGrade.F}\n`)

  // Show top 10
  console.log('=== Top 10 by Score ===')
  const sorted = [...results].sort((a, b) => b.score - a.score).slice(0, 10)
  sorted.forEach((r, i) => {
    console.log(`${i + 1}. [${r.grade}] ${r.score}pts - ${r.title?.substring(0, 60)}`)
  })

  // Show citation worthy
  console.log('\n=== Citation Worthy Insights ===')
  citationWorthy.forEach(r => {
    console.log(`★ [${r.grade}] ${r.score}pts - ${r.title?.substring(0, 60)}`)
  })
}

main().catch(console.error)
