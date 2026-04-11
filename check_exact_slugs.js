const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function check() {
  // Get exact counts for the two problematic patterns
  const { data: allIzakaya } = await supabase
    .from('insights')
    .select('slug')
    .ilike('slug', '%izakaya%')
    .ilike('slug', 'macau-restaurant%');

  if (allIzakaya) {
    const groupedBySlug = {};
    allIzakaya.forEach(row => {
      groupedBySlug[row.slug] = (groupedBySlug[row.slug] || 0) + 1;
    });

    console.log('All macau izakaya insights by slug:\n');
    Object.entries(groupedBySlug)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([slug, count]) => {
        const hasChineseInSlug = /[\u4E00-\u9FFF]/.test(slug);
        const marker = hasChineseInSlug ? '🔴 CHINESE' : '⚫ ASCII';
        console.log(`[${count}x] ${marker}: ${slug}`);
      });
  }
}

check().catch(console.error);
