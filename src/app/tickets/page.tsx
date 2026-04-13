'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

interface Ticket {
  id: number
  description: string
  status: string
  priority: string
  createdAt: string
  slaDeadline: string | null
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

export default function TicketsPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = async (s = '') => {
    setLoading(true)
    const url = `/api/tickets${s ? `?status=${s}` : ''}`
    const res = await fetch(url)
    const data = await res.json()
    setTickets(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  const filtered = tickets.filter(t =>
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    String(t.id).includes(search) ||
    t.category.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ticket Dashboard</h1>
          <p className="page-subtitle">Manage and track all support tickets</p>
        </div>
        <Link href="/tickets/new" className="btn btn-primary">➕ New Ticket</Link>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          type="text"
          placeholder="🔍  Search tickets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-chips">
          {['', 'Pending', 'Assigned', 'Resolved'].map(s => (
            <button
              key={s}
              className={`chip ${statusFilter === s ? 'chip-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: '2rem' }}>🎫</p>
          <p>No tickets found.</p>
          {user?.role === 'Customer' && <Link href="/tickets/new" className="btn btn-primary" style={{ marginTop: '12px' }}>Submit a Ticket</Link>}
        </div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="card tickets-table-view">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>#ID</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Customer</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>SLA</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const breached = t.slaDeadline && t.status !== 'Resolved' && new Date(t.slaDeadline) < new Date()
                    return (
                      <tr key={t.id} className={breached ? 'row-breach' : ''}>
                        <td><Link href={`/tickets/${t.id}`} className="ticket-id">#{t.id}</Link></td>
                        <td><span className="ticket-desc">{t.description.slice(0, 55)}{t.description.length > 55 ? '…' : ''}</span></td>
                        <td><span className="category-tag">{t.category.name}</span></td>
                        <td><span className="date-text">{t.customer.name}</span></td>
                        <td><span className="date-text">{t.assignedTech?.name || <em style={{ color: 'var(--text-muted)' }}>Unassigned</em>}</span></td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>
                          {t.slaDeadline ? (
                            <span style={{ fontSize: '0.8rem', color: breached ? '#ef4444' : '#22c55e' }}>
                              {breached ? '🔴 Breached' : `🟢 ${new Date(t.slaDeadline).toLocaleDateString()}`}
                            </span>
                          ) : '—'}
                        </td>
                        <td><span className="date-text">{new Date(t.createdAt).toLocaleDateString()}</span></td>
                        <td>
                          <Link href={`/tickets/${t.id}`} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 8px', textDecoration: 'none' }}>
                            👁️ View
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card view */}
          <div className="tickets-card-view">
            {filtered.map(t => {
              const breached = t.slaDeadline && t.status !== 'Resolved' && new Date(t.slaDeadline) < new Date()
              return (
                <Link key={t.id} href={`/tickets/${t.id}`} className="ticket-mobile-card" style={{ textDecoration: 'none' }}>
                  <div className="ticket-mobile-card-header">
                    <span className="ticket-id">#{t.id}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                  <p className="ticket-mobile-desc">{t.description.slice(0, 100)}{t.description.length > 100 ? '…' : ''}</p>
                  <div className="ticket-mobile-meta">
                    <span className="category-tag">{t.category.name}</span>
                    {t.assignedTech && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>⚙️ {t.assignedTech.name}</span>}
                    <span style={{ fontSize: '0.78rem', color: breached ? '#ef4444' : 'var(--text-muted)', marginLeft: 'auto' }}>
                      {breached ? '🔴 SLA Breached' : new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
