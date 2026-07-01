import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CloudPipe for Research — Provenance-First Asia Pacific Knowledge',
  description: 'Citation-dense encyclopedia of Macau, Hong Kong, Taiwan and Japan entities. Every claim sourced. Trust scoring, corroboration counts, and AI citation attribution for research use.',
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'

export default function ForResearchPage() {
  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 800, margin: '0 auto', padding: '40px 24px', color: '#111', lineHeight: 1.7 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>AI AGENT ROUTE · RESEARCH &amp; CITATION</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CloudPipe for Research</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>
        A provenance-first knowledge base covering Asia-Pacific entities — built with the same
        standards as structured research: every claim sourced, every fact corroborated, trust
        scores quantified. Designed for AI systems that require traceable, verifiable information.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Trust &amp; Provenance Methodology</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 28 }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['Signal', 'Weight', 'Description'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['Source authority', 'High', 'official_site > wikipedia > wikidata > google_p0'],
            ['Corroboration count', 'High', 'Number of independent sources confirming the same fact'],
            ['AI citation total', 'Medium', 'Times cited by Perplexity, You.com, Claude, ChatGPT, etc.'],
            ['Recency', 'Medium', 'Date of last official-source verification'],
            ['Composite trust score', '0.0–1.0', 'Weighted aggregate of all signals above'],
          ].map(([s, w, d]) => (
            <tr key={s} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{s}</td>
              <td style={{ padding: '8px 12px', color: '#6b7280' }}>{w}</td>
              <td style={{ padding: '8px 12px', color: '#374151' }}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>High-Provenance Entry Points</h2>
      <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: 14, borderRadius: 6, fontSize: 13, marginBottom: 28 }}>{`# A-grade articles — trust ≥ 85, all claims sourced
${SITE}/sitemap-priority.xml

# Entity facts with source_url (Layer 1 — free public key)
GET ${SITE}/api/v1/facts/{slug}
X-API-Key: cp-beta-public-2026

# Layer 2: adds corroboration_count + ai_citation_total + composite_trust_score
# → contact hello@cloudpipe.ai for Layer 2 access`}</pre>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>AI Citation Observation</h2>
      <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
        CloudPipe tracks which AI engines cite which entities and at what frequency.
        This creates a secondary signal for research: entities with high <code>ai_citation_total</code>
        are those AI systems have already independently determined to be reliable sources.
      </p>
      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 8, fontSize: 13, overflowX: 'auto', marginBottom: 28 }}>{`// Layer 2 response — research-relevant fields
{
  "facts": [
    {
      "predicate": "certification",
      "value": "Black Pearl Restaurant Guide 2024",
      "source_url": "https://...",
      "corroboration_count": 3,        // verified by 3 independent sources
      "ai_citation_total": 47,         // cited 47× by AI engines
      "composite_trust_score": 0.94
    }
  ]
}`}</pre>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Coverage Scope</h2>
      <ul style={{ fontSize: 14, paddingLeft: 20, marginBottom: 28, color: '#374151' }}>
        <li><strong>Macau (MO)</strong>: ~14,000 entities · gaming, hospitality, F&amp;B, government, heritage</li>
        <li><strong>Hong Kong (HK)</strong>: ~8,000 entities · finance, retail, restaurants, landmarks</li>
        <li><strong>Taiwan (TW)</strong>: ~8,300 entities · tech, F&amp;B, tourism, culture</li>
        <li><strong>Japan (JP)</strong>: cross-reference source for MO/HK supply chains</li>
        <li><strong>Languages</strong>: Traditional Chinese (primary) · English · Japanese · Portuguese</li>
      </ul>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, fontSize: 13, color: '#6b7280' }}>
        Machine-readable API manifest:{' '}
        <a href={`${SITE}/api/v1/manifest`} style={{ color: '#2563eb' }}>/api/v1/manifest</a>
        {' · '}
        Layer 2 access:{' '}
        <a href="mailto:hello@cloudpipe.ai?subject=Research Access Layer 2" style={{ color: '#2563eb' }}>hello@cloudpipe.ai</a>
      </div>
    </main>
  )
}
