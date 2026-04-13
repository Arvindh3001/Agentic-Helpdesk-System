import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, predictPriority, calculateSlaDeadline } from '@/lib/auth'
import { sendTicketCreatedEmail } from '@/lib/email'
import { analyzeComplaintWithLLM, summarizeComplaint, detectDuplicateComplaint } from '@/lib/ai'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET /api/tickets
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
    include: {
      customer: { select: { name: true, email: true } },
      category: true,
      assignedTech: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tickets)
}

// POST /api/tickets
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

  // ── IMAGE UPLOAD ──────────────────────────────────────────────────────────
  let imageUrl: string | null = null
  let imageDetectedObject: string | null = null
  let imageConfidence: number | null = null
  let imagePredictedCategory: string | null = null

  if (imageFile && imageFile.size > 0) {
    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    const filename = `${Date.now()}-${imageFile.name}`
    await writeFile(path.join(uploadDir, filename), buffer)
    imageUrl = `/uploads/${filename}`

    // Store image analysis results passed from the frontend (already run client-side)
    imageDetectedObject = (formData.get('imageDetectedObject') as string) || null
    imageConfidence = formData.get('imageConfidence') ? parseFloat(formData.get('imageConfidence') as string) : null
    imagePredictedCategory = (formData.get('imagePredictedCategory') as string) || null
  }

  // ── LLM COMPLAINT ANALYSIS ───────────────────────────────────────────────
  const llmResult = await analyzeComplaintWithLLM(description)
  const aiSummary = summarizeComplaint(description)

  // ── DUPLICATE DETECTION ──────────────────────────────────────────────────
  if (!forceSubmit) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const recentTickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: yesterday },
        status: { in: ['Pending', 'Assigned'] },
      },
      select: { id: true, description: true, category: true, categoryId: true, zone: true },
    })

    const dupResult = detectDuplicateComplaint(description, recentTickets, { categoryId, zone })
    if (dupResult.isDuplicate && dupResult.matchedTicketId) {
      const matched = recentTickets.find(t => t.id === dupResult.matchedTicketId)
      return NextResponse.json(
        {
          error: 'Potential duplicate detected',
          duplicate: {
            id: dupResult.matchedTicketId,
            description: matched?.description || '',
            category: matched?.category.name || '',
            createdAt: new Date().toISOString(),
            similarityScore: dupResult.similarityScore,
          },
        },
        { status: 409 },
      )
    }
  }

  // ── PRIORITY + SLA ───────────────────────────────────────────────────────
  const priority = llmResult.priority !== 'Low' ? llmResult.priority : predictPriority(description)
  const slaDeadline = calculateSlaDeadline(priority)

  // ── TECHNICIAN ASSIGNMENT ────────────────────────────────────────────────
  const techProfile = await prisma.technicianProfile.findFirst({
    where: { isAvailable: true, zone, categoryId },
    orderBy: { currentWorkload: 'asc' },
    include: { user: true },
  })

  // ── CREATE TICKET ────────────────────────────────────────────────────────
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
      // LLM fields
      aiSummary,
      aiCategory: llmResult.category || null,
      aiPriority: llmResult.priority,
      aiLocation: llmResult.location || null,
      aiTroubleshooting: JSON.stringify(llmResult.troubleshooting),
      // Image fields
      imageDetectedObject,
      imageConfidence,
      imagePredictedCategory,
      // Duplicate flag
      isDuplicate: false,
    },
    include: {
      category: true,
      customer: { select: { name: true, email: true } },
      assignedTech: { select: { name: true } },
    },
  })

  // Update technician workload
  if (techProfile) {
    await prisma.technicianProfile.update({
      where: { id: techProfile.id },
      data: { currentWorkload: { increment: 1 } },
    })
  }

  // Send email notification
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } })
  if (category) {
    try {
      await sendTicketCreatedEmail({
        ticketId: ticket.id,
        customerName: user.name,
        customerEmail: (await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }))?.email || '',
        description: ticket.description,
        category: category.name,
        zone,
        priority: ticket.priority,
        status: ticket.status,
        assignedTech: techProfile?.user.name,
        slaDeadline: ticket.slaDeadline || undefined,
      })
    } catch { /* email failure does not block ticket creation */ }
  }

  // Send WhatsApp notifications (non-blocking)
  const customerPhone = (await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }))?.phone
  if (customerPhone) {
    // Ticket submitted
    sendWhatsAppNotification('TICKET_SUBMITTED', ticket.id, customerPhone, user.name, {
      category: ticket.category.name,
      priority: ticket.priority,
    }).catch(() => {})

    // If already assigned, also send tech-assigned notification
    if (ticket.status === 'Assigned' && techProfile) {
      sendWhatsAppNotification('TECH_ASSIGNED', ticket.id, customerPhone, user.name, {
        techName: techProfile.user.name,
      }).catch(() => {})
    }
  }

  return NextResponse.json(ticket)
}
