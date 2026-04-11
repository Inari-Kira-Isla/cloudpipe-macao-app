const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function test() {
  // Check exactly what's in DB for this slug
  const testSlug = 'macau-restaurant-japanese-izakaya-taipa-氹仔日式居酒屋不完全指南';

  const { data, error } = await supabase
    .from('insights')
    .select('slug, lang, status, title_zh, title_en, title_pt')
    .eq('slug', testSlug);

  console.log(`Query: eq('slug', '${testSlug}')\n`);
  console.log(`Results: ${data ? data.length + ' rows' : 'none'}`);

  if (data && data.length > 0) {
    data.forEach((row, i) => {
      console.log(`\n[${i}] lang="${row.lang}", status="${row.status}"`);
      console.log(`    title_en="${row.title_en}"`);
      console.log(`    title_zh="${row.title_zh}"`);
    });
  }

  if (error) {
    console.log(`Error: ${error.message}`);
  }
}

test().catch(console.error);
