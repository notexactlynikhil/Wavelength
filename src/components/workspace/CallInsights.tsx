import React, { useState } from 'react'
import { CallSummary } from '../../types'
import { Sparkles, Calendar, Edit2, Check, X, Loader2 } from 'lucide-react'

type SummaryWithCall = CallSummary & { call?: { started_at?: string; customer_id?: string } }

interface CallInsightsProps {
  summaries: SummaryWithCall[]
  loading: boolean
  onUpdate: (id: string, updates: { summary_text?: string }) => Promise<void>
}

const sentimentClass = (sentiment?: string) => {
  switch (sentiment) {
    case 'positive':
      return 'bg-secondary/15 text-secondary border-secondary/30'
    case 'negative':
      return 'bg-error/15 text-error border-error/30'
    default:
      return 'bg-surface-container-high text-on-surface-variant border-outline-variant/40'
  }
}

export const CallInsights: React.FC<CallInsightsProps> = ({ summaries, loading, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startEdit = (summary: SummaryWithCall) => {
    setEditingId(summary.id)
    setDraftText(summary.summary_text || '')
    setError(null)
  }

  const save = async (id: string) => {
    setSavingId(id)
    setError(null)
    try {
      await onUpdate(id, { summary_text: draftText })
      setEditingId(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to save correction.')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (summaries.length === 0) {
    return (
      <div className="py-12 text-center border border-dashed border-outline-variant/40 rounded-2xl bg-surface-container-lowest select-none">
        <Sparkles className="w-6 h-6 mx-auto text-primary mb-2 opacity-80" />
        <p className="text-xs text-on-surface-variant">No AI call summaries recorded yet. Process a recording to generate insights.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-error bg-error/10 border border-error/25 rounded-2xl p-3.5 animate-fadeIn">
          {error}
        </div>
      )}
      {summaries.map((summary) => {
        const isEditing = editingId === summary.id
        return (
          <div key={summary.id} className="p-5 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest space-y-3 shadow-sm transition hover:border-outline-variant/70">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-outline font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>{summary.call?.started_at ? new Date(summary.call.started_at).toLocaleString() : 'Synthesized Call'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${sentimentClass(summary.sentiment)}`}>
                  {summary.sentiment || 'neutral'}
                </span>
                {!isEditing ? (
                  <button
                    onClick={() => startEdit(summary)}
                    className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white bg-surface-container-high hover:bg-surface-container rounded-full px-3 py-1 transition"
                    title="Correct AI output"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Correct</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => save(summary.id)}
                      disabled={savingId === summary.id}
                      className="inline-flex items-center gap-1 text-xs text-surface-container-lowest bg-secondary hover:bg-secondary/90 font-bold rounded-full px-3 py-1 transition disabled:opacity-50"
                    >
                      {savingId === summary.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-white bg-surface-container-high hover:bg-surface-container transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl p-3 text-xs text-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none resize-y"
                />
              </div>
            ) : (
              <>
                <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{summary.summary_text}</p>
                {summary.product && (
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-outline uppercase tracking-wider font-semibold text-[10px]">Product / Topic:</span>
                    <span className="text-primary font-medium">{summary.product}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
