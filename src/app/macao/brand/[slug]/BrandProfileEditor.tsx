'use client'

import { useEffect, useState } from 'react'

const navy = '#08111F'
const gold = '#F5C842'
const glass = 'rgba(255,255,255,0.04)'
const glassBorder = 'rgba(255,255,255,0.08)'
const textPrimary = '#DCE6F4'
const textMuted = 'rgba(220,230,244,0.5)'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  color: textPrimary,
  fontSize: 13,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: textMuted,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 4,
}

const btnPrimary: React.CSSProperties = {
  background: gold,
  color: navy,
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
}

interface ProfileData {
  name_zh?: string
  name_en?: string
  tagline?: string
  description?: string
  phone?: string
  address?: string
  website_url?: string
  instagram_url?: string
  facebook_url?: string
}

export default function BrandProfileEditor({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<ProfileData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    fetch(`/api/v1/brand-profile/${slug}`)
      .then(r => r.json())
      .then(d => setProfile(d || {}))
      .catch(() => setProfile({}))
      .finally(() => setLoading(false))
  }, [slug])

  const handleChange = (key: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`/api/v1/brand-profile/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (res.ok) {
        setSaveMsg('已儲存')
      } else {
        setSaveMsg('儲存失敗，請稍後再試')
      }
    } catch {
      setSaveMsg('網路錯誤')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  const fields: { key: keyof ProfileData; label: string; placeholder?: string }[] = [
    { key: 'name_zh', label: '品牌名稱（中文）', placeholder: '例：稻荷環球食品' },
    { key: 'name_en', label: '品牌名稱（英文）', placeholder: 'e.g. Inari Global Foods' },
    { key: 'tagline', label: '品牌標語', placeholder: '一句話說明品牌' },
    { key: 'description', label: '品牌簡介', placeholder: '詳細描述品牌背景與服務...' },
    { key: 'phone', label: '聯絡電話', placeholder: '+853 XXXX XXXX' },
    { key: 'address', label: '地址', placeholder: '澳門...' },
    { key: 'website_url', label: '網站', placeholder: 'https://...' },
    { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/...' },
    { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 44, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      background: glass,
      border: `1px solid ${glassBorder}`,
      borderRadius: 14,
      padding: '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: gold, marginBottom: 4 }}>
        🏢 品牌資料
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {fields.map(f => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={labelStyle}>{f.label}</div>
            {f.key === 'description' ? (
              <textarea
                value={profile[f.key] || ''}
                onChange={e => handleChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            ) : (
              <input
                type="text"
                value={profile[f.key] || ''}
                onChange={e => handleChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={inputStyle}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
          {saving ? '儲存中…' : '儲存變更'}
        </button>
        {saveMsg && (
          <span style={{
            fontSize: 12,
            color: saveMsg === '已儲存' ? '#4ADE80' : '#F87171',
          }}>
            {saveMsg}
          </span>
        )}
      </div>
    </div>
  )
}
