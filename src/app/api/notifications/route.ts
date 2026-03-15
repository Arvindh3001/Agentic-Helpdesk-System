import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/notifications - get notifications for current user
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generate notifications from ticket events
  const notifications = []

  if (user.role === 'Admin' || user.role === 'Technician') {
    // New unassigned tickets (pending)
    const pending = await prisma.ticket.findMany({
      where: { status: 'Pending' },
      include: { category: true, customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    for (const t of pending) {
      notifications.push({
        id: `pending-${t.id}`,
        type: 'new_ticket',
        title: 'New Ticket Awaiting Assignment',
        message: `#${t.id} – ${t.category.name} issue from ${t.customer.name}`,
        time: t.createdAt,
        ticketId: t.id,
        read: false,
        icon: '🎫',
      })
    }

    // SLA breaches
    const breached = await prisma.ticket.findMany({
      where: { status: { not: 'Resolved' }, slaDeadline: { lt: new Date(), not: null } },
      include: { category: true },
      take: 5,
    })
    for (const t of breached) {
      notifications.push({
        id: `sla-${t.id}`,
        type: 'sla_breach',
        title: '🚨 SLA Breach Alert',
        message: `Ticket #${t.id} (${t.category.name}) has exceeded its SLA deadline!`,
        time: t.slaDeadline!,
        ticketId: t.id,
        read: false,
        icon: '⏰',
      })
    }
  }

  if (user.role === 'Customer') {
    // Own ticket updates
    const myTickets = await prisma.ticket.findMany({
      where: { customerId: user.id },
      include: { category: true, assignedTech: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    for (const t of myTickets) {
      if (t.status === 'Assigned' && t.assignedTech) {
        notifications.push({
          id: `assigned-${t.id}`,
          type: 'ticket_assigned',
          title: 'Technician Assigned',
          message: `Ticket #${t.id} has been assigned to ${t.assignedTech.name}`,
          time: t.createdAt,
          ticketId: t.id,
          read: false,
          icon: '🔧',
        })
      }
      if (t.status === 'Resolved') {
        notifications.push({
          id: `resolved-${t.id}`,
          type: 'ticket_resolved',
          title: '✅ Ticket Resolved',
          message: `Ticket #${t.id} (${t.category.name}) has been resolved. Please leave feedback!`,
          time: t.resolvedAt || t.createdAt,
          ticketId: t.id,
          read: false,
          icon: '✅',
        })
      }
    }
  }

  // Sort by most recent first
  notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return NextResponse.json(notifications.slice(0, 15))
}
