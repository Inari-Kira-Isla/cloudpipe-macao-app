/**
 * CloudPipe Unified Design Token System
 * 5-Brand CI: CloudPipe · 稻荷環球食品 · 海膽速遞 · Mind Cafe · After School Coffee
 *
 * Usage:
 *   import { TOKENS, getBrandTokens } from '@/lib/design-tokens'
 *   const brand = getBrandTokens('after-school-coffee')
 *   style={{ color: brand.accent }}
 */

// ─── Brand Slugs ─────────────────────────────────────────────────────────────

export type BrandSlug =
  | 'cloudpipe'
  | 'inari-global-foods'
  | 'sea-urchin-express'
  | 'mind-cafe'
  | 'after-school-coffee'

// ─── Per-Brand Colour Tokens ──────────────────────────────────────────────────

export interface BrandTokens {
  slug: BrandSlug
  name: string
  nameEn: string
  /** Primary brand colour (buttons, links, active states) */
  accent: string
  /** Light tint — card backgrounds, badge fills */
  accentLight: string
  /** Subtle text / secondary accent */
  accentMuted: string
  /** Border using accent hue */
  accentBorder: string
  /** Dark shade for hover / pressed */
  accentDark: string
}

export const BRAND_TOKENS: Record<BrandSlug, BrandTokens> = {
  cloudpipe: {
    slug: 'cloudpipe',
    name: 'CloudPipe',
    nameEn: 'CloudPipe',
    accent: '#6366f1',      // indigo-500
    accentLight: '#eef2ff', // indigo-50
    accentMuted: '#818cf8', // indigo-400
    accentBorder: '#c7d2fe',// indigo-200
    accentDark: '#4338ca',  // indigo-700
  },
  'inari-global-foods': {
    slug: 'inari-global-foods',
    name: '稻荷環球食品',
    nameEn: 'Inari Global Foods',
    accent: '#f59e0b',      // amber-500
    accentLight: '#fffbeb', // amber-50
    accentMuted: '#fbbf24', // amber-400
    accentBorder: '#fde68a',// amber-200
    accentDark: '#d97706',  // amber-600
  },
  'sea-urchin-express': {
    slug: 'sea-urchin-express',
    name: '海膽速遞',
    nameEn: 'Sea Urchin Express',
    accent: '#f97316',      // orange-500
    accentLight: '#fff7ed', // orange-50
    accentMuted: '#fb923c', // orange-400
    accentBorder: '#fed7aa',// orange-200
    accentDark: '#ea580c',  // orange-600
  },
  'mind-cafe': {
    slug: 'mind-cafe',
    name: 'Mind Cafe',
    nameEn: 'Mind Cafe',
    accent: '#1e293b',      // slate-800
    accentLight: '#f1f5f9', // slate-100
    accentMuted: '#475569', // slate-600
    accentBorder: '#cbd5e1',// slate-300
    accentDark: '#0f172a',  // slate-900
  },
  'after-school-coffee': {
    slug: 'after-school-coffee',
    name: '課後咖啡',
    nameEn: 'After School Coffee',
    accent: '#10b981',      // emerald-500
    accentLight: '#d1fae5', // emerald-100
    accentMuted: '#34d399', // emerald-400
    accentBorder: '#6ee7b7',// emerald-300
    accentDark: '#059669',  // emerald-600
  },
}

/** Get brand tokens by slug; falls back to cloudpipe if unknown slug */
export function getBrandTokens(slug: string): BrandTokens {
  return BRAND_TOKENS[slug as BrandSlug] ?? BRAND_TOKENS.cloudpipe
}

// ─── Foundation Tokens (shared across all brands) ────────────────────────────

