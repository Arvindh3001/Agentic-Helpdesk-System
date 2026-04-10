import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'Admin' && user.role !== 'Technician') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const technicians = await prisma.user.findMany({
      where: { role: 'Technician' },
      include: {
        ticketsAsTech: {
          include: {
            category: { select: { name: true } },
            Feedback:  { select: { rating: true } },
          },
        },
        technician: {
          include: { category: { select: { name: true } } },
        },
      },
    })

    const performanceData = technicians.map(tech => {
      const tickets        = tech.ticketsAsTech
      const resolvedTickets = tickets.filter(t => t.status === 'Resolved' && t.resolvedAt)

      // Avg resolution time (hours)
      let avgResolutionTime = 0
      if (resolvedTickets.length > 0) {
        const totalMs = resolvedTickets.reduce((sum, t) => {
          return sum + (t.resolvedAt ? t.resolvedAt.getTime() - t.createdAt.getTime() : 0)
        }, 0)
        avgResolutionTime = totalMs / resolvedTickets.length
      }
      const avgResolutionHours = Math.round((avgResolutionTime / (1000 * 60 * 60)) * 10) / 10

      // Avg satisfaction rating from feedback on assigned tickets
      const feedbackRatings = tickets
        .filter(t => t.Feedback)
        .map(t => t.Feedback!.rating)
      const avgRating = feedbackRatings.length > 0
        ? Math.round((feedbackRatings.reduce((a, b) => a + b, 0) / feedbackRatings.length) * 10) / 10
        : null
      const lowRatingCount = feedbackRatings.filter(r => r <= 2).length

      return {
        id:              tech.id,
        name:            tech.name,
        email:           tech.email,
        isAvailable:     tech.technician?.isAvailable    ?? false,
        currentWorkload: tech.technician?.currentWorkload ?? 0,
        zone:            tech.technician?.zone            ?? 'Unknown',
        category:        tech.technician?.category?.name ?? 'Unknown',
        totalAssigned:   tickets.length,
        totalResolved:   resolvedTickets.length,
        avgResolutionTime: avgResolutionHours,
        resolutionRate: tickets.length > 0
          ? Math.round((resolvedTickets.length / tickets.length) * 100)
          : 0,
        recentActivity: tickets.filter(t => {
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          return t.createdAt >= oneWeekAgo
        }).length,
        // Feedback
        avgRating,
        totalFeedback:  feedbackRatings.length,
        lowRatingCount,
      }
    })

    performanceData.sort((a, b) => b.totalResolved - a.totalResolved)
    return NextResponse.json(performanceData)

  } catch (error) {
    console.error('Error fetching technician performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
