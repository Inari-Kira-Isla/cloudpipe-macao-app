import { NextRequest, NextResponse } from 'next/server'
import { parseWebhookPayload, markAsRead, sendTextMessage } from '@/lib/whatsapp'
import { generateWhatsAppReply } from '@/lib/whatsapp-rag'

// GET: Meta webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST: Receive messages from Meta
// Must return 200 quickly (within 5s) or Meta will retry
export async function POST(request: NextRequest) {
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    // Malformed payload — still return 200 to stop Meta retrying
  }

  if (body) {
    // Process async — do not await, keeps response time < 200ms
    processMessage(body).catch(err =>
      console.error('[whatsapp/webhook] processMessage error:', err)
    )
  }

  return NextResponse.json({ ok: true })
}

async function processMessage(body: unknown) {
  const message = parseWebhookPayload(body)
  if (!message) return

  // Only handle text messages
  if (message.type !== 'text' || !message.text) {
    // Optionally handle images/audio in future
    return
  }

  // 1. Mark message as read (shows double blue tick to sender)
  await markAsRead(message.id)

  // 2. Generate RAG reply via MiniMax + inari_catalog
  const reply = await generateWhatsAppReply(message.text, message.from)

  // 3. Send reply
  const sent = await sendTextMessage(message.from, reply)
  if (!sent) {
    console.error('[whatsapp/webhook] sendTextMessage failed for:', message.from)
  }
}
