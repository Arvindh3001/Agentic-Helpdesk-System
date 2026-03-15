'use client'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import LoginPage from '@/components/LoginPage'
import NotificationBell from '@/components/NotificationBell'
import Link from 'next/link'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading&hellip;</p>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <header className="app-header">
          <div></div>
          <div className="app-header-right">
            <NotificationBell />
            {(user.role === 'Customer' || user.role === 'Admin') && (
              <Link href="/tickets/new" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 14px' }}>
                ➕ New Ticket
              </Link>
            )}
          </div>
        </header>
        <div className="content-area">{children}</div>
      </main>
    </div>
  )
}
