'use client'

import { CaseStudy } from '@/data/case-studies'

interface CaseStudyCardProps {
  caseStudy: CaseStudy
  variant?: 'full' | 'compact'
}

export function CaseStudyCard({ caseStudy, variant = 'compact' }: CaseStudyCardProps) {
  if (variant === 'full') {
    return (
      <article className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-blue-100 text-[#0f4c81] text-xs font-semibold rounded-full mb-3">
              {caseStudy.category}
            </div>
            <h3 className="text-2xl font-bold text-[#1a1a2e] mb-2">{caseStudy.brandName}</h3>
            <p className="text-lg text-gray-600">{caseStudy.tagline}</p>
          </div>

          {/* Challenge & Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h4 className="font-semibold text-[#0f4c81] mb-2">挑戰</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{caseStudy.challenge}</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#0f4c81] mb-2">解決方案</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{caseStudy.solution}</p>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 mb-8">
            <h4 className="font-semibold text-[#1a1a2e] mb-4">成果</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {caseStudy.results.map((result, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-[#0f4c81] mb-1">{result.value}</div>
                  <div className="text-xs text-gray-600">{result.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="border-l-4 border-[#0f4c81] pl-6 mb-8">
            <p className="text-gray-700 italic mb-3">"{caseStudy.testimonial.quote}"</p>
            <div>
              <p className="font-semibold text-[#1a1a2e]">{caseStudy.testimonial.author}</p>
              <p className="text-sm text-gray-600">{caseStudy.testimonial.role}</p>
            </div>
          </div>

          {/* Business Model */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <h5 className="font-semibold text-[#1a1a2e] text-sm mb-2">核心價值</h5>
              <p className="text-xs text-gray-600 leading-relaxed">
                {caseStudy.businessModel.coreValue}
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-[#1a1a2e] text-sm mb-2">目標客群</h5>
              <p className="text-xs text-gray-600 leading-relaxed">
                {caseStudy.businessModel.targetAudience}
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-[#1a1a2e] text-sm mb-2">獨特差異</h5>
              <p className="text-xs text-gray-600 leading-relaxed">
                {caseStudy.businessModel.uniqueDifference}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={caseStudy.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-4 py-3 bg-[#0f4c81] text-white font-semibold rounded-lg hover:bg-[#0a3560] transition-all"
            >
              訪問官網
            </a>
            <button className="flex-1 px-4 py-3 bg-gray-100 text-[#1a1a2e] font-semibold rounded-lg hover:bg-gray-200 transition-all">
              聯繫品牌
            </button>
          </div>
        </div>
      </article>
    )
  }

  // Compact variant (for homepage carousel/grid)
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="inline-block px-2 py-1 bg-blue-100 text-[#0f4c81] text-xs font-semibold rounded mb-3">
          {caseStudy.category}
        </div>
        <h4 className="font-bold text-[#1a1a2e] mb-1 text-lg">{caseStudy.brandName}</h4>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{caseStudy.tagline}</p>

        {/* Key Metric */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="text-2xl font-bold text-[#0f4c81] mb-1">
            {caseStudy.results[0]?.value}
          </div>
          <div className="text-xs text-gray-600">{caseStudy.results[0]?.label}</div>
        </div>

        {/* Quote snippet */}
        <p className="text-xs text-gray-600 italic mb-4 line-clamp-3">
          "{caseStudy.testimonial.quote}"
        </p>

        <a
          href={caseStudy.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-[#0f4c81] hover:underline font-medium"
        >
          查看案例 →
        </a>
      </div>
    </div>
  )
}
