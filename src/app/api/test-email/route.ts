import { NextRequest, NextResponse } from 'next/server'
import { sendTicketCreatedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    // Test email with sample ticket data
    const testTicketData = {
      ticketId: 999,
      customerName: 'Test User',
      customerEmail: email,
      description: 'This is a test ticket to verify email functionality is working correctly.',
      category: 'Network / Internet',
      zone: 'SJT',
      priority: 'Medium',
      status: 'Pending',
      assignedTech: undefined,
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    }

    const success = await sendTicketCreatedEmail(testTicketData)

    if (success) {
      return NextResponse.json({ message: 'Test email sent successfully!' })
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email. Check email configuration.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}