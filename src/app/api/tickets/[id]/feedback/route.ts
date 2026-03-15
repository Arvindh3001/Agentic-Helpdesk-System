import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { rating, comments } = await req.json()
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
  }
  const feedback = await prisma.feedback.upsert({
    where: { ticketId: parseInt(id) },
    create: { ticketId: parseInt(id), rating, comments: comments || '' },
    update: { rating, comments: comments || '' },
  })
  return NextResponse.json(feedback)
}
