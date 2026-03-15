'use client'
import { useEffect, useState } from 'react'

interface TechPerformance {
  id: number
  name: string
  email: string
  isAvailable: boolean
  currentWorkload: number
  totalAssigned: number
  totalResolved: number
  avgResolutionTime: number
  resolutionRate: number
  recentActivity: number
  zone: string
  category: string
}

const zones = ['All', 'SJT', 'TT', 'MGR', 'MGB', 'SMV', 'PRP', 'CDMM', 'Mens Hostel', 'Ladies Hostel', 'Library']

export default function TechniciansPage() {
  const [performanceData, setPerformanceData] = useState<TechPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'overview' | 'performance'>('overview')
  const [selectedZone, setSelectedZone] = useState<string>('All')

  const loadPerformance = async () => {
    const res = await fetch('/api/technicians/performance')
    const data = await res.json()
    setPerformanceData(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadPerformance() }, [])

  const filteredData = selectedZone === 'All'
    ? performanceData
    : performanceData.filter(t => t.zone === selectedZone)

  const totalWorkload = filteredData.reduce((acc, t) => acc + t.currentWorkload, 0)
  const available = filteredData.filter(t => t.isAvailable).length
  const totalResolved = filteredData.reduce((acc, t) => acc + t.totalResolved, 0)
  const avgResolutionTime = filteredData.length > 0
    ? Math.round((filteredData.reduce((acc, t) => acc + t.avgResolutionTime, 0) / filteredData.length) * 10) / 10
    : 0

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return '#22c55e'
    if (rate >= 70) return '#f59e0b'
    return '#ef4444'
  }

  const getResolutionTimeColor = (time: number) => {
    if (time <= 4) return '#22c55e'
    if (time <= 12) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Technician Analytics 📊</h1>
          <p className="page-subtitle">Performance tracking and workload management</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`chip ${activeView === 'overview' ? 'chip-active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            📈 Overview
          </button>
          <button
            className={`chip ${activeView === 'performance' ? 'chip-active' : ''}`}
            onClick={() => setActiveView('performance')}
          >
            🏆 Performance
          </button>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color)',
              color: 'var(--text-color)',
              fontSize: '0.85rem'
            }}
          >
            {zones.map(zone => (
              <option key={zone} value={zone}>
                🌍 {zone}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-summary-grid" style={{ marginBottom: '32px' }}>
        <div className="summary-item">
          <div className="summary-label">{selectedZone === 'All' ? 'Total Technicians' : `${selectedZone} Technicians`}</div>
          <div className="summary-val" style={{ color: '#6366f1' }}>{filteredData.length}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Available Now</div>
          <div className="summary-val" style={{ color: '#22c55e' }}>{available}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Active Tickets</div>
          <div className="summary-val" style={{ color: '#f59e0b' }}>{totalWorkload}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Avg Resolution</div>
          <div className="summary-val" style={{ color: getResolutionTimeColor(avgResolutionTime) }}>
            {avgResolutionTime}h
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : (
        <>
          {activeView === 'overview' && (
            <div className="tech-grid">
              {filteredData.map(tech => {
                const workload = tech.currentWorkload
                const maxExpected = 8
                const pct = Math.min((workload / maxExpected) * 100, 100)
                return (
                  <div key={tech.id} className="card tech-card">
                    <div className="tech-card-header">
                      <div className="avatar" style={{ background: tech.isAvailable ? '#22c55e' : '#6b7280' }}>
                        {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="user-name">{tech.name}</p>
                        <p className="user-role">{tech.email}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          🌍 {tech.zone} • {tech.category}
                        </p>
                      </div>
                      <span className="status-indicator" style={{
                        background: tech.isAvailable ? '#22c55e' : '#6b7280',
                        marginLeft: 'auto',
                        fontSize: '0.75rem',
                        padding: '4px 8px'
                      }}>
                        {tech.isAvailable ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Load</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{workload} active</span>
                      </div>
                      <div className="workload-bar">
                        <div className="workload-fill" style={{
                          width: `${pct}%`,
                          background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e',
                        }}></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#818cf8' }}>{tech.totalResolved}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolved</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: getPerformanceColor(tech.resolutionRate) }}>
                            {tech.resolutionRate}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Success Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeView === 'performance' && (
            <div className="card">
              <div className="card-header">
                <h3>🏆 Performance Leaderboard</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Ranked by total tickets resolved
                </p>
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Rank</th>
                      <th>Technician</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Assigned</th>
                      <th style={{ textAlign: 'center' }}>Resolved</th>
                      <th style={{ textAlign: 'center' }}>Success Rate</th>
                      <th style={{ textAlign: 'center' }}>Avg Time</th>
                      <th style={{ textAlign: 'center' }}>Weekly Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((tech, index) => (
                      <tr key={tech.id}>
                        <td>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            fontWeight: '700'
                          }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar" style={{
                              width: '32px',
                              height: '32px',
                              background: tech.isAvailable ? '#22c55e' : '#6b7280',
                              fontSize: '0.75rem'
                            }}>
                              {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{tech.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tech.email}</div>
                              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                🌍 {tech.zone} • {tech.category}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.8rem',
                            color: tech.isAvailable ? '#22c55e' : '#6b7280'
                          }}>
                            {tech.isAvailable ? '🟢 Online' : '⚫ Offline'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{tech.totalAssigned}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: '700',
                            color: '#818cf8',
                            fontSize: '1rem'
                          }}>
                            {tech.totalResolved}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="badge" style={{
                            background: `${getPerformanceColor(tech.resolutionRate)}20`,
                            color: getPerformanceColor(tech.resolutionRate),
                            border: `1px solid ${getPerformanceColor(tech.resolutionRate)}40`
                          }}>
                            {tech.resolutionRate}%
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            color: getResolutionTimeColor(tech.avgResolutionTime),
                            fontWeight: '600'
                          }}>
                            {tech.avgResolutionTime}h
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            color: tech.recentActivity > 3 ? '#22c55e' : tech.recentActivity > 1 ? '#f59e0b' : 'var(--text-muted)',
                            fontWeight: '600'
                          }}>
                            {tech.recentActivity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredData.length === 0 && (
                <div className="empty-state">
                  <p>👥</p>
                  <p>No technicians registered yet.</p>
                  <p>Register users with the &apos;Technician&apos; role to see performance metrics.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
