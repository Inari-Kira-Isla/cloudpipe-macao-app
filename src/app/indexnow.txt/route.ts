export async function GET() {
  return new Response(process.env.INDEXNOW_KEY || process.env.BING_INDEX_NOW_KEY || 'ba56701768004b66b7e64c28a1e90f9e', {
    headers: { 'Content-Type': 'text/plain' },
  })
}
