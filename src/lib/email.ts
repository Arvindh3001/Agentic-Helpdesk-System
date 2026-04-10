import nodemailer from 'nodemailer'

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use app password for Gmail
  },
  // Add these options for better Gmail compatibility
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000, // 10 seconds
})

export interface TicketEmailData {
  ticketId: number
  customerName: string
  customerEmail: string
  description: string
  category: string
  zone: string
  priority: string
  status: string
  assignedTech?: string
  slaDeadline?: Date
}

// Generate ticket creation email HTML
function generateTicketCreatedEmail(ticket: TicketEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Created - Helpdesk System</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .content {
          background-color: #f8fafc;
          padding: 30px;
          border: 1px solid #e2e8f0;
        }
        .ticket-info {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #e2e8f0;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: bold;
          color: #475569;
        }
        .value {
          color: #334155;
        }
        .priority-high { color: #dc2626; font-weight: bold; }
        .priority-medium { color: #ea580c; font-weight: bold; }
        .priority-low { color: #16a34a; font-weight: bold; }
        .footer {
          background-color: #1e293b;
          color: white;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          text-align: center;
          font-size: 14px;
        }
        .button {
          background-color: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎫 New Support Ticket Created</h1>
      </div>

      <div class="content">
        <p>Dear ${ticket.customerName},</p>

        <p>Your support ticket has been successfully created and submitted to our helpdesk system. We have received your request and our team will address it according to the priority level.</p>

        <div class="ticket-info">
          <h3>Ticket Details</h3>

          <div class="info-row">
            <span class="label">Ticket ID:</span>
            <span class="value">#${ticket.ticketId}</span>
          </div>

          <div class="info-row">
            <span class="label">Category:</span>
            <span class="value">${ticket.category}</span>
          </div>

          <div class="info-row">
            <span class="label">Zone:</span>
            <span class="value">${ticket.zone}</span>
          </div>

          <div class="info-row">
            <span class="label">Priority:</span>
            <span class="value priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
          </div>

          <div class="info-row">
            <span class="label">Status:</span>
            <span class="value">${ticket.status}</span>
          </div>

          ${ticket.assignedTech ? `
          <div class="info-row">
            <span class="label">Assigned Technician:</span>
            <span class="value">${ticket.assignedTech}</span>
          </div>
          ` : ''}

          ${ticket.slaDeadline ? `
          <div class="info-row">
            <span class="label">Expected Resolution:</span>
            <span class="value">${ticket.slaDeadline.toLocaleString()}</span>
          </div>
          ` : ''}

          <div class="info-row">
            <span class="label">Description:</span>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 10px;">
            <p style="margin: 0;">${ticket.description}</p>
          </div>
        </div>

        <p><strong>What happens next?</strong></p>
        <ul>
          <li>${ticket.status === 'Assigned' ? `Your ticket has been assigned to ${ticket.assignedTech}` : 'Your ticket is in the queue and will be assigned to a technician soon'}</li>
          <li>You will receive updates via email as the status changes</li>
          <li>Our team will work to resolve your issue by the expected resolution time</li>
          <li>You can track your ticket status by logging into the helpdesk portal</li>
        </ul>

        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3002'}" class="button">View Ticket Status</a>
        </div>

        <p><strong>Need immediate assistance?</strong></p>
        <p>If this is an emergency or critical issue, please contact our support team directly.</p>
      </div>

      <div class="footer">
        <p><strong>Campus Helpdesk System</strong></p>
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>For support questions, please log a ticket through the helpdesk portal.</p>
      </div>
    </body>
    </html>
  `
}

// Send ticket creation notification email
export async function sendTicketCreatedEmail(ticket: TicketEmailData): Promise<boolean> {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email not configured. Skipping email notification.')
      return false
    }

    const mailOptions = {
      from: {
        name: 'Campus Helpdesk System',
        address: process.env.EMAIL_USER!
      },
      to: ticket.customerEmail,
      subject: `🎫 Ticket #${ticket.ticketId} Created - ${ticket.category} Issue`,
      html: generateTicketCreatedEmail(ticket),
      // Also include a plain text version for email clients that don't support HTML
      text: `
Dear ${ticket.customerName},

Your support ticket has been created successfully.

Ticket Details:
- Ticket ID: #${ticket.ticketId}
- Category: ${ticket.category}
- Zone: ${ticket.zone}
- Priority: ${ticket.priority}
- Status: ${ticket.status}
${ticket.assignedTech ? `- Assigned Technician: ${ticket.assignedTech}` : ''}
${ticket.slaDeadline ? `- Expected Resolution: ${ticket.slaDeadline.toLocaleString()}` : ''}

Description: ${ticket.description}

${ticket.status === 'Assigned' ? `Your ticket has been assigned to ${ticket.assignedTech}` : 'Your ticket is in the queue and will be assigned to a technician soon'}.

You will receive updates via email as the status changes.

Visit ${process.env.NEXTAUTH_URL || 'http://localhost:3002'} to track your ticket status.

Best regards,
Campus Helpdesk System
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Ticket creation email sent successfully:', info.messageId)
    return true

  } catch (error) {
    console.error('Failed to send ticket creation email:', error)
    return false
  }
}

// Send ticket status update email
export async function sendTicketStatusEmail(ticket: TicketEmailData, oldStatus: string, newStatus: string): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email not configured. Skipping email notification.')
      return false
    }

    const mailOptions = {
      from: {
        name: 'Campus Helpdesk System',
        address: process.env.EMAIL_USER!
      },
      to: ticket.customerEmail,
      subject: `🔄 Ticket #${ticket.ticketId} Status Updated: ${newStatus}`,
      html: `
        <h2>Ticket Status Update</h2>
        <p>Dear ${ticket.customerName},</p>
        <p>Your ticket <strong>#${ticket.ticketId}</strong> status has been updated.</p>
        <p><strong>Previous Status:</strong> ${oldStatus}</p>
        <p><strong>Current Status:</strong> ${newStatus}</p>
        ${ticket.assignedTech ? `<p><strong>Assigned Technician:</strong> ${ticket.assignedTech}</p>` : ''}
        <p>Visit <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3002'}">helpdesk portal</a> for more details.</p>
      `,
      text: `
Dear ${ticket.customerName},

Your ticket #${ticket.ticketId} status has been updated.

Previous Status: ${oldStatus}
Current Status: ${newStatus}
${ticket.assignedTech ? `Assigned Technician: ${ticket.assignedTech}` : ''}

Visit ${process.env.NEXTAUTH_URL || 'http://localhost:3002'} for more details.

Best regards,
Campus Helpdesk System
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Status update email sent successfully:', info.messageId)
    return true

  } catch (error) {
    console.error('Failed to send status update email:', error)
    return false
  }
}