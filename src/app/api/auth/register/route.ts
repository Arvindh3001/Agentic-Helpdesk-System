import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { name, email, password, role } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }
  const hashed = hashPassword(password)
  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashed, role: role || 'Customer' },
  })
  if (user.role === 'Technician') {
    await prisma.technicianProfile.create({ data: { userId: user.id } })
  }
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
}
