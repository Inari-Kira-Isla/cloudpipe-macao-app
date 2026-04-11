const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function checkVariants() {
  // The issue is clear: we have slugs WITHOUT the Chinese part
  const shortSlugs = [
    'macau-restaurant-japanese-izakaya-taipa',
    'macau-restaurant-japanese-izakaya-macau-peninsula'
  ];

  console.log('=== CHECKING PROBLEMATIC INSIGHTS ===\n');

  for (const slug of shortSlugs) {
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published');

    if (error) {
      console.log(`Error for "${slug}": ${error.message}`);
      continue;
    }

    console.log(`\n--- Insights matching "${slug}" ---`);
    if (!data || data.length === 0) {
      console.log('  NO RESULTS');
    } else {
      data.forEach((ins, i) => {
        console.log(`  [${i}] slug="${ins.slug}"`);
        console.log(`      title_zh="${ins.title_zh}"`);
        console.log(`      lang="${ins.lang}"`);
        console.log(`      status="${ins.status}"`);
      });
    }
  }

  // Check for ALL insights with Chinese in slug that start with "macau"
  console.log('\n\n=== ALL MACAU INSIGHTS WITH CHINESE IN SLUG ===');
  const { data: allMacau } = await supabase
    .from('insights')
    .select('slug, title_zh, lang, status')
    .eq('status', 'published')
    .like('slug', 'macau-%');

  if (allMacau) {
    const withChinese = allMacau.filter(ins => /[\u4E00-\u9FFF]/.test(ins.slug));
    console.log(`Found ${withChinese.length} MACAU insights with Chinese in slug\n`);
    withChinese.forEach(ins => {
      console.log(`  ${ins.slug}`);
    });
  }
}

checkVariants().catch(console.error);
