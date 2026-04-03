import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * AI Crawler Detection & Logging Middleware
 * Detects 25+ AI bot user agents, logs per-page visits to Supabase
 */

const AI_BOTS: Record<string, string> = {
  // International AI
  'GPTBot': 'OpenAI',
  'ChatGPT-User': 'OpenAI',
  'OAI-SearchBot': 'OpenAI',
  'Google-Extended': 'Google',
  'Googlebot': 'Google',
  'Bingbot': 'Microsoft',
  'anthropic-ai': 'Anthropic',
  'ClaudeBot': 'Anthropic',
  'Claude-Web': 'Anthropic',
  'PerplexityBot': 'Perplexity',
  'cohere-ai': 'Cohere',
  'Applebot': 'Apple',
  'Applebot-Extended': 'Apple',
  'YouBot': 'You.com',
  'Amazonbot': 'Amazon',
  'meta-externalagent': 'Meta',
  'FacebookBot': 'Meta',
  'AI2Bot': 'AI2',
  'Diffbot': 'Diffbot',
  'CCBot': 'Common Crawl',
  'iaskspider': 'iAsk',
  'Scrapy': 'Scrapy',
  'PetalBot': 'Aspiegel',
  'YandexBot': 'Yandex',
  'ia_archiver': 'Internet Archive',
  // Chinese AI
  'Bytespider': 'ByteDance',
  'Baiduspider': 'Baidu',
  'Sogou': 'Sogou',
  'ChatGLM': 'Zhipu AI',
  '360Spider': 'Qihoo 360',
  'HunyuanBot': 'Tencent',
  'SenseChat': 'SenseTime',
  'SparkBot': 'iFlytek',
  'Kimi': 'Moonshot AI',
  'Doubao': 'ByteDance',
  'XiaoIce': 'XiaoIce',
  // Additional bots (2026-03-16)
  'DeepSeekBot': 'DeepSeek',
  'TikTokSpider': 'ByteDance',
  'YisouSpider': 'Alibaba',
  'Kimi-Bot': 'Moonshot AI',
  'NaverBot': 'Naver',
  'SeznamBot': 'Seznam',
  'DuckDuckBot': 'DuckDuckGo',
}

