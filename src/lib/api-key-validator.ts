import { createServiceClient } from '@/lib/supabase'

export type ApiTier = 'standard' | 'premium'

export interface ApiKeyResult {
  valid: boolean
  tier?: ApiTier
  error?: string
  status?: number
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function validateApiKey(key: string | null): Promise<ApiKeyResult> {
  if (!key) {
    return { valid: false, error: 'Missing X-API-Key header', status: 401 }
  }

  const hash = await sha256Hex(key)
  const db = createServiceClient()

  const { data, error } = await db
    .from('api_keys')
    .select('id, tier, active, calls_today, rate_limit_per_day, last_reset_date')
    .eq('key_hash', hash)
    .single()

  if (error || !data) {
    return { valid: false, error: 'Invalid API key', status: 401 }
  }

  if (!data.active) {
    return { valid: false, error: 'API key disabled', status: 403 }
  }

  // Reset daily counter if new day
  const today = new Date().toISOString().split('T')[0]
  if (data.last_reset_date !== today) {
    await db.from('api_keys').update({
      calls_today: 1,
      last_reset_date: today,
      updated_at: new Date().toISOString()
    }).eq('id', data.id)
  } else {
    // Check rate limit
    if (data.calls_today >= data.rate_limit_per_day) {
      return { valid: false, error: 'Rate limit exceeded', status: 429 }
    }
    // Increment counter (fire and forget)
    db.from('api_keys').update({
      calls_today: data.calls_today + 1,
      calls_total: (data.calls_total || 0) + 1,
      updated_at: new Date().toISOString()
    }).eq('id', data.id).then(() => {})
  }

  return { valid: true, tier: data.tier as ApiTier }
}
