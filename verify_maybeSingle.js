const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function test() {
  const testSlug = 'macau-restaurant-japanese-izakaya-taipa-氹仔日式居酒屋不完全指南';
  const testLang = 'en';

  console.log(`Testing: slug="${testSlug}", lang="${testLang}"\n`);

  // Test 1: What maybeSingle() returns
  const { data: data1, error: error1 } = await supabase
    .from('insights')
    .select('*')
    .eq('slug', testSlug)
    .eq('lang', testLang)
    .eq('status', 'published')
    .maybeSingle();

  console.log('Test 1 - maybeSingle()');
  console.log(`  Error: ${error1 ? error1.message : 'none'}`);
  console.log(`  Data: ${data1 ? 'found' : 'null'}\n`);

  // Test 2: Using single() instead
  const { data: data2, error: error2 } = await supabase
    .from('insights')
    .select('*')
    .eq('slug', testSlug)
    .eq('lang', testLang)
    .eq('status', 'published')
    .single();

  console.log('Test 2 - single()');
  console.log(`  Error: ${error2 ? error2.message : 'none'}`);
  console.log(`  Data: ${data2 ? 'found' : 'null'}`);
  if (data2) {
    console.log(`    Title: ${data2.title_en}`);
    console.log(`    Lang: ${data2.lang}`);
  }
}

test().catch(console.error);
