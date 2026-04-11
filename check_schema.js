const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function test() {
  const testSlug = 'macau-restaurant-japanese-izakaya-taipa-氹仔日式居酒屋不完全指南';

  // Get all columns
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('slug', testSlug)
    .limit(1);

  if (data && data.length > 0) {
    const row = data[0];
    console.log('Actual columns in DB:');
    Object.keys(row).forEach(key => {
      const val = row[key];
      const valStr = typeof val === 'string' ? val.slice(0, 50) : String(val).slice(0, 50);
      console.log(`  ${key}: ${valStr}`);
    });
  } else {
    console.log('NO DATA FOUND!');
    if (error) console.log(`Error: ${error.message}`);
  }
}

test().catch(console.error);
