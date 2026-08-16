import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_SECRET = process.env.ASC_ADMIN_SECRET || 'asc2026admin'

// GET /api/afterschool/templates - List all available routine templates
export async function GET(req: NextRequest) {
  const isAdmin = req.headers.get('x-admin-secret') === ADMIN_SECRET
  
  const supabase = createServiceClient()
  
  // Get jobs that have routine_templates
  const { data, error } = await supabase
    .from('asc_content_jobs')
    .select('id,status,customer_name,style_pref,created_at,routine_templates')
    .not('routine_templates', 'eq', '[]')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten and format templates
  const templates = (data || [])
    .flatMap(job => {
      const jobTemplates = (job.routine_templates as unknown[]) || []
      return jobTemplates.map((t: unknown) => ({
        ...(t as object),
        source_job_id: job.id,
        source_job_status: job.status,
        source_customer_name: job.customer_name,
        source_created_at: job.created_at,
      }))
    })
    .sort((a: unknown, b: unknown) => {
      const dateA = new Date((a as { created_at?: string }).created_at || 0).getTime()
      const dateB = new Date((b as { created_at?: string }).created_at || 0).getTime()
      return dateB - dateA
    })

  return NextResponse.json({ templates })
}
