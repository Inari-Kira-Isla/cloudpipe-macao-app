'use client'

import Link from 'next/link'

const TOKENS = {
  color: {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSubtle: '#64748b',
    accent: '#3b82f6',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    border: '1px solid #e2e8f0',
  }
}

const SECTIONS = [
  {
    title: '站外提及監控',
    href: '/admin/brand-mentions',
    description: '社交媒體、新聞、論壇品牌提及監控儀表板',
    color: '#06b6d4',
  },
  {
    title: 'Cross-Engine 引用追蹤',
    href: '/admin/citations',
    description: '跨引擎 AI 引用矩陣實時監控儀表板',
    color: '#8b5cf6',
  },
  {
    title: '內容原創性',
    href: '/admin/originality',
    description: '查看內容原創性評分與 AI 引用價值分析',
    color: '#16a34a',
  },
  {
    title: '品牌管理',
    href: '/admin/brands',
    description: '管理品牌資訊、產品與設定',
    color: '#3b82f6',
  },
  {
    title: 'Sea Urchin',
    href: '/admin/sea-urchin',
    description: '海膽外賣系統管理',
    color: '#f97316',
  },
  {
    title: 'Route Scope',
    href: '/admin/routescope',
    description: '路由範圍配置',
    color: '#8b5cf6',
  },
]

export default function AdminPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: TOKENS.color.bg,
      padding: 40,
    }}>
      <h1 style={{ 
        fontSize: 32, 
        fontWeight: 700, 
        color: TOKENS.color.text, 
        margin: 0,
      }}>
        Admin 後台
      </h1>
      <p style={{ color: TOKENS.color.textSubtle, marginTop: 8, marginBottom: 32 }}>
        選擇要管理的系統
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: 20,
      }}>
        {SECTIONS.map(section => (
          <Link 
            key={section.href}
            href={section.href}
            style={{
              ...TOKENS.card,
              padding: 24,
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: section.color,
              marginBottom: 16,
            }} />
            <h2 style={{
              fontSize: 18,
              fontWeight: 600,
              color: TOKENS.color.text,
              margin: 0,
            }}>
              {section.title}
            </h2>
            <p style={{
              fontSize: 14,
              color: TOKENS.color.textSubtle,
              marginTop: 8,
              margin: '8px 0 0 0',
            }}>
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
