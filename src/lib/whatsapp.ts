import { prisma } from './prisma'

// SMS Notifications via Textbelt (free: 1 SMS/day) or Fast2SMS (paid: ₹100 min)
// Textbelt: use key "textbelt" for 1 free/day, or buy credits at textbelt.com
// Fast2SMS: get key from fast2sms.com dashboard (requires ₹100 recharge)
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || ''
const TEXTBELT_KEY     = process.env.TEXTBELT_KEY || 'textbelt'

export type WaType =
  | 'TICKET_SUBMITTED'
  | 'TECH_ASSIGNED'
  | 'TICKET_RESOLVED'
  | 'FEEDBACK_REQUEST'

// ─── Message templates ────────────────────────────────────────────────────────
function buildMessage(type: WaType, data: {
  userName: string
  ticketId: number
  category?: string
  priority?: string
  techName?: string
}): string {
  switch (type) {
    case 'TICKET_SUBMITTED':
      return (
        `Hello ${data.userName}, your complaint is registered. ` +
        `Ticket ID: #${data.ticketId}, Category: ${data.category || 'N/A'}, ` +
        `Priority: ${data.priority || 'N/A'}, Status: Pending. - NextGen Helpdesk`
      )
    case 'TECH_ASSIGNED':
      return (
        `Hello ${data.userName}, Ticket #${data.ticketId} has been assigned to ` +
        `technician ${data.techName || 'N/A'}. Status: Assigned. - NextGen Helpdesk`
      )
    case 'TICKET_RESOLVED':
      return (
        `Hello ${data.userName}, Ticket #${data.ticketId} has been resolved. ` +
        `Please rate your experience. Thank you! - NextGen Helpdesk`
      )
    case 'FEEDBACK_REQUEST':
      return (
        `Hello ${data.userName}, please rate your service for Ticket #${data.ticketId}. ` +
        `Your feedback matters! - NextGen Helpdesk`
      )
  }
}

// ─── Send via Fast2SMS ────────────────────────────────────────────────────────
async function sendSMS(
  phone: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  if (!FAST2SMS_API_KEY) {
    return { success: false, error: 'Fast2SMS API key not configured' }
  }

  // Strip country code — Fast2SMS accepts 10-digit Indian numbers
  const cleanPhone = phone.replace(/^\+91/, '').replace(/^\+/, '').slice(-10)

  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route:    'v3',        // OTP/Quick route — works without DLT registration
        message:  message,
        language: 'english',
        flash:    0,
        numbers:  cleanPhone,
      }),
      signal: AbortSignal.timeout(10000),
    })

    const text = await res.text()
    console.log('Fast2SMS raw response:', text)

    let data: any = {}
    try { data = JSON.parse(text) } catch { return { success: false, error: text } }

    if (data.return === true) return { success: true }

    // message can be string or array
    const errMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || JSON.stringify(data))
    return { success: false, error: errMsg }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Main exported function ───────────────────────────────────────────────────
export async function sendWhatsAppNotification(
  type: WaType,
  ticketId: number,
  toPhone: string,
  toName: string,
  data: {
    category?: string
    priority?: string
    techName?: string
  } = {},
): Promise<void> {
  const message = buildMessage(type, { userName: toName, ticketId, ...data })
  const { success, error } = await sendSMS(toPhone, message)

  // Log result — never throws
  try {
    await prisma.whatsAppLog.create({
      data: {
        ticketId,
        toPhone,
        toName,
        message,
        type,
        status: success ? 'sent' : 'failed',
        error:  error  || null,
      },
    })
  } catch (logErr) {
    console.error('SMS log write failed:', logErr)
  }

  if (!success) {
    console.warn(`SMS [${type}] failed for ticket #${ticketId}: ${error}`)
  } else {
    console.log(`SMS [${type}] sent to ${toPhone} for ticket #${ticketId}`)
  }
}
