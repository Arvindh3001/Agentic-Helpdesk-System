import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - get technician locations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const zone = searchParams.get('zone')

  let where: any = { role: 'Technician' }
  if (zone && zone !== 'All') {
    where.technician = { zone: zone }
  }

  const techs = await prisma.user.findMany({
    where,
    include: {
      technician: {
        include: {
          category: { select: { name: true } }
        }
      }
    },
  })
  return NextResponse.json(techs)
}


// PATCH - update own location (technician)
export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== 'Technician') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { block, isAvailable } = await req.json()
  const profile = await prisma.technicianProfile.update({
    where: { userId: user.id },
    data: {
      ...(isAvailable !== undefined ? { isAvailable } : {}),
    },
  })
  return NextResponse.json(profile)
}
