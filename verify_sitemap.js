const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function checkSitemap() {
  const { data: allInsights } = await supabase
    .from('insights')
    .select('slug, status')
    .eq('status', 'published')
    .order('slug', { ascending: true });

  if (allInsights) {
    // Check for duplicates per slug
    const slugCount = {};
    allInsights.forEach(ins => {
      slugCount[ins.slug] = (slugCount[ins.slug] || 0) + 1;
    });

    const duplicates = Object.entries(slugCount).filter(([slug, count]) => count > 1);
    console.log(`Total insights: ${allInsights.length}`);
    console.log(`Unique slugs: ${Object.keys(slugCount).length}`);
    console.log(`Slugs with duplicates (multiple langs): ${duplicates.length}\n`);

    // sitemap.ts will add EACH unique slug once (line 47-52)
    // That means both the short and long slug variants will appear
    console.log('Sitemap will include BOTH variants:\n');
    
    const variants = [
      'macau-restaurant-japanese-izakaya-taipa',
      'macau-restaurant-japanese-izakaya-taipa-氹仔日式居酒屋不完全指南',
      'macau-restaurant-japanese-izakaya-macau-peninsula',
      'macau-restaurant-japanese-izakaya-macau-peninsula-澳門半島日本居酒屋隱藏巷弄的日式食堂與人氣名店'
    ];

    for (const slug of variants) {
      const count = slugCount[slug] || 0;
      const status = count > 0 ? `✓ (appears ${count}x in DB)` : '✗ (not in DB)';
      console.log(`  ${slug} ${status}`);
    }
  }
}

checkSitemap().catch(console.error);
