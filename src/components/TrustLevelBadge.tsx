'use client'

/**
 * TrustLevelBadge — 用戶看得明的三級驗證標籤，直接對應 merchants.verification_status。
 * 唔用內部術語（verified/google_verified/unverified），一律用中文白話字眼。
 * 完整方法論見 /macao/about。
 *
 * 對應關係（2026-07-26 對照真實 DB 語義）：
 *   verification_status = 'verified'        → 已通過完整驗證管線（trust_score ≥ 70 + Google Places 核對）
 *   verification_status = 'google_verified' → 已比對 Google Places，尚未達完整驗證門檻
 *   其他（needs_review / low_confidence / unverified / null）→ 待驗證
 */
export function TrustLevelBadge({ status }: { status?: string | null }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] bg-[#dcfce7] px-2.5 py-1 rounded-full">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        已驗證
      </span>
    )
  }

  if (status === 'google_verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0f4c81] bg-[#e8f0fe] px-2.5 py-1 rounded-full">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1H12v2.85h5.35c-.25 1.4-1.5 4.1-5.35 4.1-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.8 0 3 .75 3.7 1.4l2.5-2.4C16.7 3.6 14.6 2.7 12 2.7 6.9 2.7 2.75 6.85 2.75 11.9s4.15 9.2 9.25 9.2c5.35 0 8.85-3.75 8.85-9.05 0-.6-.05-1.05-.15-1.95z"/></svg>
        Google 核實
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6b7280] bg-[#f3f4f6] px-2.5 py-1 rounded-full">
      待驗證
    </span>
  )
}
