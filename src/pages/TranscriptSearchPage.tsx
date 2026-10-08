import React, { useState, useRef, useEffect } from 'react'
import { searchCallTranscripts, TranscriptSearchResult } from '../services/db'
import { Search, Loader2, FileText, Calendar, AlertCircle } from 'lucide-react'

export const TranscriptSearchPage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TranscriptSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

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
        <mark className="bg-primary/20 text-primary font-semibold rounded px-0.5">{text.slice(idx, idx + term.length)}</mark>
        {text.slice(idx + term.length)}
      </>
    )
  }

  return (
    <div className="flex flex-col w-full pb-8 pt-4 space-y-6">

      {/* === TOP HEADER === */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm">
            <Search className="w-3 h-3" />
            Semantic Search
          </span>
        </div>
        <h1 className="font-display font-bold text-4xl text-white tracking-tight">Transcript Search</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
          Find past calls by keyword across every recorded and processed customer transcript.
        </p>
      </div>

      {/* === SEARCH BLOCK === */}
      <div className="w-full bg-surface-container-low rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 relative z-10">
          {/* Search bar */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container">
            {loading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            ) : (
              <Search className="w-5 h-5 text-on-surface-variant shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="e.g. budget, pre-approval, closing date, property offer..."
              aria-label="Search call transcripts"
              className="flex-1 bg-transparent text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults(null) }}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container-high text-outline hover:text-white hover:bg-surface-bright transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {/* CTA row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => runSearch()}
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-surface-container-lowest font-label-md text-label-md font-bold hover:scale-[0.99] transition-all shadow-lg disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search Transcripts</span>
            </button>
            <kbd className="px-2 py-1 rounded-lg bg-surface-container-high text-outline font-label-sm text-label-sm border border-outline-variant/30">Enter</kbd>
            <span className="text-outline font-label-sm text-label-sm">to search</span>

            {/* Quick suggestions */}
            {!query && (
              <div className="flex flex-wrap gap-1.5 ml-auto">
                {['budget', 'closing date', 'pre-approval', 'mortgage'].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); setTimeout(() => runSearch(s), 0) }}
                    className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-error-container/20 border border-error/20 text-error text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {results === null ? (
        <div className="py-20 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low/60">
          <FileText className="mx-auto mb-3 text-outline" width={40} height={40} />
          <p className="font-body-md text-body-md text-on-surface-variant font-medium">Search across all call transcripts</p>
          <p className="font-body-sm text-body-sm text-outline mt-1">Enter keywords above to surface relevant call discussions.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low/60">
          <p className="font-body-md text-body-md text-on-surface-variant">No transcripts matched "<span className="text-white">{query}</span>"</p>
          <p className="font-body-sm text-body-sm text-outline mt-1">Try a different keyword or check a different recording.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              {results.length} matching call{results.length > 1 ? 's' : ''} found
            </p>
            <button
              onClick={() => { setResults(null); setQuery('') }}
              className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm transition-colors"
            >
              Clear Results
            </button>
          </div>

          {results.map((result) => (
            <div
              key={result.id}
              className="bg-surface-container-low rounded-2xl p-5 flex flex-col gap-3 hover:bg-surface-container transition-all"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {result.customer_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <span className="font-headline-sm text-headline-sm text-on-surface">{result.customer_name}</span>
                    <div className="flex items-center gap-1.5 text-outline font-body-sm text-body-sm mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(result.started_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-label-sm text-label-sm">
                  Transcript Match
                </span>
              </div>

              {/* Highlighted snippet */}
              <div className="relative pl-3 border-l-2 border-primary/40">
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  …{highlight(result.snippet)}…
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
