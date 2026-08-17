// Quick check script
const { createServiceClient } = require('../src/lib/supabase')
const { calculateOriginalityScore } = require('../src/lib/originality-scorer')

const supabase = createServiceClient()

async function main() {
  const { data: insights, error } = await supabase
    .from('insights')
    .select('slug, title, trust_score, verification_sources, fact_check, created_at, updated_at, body_html, faqs')

  console.log('Found:', insights?.length || 0, 'insights')

  if (!insights || insights.length === 0) {
    console.log('No insights')
    process.exit(0)
  }

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
      title: insight.title, 
      score: result.score, 
      grade: result.grade, 
      breakdown: result.breakdown,
      signals: {
        trust_score: insight.trust_score,
        verification_sources: insight.verification_sources?.length || 0,
        fact_check: insight.fact_check ? 'yes' : 'no',
        has_schema: hasSchema,
        has_faq: hasFaq,
        content_length: content.length
      }
    })
  }

  const sorted = [...results].sort((a, b) => b.score - a.score).slice(0, 15)
  console.log('\nTop 15:')
  sorted.forEach((r, i) => {
    console.log(`${i+1}. [${r.grade}] ${r.score}pts - ${(r.title || r.slug)?.substring(0, 50)}`)
    console.log(`   breakdown: trust=${r.breakdown.trust_weight}, verif=${r.breakdown.verification_weight}, fact=${r.breakdown.fact_check_weight}, fresh=${r.breakdown.freshness_weight}, uniq=${r.breakdown.uniqueness_weight}`)
    console.log(`   signals: trust=${r.signals.trust_score}, verif_srcs=${r.signals.verification_sources}, fact_check=${r.signals.fact_check}, schema=${r.signals.has_schema}, faq=${r.signals.has_faq}`)
  })

  const byGrade = { A:0, B:0, C:0, D:0, F:0 }
  results.forEach(r => byGrade[r.grade]++)
  console.log('\nGrades:', byGrade)
  
  // Calculate average breakdown
  const avgBreakdown = { trust: 0, verif: 0, fact: 0, fresh: 0, uniq: 0 }
  results.forEach(r => {
    avgBreakdown.trust += r.breakdown.trust_weight
    avgBreakdown.verif += r.breakdown.verification_weight
    avgBreakdown.fact += r.breakdown.fact_check_weight
    avgBreakdown.fresh += r.breakdown.freshness_weight
    avgBreakdown.uniq += r.breakdown.uniqueness_weight
  })
  const n = results.length
  console.log('\nAvg breakdown:', {
    trust: Math.round(avgBreakdown.trust / n),
    verif: Math.round(avgBreakdown.verif / n),
    fact: Math.round(avgBreakdown.fact / n),
    fresh: Math.round(avgBreakdown.fresh / n),
    uniq: Math.round(avgBreakdown.uniq / n)
  })
}

main().catch(console.error)
