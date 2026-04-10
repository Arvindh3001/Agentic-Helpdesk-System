'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface Ticket {
  id: number
  description: string
  status: string
  priority: string
  zone: string
  createdAt: string
  resolvedAt: string | null
  slaDeadline: string | null
  imageUrl: string | null
  category: { name: string }
  customer: { name: string; email: string }
  assignedTech?: { name: string; email: string }
  Feedback?: { rating: number; comments: string }
  // AI fields
  aiSummary: string | null
  aiCategory: string | null
  aiPriority: string | null
  aiLocation: string | null
  aiTroubleshooting: string | null
  // Image detection
  imageDetectedObject: string | null
  imageConfidence: number | null
  imagePredictedCategory: string | null
  // Duplicate
  isDuplicate: boolean
  duplicateOfId: number | null
}

const priorityColors: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }
const statusColors: Record<string, string> = { Pending: '#f59e0b', Assigned: '#6366f1', Resolved: '#22c55e' }

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [feedback, setFeedback] = useState({ rating: 5, comments: '' })
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/tickets/${id}`)
    const data = await res.json()
    setTicket(data)
    if (data.Feedback) {
      setFeedback({ rating: data.Feedback.rating, comments: data.Feedback.comments || '' })
      setFeedbackSent(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const updateStatus = async (status: string) => {
    setUpdating(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
    setUpdating(false)
  }

  const submitFeedback = async () => {
    setFeedbackSubmitting(true)
    await fetch(`/api/tickets/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    })
    setFeedbackSent(true)
    setFeedbackSubmitting(false)
  }

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>
  if (!ticket) return <div className="page"><p>Ticket not found.</p></div>

  const breached = ticket.slaDeadline && ticket.status !== 'Resolved' && new Date(ticket.slaDeadline) < new Date()
  const troubleshootingSteps: string[] = ticket.aiTroubleshooting
    ? JSON.parse(ticket.aiTroubleshooting)
    : []

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button onClick={() => router.back()} className="btn btn-secondary" style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
            ← Back
          </button>
          <h1 className="page-title">Ticket #{ticket.id}</h1>
          <p className="page-subtitle">{ticket.category.name} · {ticket.zone}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {ticket.isDuplicate && (
            <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.8rem', padding: '4px 10px' }}>
              ⚠️ Duplicate
            </span>
          )}
          <span className="badge" style={{ background: priorityColors[ticket.priority] + '22', color: priorityColors[ticket.priority], border: `1px solid ${priorityColors[ticket.priority]}44`, fontSize: '0.9rem', padding: '6px 14px' }}>
            {ticket.priority}
          </span>
          <span className="badge" style={{ background: statusColors[ticket.status] + '22', color: statusColors[ticket.status], border: `1px solid ${statusColors[ticket.status]}44`, fontSize: '0.9rem', padding: '6px 14px' }}>
            {ticket.status}
          </span>
        </div>
      </div>

      <div className="ticket-detail-grid">
        {/* ── Left column ─────────────────────────────── */}
        <div>
          {/* Description */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>📝 Issue Description</h3>
            <p style={{ lineHeight: '1.8', color: 'var(--text-main)' }}>{ticket.description}</p>
            {ticket.imageUrl && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>📎 Attached Image:</p>
                <img src={ticket.imageUrl} alt="Ticket attachment" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
              </div>
            )}
          </div>

          {/* AI Analysis */}
          {(ticket.aiSummary || ticket.aiCategory || troubleshootingSteps.length > 0) && (
            <div className="card" style={{ marginBottom: '20px', borderColor: 'rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.03)' }}>
              <h3 style={{ marginBottom: '16px' }}>🧠 AI Analysis</h3>

              {ticket.aiSummary && (
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</p>
                  <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-main)', lineHeight: 1.6 }}>{ticket.aiSummary}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                {ticket.aiCategory && (
                  <div className="ai-detail-chip">
                    <span className="ai-detail-label">Detected Category</span>
                    <span className="ai-detail-value">{ticket.aiCategory}</span>
                  </div>
                )}
                {ticket.aiPriority && (
                  <div className="ai-detail-chip">
                    <span className="ai-detail-label">AI Priority</span>
                    <span className="ai-detail-value" style={{ color: priorityColors[ticket.aiPriority] }}>{ticket.aiPriority}</span>
                  </div>
                )}
                {ticket.aiLocation && (
                  <div className="ai-detail-chip">
                    <span className="ai-detail-label">Detected Location</span>
                    <span className="ai-detail-value">📍 {ticket.aiLocation}</span>
                  </div>
                )}
              </div>

              {troubleshootingSteps.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    💡 Troubleshooting Steps
                  </p>
                  <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {troubleshootingSteps.map((step, i) => (
                      <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Image Detection */}
          {ticket.imageDetectedObject && (
            <div className="card" style={{ marginBottom: '20px', borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.03)' }}>
              <h3 style={{ marginBottom: '16px' }}>📸 Image Detection Result</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="ai-detail-chip">
                  <span className="ai-detail-label">Detected Object</span>
                  <span className="ai-detail-value">{ticket.imageDetectedObject}</span>
                </div>
                {ticket.imagePredictedCategory && (
                  <div className="ai-detail-chip">
                    <span className="ai-detail-label">Predicted Category</span>
                    <span className="ai-detail-value">{ticket.imagePredictedCategory}</span>
                  </div>
                )}
                {ticket.imageConfidence != null && (
                  <div className="ai-detail-chip">
                    <span className="ai-detail-label">Confidence</span>
                    <span className="ai-detail-value" style={{ color: ticket.imageConfidence >= 0.8 ? '#22c55e' : ticket.imageConfidence >= 0.6 ? '#f59e0b' : '#ef4444' }}>
                      {Math.round(ticket.imageConfidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Actions */}
          {(user?.role === 'Admin' || user?.role === 'Technician') && ticket.status !== 'Resolved' && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px' }}>⚙️ Actions</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {ticket.status === 'Pending' && (
                  <button className="btn btn-primary" onClick={() => updateStatus('Assigned')} disabled={updating}>
                    🔧 Assign to Me
                  </button>
                )}
                {ticket.status === 'Assigned' && (
                  <button className="btn btn-primary" onClick={() => updateStatus('Resolved')} disabled={updating} style={{ background: '#22c55e' }}>
                    ✅ Mark Resolved
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Feedback */}
          {ticket.status === 'Resolved' && user?.role === 'Customer' && (
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>⭐ Rate This Service</h3>
              {feedbackSent ? (
                <div className="feedback-sent">
                  <p style={{ fontSize: '1.5rem' }}>{'⭐'.repeat(feedback.rating)}</p>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>{feedback.comments || 'No comments provided.'}</p>
                  <p style={{ color: '#22c55e', marginTop: '8px' }}>✅ Feedback submitted — thank you!</p>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Rating (1–5)</label>
                    <div className="star-row">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button" className={`star-btn ${feedback.rating >= n ? 'star-active' : ''}`} onClick={() => setFeedback(f => ({ ...f, rating: n }))}>★</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Comments (optional)</label>
                    <textarea value={feedback.comments} onChange={e => setFeedback(f => ({ ...f, comments: e.target.value }))} placeholder="How was the support you received?" rows={3} />
                  </div>
                  <button className="btn btn-primary" onClick={submitFeedback} disabled={feedbackSubmitting}>
                    {feedbackSubmitting ? '⏳ Submitting…' : 'Submit Feedback'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ────────────────────────────── */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TICKET INFO</h4>
            <div className="info-row"><span>Customer</span><span>{ticket.customer.name}</span></div>
            <div className="info-row"><span>Email</span><span style={{ fontSize: '0.8rem' }}>{ticket.customer.email}</span></div>
            <div className="info-row"><span>Category</span><span>{ticket.category.name}</span></div>
            <div className="info-row"><span>Zone</span><span>{ticket.zone}</span></div>
            <div className="info-row"><span>Created</span><span style={{ fontSize: '0.82rem' }}>{new Date(ticket.createdAt).toLocaleString()}</span></div>
            {ticket.resolvedAt && (
              <div className="info-row"><span>Resolved</span><span style={{ fontSize: '0.82rem' }}>{new Date(ticket.resolvedAt).toLocaleString()}</span></div>
            )}
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA STATUS</h4>
            {ticket.slaDeadline ? (
              <>
                <div className="info-row"><span>Deadline</span><span style={{ fontSize: '0.82rem' }}>{new Date(ticket.slaDeadline).toLocaleString()}</span></div>
                <div className="info-row">
                  <span>Status</span>
                  <span style={{ color: breached ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                    {breached ? '🔴 Breached' : '🟢 On Track'}
                  </span>
                </div>
              </>
            ) : <p style={{ color: 'var(--text-muted)' }}>No SLA set</p>}
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ASSIGNED TECHNICIAN</h4>
            {ticket.assignedTech ? (
              <>
                <div className="info-row"><span>Name</span><span>{ticket.assignedTech.name}</span></div>
                <div className="info-row"><span>Email</span><span style={{ fontSize: '0.8rem' }}>{ticket.assignedTech.email}</span></div>
              </>
            ) : (
              <p style={{ color: '#f59e0b' }}>⏳ In queue – awaiting technician</p>
            )}
          </div>

          {ticket.duplicateOfId && (
            <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
              <h4 style={{ marginBottom: '12px', color: '#f59e0b' }}>⚠️ Duplicate of</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                This ticket is similar to{' '}
                <a href={`/tickets/${ticket.duplicateOfId}`} style={{ color: '#6366f1' }}>
                  Ticket #{ticket.duplicateOfId}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
