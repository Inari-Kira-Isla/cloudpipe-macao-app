/**
 * A/B 測試路由配置
 * 根據用戶特性或隨機算法分配 variant
 *
 * 可配置的分配方式：
 * 1. 隨機 (50/33/17%) — 均勻的 A/B/C 測試
 * 2. 用戶特性 — 根據 user_id/session_id/country 定向分配
 * 3. 時間 — 週期性輪轉
 * 4. 環境 — 基於查詢參數或 header
 */

// A/B 測試配置
const AB_TEST_CONFIG = {
  enabled: true, // 啟用 A/B 測試
  variants: {
    a: { weight: 0.5, label: 'PREMIUM高亮 (Baseline)', description: '強調中級商戶升級' },
    b: { weight: 0.2, label: 'ENTERPRISE突出', description: '針對企業客戶和投資者' },
    c: { weight: 0.3, label: '場景分組', description: '根據用戶身份分類定價' },
  },
  // 追蹤設置
  tracking: {
    enabled: true,
    gtag_event: 'pricing_variant_assigned',
    log_to_db: true,
  },
  // 控制器設置
  control: {
    baseline_variant: 'a', // 若實驗停止，使用此 variant
    cookie_name: 'cloudpipe_pricing_variant',
    cookie_duration_days: 30,
  }
}

/**
 * 確定用戶的 variant 分配
 *
 * 策略優先順序：
 * 1. URL 參數 (?variant=a) — 用於測試和手動分配
 * 2. Cookie — 保持用戶一致性（30天）
 * 3. 算法 — 基於用戶標識符的確定性哈希分配
 */
export function determineVariant(
  sessionId: string,
  userId?: string,
  urlVariant?: string,
  cookie?: string
): 'a' | 'b' | 'c' {
  // 1. URL 參數優先（用於測試）
  if (urlVariant && ['a', 'b', 'c'].includes(urlVariant)) {
    return urlVariant as 'a' | 'b' | 'c'
  }

  // 2. Cookie 優先（保持一致性）
  if (cookie && ['a', 'b', 'c'].includes(cookie)) {
    return cookie as 'a' | 'b' | 'c'
  }

  // 3. 算法分配（確定性，基於 sessionId/userId）
  const identifier = userId || sessionId
  const hash = hashCode(identifier)
  const rand = (Math.abs(hash) % 100) / 100

  let cumulative = 0
  for (const [variant, config] of Object.entries(AB_TEST_CONFIG.variants)) {
    cumulative += config.weight
    if (rand < cumulative) {
      return variant as 'a' | 'b' | 'c'
    }
  }

  return 'a' // fallback
}

/**
 * 簡單哈希函數（用於確定性分配）
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

/**
 * 記錄 variant 分配（選項）
 */
export async function logVariantAssignment(
  sessionId: string,
  variant: string,
  userId?: string,
  source?: string
) {
  if (!AB_TEST_CONFIG.tracking.log_to_db) return

  try {
    // 可選：發送到 Supabase 或分析服務
    console.log(`[AB Test] Variant: ${variant}, Session: ${sessionId}, Source: ${source}`)

    // 示例：發送到分析 API
    // await fetch('/api/v1/track-variant', {
    //   method: 'POST',
    //   body: JSON.stringify({ sessionId, variant, userId, source, timestamp: new Date() })
    // })
  } catch (error) {
    console.error('Failed to log variant assignment:', error)
  }
}

export { AB_TEST_CONFIG }
