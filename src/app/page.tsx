'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

interface Stats {
  total: number
  resolved: number
  pending: number
  assigned: number
  avgResolutionHours: number
  slaBreaches: number
  avgRating: number
  totalFeedback: number
  byCategory: { name: string; count: number }[]
  byPriority: { priority: string; count: number }[]
}

interface Ticket {
  id: number
  description: string
  status: string
  priority: string
  createdAt: string
  slaDeadline: string
  category: { name: string }
  customer: { name: string; email: string }
  assignedTech?: { name: string }
}

const priorityColors: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }
const statusColors: Record<string, string> = { Pending: '#f59e0b', Assigned: '#6366f1', Resolved: '#22c55e' }

function PriorityBadge({ priority }: { priority: string }) {
  return <span className="badge" style={{ background: priorityColors[priority] + '22', color: priorityColors[priority], border: `1px solid ${priorityColors[priority]}44` }}>{priority}</span>
}
function StatusBadge({ status }: { status: string }) {
  return <span className="badge" style={{ background: statusColors[status] + '22', color: statusColors[status], border: `1px solid ${statusColors[status]}44` }}>{status}</span>
}

function isSlaBreached(deadline: string, status: string) {
  return status !== 'Resolved' && new Date(deadline) < new Date()
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then(r => r.json()),
      fetch('/api/tickets').then(r => r.json()),
    ]).then(([s, t]) => {
      setStats(s)
      setTickets(Array.isArray(t) ? t.slice(0, 8) : [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>

  const greeting = user?.name.split(' ')[0]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {greeting}! 👋</h1>
          <p className="page-subtitle">Here&apos;s what&apos;s happening in your helpdesk today.</p>
        </div>
        {(user?.role === 'Customer' || user?.role === 'Admin') && (
          <Link href="/tickets/new" className="btn btn-primary">
            ➕ New Ticket
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid-4">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>🎫</div>
          <div>
            <p className="stat-title">Total Tickets</p>
            <p className="stat-value">{stats?.total ?? 0}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>⏳</div>
          <div>
            <p className="stat-title">Pending</p>
            <p className="stat-value" style={{ color: '#ef4444' }}>{stats?.pending ?? 0}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>✅</div>
          <div>
            <p className="stat-title">Resolved</p>
            <p className="stat-value" style={{ color: '#22c55e' }}>{stats?.resolved ?? 0}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>🔥</div>
          <div>
            <p className="stat-title">SLA Breaches</p>
            <p className="stat-value" style={{ color: '#f59e0b' }}>{stats?.slaBreaches ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid-3" style={{ marginTop: '24px' }}>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>⚡</div>
          <div>
            <p className="stat-title">Avg Resolution</p>
            <p className="stat-value" style={{ color: '#0ea5e9' }}>{stats?.avgResolutionHours}h</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>🔧</div>
          <div>
            <p className="stat-title">Assigned</p>
            <p className="stat-value">{stats?.assigned ?? 0}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>⭐</div>
          <div>
            <p className="stat-title">Avg Satisfaction</p>
            <p className="stat-value" style={{ color: '#fbbf24' }}>{stats?.avgRating ? `${stats.avgRating}/5` : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Recent tickets table */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>Recent Tickets</h3>
          <Link href="/tickets" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px' }}>View All</Link>
        </div>
        {tickets.length === 0 ? (
          <div className="empty-state">
            <p>🎫</p>
            <p>No tickets yet. {user?.role === 'Customer' && <Link href="/tickets/new">Submit your first ticket →</Link>}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/tickets/${t.id}`} className="ticket-id">#{t.id}</Link>
                    </td>
                    <td>
                      <span className="ticket-desc" title={t.description}>{t.description.slice(0, 50)}{t.description.length > 50 ? '…' : ''}</span>
                    </td>
                    <td><span className="category-tag">{t.category.name}</span></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      {t.slaDeadline ? (
                        <span style={{ color: isSlaBreached(t.slaDeadline, t.status) ? '#ef4444' : '#22c55e', fontSize: '0.8rem' }}>
                          {isSlaBreached(t.slaDeadline, t.status) ? '🔴 Breached' : `🟢 ${new Date(t.slaDeadline).toLocaleDateString()}`}
                        </span>
                      ) : '—'}
                    </td>
                    <td><span className="date-text">{new Date(t.createdAt).toLocaleDateString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
