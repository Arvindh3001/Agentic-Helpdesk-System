'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊', roles: ['Admin', 'Technician', 'Customer'] },
  { href: '/tickets', label: 'Tickets', icon: '🎫', roles: ['Admin', 'Technician', 'Customer'] },
  { href: '/knowledge', label: 'Knowledge Base', icon: '📚', roles: ['Admin', 'Technician', 'Customer'] },
  { href: '/technicians', label: 'Technicians', icon: '⚙️', roles: ['Admin'] },
  { href: '/analytics', label: 'Analytics', icon: '📈', roles: ['Admin', 'Technician'] },
  { href: '/future', label: 'AI & Future', icon: '🚀', roles: ['Admin', 'Technician', 'Customer'] },
]


export default function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const initials = user?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">🎫</span>
        <div>
          <h2 className="sidebar-title">NextGen</h2>
          <p className="sidebar-subtitle">Helpdesk</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems
          .filter(item => user && item.roles.includes(user.role))
          .map(item => (
            <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
      </nav>

      {user?.role === 'Technician' && (
        <div className="tech-status-panel">
          <p className="tech-status-label">Availability</p>
          <button
            className="availability-toggle"
            disabled={availabilityLoading}
            onClick={async () => {
              setAvailabilityLoading(true)
              await fetch('/api/technicians', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: true }),
              })
              setAvailabilityLoading(false)
            }}
          >
            <span className="status-dot online"></span> Set Online
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn" title="Logout">⏏️</button>
      </div>
    </aside>
  )
}
