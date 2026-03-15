import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  const hashed = hashPassword(password)
  const user = await prisma.user.findFirst({ where: { email, passwordHash: hashed } })
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const cookieStore = await cookies()
  cookieStore.set('session_user_id', String(user.id), { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 })
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
}
