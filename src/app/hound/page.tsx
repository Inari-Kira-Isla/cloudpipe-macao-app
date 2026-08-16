'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────
type FunctionModule = {
  id: string
  name: string
  nameEn: string
  icon: string
  description: string
  route: string
  color: string
}

// ── Six Function Modules ────────────────────────────────────────────────────
const FUNCTION_MODULES: FunctionModule[] = [
  {
    id: 'photos',
    name: '生活照',
    nameEn: 'Photos',
    icon: '📸',
    description: '上傳生活照片到 CloudNote',
    route: '/notes?mode=photos',
    color: '#ec4899',
  },
  {
    id: 'notes',
    name: '筆記',
    nameEn: 'Notes',
    icon: '📝',
    description: '建立和管理筆記',
    route: '/notes',
    color: '#8b5cf6',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    nameEn: 'YouTube',
    icon: '▶️',
    description: '影片 deep link 到 CloudSRT',
    route: 'https://cloudsrt.example.com', // TODO: 確認 CloudSRT URL
    color: '#ef4444',
  },
  {
    id: 'audio',
    name: '錄音',
    nameEn: 'Audio',
    icon: '🎙️',
    description: '錄音並轉寫',
    route: '/notes?mode=audio',
    color: '#f59e0b',
  },
  {
    id: 'docs',
    name: '文件',
    nameEn: 'Documents',
    icon: '📄',
    description: 'PDF/文件分析',
    route: '/notes?mode=docs',
    color: '#10b981',
  },
  {
    id: 'links',
    name: '連結',
    nameEn: 'Links',
    icon: '🔗',
    description: 'URL 書籤與擷取',
    route: '/notes?mode=links',
    color: '#3b82f6',
  },
]

// ── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg: '#09090b',
  card: '#18181b',
  cardBorder: 'rgba(255,255,255,0.08)',
  cardBorderHover: 'rgba(255,255,255,0.15)',
  text: '#fafafa',
  muted: 'rgba(255,255,255,0.5)',
  accent: '#6366f1',
}

// ── Components ──────────────────────────────────────────────────────────────

function ModuleCard({ 
  module, 
  onSelect 
}: { 
  module: FunctionModule
  onSelect: (m: FunctionModule) => void
}) {
  return (
    <button
      onClick={() => onSelect(module)}
      style={{
        background: T.card,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 16,
        padding: 24,
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = T.cardBorderHover
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 30px ${module.color}20`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = T.cardBorder
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ 
        width: 48, 
        height: 48, 
        borderRadius: 12, 
        background: `${module.color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
      }}>
        {module.icon}
      </div>
      <div>
        <h3 style={{ 
          margin: 0, 
          fontSize: 16, 
          fontWeight: 600, 
          color: T.text,
          marginBottom: 4,
        }}>
          {module.name}
        </h3>
        <p style={{ 
          margin: 0, 
          fontSize: 13, 
          color: T.muted,
          lineHeight: 1.4,
        }}>
          {module.description}
        </p>
      </div>
    </button>
  )
}

function UploadZone({ 
  activeModule, 
  onUploadComplete 
}: { 
  activeModule: FunctionModule | null
  onUploadComplete: (files: File[]) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  const handleUpload = async (files: File[]) => {
    setUploading(true)
    
    // Simulate upload - in production, call actual API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setUploading(false)
    onUploadComplete(files)
    
    // Route based on active module
    if (activeModule) {
      if (activeModule.id === 'youtube' && files[0]?.name.includes('youtube')) {
        // YouTube deep link
        window.open(activeModule.route, '_blank')
      } else {
        router.push(activeModule.route)
      }
    }
  }

  if (!activeModule) {
    return (
      <div style={{
        background: T.card,
        border: `2px dashed ${T.cardBorder}`,
        borderRadius: 16,
        padding: 48,
        textAlign: 'center',
        color: T.muted,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⬆️</div>
        <p style={{ margin: 0, fontSize: 14 }}>
          選擇上方功能模組，然後拖放檔案或點擊上傳
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: T.card,
        border: `2px dashed ${dragOver ? activeModule.color : T.cardBorder}`,
        borderRadius: 16,
        padding: 48,
        textAlign: 'center',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept={activeModule.id === 'docs' ? '.pdf,.doc,.docx,.txt' : '*'}
      />
      
      <div style={{ 
        width: 64, 
        height: 64, 
        borderRadius: 16, 
        background: `${activeModule.color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
        margin: '0 auto 16px',
      }}>
        {uploading ? '⏳' : activeModule.icon}
      </div>
      
      <h3 style={{ 
        margin: '0 0 8px', 
        fontSize: 18, 
        fontWeight: 600, 
        color: T.text,
      }}>
        {uploading ? '上傳中...' : `上傳到 ${activeModule.name}`}
      </h3>
      
      <p style={{ 
        margin: 0, 
        fontSize: 14, 
        color: T.muted,
        lineHeight: 1.5,
      }}>
        {uploading 
          ? '請稍候...' 
          : '拖放檔案到這裡，或點擊選擇檔案'}
      </p>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function HoundPage() {
  const [selectedModule, setSelectedModule] = useState<FunctionModule | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const handleModuleSelect = (module: FunctionModule) => {
    setSelectedModule(module)
    setUploadedFiles([])
  }

  const handleUploadComplete = (files: File[]) => {
    setUploadedFiles(files)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8, 
            padding: '6px 16px', 
            background: `${T.accent}20`,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: T.accent,
            marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }}></span>
            CloudPipe AutoBo
          </div>
          <h1 style={{ 
            margin: '0 0 12px', 
            fontSize: 'clamp(28px, 5vw, 40px)', 
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            選擇你的功能
          </h1>
          <p style={{ 
            margin: '0 auto', 
            fontSize: 15, 
            color: T.muted,
            maxWidth: 400,
          }}>
            從六個模組中選擇你要使用的功能，然後上傳檔案
          </p>
        </header>

        {/* Function Picker Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16, 
          marginBottom: 40,
        }}>
          {FUNCTION_MODULES.map(module => (
            <ModuleCard
              key={module.id}
              module={module}
              onSelect={handleModuleSelect}
            />
          ))}
        </div>

        {/* Upload Zone */}
        <UploadZone
          activeModule={selectedModule}
          onUploadComplete={handleUploadComplete}
        />

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ 
              margin: '0 0 12px', 
              fontSize: 14, 
              fontWeight: 600, 
              color: T.muted,
            }}>
              已上傳的檔案 ({uploadedFiles.length})
            </h4>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 8 
            }}>
              {uploadedFiles.map((file, i) => (
                <div key={i} style={{
                  background: T.card,
                  border: `1px solid ${T.cardBorder}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <span>📄</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{file.name}</span>
                  <span style={{ fontSize: 12, color: T.muted }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div style={{ 
          marginTop: 48, 
          paddingTop: 24, 
          borderTop: `1px solid ${T.cardBorder}`,
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}>
          <Link 
            href="/notes"
            style={{
              color: T.muted,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            前往筆記 →
          </Link>
          <Link 
            href="/macao"
            style={{
              color: T.muted,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            澳門百科 →
          </Link>
          <a 
            href="https://cloudsrt.example.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: T.muted,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            CloudSRT →
          </a>
        </div>

      </div>
    </div>
  )
}
