import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { currentUser } from '@/lib/oliv-auth'

export const runtime = 'nodejs'

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Sign in to upload images.' }, { status: 401 })
    if (user.role !== 'AGENT' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Agent access required.' }, { status: 403 })
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Image storage is not configured yet. Add your Cloudinary keys to .env, or paste image URLs instead.' }, { status: 503 })
    }
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Attach an image file.' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Images must be 8MB or smaller.' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`
    const upload = await cloudinary.uploader.upload(dataUrl, { folder: 'oliv-homes', resource_type: 'image' })
    return NextResponse.json({ url: upload.secure_url, publicId: upload.public_id })
  } catch (error) {
    console.error('[oliv] image upload failed:', error)
    return NextResponse.json({ error: 'Image upload failed. Please try again.' }, { status: 500 })
  }
}