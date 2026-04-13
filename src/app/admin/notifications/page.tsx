'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface WaLog {
  id: number
  ticketId: number
  toPhone: string
  toName: string
  message: string
  type: string
  status: string
  error: string | null
  createdAt: string
  ticket: { id: number; description: string; status: string }
}

interface Stats { total: number; sent: number; failed: number }

const TYPE_LABELS: Record<string, string> = {
  TICKET_SUBMITTED: '🎫 Submitted',
  TECH_ASSIGNED:    '🔧 Assigned',
  TICKET_RESOLVED:  '✅ Resolved',
  FEEDBACK_REQUEST: '⭐ Feedback',
}
const TYPE_COLORS: Record<string, string> = {
  TICKET_SUBMITTED: '#6366f1',
  TECH_ASSIGNED:    '#f59e0b',
  TICKET_RESOLVED:  '#22c55e',
  FEEDBACK_REQUEST: '#ec4899',
}

export default function NotificationsPage() {
  const [logs, setLogs]     = useState<WaLog[]>([])
  const [stats, setStats]   = useState<Stats>({ total: 0, sent: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ticketFilter, setTicketFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter)   params.set('type',     typeFilter)
    if (statusFilter) params.set('status',   statusFilter)
    if (ticketFilter) params.set('ticketId', ticketFilter)
    const res  = await fetch(`/api/whatsapp/logs?${params}`)
    const data = await res.json()
    setLogs(data.logs   || [])
    setStats(data.stats || { total: 0, sent: 0, failed: 0 })
    setLoading(false)
  }

  useEffect(() => { load() }, [typeFilter, statusFilter, ticketFilter])

  const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 WhatsApp Notifications</h1>
          <p className="page-subtitle">Notification logs and delivery status</p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>💬</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Sent</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✅</div>
          <div className="stat-value">{stats.sent}</div>
          <div className="stat-label">Delivered</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>❌</div>
          <div className="stat-value">{stats.failed}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>📊</div>
          <div className="stat-value">{successRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-dark-2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
          >
            <option value="">All Types</option>
            <option value="TICKET_SUBMITTED">🎫 Ticket Submitted</option>
            <option value="TECH_ASSIGNED">🔧 Tech Assigned</option>
            <option value="TICKET_RESOLVED">✅ Resolved</option>
            <option value="FEEDBACK_REQUEST">⭐ Feedback Request</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-dark-2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
          >
            <option value="">All Status</option>
            <option value="sent">✅ Sent</option>
            <option value="failed">❌ Failed</option>
          </select>

          {/* Ticket ID filter */}
          <input
            type="number"
            placeholder="Filter by Ticket ID…"
            value={ticketFilter}
            onChange={e => setTicketFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-dark-2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem', width: '180px' }}
          />

          {(typeFilter || statusFilter || ticketFilter) && (
            <button
              onClick={() => { setTypeFilter(''); setStatusFilter(''); setTicketFilter('') }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Logs table ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : logs.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: '2rem' }}>💬</p>
          <p>No notifications found.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Add a phone number to a user account and submit a ticket to trigger WhatsApp notifications.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {logs.map((log, i) => (
            <div
              key={log.id}
              style={{
                borderBottom: i < logs.length - 1 ? '1px solid var(--border-color)' : 'none',
                background: log.status === 'failed' ? 'rgba(239,68,68,0.03)' : 'transparent',
              }}
            >
              {/* Row */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                {/* Type badge */}
                <span style={{
                  background: (TYPE_COLORS[log.type] || '#6366f1') + '18',
                  color: TYPE_COLORS[log.type] || '#6366f1',
                  border: `1px solid ${(TYPE_COLORS[log.type] || '#6366f1')}33`,
                  borderRadius: '99px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {TYPE_LABELS[log.type] || log.type}
                </span>

                {/* Ticket link */}
                <Link
                  href={`/tickets/${log.ticketId}`}
                  onClick={e => e.stopPropagation()}
                  style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                  #{log.ticketId}
                </Link>

                {/* Recipient */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.toName}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.toPhone}</p>
                </div>

                {/* Status */}
                <span style={{
                  background: log.status === 'sent' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: log.status === 'sent' ? '#22c55e' : '#ef4444',
                  border: `1px solid ${log.status === 'sent' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: '99px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {log.status === 'sent' ? '✅ Sent' : '❌ Failed'}
                </span>

                {/* Time */}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(log.createdAt).toLocaleString()}
                </span>

                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{expanded === log.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded message */}
              {expanded === log.id && (
                <div style={{ padding: '0 20px 16px 20px' }}>
                  <div style={{ background: 'var(--bg-dark-2)', borderRadius: '8px', padding: '14px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message sent:</p>
                    <pre style={{ fontSize: '0.83rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-main)', fontFamily: 'inherit' }}>{log.message}</pre>
                    {log.error && (
                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}>
                        <p style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>Error:</p>
                        <p style={{ fontSize: '0.82rem', color: '#ef4444', marginTop: '4px' }}>{log.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