/** 301 redirects: old place-XXXXX slugs → readable slugs */
const PLACE_SLUG_REDIRECTS: Record<string, string> = {
  "place--fc6-bzq": "macau-changlou-xianxiang",
  "place--tyoaaka": "farmacia-diligencia",
  "place-0dkw05tk": "sun-hung-fat",
  "place-0lqriyju": "parque-da-fortaleza-do-monte",
  "place-0r3jon18": "new-yaohan",
  "place-1g6xzcjq": "torre-de-macau",
  "place-1lrwkaiq": "artyzen-grand-lapa-macau",
  "place-1oi-ogaw": "parque-natural-da-taipa-grande",
  "place-2_6leeq8": "seng-cheong",
  "place-2e0ibxvm": "the-venetian-macao",
  "place-2rhbn8s4": "ren",
  "place-30gzsaa8": "parque-municipal-dr-sun-yat-sen",
  "place-4k_zwsza": "wynn-palace",
  "place-4qoyjsgq": "pin-yue-xuan",
  "place-4r0tevgq": "pousada-marina-infante",
  "place-55eclprk": "wong-chi-kei",
  "place-5amiziae": "sushigawa",
  "place-5axyldey": "mcdonalds-at-the-venetian-macao",
  "place-5ofki2-y": "jollibee",
  "place-6-ga20wm": "sushi-kissho-by-miyakawa",
  "place-63jj9nte": "one-central-macau",
  "place-6hi3roi4": "parque-comemoracao-handover-macau",
  "place-6ktr2ia0": "parque-municipal-da-colina-da-guia",
  "place-6lfrqibg": "farmacia-popular",
  "place-7ibewpoq": "hip-seng-seafood-hot-pot-restaurant-2",
  "place-7thdtduk": "parque-central-da-taipa",
  "place-95zzjb7s": "ilha-de-macau",
  "place-9ift4xg8": "pearl-dragon",
  "place-9jgmctb0": "palm-park",
  "place-9m7_bmwe": "templo-de-hong-chan-kuan",
  "place-9wi3pyey": "le-chinois-cantonese-restaurant",
  "place-_e1uhify": "yamazato-japanese-restaurant",
  "place-_gi54jri": "fado",
  "place-_pzaeloq": "golden-mix-dessert-taipa",
  "place-a7wrxtca": "studio-city-macau-2",
  "place-aecg7yxo": "farmacia-hong-bo",
  "place-aeemnuyc": "harbourview-hotel",
  "place-ai5wnpem": "mandarin-oriental-macau",
  "place-alnj8ifq": "ving-kei-street-vendor",
  "place-apglfzq4": "casino-veneziano-de-macau",
  "place-awxdftc0": "alain-ducasse-at-morpheus",
  "place-b6jmqdv4": "in-portuguese-food-restaurant",
  "place-ba-rlzka": "haidilao-hot-pot",
  "place-bafujlee": "jardim-de-sao-francisco",
  "place-bfsp32je": "nan-wan-macau-square",
  "place-bjheksqy": "hotel-royal-macau",
  "place-bnmyaxk0": "shoppes-at-venetian",
  "place-booyshr0": "broadway-food-street",
  "place-bp0f35z0": "tim-mat-un-chinese-dessert",
  "place-bwif9ioc": "xinyi",
  "place-bzusdzgw": "golden-court",
  "place-cd-frx1y": "lok-kei-noodle",
  "place-ce4zmmos": "ying",
  "place-cextvdme": "the-8-restaurant-grand-lisboa",
  "place-cmgrjnak": "parque-infantil-municipal-do-chunambeiro",
  "place-cqtvg4y8": "hotel-beverly-plaza-macau",
  "place-cyxxrcrq": "templo-de-pau-kung",
  "place-dc4w1lqq": "hotel-lisboa",
  "place-dkjn2wgq": "farmacia-alpha-macau-square",
  "place-dmpso-yu": "doca-dos-pescadores",
  "place-dnjkipr8": "da-tie-tofu-pudding",
  "place-drzkymoq": "sorvetes-e-doces-lai-kei",
  "place-dsqyqmme": "lisboeta-macau-maison-l-occitane",
  "place-dtsqetog": "dfs-macau-city-of-dreams",
  "place-dykklig8": "mcdonalds-macau-international-airport",
  "place-e2mot2ju": "macau-hotel-s",
  "place-ebmgu3og": "templo-de-kun-iam",
  "place-ebqlxz90": "monte-do-forte",
  "place-ecceklok": "mcdonalds-at-edificio-macau-finance-centre",
  "place-ed0ilmoa": "cafe-chion-chau",
  "place-eeosy14i": "mgm-cotai",
  "place-enfswwui": "jardim-cidade-das-flores",
  "place-f3qqvyza": "grand-coloane-resort",
  "place-f5at0xne": "mcdonalds-at-the-riviera-macau",
  "place-fbck4kae": "hotel-okura-macau",
  "place-fh1ixe-y": "farmacia-popular-2",
  "place-fngwvwdi": "hotel-grandview",
  "place-fojrg8pk": "new-orient-landmark-hotel",
  "place-fshoezwq": "stream-8",
  "place-ftczje8y": "macau",
  "place-fw8pyx_a": "grand-lisboa-palace-resort-macau",
  "place-fzdolcxw": "the-kitchen",
  "place-fztj-yje": "rocks-hotel",
  "place-g9-ricpc": "ruinas-de-sao-paulo",
  "place-ger9jjwg": "templo-de-na-tcha",
  "place-gshvswts": "sushimitei-japanese-restaurant",
  "place-h90ohwo0": "hip-seng-seafood-hot-pot-restaurant",
  "place-hgc1tjvw": "museu-de-macau",
  "place-hhp7kpue": "the-huai-yang-garden",
  "place-hi5p3dxe": "farmacia-luen-tai",
  "place-hmkuwqwy": "jardim-da-flora",
  "place-hwqyy2py": "farol-de-ka-ho",
  "place-i12wwpc8": "reservoir-park",
  "place-ibhk5wq4": "zuicho",
  "place-imztipw0": "san-tung-fong-commerical-inn-south-wing",
  "place-ir86usks": "feng-wei-ju",
  "place-j3-jhe-e": "restaurante-escola-do-utm",
  "place-j7_qwj9c": "new-furusato",
  "place-jkpsgs-w": "farmacia-h-b",
  "place-k2a2bgau": "grand-emperor-hotel",
  "place-kbfpniv0": "farmacia-chinesa-golden-wall",
  "place-kf7qbgti": "lord-stows-bakery-main-store",
  "place-klxxzz00": "hip-seng-seafood-and-hotpot-studio-city-branch",
  "place-kpinomwc": "the-londoner-macao",
  "place-kpkc7qgc": "farmacia-loyal",
  "place-kw18edf4": "dom-galo-restaurante-portugues",
  "place-kzfujeg8": "macalhau-macau",
  "place-l0mp--kq": "brasserie",
  "place-l3ib5cj4": "parque-do-alto-de-coloane",
  "place-lbmdhnhu": "templo-de-tin-hau",
  "place-lmjhltea": "sofitel-macau-at-ponte-16",
  "place-lrg5kryq": "holiday-inn-express-macau-city-centre",
  "place-lwvs6-ps": "four-seasons-hotel-macao",
  "place-lxomfwsq": "dfs-macau-shoppes-at-four-seasons",
  "place-ma_ayxpu": "lam-mau-childrens-playground",
  "place-mdraiehs": "templo-de-a-ma",
  "place-me2y_uuq": "ole-london-hotel",
  "place-me8ro1bc": "restaurante-porto-exterior",
  "place-mi3vjo9k": "jw-marriott-hotel-macau",
  "place-mjmi8kyw": "mcdonalds-at-pak-wai",
  "place-ml09ebb8": "mgm-macau-2",
  "place-msl9ujyw": "dfs-macau-shoppes-at-londoner",
  "place-ndefjq8c": "museu-do-grande-premio-de-macau",
  "place-ndj1mkoi": "loja-sem-iva-do-aeroporto-internacional-de-macau",
  "place-ndse4nra": "templo-budista-de-tin-hau",
  "place-ngiphs1g": "templo-de-kun-iam-tchai",
  "place-nkzbum8s": "farmacia-wan-tung",
  "place-nsrfsxm0": "pousada-de-coloane",
  "place-nxnmkjuq": "north",
  "place-onciubsu": "kfc",
  "place-opquoamg": "wonderful-hotpot-imperial-palace",
  "place-ow6qsgoa": "macau-masters-hotel",
  "place-oxfn-hse": "altira-macau",
  "place-p5p0quca": "good-fortune-kitchen-hong-cheong",
  "place-pabe6pda": "lotus-palace",
  "place-pfxv9j-m": "grand-emperor-hotel",
  "place-piyrss5g": "hotel-legend-palace",
  "place-pjmonrfe": "templo-tou-tei",
  "place-pltdntzw": "palace-garden",
  "place-pn7n6mjg": "chiado",
  "place-pna3gjkg": "imperial-court",
  "place-ptbek3zq": "estatua-de-jorge-alvares",
  "place-pvxtiqhg": "jollibee-macau-taipa-shop",
  "place-pxkpdpp0": "templo-de-sam-kai-vui-kun",
  "place-pyejvqi4": "praca-do-lago-sai-van",
  "place-qb0k3prk": "holiday-hotel",
  "place-qdph1ocq": "jardim-luis-de-camoes",
  "place-qfe9h0c0": "the-ritz-carlton-cafe",
  "place-qrhaowjk": "templo-de-lin-fong",
  "place-qrimu3_y": "hawker-hawker",
  "place-qrqu6rzi": "salad",
  "place-qtebw3lo": "ao-pu-restaurant",
  "place-qu-lgruy": "broadway-macau-2",
  "place-rcwvqaii": "nova-mall",
  "place-rdizyww8": "paris-macao",
  "place-rfvqh9lg": "templo-budista-tam-kong",
  "place-rjsdpyi8": "don-alfonso-1890",
  "place-rlson88i": "pavilhao-do-panda-gigante-de-macau",
  "place-rposaley": "lakeview-palace",
  "place-rqwbw5ee": "leisure-area-of-kun-iam-statue-waterfront",
  "place-sjgw12ig": "man-fai-pharmacy",
  "place-skqkcezm": "farmacia-lee-man",
  "place-snnxuzis": "hotel-sintra",
  "place-snp8gcrs": "mizumi-wynn-palace-branch",
  "place-sqhn_gdg": "dfs-macau-studio-city",
  "place-sr0om0xq": "greenery-inn-macao",
  "place-suk0mv1e": "macao-galo-portuguese-food",
  "place-t1j0gfws": "hotel-arte-regencia",
  "place-t7bych3i": "templo-de-tin-hau-2",
  "place-tfwxlchw": "porto-restaurante",
  "place-tmjireq4": "chef-tams-seasons",
  "place-tpxxwdjy": "shoppes-at-parisian",
  "place-tyvoccws": "sai-van-on-kei-taipa",
  "place-ufw5g2zk": "metropark-hotel-macau",
  "place-uptpaecg": "a-petisqueira",
  "place-usmig-o0": "diva",
  "place-v9q1z0rc": "sopa-de-fitas-ving-kei",
  "place-vcv3ikua": "parque-municipal-da-colina-de-mong-ha",
  "place-vh3kpkky": "sing-lei-cha-chaan-teng",
  "place-vvpi0d6s": "hang-heong-un",
  "place-vzieul-0": "largo-do-senado",
  "place-w3e2g_yg": "sun-star-city",
  "place-wb2hrit8": "jardim-de-lou-lim-ioc",
  "place-wcgg7zgc": "red-8-wynn-macau",
  "place-wvagbt9s": "inn-hotel-macau",
  "place-xabgtu60": "farmacia-healthy-life",
  "place-xbfvq6o0": "templo-de-lin-kai",
  "place-xhaxgeju": "alameda-dr-carlos-dassumpcao",
  "place-xjaeiheu": "mcdonalds-at-macau-ferry-terminal",
  "place-xm-wfzl4": "i-leng-temple-ka-sin-tong",
  "place-xptlytoq": "templo-de-kun-iam-coloane",
  "place-xrrn1uka": "lisboeta-macau",
  "place-xufv0gsk": "jollibee-macau-chino-plaza",
  "place-y-yxrffk": "hampton-court",
  "place-y180dgnc": "edo-japanese-restaurant",
  "place-yrytchlu": "farmacia-san-weng-lei",
  "place-ytizrfyo": "jollibee-macau-areia-preta",
  "place-ytug0l_q": "king-power-duty-free-macau-co-ltd",
  "place-z3fk50lo": "wetland-in-avenida-da-praia-taipa",
  "place-z5xt9pao": "grand-harbour-hotel",
  "place-z_amb9ui": "golden-mix-dessert",
  "place-zg-_2b8q": "banyan-tree-macau",
  "place-zgvgdhoy": "hoi-ngan-hoi-kei",
  "place-zhmp4vg0": "w-macau-studio-city",
  "place-zj6qhjtg": "templo-budista-pak-tai",
  "place-zqkxfwxm": "haidilao-hot-pot-2",
  "place-zvyeq5b4": "the-victoria-hotel-macau",
  "place-zzw5ulc4": "templo-de-pou-chai-kun-iam-tong",
}

