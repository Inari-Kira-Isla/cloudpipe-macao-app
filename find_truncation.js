const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yitmabzsxfgbchhhjjef.supabase.co',
  'sb_secret_eNR3yu3mLT89N_kTJiDvYw_4yE3eHuK'
);

async function test() {
  // Check for all slugs that contain Chinese
  const { data: allInsights } = await supabase
    .from('insights')
    .select('slug')
    .ilike('slug', '%日%')
    .ilike('slug', 'macau-restaurant%')
    .limit(100);

  if (allInsights) {
    console.log(`Found ${allInsights.length} macau insights with Chinese in slug\n`);
    
    const truncated = allInsights.filter(ins => {
      // Check if it looks truncated (ends abruptly)
      return ins.slug.endsWith('不完全') || 
             ins.slug.endsWith('深度') ||
             ins.slug.endsWith('微醺') ||
             ins.slug.match(/[一-龯]$/);  // ends with Chinese
    });

    console.log(`Potentially TRUNCATED: ${truncated.length}\n`);
    truncated.slice(0, 10).forEach(ins => {
      console.log(`  "${ins.slug}"`);
    });

    // Check the user's reported URL
    console.log('\n\n=== User Reported URL ===');
    console.log('Requested: macau-restaurant-japanese-izakaya-taipa-氹仔日式居酒屋不完全指南');
    
    const reported = allInsights.find(ins => 
      ins.slug.includes('氹仔') && ins.slug.includes('不完全')
    );
    
    if (reported) {
      console.log(`In DB:      ${reported.slug}`);
      console.log(`Length:     ${reported.slug.length} chars`);
    }
  }
}

test().catch(console.error);
