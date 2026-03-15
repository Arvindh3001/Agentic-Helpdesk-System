import { NextResponse } from 'next/server'
import { getPredictiveAlerts } from '@/lib/ai'

export async function GET() {
  const alerts = await getPredictiveAlerts()
  return NextResponse.json(alerts)
}
