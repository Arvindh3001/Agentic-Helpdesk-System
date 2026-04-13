import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/whatsapp/logs?type=&status=&ticketId=
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type     = searchParams.get('type')     || ''
  const status   = searchParams.get('status')   || ''
  const ticketId = searchParams.get('ticketId') || ''

  const where: Record<string, unknown> = {}
  if (type)     where.type     = type
  if (status)   where.status   = status
  if (ticketId) where.ticketId = parseInt(ticketId)

  const logs = await prisma.whatsAppLog.findMany({
    where,
    include: { ticket: { select: { id: true, description: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const total   = await prisma.whatsAppLog.count()
  const sent    = await prisma.whatsAppLog.count({ where: { status: 'sent' } })
  const failed  = await prisma.whatsAppLog.count({ where: { status: 'failed' } })

  return NextResponse.json({ logs, stats: { total, sent, failed } })
}
