'use client'
import { useEffect, useRef, useState } from 'react'

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
  feedbackBreakdown: { stars: number; count: number }[]
}

const PRIORITY_COLORS: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }
const STATUS_COLORS = ['#6366f1', '#f59e0b', '#22c55e']
const CAT_COLORS = ['#6366f1','#0ea5e9','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899','#14b8a6']

function DonutChart({ data, colors, title }: { data: { label: string; value: number }[], colors: string[], title: string }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  if (total === 0) return <div className="chart-empty">No data</div>
  
  let offset = 0
  const segments = data.map((d, i) => {
    const pct = (d.value / total) * 100
    const seg = { ...d, pct, offset, color: colors[i % colors.length] }
    offset += pct
    return seg
  })

  const r = 80, cx = 100, cy = 100
  const circ = 2 * Math.PI * r

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 200 200" width="200" height="200">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-color)" strokeWidth={28} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={28}
            strokeDasharray={`${(seg.pct / 100) * circ} ${circ}`}
            strokeDashoffset={-((seg.offset / 100) * circ)}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px', transition: 'stroke-dasharray 0.5s ease' }}
          />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-main)" fontSize="24" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="11">{title}</text>
      </svg>
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background: seg.color }}></span>
            <span className="legend-label">{seg.label}</span>
            <span className="legend-value">{seg.value} ({Math.round(seg.pct)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data, title }: { data: { label: string; value: number; color: string }[], title: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="bar-chart">
      <p className="chart-title">{title}</p>
      {data.map((d, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label">{d.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color }}></div>
          </div>
          <span className="bar-val">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setStats(d); setLoading(false) })
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>
  if (!stats) return null

  const statusData = [
    { label: 'Resolved', value: stats.resolved },
    { label: 'Pending', value: stats.pending },
    { label: 'Assigned', value: stats.assigned },
  ]

  const priorityData = stats.byPriority.map(p => ({ label: p.priority, value: p.count, color: PRIORITY_COLORS[p.priority] || '#6366f1' }))
  const categoryData = stats.byCategory.map((c, i) => ({ label: c.name, value: c.count, color: CAT_COLORS[i % CAT_COLORS.length] }))

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Reports 📈</h1>
          <p className="page-subtitle">Comprehensive insights into your helpdesk performance</p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>📊</div>
          <div><p className="stat-title">Resolution Rate</p><p className="stat-value">{resolutionRate}%</p></div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>⚡</div>
          <div><p className="stat-title">Avg Resolution</p><p className="stat-value">{stats.avgResolutionHours}h</p></div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>🚨</div>
          <div><p className="stat-title">SLA Breaches</p><p className="stat-value" style={{ color: stats.slaBreaches > 0 ? '#ef4444' : '#22c55e' }}>{stats.slaBreaches}</p></div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>⭐</div>
          <div><p className="stat-title">Avg Satisfaction</p><p className="stat-value">{stats.avgRating > 0 ? `${stats.avgRating}/5` : 'N/A'}</p></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '32px' }}>
        <div className="card">
          <h3 className="section-title">🍩 Ticket Status</h3>
          <DonutChart data={statusData} colors={STATUS_COLORS} title="Total" />
        </div>
        <div className="card">
          <h3 className="section-title">🍩 By Category</h3>
          <DonutChart data={stats.byCategory.map((c, i) => ({ label: c.name, value: c.count }))} colors={CAT_COLORS} title="By Category" />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <BarChart title="📊 Tickets by Priority" data={priorityData} />
        </div>
        <div className="card">
          <BarChart title="📊 Tickets by Category" data={categoryData} />
        </div>
      </div>

      {/* Customer Satisfaction Breakdown */}
      {stats.totalFeedback > 0 && (
        <div className="card" style={{ marginTop: '32px' }}>
          <h3 style={{ marginBottom: '20px' }}>⭐ Customer Satisfaction Breakdown</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Average Rating: <strong>{stats.avgRating}/5.0</strong> based on {stats.totalFeedback} customer feedback{stats.totalFeedback !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[5, 4, 3, 2, 1].map(rating => {
              const feedbackCount = stats.feedbackBreakdown.find(f => f.stars === rating)?.count || 0
              const percentage = stats.totalFeedback > 0 ? Math.round((feedbackCount / stats.totalFeedback) * 100) : 0
              return (
                <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ minWidth: '60px' }}>{rating} ⭐</span>
                  <div style={{
                    flex: 1,
                    height: '20px',
                    background: 'var(--border-color)',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: rating >= 4 ? '#22c55e' : rating >= 3 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.5s ease'
                    }}></div>
                  </div>
                  <span style={{ minWidth: '80px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {feedbackCount} ({percentage}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Complaint statistics */}
      <div className="card" style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '20px' }}>📋 Complaint Statistics Summary</h3>
        <div className="stats-summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Complaints</span>
            <span className="summary-val">{stats.total}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Solved</span>
            <span className="summary-val" style={{ color: '#22c55e' }}>{stats.resolved}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Pending</span>
            <span className="summary-val" style={{ color: '#f59e0b' }}>{stats.pending}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">In Progress</span>
            <span className="summary-val" style={{ color: '#6366f1' }}>{stats.assigned}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">SLA Breaches</span>
            <span className="summary-val" style={{ color: stats.slaBreaches > 0 ? '#ef4444' : '#22c55e' }}>{stats.slaBreaches}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Feedback Collected</span>
            <span className="summary-val">{stats.totalFeedback}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Avg Rating</span>
            <span className="summary-val">{stats.avgRating > 0 ? `${stats.avgRating} ⭐` : 'N/A'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Resolution Rate</span>
            <span className="summary-val">{resolutionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
