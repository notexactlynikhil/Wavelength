import React, { useState } from 'react'
import { searchCallTranscripts, TranscriptSearchResult } from '../services/db'
import { Search, Loader2, FileText, Calendar, AlertCircle } from 'lucide-react'

export const TranscriptSearchPage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TranscriptSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = async (term?: string) => {
    const value = (term ?? query).trim()
    if (!value) return
    setLoading(true)
    setError(null)
    try {
      setResults(await searchCallTranscripts(value))
    } catch (err: any) {
      setError(err?.message || 'Search failed.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const highlight = (text: string) => {
    const term = query.trim()
    if (!term) return text
    const idx = text.toLowerCase().indexOf(term.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-theme-accent/10 text-theme-accent font-semibold rounded px-1">{text.slice(idx, idx + term.length)}</mark>
        {text.slice(idx + term.length)}
      </>
    )
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="select-none shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-theme-text font-display">Transcript Search</h1>
        <p className="text-xs text-theme-textMuted mt-0.5">Find past calls by keyword across every recorded customer transcript</p>
      </div>

      <div className="bg-theme-surface border border-theme-border p-4 rounded-xl shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-theme-textMuted pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="e.g. budget, pre-approval, closing date, property..."
              aria-label="Search call transcripts"
              className="w-full pl-9 pr-4 py-2.5 bg-theme-base border border-theme-border focus:border-theme-accent focus:outline-none rounded-xl text-xs text-theme-text placeholder-theme-textMuted transition"
            />
          </div>
          <button
            type="button"
            onClick={() => runSearch()}
            disabled={loading || !query.trim()}
            aria-label="Run search"
            className="flex items-center gap-2 px-5 py-2.5 bg-theme-accent hover:bg-theme-accentHover active:bg-theme-accentHover disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-theme-dangerMuted border border-theme-dangerMuted text-theme-danger text-xs shrink-0">
          <AlertCircle className="w-4 h-4 text-theme-danger shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {results === null ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-theme-border rounded-xl bg-theme-surface text-theme-textMuted select-none shadow-xs">
            <FileText className="w-8 h-8 mb-3 text-theme-textMuted/60" />
            <p className="text-xs font-medium">Search across all call transcripts to surface relevant discussions.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-theme-border rounded-xl bg-theme-surface text-theme-textMuted text-xs shadow-xs">
            No transcripts matched "{query}".
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-theme-textMuted font-semibold uppercase tracking-wider font-display">
              {results.length} matching call{results.length > 1 ? 's' : ''}
            </p>
            {results.map((result) => (
              <div key={result.id} className="bg-theme-surface p-4 rounded-xl border border-theme-border space-y-2 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:-translate-y-[2px] transition">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-bold text-theme-text font-display">{result.customer_name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-theme-textMuted">
                    <Calendar className="w-3.5 h-3.5 text-theme-textMuted/70" />
                    {new Date(result.started_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-theme-textMuted leading-relaxed">
                  …{highlight(result.snippet)}…
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
