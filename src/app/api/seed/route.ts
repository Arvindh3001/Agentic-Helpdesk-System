import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CATEGORIES } from '@/lib/seed-data'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { secret } = await req.json()
  if (secret !== (process.env.SEED_SECRET || 'seed_helpdesk_2024')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Wipe all data in safe dependency order
    await prisma.whatsAppLog.deleteMany({})
    await prisma.feedback.deleteMany({})
    await prisma.ticket.deleteMany({})
    await prisma.technicianProfile.deleteMany({})
    await prisma.troubleshootingSolution.deleteMany({})
    await prisma.category.deleteMany({})
    await prisma.user.deleteMany({})

    // Seed categories + solutions
    for (const cat of CATEGORIES) {
      const category = await prisma.category.create({ data: { name: cat.name } })
      for (const sol of cat.solutions) {
        await prisma.troubleshootingSolution.create({
          data: { categoryId: category.id, title: sol.title, steps: sol.steps },
        })
      }
    }

    // Look up seeded categories
    const allCategories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
    const cat1Id = allCategories[0]?.id ?? 1
    const cat2Id = allCategories[1]?.id ?? 1

    const pw = hashPassword('password123')

    // Admin
    await prisma.user.create({
      data: { name: 'Arvindh Admin', email: 'arvindh3001@gmail.com', passwordHash: pw, role: 'Admin', phone: '+919000000001' },
    })

    // Technician 1
    const tech1 = await prisma.user.create({
      data: { name: 'Arjun Sharma', email: 'arjun.sharma@helpdesk.com', passwordHash: pw, role: 'Technician', phone: '+919000000002' },
    })
    await prisma.technicianProfile.create({
      data: { userId: tech1.id, isAvailable: true, currentWorkload: 0, zone: 'SJT', categoryId: cat1Id },
    })

    // Technician 2
    const tech2 = await prisma.user.create({
      data: { name: 'Meena Rajan', email: 'meena.rajan@helpdesk.com', passwordHash: pw, role: 'Technician', phone: '+919000000003' },
    })
    await prisma.technicianProfile.create({
      data: { userId: tech2.id, isAvailable: true, currentWorkload: 0, zone: 'TT', categoryId: cat2Id },
    })

    // Customer 1 — Gmail alias (+customer) delivers to same inbox as admin
    await prisma.user.create({
      data: { name: 'Priya Sharma', email: 'arvindh3001+customer@gmail.com', passwordHash: pw, role: 'Customer', phone: '+919347269870' },
    })

    // Customer 2
    await prisma.user.create({
      data: { name: 'Rahul Kumar', email: 'rahul.kumar@helpdesk.com', passwordHash: pw, role: 'Customer', phone: '+919000000005' },
    })

    return NextResponse.json({
      success: true,
      message: 'Seeded successfully!\n\nAdmin: arvindh3001@gmail.com / password123\nTech: arjun.sharma@helpdesk.com / password123\nCustomer: priya.sharma@helpdesk.com / password123',
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed failed: ' + String(error) }, { status: 500 })
  }
}
