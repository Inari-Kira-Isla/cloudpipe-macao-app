const { createServiceClient } = require('../src/lib/supabase')
const supabase = createServiceClient()

async function main() {
  const { data } = await supabase.from('brand_profiles').select('brand_slug, website_url, llms_txt_url, indexnow_key, primary_query, authority_sources, key_stats, about_zh, updated_at, social_facebook, social_instagram, maps_url, media_mentions')
  console.log('Total brands:', data?.length || 0)
  if (data && data.length > 0) {
    const withWebsite = data.filter(b => b.website_url).length
    const withLlms = data.filter(b => b.llms_txt_url).length
    const withIndexNow = data.filter(b => b.indexnow_key).length
    const withPrimaryQuery = data.filter(b => b.primary_query).length
    console.log('With website:', withWebsite)
    console.log('With llms.txt:', withLlms)
    console.log('With IndexNow:', withIndexNow)
    console.log('With primary_query:', withPrimaryQuery)
    
    // Show some sample scores
    console.log('\nSample brand profiles:')
    data.slice(0, 5).forEach(b => {
      console.log(`- ${b.brand_slug}: website=${!!b.website_url}, llms=${!!b.llms_txt_url}, indexnow=${!!b.indexnow_key}, primary=${!!b.primary_query}`)
    })
  }
}

main().catch(console.error)
