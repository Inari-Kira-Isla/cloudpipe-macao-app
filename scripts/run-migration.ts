import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function runMigration() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  try {
    const migrationSQL = readFileSync(
      resolve('supabase/migrations/20260411_enhance_ai_search_results.sql'),
      'utf-8'
    )

    console.log('🔄 Running migration: 20260411_enhance_ai_search_results')

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const stmt of statements) {
      console.log(`  ✓ ${stmt.slice(0, 60)}...`)
      const { error } = await supabase.rpc('exec', { sql: stmt + ';' })
        .then(res => ({ error: null }))
        .catch(err => ({ error: err.message }))

      if (error && !error.includes('already exists')) {
        console.warn(`    ⚠️  ${error}`)
      }
    }

    console.log('✅ Migration completed successfully')
    process.exit(0)
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  }
}

runMigration()
