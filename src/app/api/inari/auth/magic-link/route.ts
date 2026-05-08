import { NextResponse } from 'next/server'
import { sendMagicLink } from '@/lib/inari-supabase'

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: '請輸入有效電郵' }, { status: 400 })
  }
  const { error } = await sendMagicLink(email.trim().toLowerCase())
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
