import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({ include: { Solutions: true } })
  return NextResponse.json(categories)
}
