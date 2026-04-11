const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function test() {
  // Exact slugs from user's reported 404 URLs
  const slug1 = 'upgrade-macau-restaurant-japanese-izakaya-taipa-氹仔日式居酒屋不完全指南';
  const slug2 = 'macau-restaurant-japanese-izakaya-macau-peninsula-澳門半島日本居酒屋隱藏巷弄的日式食堂與人氣名店';

  console.log('Testing exact user-reported slugs:\n');

  for (const slug of [slug1, slug2]) {
    const { data } = await supabase
      .from('insights')
      .select('slug, lang')
      .eq('slug', slug)
      .limit(5);

    console.log(`Slug: ${slug}`);
    if (data && data.length > 0) {
      console.log(`  ✓ FOUND: ${data.length} rows`);
      data.forEach(d => console.log(`    - lang: ${d.lang}`));
    } else {
      console.log(`  ✗ NOT FOUND`);
    }
    console.log();
  }

  // Let's try a simpler search - just the base part
  console.log('\n=== Searching for partial matches ===');
  const { data: partial1 } = await supabase
    .from('insights')
    .select('slug')
    .like('slug', '%upgrade-macau-restaurant-japanese-izakaya-taipa%');
  console.log(`Pattern "%upgrade-macau-restaurant-japanese-izakaya-taipa%": ${partial1?.length || 0} matches`);

  const { data: partial2 } = await supabase
    .from('insights')
    .select('slug')
    .like('slug', '%macau-restaurant-japanese-izakaya-macau-peninsula%');
  console.log(`Pattern "%macau-restaurant-japanese-izakaya-macau-peninsula%": ${partial2?.length || 0} matches`);

  if (partial2 && partial2.length > 0) {
    console.log('Found slugs:');
    partial2.slice(0, 5).forEach(s => console.log(`  - ${s.slug}`));
  }
}

test().catch(console.error);
