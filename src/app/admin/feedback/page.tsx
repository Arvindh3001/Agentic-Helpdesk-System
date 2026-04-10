'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

interface RatingDist { star: number; count: number }

interface TechRating {
  techId: number
  techName: string
  techEmail: string
  avgRating: number
  totalFeedback: number
  lowRatingCount: number
  ratingDist: RatingDist[]
}

interface FeedbackEntry {
  id: number
  rating: number
  comments: string | null
  createdAt: string
  ticketId: number
  category: string
  customerName: string
  techName: string
}

interface FeedbackStats {
  overallAvg: number
  totalFeedback: number
  lowRatingCount: number
  ratingDist: RatingDist[]
  technicianRatings: TechRating[]
  recentFeedback: FeedbackEntry[]
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= rating ? '#fbbf24' : 'var(--border-color)' }}>★</span>
      ))}
    </span>
  )
}

function RatingPill({ rating }: { rating: number }) {
  const color = rating >= 4 ? '#22c55e' : rating >= 3 ? '#f59e0b' : '#ef4444'
  return (
    <span className="badge" style={{ background: color + '22', color, border: `1px solid ${color}44`, fontWeight: 700 }}>
      {rating}/5
    </span>
  )
}

export default function FeedbackAdminPage() {
  const { user } = useAuth()
  const [data, setData]       = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'overview' | 'technicians' | 'comments'>('overview')
  const [filterLow, setFilterLow] = useState(false)

  useEffect(() => {
    fetch('/api/analytics/feedback')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>
  if (!data)   return <div className="page"><p>Failed to load feedback data.</p></div>

  const visibleFeedback = filterLow
    ? data.recentFeedback.filter(f => f.rating <= 2)
    : data.recentFeedback

  const sentimentColor = data.overallAvg >= 4 ? '#22c55e' : data.overallAvg >= 3 ? '#f59e0b' : '#ef4444'

  return (
    <div className="page">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Feedback & Ratings ⭐</h1>
          <p className="page-subtitle">Customer satisfaction analytics and technician performance</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['overview', 'technicians', 'comments'] as const).map(t => (
            <button
              key={t}
              className={`chip ${tab === t ? 'chip-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'overview' ? '📊 Overview' : t === 'technicians' ? '👷 By Technician' : '💬 Comments'}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: sentimentColor + '20', color: sentimentColor }}>⭐</div>
          <div>
            <p className="stat-title">Overall Avg Rating</p>
            <p className="stat-value" style={{ color: sentimentColor }}>
              {data.overallAvg > 0 ? `${data.overallAvg}/5` : 'N/A'}
            </p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>💬</div>
          <div>
            <p className="stat-title">Total Feedback</p>
            <p className="stat-value">{data.totalFeedback}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>⚠️</div>
          <div>
            <p className="stat-title">Low Ratings (≤2)</p>
            <p className="stat-value" style={{ color: data.lowRatingCount > 0 ? '#ef4444' : '#22c55e' }}>
              {data.lowRatingCount}
            </p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>😊</div>
          <div>
            <p className="stat-title">Satisfaction Rate</p>
            <p className="stat-value" style={{ color: '#22c55e' }}>
              {data.totalFeedback > 0
                ? `${Math.round((data.ratingDist.filter(r => r.star >= 4).reduce((a, b) => a + b.count, 0) / data.totalFeedback) * 100)}%`
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* ── No feedback state ──────────────────────────── */}
      {data.totalFeedback === 0 && (
        <div className="card empty-state">
          <p style={{ fontSize: '2rem' }}>⭐</p>
          <p>No feedback collected yet.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Feedback appears after tickets are resolved and customers submit their rating.
          </p>
        </div>
      )}

      {/* ── OVERVIEW TAB ───────────────────────────────── */}
      {tab === 'overview' && data.totalFeedback > 0 && (
        <div>
          {/* Rating distribution */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>⭐ Rating Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[5, 4, 3, 2, 1].map(star => {
                const entry = data.ratingDist.find(r => r.star === star)
                const count = entry?.count ?? 0
                const pct   = data.totalFeedback > 0 ? Math.round((count / data.totalFeedback) * 100) : 0
                const color = star >= 4 ? '#22c55e' : star >= 3 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ minWidth: '52px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      {star} <span style={{ color: '#fbbf24' }}>★</span>
                    </span>
                    <div style={{ flex: 1, height: '22px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ minWidth: '90px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Average</span>
                  <p style={{ fontSize: '1.8rem', fontWeight: 700, color: sentimentColor, lineHeight: 1.2 }}>{data.overallAvg}</p>
                  <Stars rating={Math.round(data.overallAvg)} size={20} />
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Based on</span>
                  <p style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.2 }}>{data.totalFeedback}</p>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>responses</span>
                </div>
              </div>
            </div>
          </div>

          {/* Low rating alert */}
          {data.lowRatingCount > 0 && (
            <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.08)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <p style={{ fontWeight: 600, color: '#ef4444' }}>
                  {data.lowRatingCount} low rating{data.lowRatingCount > 1 ? 's' : ''} require attention
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Customers gave 1 or 2 stars. Review the Comments tab and follow up with the technician.
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ marginLeft: 'auto', fontSize: '0.82rem', padding: '8px 14px', whiteSpace: 'nowrap' }}
                onClick={() => { setTab('comments'); setFilterLow(true) }}
              >
                View Low Ratings
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TECHNICIANS TAB ─────────────────────────────── */}
      {tab === 'technicians' && data.totalFeedback > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>👷 Rating by Technician</h3>

          {data.technicianRatings.length === 0 ? (
            <div className="empty-state">
              <p>No feedback linked to technicians yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.technicianRatings.map((tech, i) => {
                const color       = tech.avgRating >= 4 ? '#22c55e' : tech.avgRating >= 3 ? '#f59e0b' : '#ef4444'
                const isLowPerf   = tech.avgRating < 3
                const initials    = tech.techName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

                return (
                  <div
                    key={tech.techId}
                    style={{
                      padding: '18px 20px',
                      background: isLowPerf ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      border: `1px solid ${isLowPerf ? 'rgba(239,68,68,0.2)' : 'var(--border-color)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      {/* Rank + avatar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
                        <span style={{ fontSize: '1.1rem', minWidth: '28px', textAlign: 'center' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                        <div className="avatar" style={{ width: '36px', height: '36px', background: color, fontSize: '0.78rem', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>{tech.techName}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tech.techEmail}</p>
                        </div>
                      </div>

                      {/* Avg rating */}
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color, lineHeight: 1 }}>{tech.avgRating}</p>
                        <Stars rating={Math.round(tech.avgRating)} size={14} />
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: '20px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '1rem', fontWeight: 600 }}>{tech.totalFeedback}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Responses</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '1rem', fontWeight: 600, color: tech.lowRatingCount > 0 ? '#ef4444' : '#22c55e' }}>
                            {tech.lowRatingCount}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Low (≤2★)</p>
                        </div>
                      </div>

                      {/* Low alert badge */}
                      {isLowPerf && (
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.75rem' }}>
                          ⚠️ Needs attention
                        </span>
                      )}
                    </div>

                    {/* Mini rating bar */}
                    <div style={{ marginTop: '14px', display: 'flex', gap: '6px', alignItems: 'flex-end', height: '36px' }}>
                      {[1, 2, 3, 4, 5].map(star => {
                        const entry  = tech.ratingDist.find(r => r.star === star)
                        const count  = entry?.count ?? 0
                        const maxCnt = Math.max(...tech.ratingDist.map(r => r.count), 1)
                        const h      = Math.max((count / maxCnt) * 36, count > 0 ? 6 : 2)
                        const c      = star >= 4 ? '#22c55e' : star >= 3 ? '#f59e0b' : '#ef4444'
                        return (
                          <div key={star} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <div style={{ width: '100%', height: `${h}px`, background: c, borderRadius: '3px', opacity: count > 0 ? 1 : 0.2, transition: 'height 0.4s ease' }} />
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{star}★</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── COMMENTS TAB ───────────────────────────────── */}
      {tab === 'comments' && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <h3>💬 Customer Comments</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filterLow}
                  onChange={e => setFilterLow(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: '#ef4444' }}
                />
                Show low ratings only
              </label>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{visibleFeedback.length} records</span>
            </div>
          </div>

          {visibleFeedback.length === 0 ? (
            <div className="empty-state">
              <p>📭</p>
              <p>{filterLow ? 'No low ratings found.' : 'No feedback comments yet.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {visibleFeedback.map(fb => {
                const isLow = fb.rating <= 2
                return (
                  <div
                    key={fb.id}
                    style={{
                      padding: '16px 18px',
                      background: isLow ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      border: `1px solid ${isLow ? 'rgba(239,68,68,0.2)' : 'var(--border-color)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <Stars rating={fb.rating} size={16} />
                            <RatingPill rating={fb.rating} />
                            {isLow && (
                              <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.72rem' }}>
                                ⚠️ Low
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <strong style={{ color: 'var(--text-main)' }}>{fb.customerName}</strong>
                            {' · '}
                            <Link href={`/tickets/${fb.ticketId}`} style={{ color: '#6366f1' }}>
                              Ticket #{fb.ticketId}
                            </Link>
                            {' · '}
                            {fb.category}
                            {fb.techName !== 'Unassigned' && (
                              <> · Tech: <strong style={{ color: 'var(--text-main)' }}>{fb.techName}</strong></>
                            )}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {fb.comments && (
                      <p style={{ marginTop: '10px', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.6, fontStyle: 'italic', borderLeft: `3px solid ${isLow ? '#ef4444' : 'var(--border-color)'}`, paddingLeft: '12px' }}>
                        "{fb.comments}"
                      </p>
                    )}
                    {!fb.comments && (
                      <p style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No written comment provided.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
