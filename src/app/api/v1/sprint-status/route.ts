import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SPRINT_ID = 'inari-21day-2026-05-15'
const SPRINT_START = '2026-05-15'
const SPRINT_END = '2026-06-05'
const TOTAL_DAYS = 21

export async function GET() {
  try {
    const supabase = createServiceClient()

    // Fetch all sprint actions
    const { data: actions, error: actionsError } = await supabase
      .from('sprint_actions')
      .select('day, date, brand_slug, action_type, title_zh, title_en, status, insight_slug, milestone, completed_at, notes')
      .eq('sprint_id', SPRINT_ID)
      .order('day', { ascending: true })

    if (actionsError) throw actionsError

    // Fetch brand configs for mode/weight info
    const { data: brands, error: brandsError } = await supabase
      .from('brand_configs')
      .select('slug, name_zh, name_en, mode, weight_pct')

    if (brandsError) throw brandsError

    // Calculate current day based on today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sprintStart = new Date(SPRINT_START)
    sprintStart.setHours(0, 0, 0, 0)
    const daysSinceStart = Math.floor((today.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24))
    const currentDay = Math.max(1, Math.min(TOTAL_DAYS, daysSinceStart + 1))

    // Today's action
    const todayAction = actions?.find(a => a.day === currentDay) ?? null

    // Build brand summary
    const brandSummary: Record<string, {
      mode: string
      weight_pct: number
      name_zh: string
      name_en: string
      completed_days: number[]
      published_insights: string[]
      total_actions: number
    }> = {}

    for (const brand of (brands ?? [])) {
      const brandActions = actions?.filter(a => a.brand_slug === brand.slug) ?? []
      const completedActions = brandActions.filter(a => a.status === 'completed')
      brandSummary[brand.slug] = {
        mode: brand.mode,
        weight_pct: brand.weight_pct,
        name_zh: brand.name_zh,
        name_en: brand.name_en,
        completed_days: completedActions.map(a => a.day),
        published_insights: completedActions
          .filter(a => a.insight_slug)
          .map(a => a.insight_slug!),
        total_actions: brandActions.length,
      }
    }

    // Milestone results
    const milestoneActions = actions?.filter(a => a.milestone != null) ?? []
    const milestoneResults: Record<string, { day: number; status: string; date: string }> = {}
    for (const ma of milestoneActions) {
      milestoneResults[ma.milestone!] = {
        day: ma.day,
        status: ma.status,
        date: ma.date,
      }
    }

    // D7 stop-loss check (if D7 completed)
    const stopLossTriggered = false  // Will be set by kpi_probe in future

    return NextResponse.json({
      sprint_id: SPRINT_ID,
      sprint_start: SPRINT_START,
      sprint_end: SPRINT_END,
      current_day: currentDay,
      total_days: TOTAL_DAYS,
      days_completed: actions?.filter(a => a.status === 'completed').length ?? 0,
      days_remaining: TOTAL_DAYS - currentDay,
      today_action: todayAction,
      actions: actions ?? [],
      brands: brandSummary,
      milestone_results: milestoneResults,
      stop_loss_triggered: stopLossTriggered,
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[sprint-status]', error)
    return NextResponse.json(
      { error: 'Failed to fetch sprint status', detail: String(error) },
      { status: 500 }
    )
  }
}
