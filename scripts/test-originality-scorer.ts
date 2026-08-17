/**
 * Test script for Originality Scorer
 * Run: npx tsx scripts/test-originality-scorer.ts
 */

import { scoreInsightOriginality, getCitationWorthyInsights } from '../src/lib/originality-scorer'

async function main() {
  console.log('=== Originality Scorer Test ===\n')

  // Test 1: Score a specific insight
  const testSlug = 'test-insight' // Replace with actual slug
  console.log(`Testing insight: ${testSlug}`)
  
  const result = await scoreInsightOriginality(testSlug)
  
  if (result) {
    console.log(`Score: ${result.score}/100`)
    console.log(`Grade: ${result.grade}`)
    console.log(`Citation Worthy: ${result.citation_worthy}`)
    console.log('Breakdown:', result.breakdown)
    console.log('Recommendations:', result.recommendations)
  } else {
    console.log('Insight not found (expected if test slug does not exist)')
  }

  // Test 2: Get citation worthy insights
  console.log('\n=== Citation Worthy Insights ===')
  const worthy = await getCitationWorthyInsights(5)
  console.log(`Found ${worthy.length} citation-worthy insights`)
  worthy.forEach((insight, i) => {
    console.log(`${i + 1}. ${insight.title} (${insight.originality_score}pts, ${insight.grade})`)
  })
}

main().catch(console.error)
