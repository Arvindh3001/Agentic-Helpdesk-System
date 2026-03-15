import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins and technicians can view performance metrics
  if (user.role !== 'Admin' && user.role !== 'Technician') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Get all technicians with their tickets
    const technicians = await prisma.user.findMany({
      where: { role: 'Technician' },
      include: {
        ticketsAsTech: {
          include: {
            category: { select: { name: true } }
          }
        },
        technician: {
          include: {
            category: { select: { name: true } }
          }
        }
      }
    })

    const performanceData = technicians.map(tech => {
      const tickets = tech.ticketsAsTech
      const resolvedTickets = tickets.filter(t => t.status === 'Resolved' && t.resolvedAt)

      // Calculate average resolution time
      let avgResolutionTime = 0
      if (resolvedTickets.length > 0) {
        const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
          if (ticket.resolvedAt) {
            const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime()
            return sum + resolutionTime
          }
          return sum
        }, 0)
        avgResolutionTime = totalResolutionTime / resolvedTickets.length
      }

      // Convert milliseconds to hours
      const avgResolutionHours = Math.round((avgResolutionTime / (1000 * 60 * 60)) * 10) / 10

      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        isAvailable: tech.technician?.isAvailable || false,
        currentWorkload: tech.technician?.currentWorkload || 0,
        zone: tech.technician?.zone || 'Unknown',
        category: tech.technician?.category?.name || 'Unknown',
        totalAssigned: tickets.length,
        totalResolved: resolvedTickets.length,
        avgResolutionTime: avgResolutionHours,
        resolutionRate: tickets.length > 0 ? Math.round((resolvedTickets.length / tickets.length) * 100) : 0,
        recentActivity: tickets
          .filter(t => {
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            return t.createdAt >= oneWeekAgo
          })
          .length
      }
    })

    // Sort by total resolved tickets descending
    performanceData.sort((a, b) => b.totalResolved - a.totalResolved)

    return NextResponse.json(performanceData)
  } catch (error) {
    console.error('Error fetching technician performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}