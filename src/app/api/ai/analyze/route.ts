import { NextRequest, NextResponse } from 'next/server'
import { analyzeImage } from '@/lib/ai'

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || 'http://localhost:8000'

const CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Furniture',
  'Classroom Equipment',
  'Network / Internet',
  'Cleaning / Housekeeping',
  'Security',
  'Infrastructure / Building Maintenance',
]

async function analyzeWithGroqVision(imageFile: File): Promise<object | null> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey || groqKey === 'your_groq_api_key_here') return null

  try {
    const bytes = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(bytes).toString('base64')
    const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpeg'
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a campus facility management AI. Look at this image carefully and identify any maintenance issues.

Return ONLY this JSON (no markdown, no extra text):
{
  "detectedObject": "<main object or issue visible in the image>",
  "detectedLabel": "<brief label, e.g. 'Broken Chair Detected' or 'Water Leakage Detected'>",
  "category": "<one of: ${CATEGORIES.join(' | ')}>",
  "confidence": 0.9,
  "suggestions": ["<specific issue 1>", "<specific issue 2>", "<specific issue 3>"]
}`,
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const content: string = data.choices?.[0]?.message?.content ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0])
    if (parsed.category && parsed.detectedLabel) {
      return { ...parsed, source: 'groq-vision-fallback' }
    }
  } catch {
    // fall through
  }
  return null
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const imageFile = formData.get('image') as File | null
  if (!imageFile) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  // ── Step 1: Try real YOLO microservice ────────────────────────────────────
  try {
    const fd = new FormData()
    fd.append('image', imageFile, imageFile.name)

    const res = await fetch(`${YOLO_SERVICE_URL}/analyze`, {
      method: 'POST',
      body: fd,
      signal: AbortSignal.timeout(20000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch {
    console.warn('[analyze] YOLO service unavailable, trying Groq Vision fallback')
  }

  // ── Step 2: Groq Vision LLM (actually reads the image pixels) ────────────
  const groqResult = await analyzeWithGroqVision(imageFile)
  if (groqResult) return NextResponse.json(groqResult)

  // ── Step 3: Last resort — filename keyword matching ───────────────────────
  const result = await analyzeImage(imageFile.name)
  return NextResponse.json({ ...result, source: 'filename-fallback' })
}
