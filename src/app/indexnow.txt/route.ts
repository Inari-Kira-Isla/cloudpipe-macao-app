export async function GET() {
  return new Response(process.env.BING_INDEX_NOW_KEY || 'c845f9a3c8084f01bfceb67decbc6a3d', {
    headers: { 'Content-Type': 'text/plain' },
  })
}
