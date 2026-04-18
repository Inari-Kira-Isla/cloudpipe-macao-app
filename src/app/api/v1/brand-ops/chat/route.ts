import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function buildBrandContext(supabase: ReturnType<typeof createServiceClient>, slug: string) {
  const [knowledgeRes, postsRes, planRes] = await Promise.all([
    supabase
      .from('brand_ops_knowledge')
      .select('category, title, content')
      .eq('brand_slug', slug)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(20),
    supabase
      .from('brand_ops_posts_cache')
      .select('content, hook_type, published_at, likes, comments, reach')
      .eq('brand_slug', slug)
      .order('published_at', { ascending: false })
      .limit(5),
    supabase
      .from('brand_ops_content_plan')
      .select('commercial_goal, content_pillars, avoid_topics, next_focus')
      .eq('brand_slug', slug)
      .single(),
  ])

  const knowledge = knowledgeRes.data || []
  const posts = postsRes.data || []
  const plan = planRes.data

  let ctx = `你是 ${slug} 品牌的 AI 顧問。以下是品牌最新資料：\n\n`

  if (plan) {
    ctx += `【商業目標】\n${plan.commercial_goal || '未設定'}\n`
    ctx += `【下週焦點】\n${plan.next_focus || '未設定'}\n`
    if (plan.content_pillars?.length) ctx += `【內容支柱】\n${plan.content_pillars.join(' / ')}\n`
    if (plan.avoid_topics?.length) ctx += `【禁止主題】\n${plan.avoid_topics.join(', ')}\n`
    ctx += '\n'
  }

  if (knowledge.length > 0) {
    ctx += `【品牌知識庫（${knowledge.length} 條）】\n`
    for (const k of knowledge) {
      ctx += `▸ [${k.category}] ${k.title}：${k.content.slice(0, 300)}${k.content.length > 300 ? '…' : ''}\n`
    }
    ctx += '\n'
  }

  if (posts.length > 0) {
    ctx += `【近期發文表現（最新 ${posts.length} 篇）】\n`
    for (const p of posts) {
      const date = p.published_at ? p.published_at.slice(0, 10) : '未知'
      ctx += `▸ ${date} [${p.hook_type || '—'}] 讚:${p.likes} 留言:${p.comments} 觸及:${p.reach}\n`
      ctx += `  "${p.content.slice(0, 150)}${p.content.length > 150 ? '…' : ''}"\n`
    }
    ctx += '\n'
  }

  return ctx
}

export async function POST(req: NextRequest) {
  try {
    const { slug, messages } = await req.json()
    if (!slug || !messages?.length) {
      return NextResponse.json({ error: 'slug and messages required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const brandContext = await buildBrandContext(supabase, slug)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `${brandContext}
你的職責：
1. 根據品牌知識庫回答問題，提供準確的品牌資訊
2. 分析發文表現，找出高效 hook type 和內容模式
3. 結合商業目標提供內容策略建議
4. 用繁體中文回答，語氣專業但貼地（廣東話日常用語）
5. 回答簡潔，重點突出，適當用條列式

如果問題超出品牌範疇，誠實說明。`,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply: text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