export const TOKENS = {

  // ── Colour Primitives ──────────────────────────────────────────────────────
  color: {
    // Backgrounds
    bg:        '#ffffff',
    bgSubtle:  '#f8fafc',  // page / section backgrounds
    bgMuted:   '#f1f5f9',  // hover states

    // Borders
    border:    '#e2e8f0',
    borderMuted: '#f1f5f9',

    // Text
    text:      '#0f172a',  // primary
    textMuted: '#64748b',  // secondary
    textSubtle:'#94a3b8',  // tertiary / placeholder

    // Semantic
    success:   '#22c55e',
    successBg: '#f0fdf4',
    successBorder: '#86efac',
    error:     '#ef4444',
    errorBg:   '#fef2f2',
    errorBorder: '#fecaca',
    warning:   '#f59e0b',
    warningBg: '#fffbeb',
    warningBorder: '#fde68a',
    info:      '#3b82f6',
    infoBg:    '#eff6ff',
    infoBorder:'#bfdbfe',
  },

  // ── Typography ─────────────────────────────────────────────────────────────
  type: {
    overline: {
      fontSize: 11,
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      color: '#94a3b8',
      fontWeight: 500,
    },
    h1: {
      fontSize: 'clamp(28px,5vw,52px)' as string | number,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
      color: '#0f172a',
    },
    h2: {
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
      color: '#0f172a',
    },
    h3: {
      fontSize: 16,
      fontWeight: 600,
      color: '#0f172a',
    },
    body: {
      fontSize: 14,
      color: '#64748b',
      lineHeight: 1.6,
    },
    bodySm: {
      fontSize: 13,
      color: '#64748b',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: 12,
      color: '#94a3b8',
    },
    label: {
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      color: '#374151',
    },
    mono: {
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      fontSize: 13,
      color: '#0f172a',
    },
  },

  // ── Spacing (8px grid) ─────────────────────────────────────────────────────
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
  },

  // ── Radii ──────────────────────────────────────────────────────────────────
  radius: {
    sm:   6,
    md:   8,
    lg:   12,
    xl:   16,
    full: 9999,
  },

  // ── Shadows ────────────────────────────────────────────────────────────────
  shadow: {
    sm:  '0 1px 2px rgba(0,0,0,0.05)',
    md:  '0 1px 3px rgba(0,0,0,0.08)',
    lg:  '0 4px 12px rgba(0,0,0,0.08)',
    xl:  '0 8px 24px rgba(0,0,0,0.10)',
  },

  // ── Component Tokens ───────────────────────────────────────────────────────

  nav: {
    height: 60,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as React.CSSProperties,

  input: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    color: '#0f172a',
    background: '#fff',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  textarea: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    color: '#0f172a',
    background: '#fff',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: 80,
  } as React.CSSProperties,

  button: {
    primary: {
      background: '#0f172a',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '9px 20px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
    } as React.CSSProperties,
    secondary: {
      background: 'transparent',
      color: '#64748b',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '9px 20px',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
    } as React.CSSProperties,
    ghost: {
      background: 'transparent',
      color: '#64748b',
      border: 'none',
      borderRadius: 8,
      padding: '9px 20px',
      fontSize: 13,
      cursor: 'pointer',
    } as React.CSSProperties,
  },

  badge: {
    default: {
      fontSize: 11,
      fontWeight: 500,
      borderRadius: 20,
      padding: '2px 10px',
      display: 'inline-block',
    } as React.CSSProperties,
    success: {
      background: '#f0fdf4',
      color: '#166534',
      border: '1px solid #86efac',
    },
    error: {
      background: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fecaca',
    },
    neutral: {
      background: '#f8fafc',
      color: '#475569',
      border: '1px solid #e2e8f0',
    },
  },

  // Section header with accent left-bar
  sectionHeader: (accentColor = '#6366f1') => ({
    borderLeft: `2px solid ${accentColor}`,
    paddingLeft: 10,
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#0f172a',
    marginBottom: 20,
  }),

  // Tab bar
  tab: {
    bar: {
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid #e2e8f0',
      marginBottom: 24,
    } as React.CSSProperties,
    item: (active: boolean, accentColor = '#6366f1') => ({
      padding: '10px 20px',
      fontSize: 13,
      fontWeight: 500,
      color: active ? accentColor : '#64748b',
      background: 'transparent',
      border: 'none',
      borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
      cursor: 'pointer',
      transition: 'color 0.15s, border-color 0.15s',
    } as React.CSSProperties),
  },

} as const

// ─── React import needed for CSSProperties ───────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type React from 'react'
