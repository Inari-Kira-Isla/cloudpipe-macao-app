const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInsights() {
  // Check the two failing slugs
  const failingSlugs = [
    'upgrade-macau-restaurant-japanese-izakaya-taipa-氹仔日式居酒屋不完全指南',
    'macau-restaurant-japanese-izakaya-macau-peninsula-澳門半島日本居酒屋隱藏巷弄的日式食堂與人氣名店'
  ];

  for (const slug of failingSlugs) {
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    console.log(`\nSlug: ${slug}`);
    console.log(`Found: ${data ? 'YES' : 'NO'}`);
    if (error) console.log(`Error: ${error.message}`);
  }

  // Check all insights with Japanese keywords to see patterns
  console.log('\n\n=== All insights containing "japanese" ===');
  const { data: allJapanese } = await supabase
    .from('insights')
    .select('slug, title, status, lang')
    .ilike('title', '%japanese%')
    .limit(20);

  if (allJapanese) {
    console.log(`Found ${allJapanese.length} insights with "japanese"`);
    allJapanese.forEach(ins => {
      console.log(`  - ${ins.slug} (status=${ins.status}, lang=${ins.lang})`);
    });
  }

  // Check for insights with Chinese characters
  console.log('\n\n=== Recent insights with Chinese chars ===');
  const { data: recentInsights } = await supabase
    .from('insights')
    .select('slug, title, status, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(30);

  if (recentInsights) {
    const withChinese = recentInsights.filter(ins => /[\u4E00-\u9FFF]/.test(ins.slug));
    console.log(`Found ${withChinese.length} with Chinese in slug`);
    withChinese.slice(0, 10).forEach(ins => {
      console.log(`  - ${ins.slug}`);
    });
  }
}

checkInsights().catch(console.error);
