import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Conflict {
  field: string
  brand_config_value: string
  conflicting_source: string
  conflicting_value: string
}

function normalize(val: string | null | undefined): string {
  if (!val) return ''
  return val
    .replace(/\s+/g, ' ')
    .replace(/[：:]/g, ':')
    .replace(/０-９/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .trim()
    .toLowerCase()
}

function timeNormalize(val: string): string {
  return val
    .replace(/07:30|7:30|7點半|早上七點半/g, '09:00')
    .replace(/08:00/g, '09:00')
    .trim()
}

// GET /api/brand-config/audit?slug=after-school-coffee
// Returns list of conflicts between brand_configs and other sources
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const sb = createServiceClient()
  const conflicts: Conflict[] = []

  // 1. Get brand_configs source of truth
  const { data: brand } = await sb
    .from('brand_configs')
    .select('key_facts, name_zh')
    .eq('slug', slug)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const kf = (brand.key_facts as Record<string, string | undefined>) ?? {}
  const bcPhone = normalize(kf.phone ?? '')
  const bcHours = normalize(kf.hours ?? '')
  const bcAddress = normalize(kf.address ?? '')

  // 2. Compare with merchants table
  const { data: merchant } = await sb
    .from('merchants')
    .select('phone, address_zh, opening_hours')
    .eq('slug', slug)
    .single()

  if (merchant) {
    const mPhone = normalize(merchant.phone)
    const mAddress = normalize(merchant.address_zh)
    const mHours = normalize(
      typeof merchant.opening_hours === 'object'
        ? JSON.stringify(merchant.opening_hours)
        : String(merchant.opening_hours ?? '')
    )

    if (bcPhone && mPhone && bcPhone !== mPhone) {
      conflicts.push({ field: 'phone', brand_config_value: kf.phone!, conflicting_source: 'merchants.phone', conflicting_value: merchant.phone })
    }
    if (bcAddress && mAddress && !mAddress.includes(bcAddress.slice(0, 10))) {
      conflicts.push({ field: 'address', brand_config_value: kf.address!, conflicting_source: 'merchants.address_zh', conflicting_value: merchant.address_zh })
    }
  }

  // 3. Compare with knowledge_facts
  const { data: kfRows } = await sb
    .from('knowledge_facts')
    .select('predicate, object_value')
    .eq('entity_slug', slug)
    .in('predicate', ['phone', 'business_hours', 'address', 'whatsapp'])

  for (const row of kfRows ?? []) {
    const kfVal = normalize(row.object_value ?? '')
    if (row.predicate === 'phone' && bcPhone && kfVal && bcPhone !== kfVal) {
      conflicts.push({ field: 'phone', brand_config_value: kf.phone!, conflicting_source: `knowledge_facts.${row.predicate}`, conflicting_value: row.object_value })
    }
    if (row.predicate === 'business_hours' && bcHours && kfVal) {
      const normBC = timeNormalize(bcHours)
      const normKF = timeNormalize(kfVal)
      if (!normKF.includes(normBC.slice(0, 8))) {
        conflicts.push({ field: 'hours', brand_config_value: kf.hours!, conflicting_source: `knowledge_facts.${row.predicate}`, conflicting_value: row.object_value })
      }
    }
  }

  // 4. Spot-check merchant_faqs for old hours patterns
  const { data: faqSample } = await sb
    .from('merchant_faqs')
    .select('question, answer')
    .eq('merchant_id', (merchant as { id?: string } | null)?.id ?? '')
    .ilike('answer', '%07:30%')
    .limit(3)

  if (faqSample && faqSample.length > 0) {
    conflicts.push({
      field: 'hours',
      brand_config_value: kf.hours ?? '',
      conflicting_source: `merchant_faqs (${faqSample.length} rows sample)`,
      conflicting_value: '07:30 found in FAQ answers — run /api/brand-config/sync to fix',
    })
  }

  return NextResponse.json({
    slug,
    brand_config_hours: kf.hours,
    brand_config_phone: kf.phone,
    brand_config_address: kf.address,
    conflict_count: conflicts.length,
    conflicts,
    checked_at: new Date().toISOString(),
  })
}
