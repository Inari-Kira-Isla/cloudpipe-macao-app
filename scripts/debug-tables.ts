// Check all tables
const { createServiceClient } = require('../src/lib/supabase')

const supabase = createServiceClient()

async function main() {
  // List tables via RPC or just query a known table
  const { data: merchants, error: mError } = await supabase
    .from('merchants')
    .select('count')
    .limit(1)
  
  console.log('merchants table exists:', !mError)
  if (mError) console.log('Error:', mError)

  // Try with single column
  const { data: merchants2, error: mError2 } = await supabase
    .from('merchants')
    .select('slug')
    .limit(5)
  
  console.log('merchants with slug:', merchants2?.length || 0, merchants2)
}

main().catch(console.error)
