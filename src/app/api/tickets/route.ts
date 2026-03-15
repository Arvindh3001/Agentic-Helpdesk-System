import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, predictPriority, calculateSlaDeadline } from '@/lib/auth'
import { sendTicketCreatedEmail } from '@/lib/email'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Simple NLP similarity check for duplicate detection
function findDuplicateTicket(newDescription: string, existingTickets: any[]): any | null {
  const newWords = extractKeywords(newDescription.toLowerCase())

  for (const ticket of existingTickets) {
    const existingWords = extractKeywords(ticket.description.toLowerCase())
    const similarity = calculateSimilarity(newWords, existingWords)

    // If similarity is above 70%, consider it a potential duplicate
    if (similarity > 0.7) {
      return ticket
    }
  }
  return null
}

// Extract meaningful keywords from description
function extractKeywords(text: string): string[] {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their']

  return text
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 2 && !stopWords.includes(word)) // Filter meaningful words
    .slice(0, 20) // Take first 20 keywords to avoid processing too much
}

// Calculate Jaccard similarity between two sets of keywords
function calculateSimilarity(words1: string[], words2: string[]): number {
  const set1 = new Set(words1)
  const set2 = new Set(words2)

  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return union.size === 0 ? 0 : intersection.size / union.size
}

// GET /api/tickets - list tickets
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: Record<string, unknown> = {}
  if (user.role === 'Customer') where.customerId = user.id
  if (user.role === 'Technician') where.assignedTechId = user.id
  if (status) where.status = status
  const tickets = await prisma.ticket.findMany({
    where,
    include: { customer: { select: { name: true, email: true } }, category: true, assignedTech: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tickets)
}

// POST /api/tickets - create ticket
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const description = formData.get('description') as string
  const categoryId = parseInt(formData.get('categoryId') as string)
  const zone = formData.get('zone') as string
  const imageFile = formData.get('image') as File | null
  const forceSubmit = formData.get('forceSubmit') === 'true'

  if (!description || !categoryId || !zone) {
    return NextResponse.json({ error: 'Description, category, and zone are required' }, { status: 400 })
  }

  let imageUrl: string | null = null
  if (imageFile && imageFile.size > 0) {
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    const filename = `${Date.now()}-${imageFile.name}`
    await writeFile(path.join(uploadDir, filename), buffer)
    imageUrl = `/uploads/${filename}`
  }

  // Check for duplicate tickets in the last 24 hours (unless forcing submit)
  if (!forceSubmit) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const recentTickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: yesterday },
        status: { in: ['Pending', 'Assigned'] }, // Only unresolved tickets
      },
      include: { category: true }
    })

    // Simple NLP similarity check
    const duplicateTicket = findDuplicateTicket(description, recentTickets)
    if (duplicateTicket) {
      return NextResponse.json(
        {
          error: 'Potential duplicate detected',
          duplicate: {
            id: duplicateTicket.id,
            description: duplicateTicket.description,
            category: duplicateTicket.category.name,
            createdAt: duplicateTicket.createdAt
          }
        },
        { status: 409 }
      )
    }
  }

  const priority = predictPriority(description)
  const slaDeadline = calculateSlaDeadline(priority)

  // Find the best available technician with the lowest workload in the same zone and category
  const techProfile = await prisma.technicianProfile.findFirst({
    where: {
      isAvailable: true,
      zone: zone,
      categoryId: categoryId
    },
    orderBy: { currentWorkload: 'asc' },
    include: { user: true },
  })

  const ticket = await prisma.ticket.create({
    data: {
      customerId: user.id,
      categoryId,
      description,
      imageUrl,
      zone,
      priority,
      slaDeadline,
      status: techProfile ? 'Assigned' : 'Pending',
      assignedTechId: techProfile?.userId || null,
    },
    include: {
      category: true,
      customer: { select: { name: true, email: true } },
      assignedTech: { select: { name: true } }
    },
  })

  if (techProfile) {
    await prisma.technicianProfile.update({
      where: { id: techProfile.id },
      data: { currentWorkload: { increment: 1 } },
    })
  }

  // Get customer and category info for email
  const customer = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true }
  })

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { name: true }
  })

  // Send email notification to customer
  if (customer && category) {
    try {
      await sendTicketCreatedEmail({
        ticketId: ticket.id,
        customerName: customer.name,
        customerEmail: customer.email,
        description: ticket.description,
        category: category.name,
        zone: zone,
        priority: ticket.priority,
        status: ticket.status,
        assignedTech: techProfile?.user.name,
        slaDeadline: ticket.slaDeadline || undefined,
      })
    } catch (error) {
      console.error('Failed to send ticket creation email:', error)
      // Don't fail the ticket creation if email fails
    }
  }

  return NextResponse.json(ticket)
}
