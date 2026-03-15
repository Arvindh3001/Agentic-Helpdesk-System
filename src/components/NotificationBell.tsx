'use client'
import { useState, useEffect, useRef } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  time: string
  ticketId?: number
  icon: string
  read: boolean
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => !readIds.has(n.id)).length

  const markRead = (id: string) => setReadIds(prev => new Set([...prev, id]))
  const markAllRead = () => setReadIds(new Set(notifications.map(n => n.id)))

  const typeColor: Record<string, string> = {
    sla_breach: '#ef4444',
    new_ticket: '#6366f1',
    ticket_assigned: '#0ea5e9',
    ticket_resolved: '#22c55e',
  }

  return (
    <div className="notif-wrapper" ref={ref}>
      <button className="notif-btn" onClick={() => { setOpen(!open); if (!open) load() }}>
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <h4>Notifications</h4>
            {unread > 0 && <button className="mark-all-btn" onClick={markAllRead}>Mark all read</button>}
          </div>

          {loading && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>}

          {!loading && notifications.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>🎉</p><p style={{ marginTop: '8px' }}>All caught up!</p>
            </div>
          )}

          <div className="notif-list">
            {notifications.map(n => {
              const isRead = readIds.has(n.id)
              return (
                <a
                  key={n.id}
                  href={n.ticketId ? `/tickets/${n.ticketId}` : '#'}
                  className={`notif-item ${isRead ? 'read' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  <div className="notif-icon" style={{ background: (typeColor[n.type] || '#6366f1') + '22', color: typeColor[n.type] || '#6366f1' }}>
                    {n.icon}
                  </div>
                  <div className="notif-content">
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-msg">{n.message}</p>
                    <p className="notif-time">{new Date(n.time).toLocaleString()}</p>
                  </div>
                  {!isRead && <span className="notif-dot"></span>}
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
