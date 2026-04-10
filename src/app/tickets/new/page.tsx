'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface Category { id: number; name: string; Solutions: { id: number; title: string; steps: string }[] }
interface AiImageResult { detectedLabel: string; detectedObject: string; category: string; confidence: number; suggestions: string[] }
interface AiLLMResult { category: string; priority: string; location: string; summary: string; troubleshooting: string[] }

const zones = ['SJT', 'TT', 'MGR', 'MGB', 'SMV', 'PRP', 'CDMM', 'Mens Hostel', 'Ladies Hostel', 'Library']
const priorityColor: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }

export default function NewTicketPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [form, setForm] = useState({ description: '', categoryId: '', zone: '' })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [aiImageResult, setAiImageResult] = useState<AiImageResult | null>(null)
  const [aiImageAnalyzing, setAiImageAnalyzing] = useState(false)
  const [aiLLMResult, setAiLLMResult] = useState<AiLLMResult | null>(null)
  const [showSolutions, setShowSolutions] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: number; description: string; category: string; createdAt: string; similarityScore?: number
  } | null>(null)
  const [detectedZone, setDetectedZone] = useState<string | null>(null)
  const llmDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true)
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SR()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (event: any) => {
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript
        }
        if (final) setForm(prev => ({ ...prev, description: prev.description + (prev.description ? ' ' : '') + final }))
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)
      recognitionRef.current = recognition
    }
  }, [])

  // Client-side LLM analysis via API
  const runLLMAnalysis = async (text: string) => {
    if (text.length < 15) { setAiLLMResult(null); return }
    try {
      const res = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      })
      const data = await res.json()
      setAiLLMResult(data)
      // Auto-fill zone if detected
      if (data.location && !form.zone) {
        setForm(prev => ({ ...prev, zone: data.location }))
        setDetectedZone(data.location)
      }
      // Auto-select category if detected and none chosen
      if (data.category && !form.categoryId) {
        const matched = categories.find(c => c.name === data.category)
        if (matched) {
          setForm(prev => ({ ...prev, categoryId: String(matched.id) }))
          setSelectedCategory(matched)
          setShowSolutions(true)
        }
      }
    } catch { /* silent */ }
  }

  const handleDescChange = (v: string) => {
    setForm(f => ({ ...f, description: v }))
    if (llmDebounceRef.current) clearTimeout(llmDebounceRef.current)
    llmDebounceRef.current = setTimeout(() => runLLMAnalysis(v), 700)
  }

  const handleCategoryChange = (id: string) => {
    setForm(f => ({ ...f, categoryId: id }))
    const cat = categories.find(c => c.id === parseInt(id)) || null
    setSelectedCategory(cat)
    setShowSolutions(!!cat)
  }

  const runImageAnalysis = async (file: File) => {
    setAiImageAnalyzing(true)
    setAiImageResult(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/ai/analyze', { method: 'POST', body: fd })
      const result: AiImageResult = await res.json()
      setAiImageResult(result)
      if (result.category && !form.categoryId) {
        const matched = categories.find(c => c.name === result.category)
        if (matched) {
          setForm(f => ({ ...f, categoryId: String(matched.id) }))
          setSelectedCategory(matched)
          setShowSolutions(true)
        }
      }
    } catch { /* silent */ }
    setAiImageAnalyzing(false)
  }

  const handleImageChange = async (f: File | null) => {
    setImage(f)
    setAiImageResult(null)
    if (f) {
      const reader = new FileReader()
      reader.onload = e => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(f)
      await runImageAnalysis(f)
    } else {
      setImagePreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent, forceSubmit = false) => {
    e.preventDefault()
    setError('')
    setDuplicateWarning(null)
    setSubmitting(true)

    const fd = new FormData()
    fd.append('description', form.description)
    fd.append('categoryId', form.categoryId)
    fd.append('zone', form.zone)
    if (image) fd.append('image', image)
    if (forceSubmit) fd.append('forceSubmit', 'true')
    // Pass image analysis results to backend
    if (aiImageResult) {
      fd.append('imageDetectedObject', aiImageResult.detectedObject)
      fd.append('imageConfidence', String(aiImageResult.confidence))
      fd.append('imagePredictedCategory', aiImageResult.category)
    }

    const res = await fetch('/api/tickets', { method: 'POST', body: fd })
    const data = await res.json()
    setSubmitting(false)

    if (res.status === 409 && data.duplicate) {
      setDuplicateWarning(data.duplicate)
      return
    }
    if (!res.ok) { setError(data.error || 'Failed to submit ticket'); return }
    router.push(`/tickets/${data.id}`)
  }

  const confPct = aiImageResult ? Math.round(aiImageResult.confidence * 100) : 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Submit a Ticket</h1>
          <p className="page-subtitle">AI-powered complaint classification and routing</p>
        </div>
      </div>

      <div className="ticket-form-layout">
        <div className="card">
          <form onSubmit={handleSubmit} className="form-grid">

            {/* ── Image Upload ─────────────────────────────── */}
            <div className="form-group">
              <label>📸 Upload Image — AI will auto-detect issue category</label>
              <div
                className="upload-zone"
                onClick={() => document.getElementById('imgInput')?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleImageChange(e.dataTransfer.files[0] || null) }}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="upload-preview" />
                  : (
                    <div className="upload-placeholder">
                      <span style={{ fontSize: '2.5rem' }}>🤖</span>
                      <p>Click or drag to upload — AI will analyse</p>
                      <p className="upload-hint">PNG, JPG up to 10MB</p>
                    </div>
                  )}
              </div>
              <input id="imgInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageChange(e.target.files?.[0] || null)} />
              {image && (
                <button type="button" className="btn btn-secondary" style={{ marginTop: '8px', fontSize: '0.8rem' }} onClick={() => handleImageChange(null)}>
                  ✕ Remove image
                </button>
              )}
            </div>

            {/* ── Image AI Result ───────────────────────────── */}
            {aiImageAnalyzing && (
              <div className="ai-analyzing-box">
                <div className="spinner" style={{ width: '20px', height: '20px', margin: 0 }}></div>
                <span>🤖 AI is analysing your image…</span>
              </div>
            )}
            {aiImageResult && !aiImageAnalyzing && (
              <div className="ai-result-box">
                <div className="ai-result-header">
                  <span>🤖 Image Detection Result</span>
                  <span className="ai-confidence" style={{ color: confPct >= 80 ? '#22c55e' : confPct >= 60 ? '#f59e0b' : '#ef4444' }}>
                    {confPct}% confidence
                  </span>
                </div>
                <p className="ai-label">{aiImageResult.detectedLabel}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                  Detected: <strong style={{ color: 'var(--text-main)' }}>{aiImageResult.detectedObject}</strong>
                </p>
                {aiImageResult.category && (
                  <p className="ai-category">📂 Category auto-set to: <strong>{aiImageResult.category}</strong></p>
                )}
                <div className="ai-suggestions">
                  {aiImageResult.suggestions.map((s, i) => <span key={i} className="ai-suggestion-chip">{s}</span>)}
                </div>
                <div className="ai-confidence-bar">
                  <div className="ai-confidence-fill" style={{ width: `${confPct}%`, background: confPct >= 80 ? '#22c55e' : confPct >= 60 ? '#f59e0b' : '#ef4444' }}></div>
                </div>
              </div>
            )}

            {/* ── Category ─────────────────────────────────── */}
            <div className="form-group">
              <label>Issue Category *</label>
              <select value={form.categoryId} onChange={e => handleCategoryChange(e.target.value)} required>
                <option value="">Select a category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {aiImageResult?.category && <p style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: '4px' }}>✅ Auto-selected by image AI</p>}
              {aiLLMResult?.category && !aiImageResult?.category && (
                <p style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '4px' }}>🧠 Suggested by text AI: <strong>{aiLLMResult.category}</strong></p>
              )}
            </div>

            {/* ── Zone ─────────────────────────────────────── */}
            <div className="form-group">
              <label>Zone *</label>
              <select value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} required>
                <option value="">Select a zone…</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              {detectedZone && (
                <p style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: '4px' }}>
                  🤖 Auto-detected zone: <strong>{detectedZone}</strong>
                </p>
              )}
            </div>

            {/* ── Description ──────────────────────────────── */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label>Description *</label>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => isListening ? recognitionRef.current?.stop() : recognitionRef.current?.start()}
                    className={`voice-btn ${isListening ? 'listening' : ''}`}
                  >
                    {isListening ? '🔴 Stop' : '🎤 Voice'}
                  </button>
                )}
              </div>
              <textarea
                value={form.description}
                onChange={e => handleDescChange(e.target.value)}
                placeholder="Describe the issue in detail. AI will analyse as you type…"
                required rows={5}
              />
            </div>

            {/* ── LLM AI Analysis Panel ─────────────────────── */}
            {aiLLMResult && (
              <div className="ai-result-box" style={{ borderColor: 'rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.04)' }}>
                <div className="ai-result-header">
                  <span>🧠 AI Complaint Analysis</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live · updates as you type</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {aiLLMResult.category && (
                    <div className="ai-detail-chip">
                      <span className="ai-detail-label">Category</span>
                      <span className="ai-detail-value">{aiLLMResult.category}</span>
                    </div>
                  )}
                  {aiLLMResult.priority && (
                    <div className="ai-detail-chip">
                      <span className="ai-detail-label">Priority</span>
                      <span className="ai-detail-value" style={{ color: priorityColor[aiLLMResult.priority] }}>
                        {aiLLMResult.priority}
                      </span>
                    </div>
                  )}
                  {aiLLMResult.location && (
                    <div className="ai-detail-chip">
                      <span className="ai-detail-label">Location</span>
                      <span className="ai-detail-value">📍 {aiLLMResult.location}</span>
                    </div>
                  )}
                  {aiLLMResult.summary && (
                    <div className="ai-detail-chip" style={{ gridColumn: '1 / -1' }}>
                      <span className="ai-detail-label">Summary</span>
                      <span className="ai-detail-value" style={{ fontStyle: 'italic' }}>{aiLLMResult.summary}</span>
                    </div>
                  )}
                </div>
                {aiLLMResult.troubleshooting.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>💡 Suggested Troubleshooting:</p>
                    <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {aiLLMResult.troubleshooting.map((step, i) => (
                        <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* ── Error ────────────────────────────────────── */}
            {error && <div className="login-error">⚠️ {error}</div>}

            {/* ── Duplicate Warning ─────────────────────────── */}
            {duplicateWarning && (
              <div className="duplicate-warning">
                <div className="duplicate-header">
                  <span>⚠️ Similar Issue Detected</span>
                  {duplicateWarning.similarityScore && (
                    <span style={{ fontSize: '0.78rem', color: '#f59e0b' }}>
                      {Math.round(duplicateWarning.similarityScore * 100)}% match
                    </span>
                  )}
                </div>
                <p className="duplicate-msg">A similar complaint was recently reported:</p>
                <div className="duplicate-ticket">
                  <p><strong>Ticket #{duplicateWarning.id}</strong></p>
                  <p className="duplicate-desc">"{duplicateWarning.description.substring(0, 100)}…"</p>
                  <p className="duplicate-meta">
                    Category: <span>{duplicateWarning.category}</span>
                  </p>
                </div>
                <p className="duplicate-question">Is your issue different? You can still submit it.</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setDuplicateWarning(null)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={e => handleSubmit(e as any, true)} disabled={submitting}>
                    {submitting ? '⏳ Submitting…' : '✅ Submit Anyway'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Submit ───────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? '⏳ Submitting…' : '🚀 Submit Ticket'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
            </div>
          </form>
        </div>

        {/* ── Solutions Panel ───────────────────────────── */}
        {showSolutions && selectedCategory && (
          <div className="card solutions-panel">
            <h3>💡 Try These First — "{selectedCategory.name}"</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Resolve without raising a ticket:</p>
            <div className="solutions-list">
              {selectedCategory.Solutions.map(sol => (
                <details key={sol.id} className="solution-item">
                  <summary className="solution-title">{sol.title}</summary>
                  <pre className="solution-steps">{sol.steps}</pre>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
