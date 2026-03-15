import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const total = await prisma.ticket.count()
  const resolved = await prisma.ticket.count({ where: { status: 'Resolved' } })
  const pending = await prisma.ticket.count({ where: { status: 'Pending' } })
  const assigned = await prisma.ticket.count({ where: { status: 'Assigned' } })
  const byCategory = await prisma.ticket.groupBy({ by: ['categoryId'], _count: { id: true } })
  const categories = await prisma.category.findMany()
  const byPriority = await prisma.ticket.groupBy({ by: ['priority'], _count: { id: true } })
  const byCategoryMapped = byCategory.map((b) => ({
    name: categories.find((c) => c.id === b.categoryId)?.name || 'Unknown',
    count: b._count.id,
  }))

  // Avg resolution time in hours
  const resolvedTickets = await prisma.ticket.findMany({ where: { status: 'Resolved', resolvedAt: { not: null } } })
  let avgResolutionHours = 0
  if (resolvedTickets.length > 0) {
    const totalMs = resolvedTickets.reduce((acc, t) => acc + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0)
    avgResolutionHours = Math.round((totalMs / resolvedTickets.length) / (1000 * 60 * 60) * 10) / 10
  }
  
  // SLA breaches (tickets past deadline that aren't resolved)
  const slaBreaches = await prisma.ticket.count({
    where: { status: { not: 'Resolved' }, slaDeadline: { lt: new Date() } }
  })

  const feedbackStats = await prisma.feedback.aggregate({ _avg: { rating: true }, _count: { id: true } })

  // Get detailed feedback breakdown
  const feedbackBreakdown = await prisma.feedback.groupBy({
    by: ['rating'],
    _count: { rating: true }
  })

  return NextResponse.json({
    total, resolved, pending, assigned, byCategory: byCategoryMapped,
    byPriority: byPriority.map((b) => ({ priority: b.priority, count: b._count.id })),
    avgResolutionHours, slaBreaches,
    avgRating: Math.round((feedbackStats._avg.rating || 0) * 10) / 10,
    totalFeedback: feedbackStats._count.id,
    feedbackBreakdown: feedbackBreakdown.sort((a, b) => b.rating - a.rating).map(f => ({
      stars: f.rating,
      count: f._count.rating
    }))
  })
}
