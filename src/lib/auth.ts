import crypto from 'crypto'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + process.env.NEXTAUTH_SECRET).digest('hex')
}

export async function getSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_user_id')?.value
  if (!sessionId) return null
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(sessionId) },
      select: { id: true, name: true, email: true, role: true },
    })
    return user
  } catch {
    return null
  }
}

export function predictPriority(description: string): string {
  const desc = description.toLowerCase()
  const highKeywords = ['urgent', 'critical', 'down', 'crash', 'broken', 'not working', 'emergency', 'failed', 'error', 'virus', 'hack', 'breach', 'data loss', 'server', 'outage']
  const medKeywords = ['slow', 'issue', 'problem', 'intermittent', 'sometimes', 'delay', 'trouble', 'fail', 'incorrect', 'wrong']
  for (const kw of highKeywords) {
    if (desc.includes(kw)) return 'High'
  }
  for (const kw of medKeywords) {
    if (desc.includes(kw)) return 'Medium'
  }
  return 'Low'
}

export function calculateSlaDeadline(priority: string): Date {
  const now = new Date()
  const hoursMap: Record<string, number> = { High: 4, Medium: 24, Low: 72 }
  const hours = hoursMap[priority] ?? 72
  return new Date(now.getTime() + hours * 60 * 60 * 1000)
}
