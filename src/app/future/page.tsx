'use client'
import { useEffect, useState } from 'react'

interface Alert {
  categoryId: number
  categoryName: string
  recentCount: number
  olderCount: number
  total: number
  trendRatio: number
  severity: 'High' | 'Medium' | 'Low'
  recommendation: string
}

interface Tech {
  id: number
  name: string
  email: string
  technician: { isAvailable: boolean; currentWorkload: number } | null
}

const CAMPUS_BLOCKS = ['SJT', 'TT', 'MGR', 'MGB', 'SMV', 'PRP', 'CDMM', 'Mens Hostel', 'Ladies Hostel', 'Library']
const severityColor: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }

export default function FuturePage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [techs, setTechs] = useState<Tech[]>([])
  const [techLocations, setTechLocations] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ai' | 'predict' | 'gps' | 'mobile' | 'notify'>('ai')

  useEffect(() => {
    Promise.all([
      fetch('/api/ai/predict').then(r => r.json()),
      fetch('/api/technicians').then(r => r.json()),
    ]).then(([a, t]) => {
      setAlerts(Array.isArray(a) ? a : [])
      setTechs(Array.isArray(t) ? t : [])
      // Simulate random initial locations
      const locs: Record<number, string> = {}
      if (Array.isArray(t)) t.forEach((tech: Tech, i: number) => { locs[tech.id] = CAMPUS_BLOCKS[i % CAMPUS_BLOCKS.length] })
      setTechLocations(locs)
      setLoading(false)
    })
  }, [])

  const tabs = [
    { id: 'ai', label: '🤖 AI Detection', icon: '🤖' },
    { id: 'predict', label: '📊 Predictive', icon: '📊' },
    { id: 'gps', label: '📍 GPS Tracking', icon: '📍' },
    { id: 'mobile', label: '📱 Mobile App', icon: '📱' },
    { id: 'notify', label: '🔔 Notifications', icon: '🔔' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI & Future Features 🚀</h1>
          <p className="page-subtitle">Advanced capabilities — current implementation and future roadmap</p>
        </div>
        <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '8px 16px', fontSize: '0.85rem' }}>v2.0 Roadmap</span>
      </div>

      {/* Tabs */}
      <div className="future-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`future-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id as typeof activeTab)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* AI Image Detection */}
      {activeTab === 'ai' && (
        <div className="future-section">
          <div className="future-hero card">
            <div className="future-badge">🤖 Implemented (Simulation Mode)</div>
            <h2>AI-Based Image Fault Detection</h2>
            <p>Upload an image in <strong>Submit Ticket</strong> — our AI instantly analyzes it and suggests the complaint category and fault type. Currently uses intelligent keyword analysis.</p>
            <div className="future-pipeline">
              <div className="pipeline-step">
                <div className="pipeline-icon">📤</div>
                <p>User uploads image</p>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step active-step">
                <div className="pipeline-icon">🤖</div>
                <p>AI analyzes image</p>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step">
                <div className="pipeline-icon">📂</div>
                <p>Category auto-detected</p>
              </div>
              <div className="pipeline-arrow">→</div>
              <div className="pipeline-step">
                <div className="pipeline-icon">🔧</div>
                <p>Technician assigned</p>
              </div>
            </div>
            <div className="ai-demo-examples">
              <h4>Example Detections:</h4>
              <div className="ai-examples-grid">
                {[
                  { label: 'broken_chair.jpg', detected: 'Furniture Damage', category: 'Furniture', conf: 85 },
                  { label: 'water_leak.jpg', detected: 'Water Leakage', category: 'Plumbing', conf: 87 },
                  { label: 'exposed_wire.jpg', detected: 'Electrical Fault', category: 'Electrical', conf: 91 },
                  { label: 'projector_issue.jpg', detected: 'Equipment Fault', category: 'Classroom Equipment', conf: 88 },
                ].map((ex, i) => (
                  <div key={i} className="ai-example-card">
                    <div className="ai-example-icon">🖼️</div>
                    <p className="ai-example-file">{ex.label}</p>
                    <p className="ai-example-detected">→ {ex.detected}</p>
                    <p className="ai-example-cat">📂 {ex.category}</p>
                    <div className="mini-conf-bar"><div style={{ width: `${ex.conf}%`, height: '100%', background: '#22c55e', borderRadius: '99px' }}></div></div>
                    <p style={{ fontSize: '0.75rem', color: '#22c55e' }}>{ex.conf}% confidence</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="future-roadmap-box">
              <h4>🔮 Future Upgrade: YOLO / CNN Deep Learning</h4>
              <p>In future, we plan to integrate YOLO-based image detection to automatically identify campus infrastructure faults from uploaded images with high accuracy (&gt;95%) using a Python FastAPI microservice.</p>
            </div>
          </div>
        </div>
      )}

      {/* Predictive Maintenance */}
      {activeTab === 'predict' && (
        <div className="future-section">
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="future-badge">📊 Live — Powered by Complaint History</div>
            <h2 style={{ marginBottom: '8px' }}>Predictive Maintenance System</h2>
            <p style={{ color: 'var(--text-muted)' }}>Analyzes complaint patterns to proactively identify infrastructure areas at risk before they cause major disruptions.</p>
          </div>
          {loading ? <div className="page-loading"><div className="spinner"></div></div> : alerts.length === 0 ? (
            <div className="card empty-state">
              <p style={{ fontSize: '2rem' }}>✅</p>
              <p>No maintenance alerts. All systems normal.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Submit more tickets to train the prediction system.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {alerts.map((alert, i) => (
                <div key={i} className="predict-alert-card card" style={{ borderLeft: `4px solid ${severityColor[alert.severity]}` }}>
                  <div className="predict-header">
                    <div>
                      <span className="badge" style={{ background: severityColor[alert.severity] + '22', color: severityColor[alert.severity], border: `1px solid ${severityColor[alert.severity]}44` }}>{alert.severity} Risk</span>
                      <h3 style={{ marginTop: '8px' }}>⚠️ {alert.categoryName}</h3>
                    </div>
                    <div className="predict-stats">
                      <div className="predict-stat"><span>Recent (15d)</span><strong style={{ color: '#ef4444' }}>{alert.recentCount}</strong></div>
                      <div className="predict-stat"><span>Previous (15d)</span><strong>{alert.olderCount}</strong></div>
                      <div className="predict-stat"><span>Trend</span><strong style={{ color: '#f59e0b' }}>↑ {alert.trendRatio}x</strong></div>
                      <div className="predict-stat"><span>Total</span><strong>{alert.total}</strong></div>
                    </div>
                  </div>
                  <div className="predict-recommendation">
                    <span>🔧</span>
                    <p>{alert.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="future-roadmap-box card" style={{ marginTop: '24px' }}>
            <h4>🔮 Future: ML-Based Time Series Prediction</h4>
            <p>Future work includes predictive maintenance analytics using historical complaint data, training a time-series model (LSTM/Prophet) to forecast infrastructure failures weeks in advance.</p>
          </div>
        </div>
      )}

      {/* GPS Tracking */}
      {activeTab === 'gps' && (
        <div className="future-section">
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="future-badge">📍 Simulated — Campus Block Tracking</div>
            <h2 style={{ marginBottom: '8px' }}>Technician GPS Location Tracking</h2>
            <p style={{ color: 'var(--text-muted)' }}>Track technician locations across campus blocks for nearest-first assignment and faster response times.</p>
          </div>
          <div className="gps-layout">
            {/* Campus map */}
            <div className="card campus-map">
              <h3 style={{ marginBottom: '16px' }}>🗺️ Campus Map</h3>
              <div className="map-grid">
                {CAMPUS_BLOCKS.map(block => {
                  const techsHere = techs.filter(t => techLocations[t.id] === block)
                  return (
                    <div key={block} className={`map-block ${techsHere.length > 0 ? 'has-tech' : ''}`}>
                      <p className="block-name">{block}</p>
                      {techsHere.map(t => {
                        const isAvailable = t.technician?.isAvailable ?? true
                        const dotColor = isAvailable ? '#22c55e' : '#6b7280'
                        const bgColor = isAvailable ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)'
                        const borderColor = isAvailable ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'
                        const textColor = isAvailable ? '#22c55e' : '#6b7280'

                        return (
                          <div key={t.id} className="tech-dot-with-name" title={`${t.name} - ${isAvailable ? 'Available' : 'Busy'}`} style={{
                            background: bgColor,
                            borderColor: borderColor
                          }}>
                            <span className="tech-dot" style={{ background: `linear-gradient(135deg, ${dotColor}, ${dotColor}dd)` }}>
                              {t.name[0]}
                            </span>
                            <span className="tech-name" style={{ color: textColor }}>{t.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Technician location panel */}
            <div>
              <div className="card">
                <h3 style={{ marginBottom: '16px' }}>👷 Technician Locations</h3>
                {techs.map(t => (
                  <div key={t.id} className="tech-location-item">
                    <div className="avatar" style={{ background: t.technician?.isAvailable ? '#22c55e' : '#6b7280', width: '32px', height: '32px', fontSize: '0.8rem' }}>
                      {t.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{techLocations[t.id] || 'Unknown'}</p>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: t.technician?.isAvailable ? '#22c55e' : '#6b7280' }}>
                      {t.technician?.isAvailable ? '🟢 Available' : '⚫ Busy'}
                    </span>
                  </div>
                ))}
                {techs.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No technicians registered yet.</p>}
              </div>
              <div className="future-roadmap-box card" style={{ marginTop: '16px' }}>
                <h4>🔮 Future: Real GPS Tracking</h4>
                <p>GPS-based technician tracking will allow dynamic assignment based on technician proximity using Google Maps API / device GPS coordinates.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile App */}
      {activeTab === 'mobile' && (
        <div className="future-section">
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="future-badge">📱 PWA Enabled — Installable on Mobile</div>
            <h2 style={{ marginBottom: '8px' }}>Mobile Application Integration</h2>
            <p style={{ color: 'var(--text-muted)' }}>This web app is built as a Progressive Web App (PWA) — installable on Android and iOS directly from the browser, no app store needed.</p>
          </div>
          <div className="grid-2">
            <div className="card">
              <h3>📲 PWA Features (Available Now)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                {[
                  { icon: '🔗', label: 'Installable from browser', desc: 'Works on Android Chrome & iOS Safari' },
                  { icon: '📸', label: 'Camera upload', desc: 'Take photos directly from mobile camera' },
                  { icon: '🔔', label: 'Notification support', desc: 'Browser push notifications on mobile' },
                  { icon: '🌐', label: 'Responsive design', desc: 'Fully optimized for mobile screens' },
                  { icon: '📶', label: 'Works on slow networks', desc: 'Lightweight app, campus WiFi friendly' },
                ].map((f, i) => (
                  <div key={i} className="mobile-feature">
                    <span className="mobile-icon">{f.icon}</span>
                    <div><p style={{ fontWeight: 600 }}>{f.label}</p><p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{f.desc}</p></div>
                    <span style={{ color: '#22c55e', fontSize: '1.2rem' }}>✅</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>🔮 Native App Roadmap</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                {[
                  { icon: '🤖', label: 'Android App', desc: 'React Native / Flutter cross-platform app', status: 'Planned' },
                  { icon: '🍎', label: 'iOS App', desc: 'App Store submission and approval', status: 'Planned' },
                  { icon: '📡', label: 'Push Notifications', desc: 'Firebase Cloud Messaging (FCM)', status: 'Planned' },
                  { icon: '📍', label: 'Native GPS', desc: 'Device GPS for technician tracking', status: 'Planned' },
                  { icon: '📷', label: 'AR Fault Detection', desc: 'Point camera at issue for instant AI scan', status: 'Future' },
                ].map((f, i) => (
                  <div key={i} className="mobile-feature">
                    <span className="mobile-icon">{f.icon}</span>
                    <div><p style={{ fontWeight: 600 }}>{f.label}</p><p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{f.desc}</p></div>
                    <span className="badge" style={{ background: f.status === 'Future' ? 'rgba(168,85,247,0.15)' : 'rgba(245,158,11,0.15)', color: f.status === 'Future' ? '#a855f7' : '#f59e0b', fontSize: '0.72rem' }}>{f.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification System */}
      {activeTab === 'notify' && (
        <div className="future-section">
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="future-badge">🔔 Live — In-App Notifications Active</div>
            <h2 style={{ marginBottom: '8px' }}>Real-Time Notification System</h2>
            <p style={{ color: 'var(--text-muted)' }}>Click the 🔔 bell in the top-right corner to see real-time ticket alerts. Channels expand in future phases.</p>
          </div>
          <div className="grid-2">
            <div>
              {[
                { icon: '🔔', channel: 'In-App Notifications', status: '✅ Live', desc: 'Real-time alerts for ticket updates, SLA breaches, and assignments via the notification bell.', color: '#22c55e' },
                { icon: '📧', channel: 'Email Notifications', status: '⚙️ Ready', desc: 'Nodemailer configured. Email on ticket creation, assignment, and resolution. Requires SMTP credentials in .env', color: '#f59e0b' },
                { icon: '📱', channel: 'SMS Alerts', status: '🔮 Future', desc: 'Integration with Twilio or MSG91 for SMS on critical ticket updates and SLA breaches.', color: '#a855f7' },
                { icon: '💬', channel: 'WhatsApp Alerts', status: '🔮 Future', desc: 'WhatsApp Business API for instant complaint status updates to students and staff.', color: '#25d366' },
              ].map((ch, i) => (
                <div key={i} className="card notify-channel" style={{ marginBottom: '16px', borderLeft: `4px solid ${ch.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4>{ch.icon} {ch.channel}</h4>
                    <span className="badge" style={{ background: ch.color + '22', color: ch.color, border: `1px solid ${ch.color}44` }}>{ch.status}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{ch.desc}</p>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Notification Events</h3>
              {[
                { event: 'Ticket Submitted', triggers: ['Customer', 'Admin'], icon: '🎫' },
                { event: 'Technician Assigned', triggers: ['Customer', 'Technician'], icon: '🔧' },
                { event: 'Ticket Resolved', triggers: ['Customer'], icon: '✅' },
                { event: 'SLA Breach Warning', triggers: ['Admin', 'Technician'], icon: '⏰' },
                { event: 'New Pending Ticket', triggers: ['Admin'], icon: '🆕' },
                { event: 'Feedback Submitted', triggers: ['Admin', 'Technician'], icon: '⭐' },
              ].map((ev, i) => (
                <div key={i} className="notif-event-row">
                  <span className="notif-event-icon">{ev.icon}</span>
                  <span style={{ flex: 1, fontSize: '0.88rem' }}>{ev.event}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {ev.triggers.map(t => (
                      <span key={t} className="badge" style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
