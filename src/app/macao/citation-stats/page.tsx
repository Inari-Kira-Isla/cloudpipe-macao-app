import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Citation Statistics — CloudPipe 澳門百科',
  description: 'Track AI crawler citations and certification badge effectiveness',
  robots: 'noindex', // Private dashboard
}

interface CitationStats {
  total_today: number
  by_ai_model: Record<string, number>
  by_region: Record<string, number>
  by_source_type: Record<string, number>
  unique_merchants: number
  avg_confidence: number
}

async function getCitationStats(): Promise<CitationStats | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
    const response = await fetch(`${baseUrl}/api/v1/citation-track`, {
      next: { revalidate: 60 }, // Revalidate every minute
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.stats
  } catch (error) {
    console.error('Failed to fetch citation stats:', error)
    return null
  }
}

export default async function CitationStatsPage() {
  const stats = await getCitationStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold mb-2">📊 Citation Statistics</h1>
          <p className="text-blue-200">Real-time AI crawler activity & certification effectiveness</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {!stats ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-600">No citation data available yet. Data will appear as AI crawlers access the site.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="text-3xl font-bold text-blue-600">{stats.total_today}</div>
                <div className="text-sm text-gray-600 mt-1">Citations Today</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="text-3xl font-bold text-green-600">{stats.unique_merchants}</div>
                <div className="text-sm text-gray-600 mt-1">Unique Merchants</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="text-3xl font-bold text-amber-600">{(stats.avg_confidence * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-600 mt-1">Avg Confidence</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="text-3xl font-bold text-purple-600">{Object.keys(stats.by_ai_model).length}</div>
                <div className="text-sm text-gray-600 mt-1">AI Models</div>
              </div>
            </div>

            {/* By AI Model */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0f4c81] mb-4">Citations by AI Model</h2>
              <div className="space-y-2">
                {Object.entries(stats.by_ai_model)
                  .sort(([, a], [, b]) => b - a)
                  .map(([model, count]) => (
                    <div key={model} className="flex items-center justify-between">
                      <span className="font-medium text-[#1a1a2e] capitalize">{model}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-48 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full transition-all"
                            style={{
                              width: `${(count / stats.total_today) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* By Region */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0f4c81] mb-4">Citations by Region</h2>
              <div className="space-y-2">
                {Object.entries(stats.by_region)
                  .sort(([, a], [, b]) => b - a)
                  .map(([region, count]) => (
                    <div key={region} className="flex items-center justify-between">
                      <span className="font-medium text-[#1a1a2e] capitalize">
                        {region === 'macao' ? '🇲🇴 澳門' : region === 'hongkong' ? '🇭🇰 香港' : region === 'taiwan' ? '🇹🇼 台灣' : '🇯🇵 日本'}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-48 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-green-600 h-full transition-all"
                            style={{
                              width: `${(count / stats.total_today) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* By Source Type */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0f4c81] mb-4">Citations by Source Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(stats.by_source_type).map(([source, count]) => (
                  <div key={source} className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 capitalize">{source}</div>
                    <div className="text-2xl font-bold text-blue-600 mt-2">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-[#0f4c81] mb-4">📈 Insights</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ {stats.total_today > 0 ? '✅ Active citations detected today' : '⏳ Waiting for citation data'}</li>
                <li>✓ Average certification confidence: {(stats.avg_confidence * 100).toFixed(1)}%</li>
                <li>✓ {stats.unique_merchants} merchants being cited</li>
                <li>✓ Most popular AI model: {Object.entries(stats.by_ai_model).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 mt-10 text-sm text-gray-400">
          <p>Last updated: {new Date().toLocaleString('zh-TW')}</p>
          <p className="mt-1">Data refreshes every 60 seconds</p>
        </footer>
      </main>
    </div>
  )
}
