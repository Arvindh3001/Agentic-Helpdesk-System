import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'Admin' && user.role !== 'Technician') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── All feedback entries with full context ──────────────────────
  const allFeedback = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      ticket: {
        include: {
          customer:     { select: { name: true, email: true } },
          assignedTech: { select: { name: true, email: true } },
          category:     { select: { name: true } },
        },
      },
    },
  })

  // ── Per-technician rating aggregation ──────────────────────────
  const techMap: Record<number, {
    techId: number
    techName: string
    techEmail: string
    ratings: number[]
    lowRatingCount: number
  }> = {}

  for (const fb of allFeedback) {
    const tech = fb.ticket.assignedTech
    if (!tech) continue
    const techId = fb.ticket.assignedTechId as number
    if (!techMap[techId]) {
      techMap[techId] = {
        techId,
        techName:  tech.name,
        techEmail: tech.email,
        ratings: [],
        lowRatingCount: 0,
      }
    }
    techMap[techId].ratings.push(fb.rating)
    if (fb.rating <= 2) techMap[techId].lowRatingCount++
  }

  const technicianRatings = Object.values(techMap).map(t => ({
    techId:        t.techId,
    techName:      t.techName,
    techEmail:     t.techEmail,
    avgRating:     Math.round((t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length) * 10) / 10,
    totalFeedback: t.ratings.length,
    lowRatingCount: t.lowRatingCount,
    ratingDist:    [1, 2, 3, 4, 5].map(star => ({ star, count: t.ratings.filter(r => r === star).length })),
  })).sort((a, b) => b.avgRating - a.avgRating)

  // ── Overall stats ───────────────────────────────────────────────
  const allRatings = allFeedback.map(f => f.rating)
  const overallAvg = allRatings.length > 0
    ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
    : 0

  return NextResponse.json({
    overallAvg,
    totalFeedback: allFeedback.length,
    lowRatingCount: allRatings.filter(r => r <= 2).length,
    ratingDist: [1, 2, 3, 4, 5].map(star => ({
      star,
      count: allRatings.filter(r => r === star).length,
    })),
    technicianRatings,
    recentFeedback: allFeedback.slice(0, 50).map(fb => ({
      id:           fb.id,
      rating:       fb.rating,
      comments:     fb.comments,
      createdAt:    fb.createdAt,
      ticketId:     fb.ticketId,
      category:     fb.ticket.category.name,
      customerName: fb.ticket.customer.name,
      techName:     fb.ticket.assignedTech?.name ?? 'Unassigned',
    })),
  })
}
