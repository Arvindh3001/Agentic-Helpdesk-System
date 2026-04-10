import { NextRequest, NextResponse } from 'next/server'
import { getPredictiveAlerts, analyzeComplaintWithLLM } from '@/lib/ai'

// GET /api/ai/predict — predictive maintenance alerts
export async function GET() {
  const alerts = await getPredictiveAlerts()
  return NextResponse.json(alerts)
}

// POST /api/ai/predict — analyse complaint text with LLM logic
export async function POST(req: NextRequest) {
  const { description } = await req.json()
  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description required' }, { status: 400 })
  }
  const result = analyzeComplaintWithLLM(description)
  return NextResponse.json(result)
}
