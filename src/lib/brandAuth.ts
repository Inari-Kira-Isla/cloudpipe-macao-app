import { createServiceClient } from './supabase'

export interface BrandSession {
  brand_slug: string
  email: string
}

// 驗證 Authorization: Bearer <token>，返回 BrandSession 或 null
export async function verifyBrandToken(authHeader: string | null): Promise<BrandSession | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  if (!token) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('brand_auth_tokens')
    .select('email, brand_slug, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!data) return null
  // 允許已使用的 token（用戶刷頁時 token 已 mark used_at，但 localStorage session 仍有效）
  // 只拒絕過期的 token
  if (new Date(data.expires_at) < new Date()) return null

  return { brand_slug: data.brand_slug, email: data.email }
}

// 從 NextRequest headers 提取並驗證
export async function getSessionFromRequest(request: Request): Promise<BrandSession | null> {
  return verifyBrandToken(request.headers.get('Authorization'))
}
