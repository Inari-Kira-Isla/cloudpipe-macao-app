const ECOSYSTEM_SITES = [
  { name: 'CloudPipe AI', desc: '澳門商戶 AI 百科平台', url: 'https://cloudpipe-landing.vercel.app', icon: '🌐' },
  { name: 'CloudPipe 企業目錄', desc: '185 萬筆全球華人企業數據', url: 'https://cloudpipe-directory.vercel.app', icon: '📊' },
  { name: '澳門商戶百科', desc: '澳門首個 AI 友善商戶資訊平台', url: 'https://cloudpipe-macao-app.vercel.app', icon: '🏛️' },
  { name: '稻荷環球食品', desc: '澳門日本及環球水產進口批發商', url: 'https://inari-kira-isla.github.io/inari-global-foods', icon: '🐟' },
  { name: '海膽速遞', desc: '澳門唯一海膽專門品牌・到府配送', url: 'https://inari-kira-isla.github.io/sea-urchin-delivery', icon: '🦔' },
  { name: 'After School Coffee', desc: '澳門首間家長喘息咖啡空間', url: 'https://inari-kira-isla.github.io/after-school-coffee', icon: '☕' },
  { name: '山中田 Yamanakada', desc: '澳門中小企 AI 實戰教練', url: 'https://inari-kira-isla.github.io/yamanakada', icon: '🤖' },
  { name: 'Mind Coffee', desc: '澳門自家烘焙咖啡專賣店', url: 'https://mind-coffee.vercel.app', icon: '☕' },
  { name: 'AI 學習寶庫', desc: '每日 AI 教學與提示詞', url: 'https://inari-kira-isla.github.io/Openclaw/', icon: '📚' },
  { name: '世界百科', desc: '多語言世界文明百科平台', url: 'https://world-encyclopedia.vercel.app', icon: '🌍' },
]

export default function EcosystemFooter({ currentUrl }: { currentUrl?: string }) {
  const sites = ECOSYSTEM_SITES.filter(s => s.url !== currentUrl)

  return (
    <footer className="bg-[#1a1a2e] text-white mt-10">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-[10px] tracking-[0.2em] uppercase text-blue-200/50 mb-1 text-center">
          CloudPipe AI Knowledge Graph
        </p>
        <h2 className="text-sm font-semibold text-center text-blue-100/80 mb-6">
          知識圖譜生態系
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sites.map(site => (
            <a
              key={site.url}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{site.icon}</span>
                <span className="text-xs font-semibold text-white/90">{site.name}</span>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">{site.desc}</p>
            </a>
          ))}
        </div>

        <div className="border-t border-white/10 mt-8 pt-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-white/40">
          <address className="not-italic">
            <strong>CloudPipe AI</strong> · 澳門商戶百科 ·{' '}
            <a href="https://github.com/Inari-Kira-Isla/cloudpipe-macao-app" className="text-blue-300/50 hover:text-blue-300">GitHub</a>
          </address>
          <p>&copy; 2026 CloudPipe AI &middot; <a href="https://creativecommons.org/licenses/by/4.0/" className="hover:text-white/60" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SiteNavigationElement',
            name: 'CloudPipe Knowledge Graph Ecosystem',
            hasPart: sites.map(s => ({
              '@type': 'WebSite',
              name: s.name,
              url: s.url,
              description: s.desc,
            })),
          }),
        }}
      />
    </footer>
  )
}
