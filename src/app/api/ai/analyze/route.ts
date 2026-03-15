import { NextRequest, NextResponse } from 'next/server'
import { analyzeImage } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const imageFile = formData.get('image') as File | null
  if (!imageFile) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1200))

  const result = await analyzeImage(imageFile.name)
  return NextResponse.json(result)
}
