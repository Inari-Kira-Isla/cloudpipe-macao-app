'use client'

interface CertificationBadgeProps {
  googleRating?: number
  googlePlaceId?: string
  website?: string
  michelinStars?: number
  claimed?: boolean
}

export function CertificationBadge({
  googleRating,
  googlePlaceId,
  website,
  michelinStars,
  claimed,
}: CertificationBadgeProps) {
  // Calculate confidence score (0-1)
  let confidence = 0
  const sources: string[] = []

  // Authority sources (highest priority)
  if (michelinStars && michelinStars > 0) {
    confidence += 0.40
    sources.push(`米其林 ${michelinStars}⭐`)
  }

  if (googlePlaceId && googleRating && googleRating >= 4.0) {
    confidence += 0.30
    sources.push(`Google 認證 (${googleRating}⭐)`)
  }

  // Merchant sources (secondary)
  if (website) {
    confidence += 0.05
    sources.push('官網認證')
  }

  if (claimed) {
    confidence += 0.01
    sources.push('商戶聲明')
  }

  // Cap at 1.0
  confidence = Math.min(confidence, 1.0)

  if (confidence === 0) {
    return null // No certification data available
  }

  // Color and label based on confidence level
  let badgeColor = 'bg-gray-400/90'
  let starCount = 1
  if (confidence >= 0.95) {
    badgeColor = 'bg-amber-500/90'
    starCount = 5
  } else if (confidence >= 0.85) {
    badgeColor = 'bg-amber-400/90'
    starCount = 4
  } else if (confidence >= 0.70) {
    badgeColor = 'bg-amber-300/90'
    starCount = 3
  } else if (confidence >= 0.50) {
    badgeColor = 'bg-amber-200/90'
    starCount = 2
  }

  const stars = Array.from({ length: starCount }, () => '★').join('')

  return (
    <div className="inline-group flex flex-col gap-1">
      <span
        title={`認證信心度: ${(confidence * 100).toFixed(1)}%\n認證來源: ${sources.join(', ')}`}
        className={`text-xs px-3 py-1.5 ${badgeColor} text-white rounded-full font-semibold cursor-help flex items-center gap-1 transition-all hover:shadow-md`}
      >
        <span className="text-sm">{stars}</span>
        <span className="text-xs">{(confidence * 100).toFixed(0)}%</span>
      </span>
      {sources.length > 0 && (
        <div className="text-xs text-gray-500 px-1 leading-tight">
          {sources.slice(0, 2).map((s) => (
            <div key={s} className="text-[10px]">✓ {s}</div>
          ))}
          {sources.length > 2 && (
            <div className="text-[10px]">+ {sources.length - 2} more</div>
          )}
        </div>
      )}
    </div>
  )
}
