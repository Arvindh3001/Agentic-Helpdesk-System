import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CATEGORIES } from '@/lib/seed-data'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { secret } = await req.json()
  if (secret !== (process.env.SEED_SECRET || 'seed_helpdesk_2024')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Wipe old data in dependency order (foreign keys)
  await prisma.feedback.deleteMany({})
  await prisma.ticket.deleteMany({})
  await prisma.troubleshootingSolution.deleteMany({})
  await prisma.category.deleteMany({})


  // Seed categories + solutions
  for (const cat of CATEGORIES) {
    const category = await prisma.category.create({ data: { name: cat.name } })
    for (const sol of cat.solutions) {
      await prisma.troubleshootingSolution.create({ data: { categoryId: category.id, title: sol.title, steps: sol.steps } })
    }
  }


  // Seed demo users
  const adminHash = hashPassword('admin123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@helpdesk.com' },
    create: { name: 'Admin User', email: 'admin@helpdesk.com', passwordHash: adminHash, role: 'Admin' },
    update: {},
  })

  // Look up seeded categories so we can assign them to technicians
  const allCategories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
  const cat1Id = allCategories[0]?.id ?? 1
  const cat2Id = allCategories[1]?.id ?? 1

  const techHash = hashPassword('tech123')
  const tech1 = await prisma.user.upsert({
    where: { email: 'alice@helpdesk.com' },
    create: { name: 'Alice Tech', email: 'alice@helpdesk.com', passwordHash: techHash, role: 'Technician' },
    update: {},
  })
  await prisma.technicianProfile.upsert({
    where: { userId: tech1.id },
    create: { userId: tech1.id, isAvailable: true, currentWorkload: 0, zone: 'SJT', categoryId: cat1Id },
    update: {},
  })

  const tech2 = await prisma.user.upsert({
    where: { email: 'bob@helpdesk.com' },
    create: { name: 'Bob Tech', email: 'bob@helpdesk.com', passwordHash: techHash, role: 'Technician' },
    update: {},
  })
  await prisma.technicianProfile.upsert({
    where: { userId: tech2.id },
    create: { userId: tech2.id, isAvailable: true, currentWorkload: 0, zone: 'TT', categoryId: cat2Id },
    update: {},
  })

  const custHash = hashPassword('user123')
  await prisma.user.upsert({
    where: { email: 'john@company.com' },
    create: { name: 'John Customer', email: 'john@company.com', passwordHash: custHash, role: 'Customer' },
    update: {},
  })
  await prisma.user.upsert({
    where: { email: 'jane@company.com' },
    create: { name: 'Jane Customer', email: 'jane@company.com', passwordHash: custHash, role: 'Customer' },
    update: {},
  })

  return NextResponse.json({ success: true, message: 'Database seeded successfully' })
}
