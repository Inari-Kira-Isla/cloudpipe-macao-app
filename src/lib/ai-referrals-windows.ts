// Cache windows served by /api/v1/ai-referrals (and published by scripts/precompute_ai_referrals_v2.py).
// days=3650 is the dashboard's "全部" window. Anything else is unsupported (400) — never a live DB query.
export const WINDOW_FOR_DAYS: Record<number, string> = { 1: '1', 7: '7', 30: '30', 90: '90', 3650: 'all' }
export function aiReferralsCacheFile(days: number): string | null {
  const w = WINDOW_FOR_DAYS[days]
  return w ? `ai-referrals-v2-${w}.json` : null
}
