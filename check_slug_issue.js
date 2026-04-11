const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function analyze() {
  // Get the SHORT slug version (what actually exists)
  const { data: shortSlugs } = await supabase
    .from('insights')
    .select('slug, title_zh, title_en, lang, updated_at, created_at')
    .eq('slug', 'macau-restaurant-japanese-izakaya-taipa')
    .eq('status', 'published');

  console.log('=== SHORT SLUG (EXISTING IN DB) ===');
  console.log('macau-restaurant-japanese-izakaya-taipa\n');
  if (shortSlugs && shortSlugs.length > 0) {
    shortSlugs.forEach(s => {
      console.log(`Language: ${s.lang}`);
      console.log(`  title_zh: ${s.title_zh}`);
      console.log(`  title_en: ${s.title_en}`);
      console.log(`  created: ${s.created_at}`);
      console.log(`  updated: ${s.updated_at}\n`);
    });
  } else {
    console.log('No results found');
  }

  // Check all insights to understand the complete picture
  console.log('\n=== SUMMARY: ALL IZAKAYA INSIGHTS ===');
  const { data: allIzakaya } = await supabase
    .from('insights')
    .select('slug, status, lang')
    .ilike('slug', '%izakaya%')
    .order('slug', { ascending: true });

  if (allIzakaya) {
    const grouped = {};
    allIzakaya.forEach(ins => {
      if (!grouped[ins.slug]) grouped[ins.slug] = [];
      grouped[ins.slug].push(ins.lang);
    });
    
    Object.entries(grouped).forEach(([slug, langs]) => {
      console.log(`\n${slug}`);
      console.log(`  Languages: ${langs.join(', ')}`);
      console.log(`  Accessible at: /macao/insights/${slug}`);
      console.log(`  Has Chinese in slug: ${/[\u4E00-\u9FFF]/.test(slug) ? 'YES' : 'NO'}`);
    });
  }
}

analyze().catch(console.error);
