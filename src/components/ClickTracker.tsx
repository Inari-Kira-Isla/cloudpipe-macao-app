'use client'

import { useEffect, useCallback } from 'react'

/**
 * Lightweight client-side click tracker for insight→merchant and merchant→action conversions.
 * Uses navigator.sendBeacon for fire-and-forget tracking that survives page navigation.
 *
 * Data attributes on links:
 *   data-track="merchant-click"   → insight page: user clicked a merchant link
 *   data-track="insight-click"    → merchant page: user clicked an insight link
 *   data-track="phone-click"      → merchant page: user clicked phone number
 *   data-track="website-click"    → merchant page: user clicked website link
 *   data-track="email-click"      → merchant page: user clicked email
 *   data-track="claim-click"      → merchant page: user clicked claim CTA
 *   data-source="insight-slug"    → which insight the click came from
 *   data-target="merchant-slug"   → which merchant was clicked
 */

const TRACK_ENDPOINT = '/api/v1/track-click'

interface ClickEvent {
  action: string
  source_page: string
  target_slug?: string
  source_slug?: string
  referrer?: string
  ts: string
}

export function ClickTracker({ pageType, pageSlug }: { pageType: 'insight' | 'merchant'; pageSlug: string }) {
  const handleClick = useCallback((e: MouseEvent) => {
    const link = (e.target as HTMLElement).closest('[data-track]') as HTMLElement | null
    if (!link) return

    const action = link.getAttribute('data-track') || 'unknown'
    const targetSlug = link.getAttribute('data-target') || undefined
    const sourceSlug = link.getAttribute('data-source') || undefined

    const payload: ClickEvent = {
      action,
      source_page: `${pageType}:${pageSlug}`,
      target_slug: targetSlug,
      source_slug: sourceSlug,
      referrer: document.referrer || undefined,
      ts: new Date().toISOString(),
    }

    // sendBeacon survives page navigation — no need for async/await
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_ENDPOINT, JSON.stringify(payload))
    } else {
      fetch(TRACK_ENDPOINT, { method: 'POST', body: JSON.stringify(payload), keepalive: true })
    }
  }, [pageType, pageSlug])

  useEffect(() => {
    // Also track page arrival with referrer info (detect AI referrals)
    const ref = document.referrer
    const isAiReferral = ref && /chatgpt|perplexity|claude|copilot|bing\.com\/chat|you\.com/i.test(ref)

    if (ref) {
      const arrival = {
        action: 'page-view',
        source_page: `${pageType}:${pageSlug}`,
        referrer: ref,
        is_ai_referral: isAiReferral,
        ts: new Date().toISOString(),
      }
      if (navigator.sendBeacon) {
        navigator.sendBeacon(TRACK_ENDPOINT, JSON.stringify(arrival))
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [handleClick, pageType, pageSlug])

  return null // renders nothing — pure tracking
}
