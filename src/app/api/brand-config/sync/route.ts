import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_KEY = process.env.BRAND_ADMIN_KEY ?? process.env.ADMIN_KEY ?? ''
const BATCH_SIZE = 50

interface SyncTarget {
  table: string
  idField: string
  id: string | number
  oldValue: string
  newValue: string
}

// POST /api/brand-config/sync
// Body: { slug, field, new_value, dry_run: true/false }
// dry_run=true  → returns list of affected rows (no write)
// dry_run=false → applies changes in batches of 50
export async function POST(req: NextRequest) {
  if (!ADMIN_KEY || req.headers.get('x-admin-key') !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { slug: string; field: string; new_value: string; dry_run?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { slug, field, new_value, dry_run = true } = body
  if (!slug || !field || new_value === undefined) {
    return NextResponse.json({ error: 'slug, field, new_value required' }, { status: 400 })
  }

  const sb = createServiceClient()

  // 1. Get current brand value and merchant_id
  const { data: brand, error: brandErr } = await sb
    .from('brand_configs')
    .select('key_facts, updated_by')
    .eq('slug', slug)
    .single()

  if (brandErr || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const kf = (brand.key_facts as Record<string, string | undefined>) ?? {}
  const old_value = kf[field] ?? ''

  if (!old_value) {
    return NextResponse.json({
      dry_run,
      slug,
      field,
      old_value: null,
      new_value,
      message: 'No existing value to propagate from. Update brand_configs directly.',
      affected: [],
    })
  }

  // 2. Find affected rows in merchant_faqs
  const targets: SyncTarget[] = []

  // Get merchant_id from merchants table
  const { data: merchantRows } = await sb
    .from('merchants')
    .select('id')
    .eq('slug', slug)
    .limit(1)

  const merchantId = merchantRows?.[0]?.id

  if (merchantId) {
    // Scan merchant_faqs in batches
    let offset = 0
    while (true) {
      const { data: faqs, error: faqErr } = await sb
        .from('merchant_faqs')
        .select('id, answer')
        .eq('merchant_id', merchantId)
        .ilike('answer', `%${old_value}%`)
        .range(offset, offset + BATCH_SIZE - 1)

      if (faqErr || !faqs || faqs.length === 0) break

      for (const faq of faqs) {
        targets.push({
          table: 'merchant_faqs',
          idField: 'id',
          id: faq.id,
          oldValue: old_value,
          newValue: new_value,
        })
      }
      if (faqs.length < BATCH_SIZE) break
      offset += BATCH_SIZE
    }
  }

  // Scan knowledge_facts
  {
    let offset = 0
    while (true) {
      const { data: kfs, error: kfErr } = await sb
        .from('knowledge_facts')
        .select('id, object_value')
        .eq('entity_slug', slug)
        .ilike('object_value', `%${old_value}%`)
        .range(offset, offset + BATCH_SIZE - 1)

      if (kfErr || !kfs || kfs.length === 0) break

      for (const kf of kfs) {
        targets.push({
          table: 'knowledge_facts',
          idField: 'id',
          id: kf.id,
          oldValue: old_value,
          newValue: new_value,
        })
      }
      if (kfs.length < BATCH_SIZE) break
      offset += BATCH_SIZE
    }
  }

  if (dry_run) {
    return NextResponse.json({
      dry_run: true,
      slug,
      field,
      old_value,
      new_value,
      affected_count: targets.length,
      affected: targets.map(t => ({ table: t.table, id: t.id })),
      message: `Found ${targets.length} rows to update. Re-send with dry_run=false to apply.`,
    })
  }

  // 3. Apply changes in batches
  let applied = 0
  const errors: string[] = []

  // Group by table
  const byTable: Record<string, SyncTarget[]> = {}
  for (const t of targets) {
    byTable[t.table] = byTable[t.table] ?? []
    byTable[t.table].push(t)
  }

  for (const [table, rows] of Object.entries(byTable)) {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      for (const row of batch) {
        const newText = String(row.oldValue).split(old_value).join(new_value)
        const updateField = table === 'merchant_faqs' ? 'answer' : 'object_value'

        const { error } = await sb
          .from(table)
          .update({ [updateField]: newText })
          .eq(row.idField, row.id)

        if (error) {
          errors.push(`${table}#${row.id}: ${error.message}`)
        } else {
          applied++
        }
      }
    }
  }

  // Also update brand_configs key_facts
  const updatedKf = { ...(brand.key_facts as Record<string, unknown>), [field]: new_value }
  await sb.from('brand_configs').update({
    key_facts: updatedKf,
    updated_at: new Date().toISOString(),
    updated_by: 'sync-engine',
  }).eq('slug', slug)

  return NextResponse.json({
    dry_run: false,
    slug,
    field,
    old_value,
    new_value,
    applied,
    errors: errors.length > 0 ? errors : undefined,
    message: `Applied ${applied}/${targets.length} updates.${errors.length > 0 ? ` ${errors.length} errors.` : ''}`,
  })
}
