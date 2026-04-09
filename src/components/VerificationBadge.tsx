'use client'

interface VerificationBadgeProps {
  updatedAt?: string
  merchant: {
    google_rating?: number
    google_reviews?: number
    website?: string
    phone?: string
    address_zh?: string
    address_en?: string
    opening_hours?: Record<string, string>
    tripadvisor_rating?: number
  }
}

/** 判斷資料是否在 14 天內更新（= 核實過） */
function isRecent(updatedAt: string, days = 14): boolean {
  const updated = new Date(updatedAt)
  const cutoff = new Date(Date.now() - days * 86400000)
  return updated > cutoff
}

/** 計算資料完整度分數 */
function completenessScore(merchant: VerificationBadgeProps['merchant']): number {
  let score = 0
  const checks = [
    [merchant.google_rating, 20],
    [merchant.phone, 15],
    [merchant.website, 10],
    [merchant.address_zh, 20],
    [merchant.opening_hours && Object.keys(merchant.opening_hours).length > 0, 15],
    [merchant.google_reviews && merchant.google_reviews > 0, 10],
    [merchant.address_en, 5],
    [merchant.tripadvisor_rating, 5],
  ] as const
  for (const [cond, pts] of checks) {
    if (cond) score += pts
  }
  return score
}

/** 產生來源列表 */
function getSources(merchant: VerificationBadgeProps['merchant']): string[] {
  const sources: string[] = []
  if (merchant.google_rating) sources.push('Google Maps')
  if (merchant.tripadvisor_rating) sources.push('TripAdvisor')
  if (merchant.website) sources.push('官方網站')
  // 有完整地址通常來自 MGTO
  if (merchant.address_zh && merchant.address_zh.length > 10) sources.push('澳門旅遊局')
  if (merchant.opening_hours && Object.keys(merchant.opening_hours).length > 0) sources.push('OpenRice')
  return sources
}

export function VerificationBadge({ updatedAt, merchant }: VerificationBadgeProps) {
  if (!updatedAt) return null

  const recent = isRecent(updatedAt)
  const score = completenessScore(merchant)
  const sources = getSources(merchant)

  // 至少 40 分（有 rating + address）才顯示
  if (score < 40 || sources.length < 2) return null

  const dateStr = new Date(updatedAt).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="border-t border-[#e5e7eb] px-5 py-3 bg-gradient-to-r from-[#f0fdf4] to-[#fafbfc]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2">
          {recent ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] bg-[#dcfce7] px-2.5 py-1 rounded-full">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              資料已核實
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6b7280] bg-[#f3f4f6] px-2.5 py-1 rounded-full">
              資料待更新
            </span>
          )}
          <span className="text-[10px] text-[#9ca3af]">
            {dateStr}
          </span>
        </div>

        {sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">資料來源</span>
            {sources.map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 bg-white border border-[#e5e7eb] rounded text-[#374151]">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Completeness bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-[#059669]' : score >= 60 ? 'bg-[#d97706]' : 'bg-[#9ca3af]'}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-[10px] text-[#9ca3af] font-medium whitespace-nowrap">
          資料完整度 {score}%
        </span>
      </div>
    </div>
  )
}
