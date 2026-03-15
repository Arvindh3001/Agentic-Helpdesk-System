'use client'
import { useEffect, useState } from 'react'

interface Category {
  id: number
  name: string
  Solutions: { id: number; title: string; steps: string }[]
}

export default function KnowledgePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Category | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then((data: Category[]) => {
      setCategories(data)
      if (data.length > 0) setSelected(data[0])
    })
  }, [])

  const filtered = selected?.Solutions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.steps.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Base 📚</h1>
          <p className="page-subtitle">Browse troubleshooting guides across {categories.length} categories</p>
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="🔍  Search solutions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '280px' }}
        />
      </div>

      <div className="kb-layout">
        {/* Category tabs */}
        <div className="kb-sidebar">
          {categories.map(c => (
            <button
              key={c.id}
              className={`kb-tab ${selected?.id === c.id ? 'active' : ''}`}
              onClick={() => { setSelected(c); setSearch('') }}
            >
              <span className="kb-tab-name">{c.name}</span>
              <span className="kb-tab-count">{c.Solutions.length}</span>
            </button>
          ))}
        </div>

        {/* Solutions */}
        <div className="kb-content">
          {selected && (
            <>
              <h2 style={{ marginBottom: '8px' }}>{selected.name}</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>{filtered.length} solution{filtered.length !== 1 ? 's' : ''} available</p>
              {filtered.length === 0 ? (
                <div className="empty-state"><p>No solutions match your search.</p></div>
              ) : (
                <div className="solutions-grid">
                  {filtered.map(sol => (
                    <details key={sol.id} className="solution-card">
                      <summary className="solution-card-title">
                        <span>💡 {sol.title}</span>
                        <span className="solution-arrow">▼</span>
                      </summary>
                      <div className="solution-card-body">
                        {sol.steps.split('\n').map((step, i) => (
                          <div key={i} className="solution-step">
                            <span className="step-num">{i + 1}</span>
                            <span>{step.replace(/^\d+\.\s*/, '')}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
