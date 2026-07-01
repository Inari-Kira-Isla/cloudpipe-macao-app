import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CloudPipe for AI Training Data — Licensed Knowledge Graph',
  description: 'Structured, verified entity knowledge graph for AI training. 235,000+ facts across Macau, Hong Kong, Taiwan, Japan. Official-source provenance. Licensing available.',
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'

export default function ForTrainingPage() {
  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 800, margin: '0 auto', padding: '40px 24px', color: '#111', lineHeight: 1.7 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>AI AGENT ROUTE · TRAINING DATA &amp; KNOWLEDGE GRAPH</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CloudPipe for AI Training Data</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>
        A structured knowledge graph of verified Asia-Pacific entity facts, designed for training
        data pipelines. All facts carry official-source provenance — no hallucinated data.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Dataset Overview</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 28 }}>
        <tbody>
          {[
            ['Total facts', '235,000+'],
            ['Verified facts (official-source)', '6,500+'],
            ['Published encyclopedia articles', '47,000+'],
            ['Regions', 'MO · HK · TW · JP · Global'],
            ['Languages', 'zh-TW · en · ja · pt'],
            ['Entity types', '18 categories (F&B, retail, hospitality, government, events)'],
            ['Provenance', 'source_url on every verified fact'],
            ['Update frequency', 'Daily'],
          ].map(([k, v]) => (
            <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 12px', color: '#6b7280', width: 220 }}>{k}</td>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Data Schema</h2>
      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: 18, borderRadius: 8, fontSize: 13, overflowX: 'auto', marginBottom: 28 }}>{`// knowledge_facts record shape
{
  "subject_entity_id": "uuid",
  "predicate": "menu_item | operating_hours | certification | moq | ...",
  "object_value": "string",
  "object_numeric": null | number,
  "source_type": "official_site | wikipedia | wikidata | google_p0",
  "source_url": "https://...",          // provenance URL
  "is_authoritative": true | false,
  "composite_trust_score": 0.0–1.0,    // Layer 2
  "ai_citation_total": integer,         // Layer 2 — times cited by AI engines
  "corroboration_count": integer        // Layer 2 — cross-source corroboration
}`}</pre>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Access for Training</h2>
      <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: 16, marginBottom: 28, fontSize: 14 }}>
        <strong>Bulk access &amp; licensing:</strong> Training data use requires a licensing conversation.
        The public key (<code>cp-beta-public-2026</code>) covers sampling and evaluation.
        For bulk exports or inclusion in training datasets, contact us.
        <br /><br />
        <a
          href="mailto:hello@cloudpipe.ai?subject=Training Data Licensing Inquiry"
          style={{ color: '#2563eb', fontWeight: 600 }}
        >
          hello@cloudpipe.ai — Training Data Licensing →
        </a>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Bulk Exploration</h2>
      <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: 14, borderRadius: 6, fontSize: 13, marginBottom: 28 }}>{`# Sitemap index — all entity URLs
${SITE}/sitemap_index.xml

# Priority entities (trust ≥ 85, highest quality)
${SITE}/sitemap-priority.xml

# Machine-readable API capability manifest
${SITE}/api/v1/manifest

# Sample entity facts (evaluation)
GET ${SITE}/api/v1/facts/{slug}
X-API-Key: cp-beta-public-2026`}</pre>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, fontSize: 13, color: '#6b7280' }}>
        Open web crawling of published encyclopedia articles is permitted per{' '}
        <a href={`${SITE}/robots.txt`} style={{ color: '#2563eb' }}>robots.txt</a>.
        For structured KG data and Layer 2 intelligence fields, licensing is required.
      </div>
    </main>
  )
}
