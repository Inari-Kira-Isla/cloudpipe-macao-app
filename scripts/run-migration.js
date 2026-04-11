require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔍 Checking credentials:');
console.log(`  URL: ${SUPABASE_URL ? '✓' : '✗'}`);
console.log(`  KEY: ${SUPABASE_KEY ? '✓' : '✗'}`);

async function runMigration() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const migrationSQL = fs.readFileSync(
      'supabase/migrations/20260411_enhance_ai_search_results.sql',
      'utf-8'
    );

    console.log('🔄 Running migration: 20260411_enhance_ai_search_results');
    console.log(`   SQL length: ${migrationSQL.length} bytes`);

    // Since we can't use exec, let's just acknowledge the migration exists
    console.log('✅ Migration file verified and ready');
    console.log('\n📝 Next steps:');
    console.log('   1. Copy the SQL from: supabase/migrations/20260411_enhance_ai_search_results.sql');
    console.log('   2. Open Supabase Console → SQL Editor');
    console.log('   3. Paste and execute the SQL');
    console.log('   4. Or run: npx supabase db push');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();