/** Simple hash for IP anonymization (no PII stored) */
async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + 'cloudpipe-salt-2026')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

/** Extract page type and segments from path */
function parsePath(path: string): { pageType: string; industry: string | null; category: string | null } {
  // All cloudpipe-macao-app pages have industry='澳門商戶百科'
  const MACAO_INDUSTRY = '澳門商戶百科'

  if (path === '/macao' || path === '/macao/') return { pageType: 'home', industry: MACAO_INDUSTRY, category: null }
  if (path.includes('/llms-txt')) return { pageType: 'llms-txt', industry: MACAO_INDUSTRY, category: null }
  if (path.includes('/api/')) return { pageType: 'api', industry: MACAO_INDUSTRY, category: null }
  if (path === '/sitemap.xml') return { pageType: 'sitemap', industry: MACAO_INDUSTRY, category: null }
  if (path === '/robots.txt') return { pageType: 'robots', industry: MACAO_INDUSTRY, category: null }

  // Insights section
  if (path === '/macao/insights' || path === '/macao/insights/') return { pageType: 'insight-index', industry: MACAO_INDUSTRY, category: null }
  if (path.startsWith('/macao/insights/')) return { pageType: 'insight', industry: MACAO_INDUSTRY, category: null }

  // Crawler dashboard (internal, skip)
  if (path.startsWith('/macao/crawler-dashboard')) return { pageType: 'other', industry: MACAO_INDUSTRY, category: null }

  const segments = path.replace(/^\/macao\//, '').replace(/\/$/, '').split('/')
  if (segments.length === 1) return { pageType: 'industry', industry: MACAO_INDUSTRY, category: null }
  if (segments.length === 2) return { pageType: 'category', industry: MACAO_INDUSTRY, category: null }
  if (segments.length >= 3) return { pageType: 'merchant', industry: MACAO_INDUSTRY, category: null }

  return { pageType: 'other', industry: MACAO_INDUSTRY, category: null }
}

/** Detect AI bot from User-Agent string */
function detectBot(ua: string): { name: string; owner: string } | null {
  for (const [botUA, owner] of Object.entries(AI_BOTS)) {
    if (ua.includes(botUA)) {
      return { name: botUA, owner }
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  // 308 redirect: old place-XXXXX slugs → readable slugs
  const lastSegment = request.nextUrl.pathname.split('/').pop()
  if (lastSegment?.startsWith('place-') && PLACE_SLUG_REDIRECTS[lastSegment]) {
    const newPath = request.nextUrl.pathname.replace(lastSegment, PLACE_SLUG_REDIRECTS[lastSegment])
    return NextResponse.redirect(new URL(newPath, request.url), 308)
  }

  const response = NextResponse.next()

  // Set Content-Language header based on ?lang= parameter (for AI crawlers)
  const langParam = request.nextUrl.searchParams.get('lang')
  if (langParam === 'en') {
    response.headers.set('Content-Language', 'en')
  } else if (langParam === 'pt') {
    response.headers.set('Content-Language', 'pt')
  } else {
    response.headers.set('Content-Language', 'zh-Hant')
  }

  const ua = request.headers.get('user-agent') || ''
  const bot = detectBot(ua)

  if (!bot) return response // Not an AI bot, skip

  // Skip logging paths with /null slug (bad data, wastes crawler budget)
  if (request.nextUrl.pathname.includes('/null')) return response

  // Non-blocking: fire and forget the log insertion
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return response

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '0.0.0.0'
    const ipHash = await hashIP(ip)
    const path = request.nextUrl.pathname
    const referer = request.headers.get('referer') || null
    const { pageType, industry, category } = parsePath(path)

    // Session ID: group requests from same bot + IP within same day
    const dateStr = new Date().toISOString().slice(0, 10)
    const sessionId = `${ipHash}-${bot.name}-${dateStr}`

    const row = {
      bot_name: bot.name,
      bot_owner: bot.owner,
      path,
      referer,
      ip_hash: ipHash,
      session_id: sessionId,
      ua_raw: ua.slice(0, 500),
      site: 'cloudpipe-macao-app',
      industry,
      category,
      page_type: pageType,
    }

    // Fire-and-forget: don't await, don't block the response
    fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    }).catch(() => {}) // Silently ignore errors

  } catch {
    // Never block the response
  }

  return response
}

export const config = {
  matcher: [
    '/macao/:path*',
    '/sitemap.xml',
    '/robots.txt',
    '/api/:path*',
  ],
}
