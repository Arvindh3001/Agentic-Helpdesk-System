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
  const resolvedRole = role || 'Customer'

  // TechnicianProfile requires zone + categoryId which are not collected at registration.
  // The profile is created later by an admin or via the seed route.
  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashed, role: resolvedRole },
  })

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
}
