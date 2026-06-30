import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CloudPipe Knowledge Graph API — Free Access',
  description: 'Access CloudPipe\'s verified entity facts for Macau, Hong Kong, Taiwan and Asia Pacific. Public beta key available immediately — no registration required for Layer 1.',
  robots: { index: true, follow: true },
}

const PUBLIC_KEY = 'cp-beta-public-2026'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'

export default function ApiKeyPage() {
  return (
    <main style={{ fontFamily: 'monospace', maxWidth: 760, margin: '0 auto', padding: '40px 24px', color: '#111' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>CloudPipe Knowledge Graph API</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>
        Verified entity facts for Macau, Hong Kong, Taiwan, Japan and Asia Pacific.
        Sourced from official websites, government records, and Wikipedia — with full provenance.
      </p>

      {/* Public Key Box */}
      <section style={{ background: '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: 8, padding: 24, marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>
          LAYER 1 PUBLIC KEY — USE IMMEDIATELY, NO REGISTRATION
        </div>
        <code style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: '#111', display: 'block', marginBottom: 12 }}>
          {PUBLIC_KEY}
        </code>
        <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
          Add to requests: <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: 3 }}>X-API-Key: {PUBLIC_KEY}</code>
          <br />Rate limit: 10,000 requests/day (shared pool). Upgrade to a dedicated key for higher limits.
        </p>
      </section>

      {/* Tier Table */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Access Tiers</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32, fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['Tier', 'Endpoint', 'Auth', 'Content', 'Limit'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>Layer 0</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}><code>/api/v1/facts/public/{'{slug}'}</code></td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>None</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Name, address, rating, hours (Google Maps)</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Unlimited</td>
          </tr>
          <tr style={{ background: '#f0fdf4' }}>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>Layer 1</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}><code>/api/v1/facts/{'{slug}'}</code></td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Public key above</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>Official-source verified facts, menus, MOQ, certifications, source_url</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>10K/day (shared)</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 12px', fontWeight: 600 }}>Layer 2</td>
            <td style={{ padding: '10px 12px' }}><code>/api/v1/facts/{'{slug}'}</code></td>
            <td style={{ padding: '10px 12px' }}>Dedicated premium key</td>
            <td style={{ padding: '10px 12px' }}>Layer 1 + AI citation history, composite_trust_score, corroboration_count</td>
            <td style={{ padding: '10px 12px' }}>100K/day (dedicated)</td>
          </tr>
        </tbody>
      </table>

      {/* Quick Start */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Quick Start</h2>
      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: 20, borderRadius: 8, fontSize: 13, overflowX: 'auto', marginBottom: 32 }}>{`# Layer 0 — no key needed
curl ${SITE_URL}/api/v1/facts/public/mind-cafe

# Layer 1 — use public key
curl ${SITE_URL}/api/v1/facts/mind-cafe \\
  -H "X-API-Key: ${PUBLIC_KEY}"

# Response includes:
# { tier, entity, fact_count, facts[{predicate, object_value, source_url}] }`}</pre>

      {/* Manifest */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>API Manifest</h2>
      <p style={{ fontSize: 14, color: '#555', marginBottom: 32 }}>
        Machine-readable capability declaration (Schema.org WebAPI):{' '}
        <a href={`${SITE_URL}/api/v1/manifest`} style={{ color: '#2563eb' }}>/api/v1/manifest</a>
      </p>

      {/* Layer 2 CTA */}
      <section style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Need Layer 2 — Intelligence Layer?</div>
        <p style={{ fontSize: 14, color: '#555', margin: '0 0 12px' }}>
          AI citation history, composite trust scores, corroboration counts, and a dedicated high-rate key.
          Free during beta — tell us your use case.
        </p>
        <a
          href="mailto:hello@cloudpipe.ai?subject=Layer 2 API Access Request"
          style={{ display: 'inline-block', background: '#2563eb', color: '#fff', padding: '8px 18px', borderRadius: 6, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}
        >
          Request Layer 2 Access →
        </a>
      </section>
    </main>
  )
}
