// Brand File Upload API - Supabase Storage Integration
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const brandSlug = formData.get('brandSlug') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
    const filePath = `${brandSlug}/${fileName}`
    
    // Convert File to ArrayBuffer then to Uint8Array for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    const { data, error } = await supabase.storage
      .from('brand-uploads')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false
      })
    
    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ 
        error: 'Upload failed', 
        details: error.message 
      }, { status: 500 })
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('brand-uploads')
      .getPublicUrl(filePath)
    
    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      fileName: file.name,
      fileSize: file.size,
      message: 'Upload successful - Supabase bucket "brand-uploads" configured'
    })
    
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: String(err)
    }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}