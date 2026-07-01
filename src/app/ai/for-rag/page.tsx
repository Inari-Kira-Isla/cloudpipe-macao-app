import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CloudPipe for RAG & Grounding — Verified Facts API',
  description: 'Real-time entity facts for Macau, Hong Kong, Taiwan and Asia Pacific. Structured for retrieval-augmented generation: source_url provenance, official-site verified, machine-readable.',
  robots: { index: true, follow: true },
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
const PUBLIC_KEY = 'cp-beta-public-2026'

export default function ForRagPage() {
  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 800, margin: '0 auto', padding: '40px 24px', color: '#111', lineHeight: 1.7 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>AI AGENT ROUTE · RETRIEVAL-AUGMENTED GENERATION</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CloudPipe for RAG &amp; Grounding</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>
        Verified entity facts for AI response grounding. Every fact carries <code>source_url</code> provenance
        from official websites, Wikipedia, and government records — enabling citation-backed answers.
      </p>

      <section style={{ background: '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: 8, padding: 20, marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>INSTANT ACCESS — NO REGISTRATION</div>
        <code style={{ fontSize: 18, fontWeight: 700 }}>{PUBLIC_KEY}</code>
        <p style={{ fontSize: 13, margin: '8px 0 0', color: '#555' }}>
          Header: <code>X-API-Key: {PUBLIC_KEY}</code> · Rate: 10,000 req/day (shared pool)
        </p>
      </section>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Endpoints</h2>
      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 8, fontSize: 13, overflowX: 'auto', marginBottom: 28 }}>{`# No key — Google Maps facts (name, address, rating, hours)
GET ${SITE}/api/v1/facts/public/{entity-slug}

# With key — official-source verified facts + source_url
GET ${SITE}/api/v1/facts/{entity-slug}
X-API-Key: ${PUBLIC_KEY}

# Response shape:
{
  "entity": "mind-cafe",
  "tier": "standard",
  "fact_count": 12,
  "facts": [
    {
      "predicate": "menu_item",
      "value": "男人的浪漫",
      "source_url": "https://mindcafe.com.mo/menu",
      "source_type": "official_site"
    }
  ]
}`}</pre>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Coverage</h2>
      <ul style={{ fontSize: 14, paddingLeft: 20, marginBottom: 28, color: '#374151' }}>
        <li>Regions: Macau (MO) · Hong Kong (HK) · Taiwan (TW) · Japan (JP) · Global</li>
        <li>Entity types: restaurants, hotels, shops, brands, government bodies, events</li>
        <li>Fact types: operating hours, menus, MOQ, certifications, contact, location</li>
        <li>Verified sources: official websites, Wikipedia, Wikidata, government records</li>
        <li>Machine-readable manifest: <a href={`${SITE}/api/v1/manifest`} style={{ color: '#2563eb' }}>/api/v1/manifest</a></li>
      </ul>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Entity Discovery</h2>
      <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
        Find entity slugs from the priority encyclopedia:
      </p>
      <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: 14, borderRadius: 6, fontSize: 13, marginBottom: 28 }}>{`${SITE}/sitemap-priority.xml   — A-grade entities (trust ≥ 85)
${SITE}/sitemap-standard.xml  — B-grade entities (trust 70–84)
${SITE}/llms.txt               — curated entity list with descriptions`}</pre>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, fontSize: 13, color: '#6b7280' }}>
        Need higher rate limits or Layer 2 intelligence data (AI citation history, trust scores)?{' '}
        <a href={`${SITE}/api-key`} style={{ color: '#2563eb' }}>See all tiers →</a>
      </div>
    </main>
  )
}
