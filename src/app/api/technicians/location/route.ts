import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET — all technician locations (admin use, for the map)
export async function GET() {
  const techs = await prisma.user.findMany({
    where: { role: 'Technician' },
    select: {
      id: true,
      name: true,
      email: true,
      technician: {
        select: {
          isAvailable: true,
          currentWorkload: true,
          zone: true,
          latitude: true,
          longitude: true,
          locationUpdatedAt: true,
          category: { select: { name: true } },
        },
      },
    },
  })
  return NextResponse.json(techs)
}

// PATCH — technician updates their own location
export async function PATCH(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== 'Technician') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { latitude, longitude, isAvailable } = body

  const updateData: Record<string, unknown> = {}
  if (isAvailable !== undefined) updateData.isAvailable = isAvailable
  if (latitude !== undefined && longitude !== undefined) {
    updateData.latitude = latitude
    updateData.longitude = longitude
    updateData.locationUpdatedAt = new Date()
  }

  const profile = await prisma.technicianProfile.update({
    where: { userId: user.id },
    data: updateData,
  })

  return NextResponse.json(profile)
}
