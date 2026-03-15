'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

interface Category { id: number; name: string; Solutions: { id: number; title: string; steps: string }[] }
interface AiResult { detectedLabel: string; category: string; confidence: number; suggestions: string[] }

const zones = ['SJT', 'TT', 'MGR', 'MGB', 'SMV', 'PRP', 'CDMM', 'Mens Hostel', 'Ladies Hostel', 'Library']

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
  const [predictedPriority, setPredictedPriority] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [showSolutions, setShowSolutions] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: number
    description: string
    category: string
    createdAt: string
  } | null>(null)
  const [detectedZone, setDetectedZone] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories)

    // Check for Speech Recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setForm(prev => ({
            ...prev,
            description: prev.description + (prev.description ? ' ' : '') + finalTranscript
          }))
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const predictPriority = (desc: string) => {
    const d = desc.toLowerCase()
    const high = ['urgent', 'critical', 'emergency', 'exposed wire', 'shock', 'fire', 'flood', 'collapse', 'gas leak', 'not working', 'power failure', 'water leakage', 'ceiling leak', 'electrical hazard', 'security breach', 'cctv down']
    const med = ['slow', 'issue', 'problem', 'intermittent', 'delay', 'trouble', 'damaged', 'broken', 'leak', 'dirty', 'cleaning needed', 'furniture repair', 'wifi slow', 'projector issue']
    for (const kw of high) if (d.includes(kw)) return 'High'
    for (const kw of med) if (d.includes(kw)) return 'Medium'
    return 'Low'
  }

  const detectZoneFromDescription = (desc: string) => {
    const d = desc.toLowerCase().replace(/[^a-z0-9\s]/g, '')

    // Zone detection patterns (including common variations and typos)
    const zonePatterns: { [key: string]: string[] } = {
      'SJT': ['sjt', 's j t', 'sj t', 'saint joseph', 'st joseph', 'joseph'],
      'TT': ['tt', 't t', 'technology', 'tech department'],
      'MGR': ['mgr', 'm g r', 'mg r', 'manager', 'management'],
      'MGB': ['mgb', 'm g b', 'mg b'],
      'SMV': ['smv', 's m v', 'sm v'],
      'PRP': ['prp', 'p r p', 'pr p'],
      'CDMM': ['cdmm', 'c d m m', 'cd mm', 'cdm m'],
      'Mens Hostel': ['mens hostel', 'men hostel', 'boys hostel', 'male hostel', 'mens', 'boys'],
      'Ladies Hostel': ['ladies hostel', 'lady hostel', 'women hostel', 'female hostel', 'ladies', 'women', 'girls hostel'],
      'Library': ['library', 'lib', 'libraries', 'reading room', 'study hall']
    }

    for (const [zone, patterns] of Object.entries(zonePatterns)) {
      for (const pattern of patterns) {
        if (d.includes(pattern)) {
          return zone
        }
      }
    }
    return null
  }

  const handleDescChange = (v: string) => {
    setForm({ ...form, description: v })

    if (v.length > 10) {
      setPredictedPriority(predictPriority(v))

      // AI Zone Detection
      const zone = detectZoneFromDescription(v)
      if (zone && zone !== form.zone) {
        setForm(prev => ({ ...prev, zone: zone }))
        setDetectedZone(zone)
      }
    } else {
      setPredictedPriority(null)
      if (detectedZone) {
        setDetectedZone(null)
      }
    }
  }

  const toggleSpeechRecognition = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      recognitionRef.current?.start()
    }
  }

  const handleCategoryChange = (id: string) => {
    setForm({ ...form, categoryId: id })
    const cat = categories.find(c => c.id === parseInt(id)) || null
    setSelectedCategory(cat)
    setShowSolutions(!!cat)
  }

  const runAiAnalysis = async (file: File) => {
    setAiAnalyzing(true)
    setAiResult(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/ai/analyze', { method: 'POST', body: fd })
      const result: AiResult = await res.json()
      setAiResult(result)
      // Auto-select category if AI detects one
      if (result.category) {
        const matched = categories.find(c => c.name === result.category)
        if (matched) {
          setForm(f => ({ ...f, categoryId: String(matched.id) }))
          setSelectedCategory(matched)
          setShowSolutions(true)
        }
      }
    } catch {
      // ignore
    }
    setAiAnalyzing(false)
  }

  const handleImageChange = async (f: File | null) => {
    setImage(f)
    setAiResult(null)
    if (f) {
      const reader = new FileReader()
      reader.onload = e => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(f)
      await runAiAnalysis(f)
    } else {
      setImagePreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, forceSubmit = false) => {
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

    const res = await fetch('/api/tickets', { method: 'POST', body: fd })
    const data = await res.json()
    setSubmitting(false)

    if (res.status === 409 && data.duplicate) {
      // Show duplicate warning
      setDuplicateWarning(data.duplicate)
      return
    }

    if (!res.ok) {
      setError(data.error || 'Failed to submit ticket')
      return
    }

    router.push(`/tickets/${data.id}`)
  }

  const submitAnyway = (e: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e, true)
  }

  const priorityColor: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }
  const confPct = aiResult ? Math.round(aiResult.confidence * 100) : 0

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
            {/* Image Upload with AI */}
            <div className="form-group">
              <label>📸 Upload Image — AI will auto-detect the issue category</label>
              <div
                className="upload-zone"
                onClick={() => document.getElementById('imgInput')?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleImageChange(e.dataTransfer.files[0] || null) }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="upload-preview" />
                ) : (
                  <div className="upload-placeholder">
                    <span style={{ fontSize: '2.5rem' }}>🤖</span>
                    <p>Click or drag to upload — AI will analyze</p>
                    <p className="upload-hint">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
              <input id="imgInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageChange(e.target.files?.[0] || null)} />
              {image && <button type="button" className="btn btn-secondary" style={{ marginTop: '8px', fontSize: '0.8rem' }} onClick={() => handleImageChange(null)}>✕ Remove image</button>}
            </div>

            {/* AI Analysis Result */}
            {aiAnalyzing && (
              <div className="ai-analyzing-box">
                <div className="spinner" style={{ width: '20px', height: '20px', margin: '0' }}></div>
                <span>🤖 AI is analyzing your image…</span>
              </div>
            )}
            {aiResult && !aiAnalyzing && (
              <div className="ai-result-box">
                <div className="ai-result-header">
                  <span>🤖 AI Detection Result</span>
                  <span className="ai-confidence" style={{ color: confPct >= 80 ? '#22c55e' : confPct >= 60 ? '#f59e0b' : '#ef4444' }}>
                    {confPct}% confidence
                  </span>
                </div>
                <p className="ai-label">{aiResult.detectedLabel}</p>
                {aiResult.category && <p className="ai-category">📂 Category auto-set to: <strong>{aiResult.category}</strong></p>}
                <div className="ai-suggestions">
                  {aiResult.suggestions.map((s, i) => <span key={i} className="ai-suggestion-chip">{s}</span>)}
                </div>
                <div className="ai-confidence-bar">
                  <div className="ai-confidence-fill" style={{ width: `${confPct}%`, background: confPct >= 80 ? '#22c55e' : confPct >= 60 ? '#f59e0b' : '#ef4444' }}></div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>* Powered by AI image analysis. In future: YOLO/CNN deep learning model.</p>
              </div>
            )}

            <div className="form-group">
              <label>Issue Category *</label>
              <select value={form.categoryId} onChange={e => handleCategoryChange(e.target.value)} required>
                <option value="">Select a category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {aiResult?.category && <p style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: '4px' }}>✅ Auto-selected by AI</p>}
            </div>

            <div className="form-group">
              <label>Zone *</label>
              <select value={form.zone} onChange={e => setForm({...form, zone: e.target.value})} required>
                <option value="">Select a zone...</option>
                {zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
              </select>
              {detectedZone && <p style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: '4px' }}>🤖 Auto-detected zone: <strong>{detectedZone}</strong></p>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label>Description *</label>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`voice-btn ${isListening ? 'listening' : ''}`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? '🔴 Stop' : '🎤 Voice'}
                  </button>
                )}
              </div>
              <textarea
                value={form.description}
                onChange={e => handleDescChange(e.target.value)}
                placeholder="Describe your issue in detail. Include location, what happened, and any relevant context... Click the microphone to use voice input."
                required rows={5}
              />
              {predictedPriority && (
                <div className="priority-hint">
                  🤖 AI Priority Prediction: <span style={{ color: priorityColor[predictedPriority], fontWeight: 600 }}>{predictedPriority}</span>
                </div>
              )}
            </div>

            {error && <div className="login-error">⚠️ {error}</div>}

            {duplicateWarning && (
              <div className="duplicate-warning">
                <div className="duplicate-header">
                  <span>⚠️ Similar Issue Detected</span>
                </div>
                <p className="duplicate-msg">
                  We found a similar issue that was already reported:
                </p>
                <div className="duplicate-ticket">
                  <p><strong>Ticket #{duplicateWarning.id}</strong></p>
                  <p className="duplicate-desc">"{duplicateWarning.description.substring(0, 100)}..."</p>
                  <p className="duplicate-meta">
                    Category: <span>{duplicateWarning.category}</span> •
                    Created: <span>{new Date(duplicateWarning.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
                <p className="duplicate-question">
                  Is your issue different? You can still submit it below.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDuplicateWarning(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    onClick={(e) => submitAnyway(e as any)}
                    disabled={submitting}
                  >
                    {submitting ? '⏳ Submitting...' : '✅ Submit Anyway'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? '⏳ Submitting...' : '🚀 Submit Ticket'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
            </div>
          </form>
        </div>

        {showSolutions && selectedCategory && (
          <div className="card solutions-panel">
            <h3>💡 Suggested Solutions for &ldquo;{selectedCategory.name}&rdquo;</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Try these before submitting:</p>
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
