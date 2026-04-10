'use client'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'

// Leaflet must be client-only (no SSR)
const TechnicianMap = dynamic(() => import('@/components/TechnicianMap'), { ssr: false })

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
  avgRating: number | null
  totalFeedback: number
  lowRatingCount: number
}

interface TechLocation {
  id: number
  name: string
  email: string
  technician: {
    isAvailable: boolean
    currentWorkload: number
    zone: string
    latitude: number | null
    longitude: number | null
    locationUpdatedAt: string | null
    category: { name: string } | null
  } | null
}

const zones = ['All', 'SJT', 'TT', 'MGR', 'MGB', 'SMV', 'PRP', 'CDMM', 'Mens Hostel', 'Ladies Hostel', 'Library']

export default function TechniciansPage() {
  const [performanceData, setPerformanceData] = useState<TechPerformance[]>([])
  const [locationData, setLocationData]       = useState<TechLocation[]>([])
  const [loading, setLoading]                 = useState(true)
  const [activeView, setActiveView]           = useState<'overview' | 'performance' | 'map'>('overview')
  const [selectedZone, setSelectedZone]       = useState<string>('All')
  const mapRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadPerformance = async () => {
    const res  = await fetch('/api/technicians/performance')
    const data = await res.json()
    setPerformanceData(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const loadLocations = async () => {
    const res  = await fetch('/api/technicians/location')
    const data = await res.json()
    setLocationData(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    loadPerformance()
    loadLocations()
  }, [])

  // Auto-refresh map data every 30s when map tab is active
  useEffect(() => {
    if (activeView === 'map') {
      loadLocations()
      mapRefreshRef.current = setInterval(loadLocations, 30_000)
    } else {
      if (mapRefreshRef.current) clearInterval(mapRefreshRef.current)
    }
    return () => { if (mapRefreshRef.current) clearInterval(mapRefreshRef.current) }
  }, [activeView])

  const filteredData = selectedZone === 'All'
    ? performanceData
    : performanceData.filter(t => t.zone === selectedZone)

  const totalWorkload    = filteredData.reduce((acc, t) => acc + t.currentWorkload, 0)
  const available        = filteredData.filter(t => t.isAvailable).length
  const avgResolutionTime = filteredData.length > 0
    ? Math.round((filteredData.reduce((acc, t) => acc + t.avgResolutionTime, 0) / filteredData.length) * 10) / 10
    : 0

  const getPerformanceColor  = (rate: number) => rate >= 90 ? '#22c55e' : rate >= 70 ? '#f59e0b' : '#ef4444'
  const getResolutionColor   = (h: number)    => h <= 4 ? '#22c55e' : h <= 12 ? '#f59e0b' : '#ef4444'

  const techsWithLocation  = locationData.filter(t => t.technician?.latitude != null)
  const techsWithoutLocation = locationData.filter(t => t.technician?.latitude == null)

  return (
    <div className="page">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Technician Hub 📊</h1>
          <p className="page-subtitle">Performance, workload and real-time GPS tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['overview', 'performance', 'map'] as const).map(v => (
            <button
              key={v}
              className={`chip ${activeView === v ? 'chip-active' : ''}`}
              onClick={() => setActiveView(v)}
            >
              {v === 'overview' ? '📈 Overview' : v === 'performance' ? '🏆 Performance' : '📍 GPS Map'}
            </button>
          ))}
          {activeView !== 'map' && (
            <select
              value={selectedZone}
              onChange={e => setSelectedZone(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
            >
              {zones.map(z => <option key={z} value={z}>🌍 {z}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Summary KPIs ────────────────────────────────── */}
      <div className="stats-summary-grid" style={{ marginBottom: '28px' }}>
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
          <div className="summary-val" style={{ color: getResolutionColor(avgResolutionTime) }}>{avgResolutionTime}h</div>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div></div>
      ) : (
        <>
          {/* ── Overview ──────────────────────────────────── */}
          {activeView === 'overview' && (
            <div className="tech-grid">
              {filteredData.map(tech => {
                const pct = Math.min((tech.currentWorkload / 8) * 100, 100)
                return (
                  <div key={tech.id} className="card tech-card">
                    <div className="tech-card-header">
                      <div className="avatar" style={{ background: tech.isAvailable ? '#22c55e' : '#6b7280' }}>
                        {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="user-name">{tech.name}</p>
                        <p className="user-role">{tech.email}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🌍 {tech.zone} · {tech.category}</p>
                      </div>
                      <span className="status-indicator" style={{ background: tech.isAvailable ? '#22c55e' : '#6b7280', marginLeft: 'auto', fontSize: '0.75rem', padding: '4px 8px' }}>
                        {tech.isAvailable ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Load</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tech.currentWorkload} active</span>
                      </div>
                      <div className="workload-bar">
                        <div className="workload-fill" style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e' }}></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#818cf8' }}>{tech.totalResolved}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolved</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: getPerformanceColor(tech.resolutionRate) }}>{tech.resolutionRate}%</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Success Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredData.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                  <p>👥</p><p>No technicians in this zone.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Performance Leaderboard ───────────────────── */}
          {activeView === 'performance' && (
            <div className="card">
              <div className="card-header">
                <h3>🏆 Performance Leaderboard</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Ranked by total tickets resolved</p>
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
                      <th style={{ textAlign: 'center' }}>Rating</th>
                      <th style={{ textAlign: 'center' }}>Weekly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((tech, index) => (
                      <tr key={tech.id}>
                        <td style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar" style={{ width: '32px', height: '32px', background: tech.isAvailable ? '#22c55e' : '#6b7280', fontSize: '0.75rem' }}>
                              {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tech.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tech.email}</div>
                              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>🌍 {tech.zone} · {tech.category}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem', color: tech.isAvailable ? '#22c55e' : '#6b7280' }}>
                          {tech.isAvailable ? '🟢 Online' : '⚫ Offline'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{tech.totalAssigned}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#818cf8', fontSize: '1rem' }}>{tech.totalResolved}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge" style={{ background: `${getPerformanceColor(tech.resolutionRate)}20`, color: getPerformanceColor(tech.resolutionRate), border: `1px solid ${getPerformanceColor(tech.resolutionRate)}40` }}>
                            {tech.resolutionRate}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: getResolutionColor(tech.avgResolutionTime), fontWeight: 600 }}>
                          {tech.avgResolutionTime}h
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {tech.avgRating != null ? (
                            <span style={{
                              fontWeight: 700,
                              color: tech.avgRating >= 4 ? '#22c55e' : tech.avgRating >= 3 ? '#f59e0b' : '#ef4444',
                            }}>
                              {tech.avgRating} ⭐
                              {tech.lowRatingCount > 0 && (
                                <span title={`${tech.lowRatingCount} low rating(s)`} style={{ color: '#ef4444', marginLeft: '4px', fontSize: '0.75rem' }}>⚠️</span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: tech.recentActivity > 3 ? '#22c55e' : tech.recentActivity > 1 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600 }}>
                          {tech.recentActivity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredData.length === 0 && (
                <div className="empty-state"><p>👥</p><p>No technicians registered yet.</p></div>
              )}
            </div>
          )}

          {/* ── GPS Map ───────────────────────────────────── */}
          {activeView === 'map' && (
            <div>
              {/* Import leaflet CSS inline via a style tag equivalent */}
              <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                crossOrigin=""
              />

              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header" style={{ marginBottom: '16px' }}>
                  <div>
                    <h3>📍 Live Technician GPS Map</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Auto-refreshes every 30 seconds · {techsWithLocation.length} of {locationData.length} technicians sharing location
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '8px 14px' }} onClick={loadLocations}>
                    🔄 Refresh
                  </button>
                </div>

                {/* Map */}
                <TechnicianMap techs={locationData} />
              </div>

              {/* Location status list */}
              <div className="card">
                <h3 style={{ marginBottom: '16px' }}>📋 Technician Location Status</h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Technician</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'center' }}>Zone</th>
                        <th style={{ textAlign: 'center' }}>GPS</th>
                        <th style={{ textAlign: 'center' }}>Last Updated</th>
                        <th style={{ textAlign: 'center' }}>Coordinates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locationData.map(tech => {
                        const hasGPS = tech.technician?.latitude != null
                        const avail  = tech.technician?.isAvailable ?? false
                        const updated = tech.technician?.locationUpdatedAt
                          ? new Date(tech.technician.locationUpdatedAt).toLocaleString()
                          : '—'
                        return (
                          <tr key={tech.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="avatar" style={{ width: '32px', height: '32px', background: avail ? '#22c55e' : '#6b7280', fontSize: '0.75rem' }}>
                                  {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tech.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tech.technician?.category?.name ?? 'General'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '0.82rem', color: avail ? '#22c55e' : '#6b7280' }}>
                              {avail ? '🟢 Online' : '⚫ Offline'}
                            </td>
                            <td style={{ textAlign: 'center' }}>{tech.technician?.zone ?? '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge" style={{
                                background: hasGPS ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                                color: hasGPS ? '#22c55e' : '#6b7280',
                                border: `1px solid ${hasGPS ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'}`,
                              }}>
                                {hasGPS ? '📍 Sharing' : '❌ No GPS'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{updated}</td>
                            <td style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {hasGPS
                                ? `${tech.technician!.latitude!.toFixed(4)}, ${tech.technician!.longitude!.toFixed(4)}`
                                : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {techsWithoutLocation.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                      ⚠️ {techsWithoutLocation.length} technician{techsWithoutLocation.length > 1 ? 's have' : ' has'} not shared their location yet.
                      Ask them to click <strong>"📍 Share Location"</strong> in their sidebar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
