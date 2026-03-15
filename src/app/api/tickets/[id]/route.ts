import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/tickets/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) },
    include: {
      customer: { select: { name: true, email: true } },
      category: true,
      assignedTech: { select: { name: true, email: true } },
      Feedback: true,
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(ticket)
}

// PATCH /api/tickets/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.status) data.status = body.status
  if (body.status === 'Resolved') {
    data.resolvedAt = new Date()
    // Decrease technician workload
    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } })
    if (ticket?.assignedTechId) {
      const profile = await prisma.technicianProfile.findFirst({ where: { userId: ticket.assignedTechId } })
      if (profile && profile.currentWorkload > 0) {
        await prisma.technicianProfile.update({
          where: { id: profile.id },
          data: { currentWorkload: { decrement: 1 } },
        })
      }
      // Check queue and assign next pending ticket
      const nextTicket = await prisma.ticket.findFirst({
        where: { status: 'Pending', assignedTechId: null },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      })
      if (nextTicket) {
        await prisma.ticket.update({
          where: { id: nextTicket.id },
          data: { status: 'Assigned', assignedTechId: ticket.assignedTechId },
        })
        await prisma.technicianProfile.update({
          where: { id: profile!.id },
          data: { currentWorkload: { increment: 1 } },
        })
      }
    }
  }
  if (body.assignedTechId !== undefined) data.assignedTechId = body.assignedTechId
  const updated = await prisma.ticket.update({
    where: { id: parseInt(id) },
    data,
    include: { category: true, customer: { select: { name: true, email: true } }, assignedTech: { select: { name: true } } },
  })
  return NextResponse.json(updated)
}
