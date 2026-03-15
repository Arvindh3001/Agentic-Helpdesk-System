import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/technicians - list technicians with profiles
export async function GET() {
  const techs = await prisma.user.findMany({
    where: { role: 'Technician' },
    include: { technician: true, ticketsAsTech: { where: { status: { not: 'Resolved' } } } },
  })
  return NextResponse.json(techs)
}

// PATCH /api/technicians - update own availability
export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== 'Technician') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { isAvailable } = await req.json()
  const profile = await prisma.technicianProfile.update({
    where: { userId: user.id },
    data: { isAvailable },
  })

  // If technician becomes available, auto-assign pending tickets
  if (isAvailable) {
    const pendingTickets = await prisma.ticket.findMany({
      where: { status: 'Pending', assignedTechId: null },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 1,
    })
    if (pendingTickets.length > 0) {
      await prisma.ticket.update({
        where: { id: pendingTickets[0].id },
        data: { status: 'Assigned', assignedTechId: user.id },
      })
      await prisma.technicianProfile.update({
        where: { userId: user.id },
        data: { currentWorkload: { increment: 1 } },
      })
    }
  }
  return NextResponse.json(profile)
}
