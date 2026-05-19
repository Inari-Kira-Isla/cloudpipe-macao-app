import { NextRequest, NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/whatsapp'

// Internal API: proactively send a WhatsApp message
// Requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
// Used by: order confirmation daemons, Hermes jobs, manual broadcast
export async function POST(request: NextRequest) {
  // Simple bearer auth — reuses SUPABASE_SERVICE_ROLE_KEY as the internal secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let to: string | undefined
  let message: string | undefined
  try {
    const body = await request.json() as { to?: string; message?: string }
    to = body.to
    message = body.message
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!to || !message) {
    return NextResponse.json({ error: 'Missing required fields: to, message' }, { status: 400 })
  }

  const ok = await sendTextMessage(to, message)
  return NextResponse.json({ ok })
}
