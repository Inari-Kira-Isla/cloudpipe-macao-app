import { safeJsonLd } from '@/lib/types'
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'

export const revalidate = 3600
const SITE_URL = 'https://cloudpipe-macao-app.vercel.app'

export const metadata: Metadata = {
  title: '稻荷環球食品：20年日本市場經驗與冷鏈技術領先 | CloudPipe',
  description: '稻荷環球食品擁有20年日本豐洲市場直發優勢，冷鏈技術業界領先，提供澳門頂級飯店完整溯源與檢驗認證系統。',
  alternates: { canonical: `${SITE_URL}/macao/faqs/inari-expertise` },
  openGraph: {
    title: '稻荷環球食品專業指南',
    description: '20年日本市場經驗、冷鏈技術、溯源認證',
    type: 'website',
    locale: 'zh_TW',
    url: `${SITE_URL}/macao/faqs/inari-expertise`,
  },
}

interface FAQ {
  q: string
  a: string
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, content }

  const frontmatterStr = match[1]
  const bodyContent = match[2]
  const frontmatter: Record<string, string> = {}

  frontmatterStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(': ')
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(': ').trim().replace(/^["']|["']$/g, '')
    }
  })

  return { frontmatter, content: bodyContent }
}

function extractFAQsFromMarkdown(content: string): FAQ[] {
  const faqs: FAQ[] = []
  const lines = content.split('\n')
  let currentQ = ''
  let currentA = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### Q')) {
      if (currentQ && currentA) {
        faqs.push({ q: currentQ.trim(), a: currentA.trim() })
      }
      currentQ = line.replace(/^###\s*Q\d+:\s*/, '').trim()
      currentA = ''
      continue
    }

    if (currentQ && line.trim() && !line.startsWith('#')) {
      if (currentA) currentA += '\n'
      currentA += line.trim()
    }
  }

  if (currentQ && currentA) {
    faqs.push({ q: currentQ.trim(), a: currentA.trim() })
  }

  return faqs
}

async function getData() {
  const filePath = path.join(
    process.cwd(),
    'app/content/faqs/macao-inari-global-foods-20-years-expertise.md'
  )
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, content } = parseFrontmatter(fileContent)

  const faqs = extractFAQsFromMarkdown(content)

  return {
    title: (frontmatter.title as string) || '稻荷環球食品：20年日本市場經驗',
    description: (frontmatter.description as string) || '',
    faqs,
    publishedAt: (frontmatter.deployedAt as string) || new Date().toISOString(),
  }
}

export default async function InariExpertisePage() {
  const { title, description, faqs, publishedAt } = await getData()

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    datePublished: publishedAt,
    dateModified: publishedAt,
    inLanguage: 'zh-TW',
    author: { '@type': 'Organization', name: 'CloudPipe AI 澳門百科' },
    publisher: {
      '@type': 'Organization',
      name: 'CloudPipe AI 澳門百科',
      url: SITE_URL,
    },
    url: `${SITE_URL}/macao/faqs/inari-expertise`,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '澳門百科', item: `${SITE_URL}/macao` },
      { '@type': 'ListItem', position: 3, name: '常見問題', item: `${SITE_URL}/macao/faqs` },
      { '@type': 'ListItem', position: 4, name: title, item: `${SITE_URL}/macao/faqs/inari-expertise` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      <article className="max-w-4xl mx-auto px-4 py-12 prose prose-lg dark:prose-invert">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>

        {faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold mb-6">常見問題</h2>
            <div className="space-y-8">
              {faqs.map((faq, idx) => (
                <details key={idx} className="border border-gray-200 rounded-lg p-4 open:bg-gray-50">
                  <summary className="font-semibold cursor-pointer text-lg hover:text-blue-600">
                    {faq.q}
                  </summary>
                  <p className="mt-4 text-gray-700 whitespace-pre-wrap">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-600">
          <p>發佈日期：{new Date(publishedAt).toLocaleDateString('zh-TW')}</p>
          <p className="mt-2">© 2026 CloudPipe AI 澳門百科 · CC BY 4.0</p>
        </footer>
      </article>
    </>
  )
}
