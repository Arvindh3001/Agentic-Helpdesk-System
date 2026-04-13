import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendWhatsAppNotification } from '@/lib/whatsapp'

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
      WhatsAppLogs: { orderBy: { createdAt: 'desc' } },
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

  // Fetch current ticket + customer phone before update
  const existingTicket = await prisma.ticket.findUnique({
    where: { id: parseInt(id) },
    include: {
      customer: { select: { name: true, phone: true } },
      assignedTech: { select: { name: true } },
      category: { select: { name: true } },
    },
  })
  if (!existingTicket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.status) data.status = body.status

  if (body.status === 'Resolved') {
    data.resolvedAt = new Date()
    // Decrease technician workload
    if (existingTicket.assignedTechId) {
      const profile = await prisma.technicianProfile.findFirst({ where: { userId: existingTicket.assignedTechId } })
      if (profile && profile.currentWorkload > 0) {
        await prisma.technicianProfile.update({
          where: { id: profile.id },
          data: { currentWorkload: { decrement: 1 } },
        })
      }
      // Auto-assign next pending ticket
      const nextTicket = await prisma.ticket.findFirst({
        where: { status: 'Pending', assignedTechId: null },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      })
      if (nextTicket && profile) {
        await prisma.ticket.update({
          where: { id: nextTicket.id },
          data: { status: 'Assigned', assignedTechId: existingTicket.assignedTechId },
        })
        await prisma.technicianProfile.update({
          where: { id: profile.id },
          data: { currentWorkload: { increment: 1 } },
        })
      }
    }
  }

  if (body.assignedTechId !== undefined) data.assignedTechId = body.assignedTechId

  const updated = await prisma.ticket.update({
    where: { id: parseInt(id) },
    data,
    include: {
      category: true,
      customer: { select: { name: true, email: true } },
      assignedTech: { select: { name: true } },
    },
  })

  // ── WhatsApp notifications (non-blocking) ────────────────────────────────
  const customerPhone = existingTicket.customer.phone
  const customerName  = existingTicket.customer.name

  if (customerPhone) {
    if (body.status === 'Assigned') {
      // Fetch assigned tech name if assignedTechId was just set
      let techName = existingTicket.assignedTech?.name
      if (body.assignedTechId && !techName) {
        const tech = await prisma.user.findUnique({ where: { id: body.assignedTechId }, select: { name: true } })
        techName = tech?.name
      }
      sendWhatsAppNotification('TECH_ASSIGNED', existingTicket.id, customerPhone, customerName, {
        techName,
      }).catch(() => {})
    }

    if (body.status === 'Resolved') {
      sendWhatsAppNotification('TICKET_RESOLVED', existingTicket.id, customerPhone, customerName).catch(() => {})
      // Send feedback request after a short delay feel (fire and forget)
      setTimeout(() => {
        sendWhatsAppNotification('FEEDBACK_REQUEST', existingTicket.id, customerPhone, customerName).catch(() => {})
      }, 5000)
    }
  }

  return NextResponse.json(updated)
}
