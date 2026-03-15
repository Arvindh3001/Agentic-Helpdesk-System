'use client'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Customer' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(form.email, form.password)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    await login(form.email, form.password)
    setLoading(false)
  }

  const handleSeed = async () => {
    setSeeding(true)
    const res = await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'seed_helpdesk_2024' }),
    })
    const data = await res.json()
    setSeeding(false)
    if (res.ok) alert('✅ Database seeded! You can now log in with:\n\nAdmin: arvindh3001@gmail.com / password123\nTech: arjun.sharma@helpdesk.com / password123\nCustomer: priya.sharma@helpdesk.com / password123')
    else alert('Seed failed: ' + JSON.stringify(data))
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1"></div>
        <div className="login-orb login-orb-2"></div>
      </div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🎫</div>
          <h1>NextGen Helpdesk</h1>
          <p>AI-Powered IT Support System</p>
        </div>
        <div className="login-tabs">
          <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
          <button className={`tab-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="Customer">Customer</option>
                <option value="Technician">Technician</option>
              </select>
            </div>
          )}
          {error && <div className="login-error">⚠️ {error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="login-divider">
          <span>First time setup?</span>
        </div>
        <button onClick={handleSeed} className="btn btn-secondary btn-full" disabled={seeding}>
          {seeding ? '⏳ Seeding...' : '🚀 Seed Demo Data'}
        </button>
        <div className="demo-creds">
          <p><strong>Admin:</strong> arvindh3001@gmail.com / password123</p>
          <p><strong>Tech:</strong> arjun.sharma@helpdesk.com / password123</p>
          <p><strong>User:</strong> priya.sharma@helpdesk.com / password123</p>
        </div>
      </div>
    </div>
  )
}
