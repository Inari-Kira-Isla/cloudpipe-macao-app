'use client'

import { useState, useCallback } from 'react'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  status: 'uploading' | 'processing' | 'done' | 'error'
  progress: number
  extractedText?: string
}

interface BrandFileUploadProps {
  brandSlug: string
  onUploadComplete?: (file: UploadedFile) => void
}

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']

export default function BrandFileUpload({ brandSlug, onUploadComplete }: BrandFileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    handleFiles(dropped)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = async (newFiles: File[]) => {
    const validFiles = newFiles.filter(f => ALLOWED_TYPES.includes(f.type))
    if (validFiles.length === 0) return

    setUploading(true)
    
    for (const file of validFiles) {
      const fileId = `${Date.now()}-${file.name}`
      
      // Create placeholder entry
      const placeholder: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
      }
      setFiles(prev => [...prev, placeholder])

      try {
        // Upload to Supabase Storage
        const formData = new FormData()
        formData.append('file', file)
        formData.append('brandSlug', brandSlug)
        
        const res = await fetch('/api/v1/brand/file-upload', {
          method: 'POST',
          body: formData,
        })
        
        if (res.ok) {
          const data = await res.json()
          setFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'processing' as const, url: data.url, progress: 50 }
              : f
          ))
          
          // Extract text from PDF
          const extractRes = await fetch('/api/v1/brand/pdf-extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: data.url, fileId }),
          })
          
          if (extractRes.ok) {
            const extractData = await extractRes.json()
            setFiles(prev => prev.map(f =>
              f.id === fileId 
                ? { ...f, status: 'done' as const, progress: 100, extractedText: extractData.text }
                : f
            ))
            onUploadComplete?.(files.find(f => f.id === fileId)!)
          } else {
            setFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, status: 'error' as const } : f
            ))
          }
        }
      } catch (err) {
        console.error('Upload error:', err)
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: 'error' as const } : f
        ))
      }
    }
    
    setUploading(false)
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-input"
        />
        <label htmlFor="file-upload-input" className="cursor-pointer">
          <div className="text-gray-600">
            <p className="font-medium">拖放文件或点击上传</p>
            <p className="text-sm mt-1">支持 PDF、DOCX、TXT（最大 10MB）</p>
          </div>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB · {file.status}
                </p>
              </div>
              {file.status === 'uploading' && (
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all" 
                    style={{ width: `${file.progress}%` }} 
                  />
                </div>
              )}
              {file.status === 'done' && <span className="text-green-600">✓</span>}
              {file.status === 'error' && <span className="text-red-600">✗</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}