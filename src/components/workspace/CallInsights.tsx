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
      return 'bg-theme-successMuted text-theme-success border-theme-successMuted'
    case 'negative':
      return 'bg-theme-dangerMuted text-theme-danger border-theme-dangerMuted'
    default:
      return 'bg-theme-surfaceHover text-theme-textMuted border-theme-border'
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
          <div key={i} className="h-20 bg-theme-surface border border-theme-border rounded-xl" />
        ))}
      </div>
    )
  }

  if (summaries.length === 0) {
    return (
      <div className="py-10 text-center border border-dashed border-theme-border rounded-xl bg-theme-surface select-none">
        <Sparkles className="w-6 h-6 mx-auto text-theme-textMuted mb-2" />
        <p className="text-xs text-theme-textMuted">No AI call summaries yet. Process a call to generate insights.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-xs text-theme-danger bg-theme-dangerMuted border border-theme-dangerMuted rounded-xl p-3">{error}</div>}
      {summaries.map((summary) => {
        const isEditing = editingId === summary.id
        return (
          <div key={summary.id} className="p-4 rounded-xl border border-theme-border bg-theme-surface space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] text-theme-textMuted">
                <Calendar className="w-3.5 h-3.5" />
                {summary.call?.started_at ? new Date(summary.call.started_at).toLocaleString() : 'Call analysis'}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${sentimentClass(summary.sentiment)}`}>
                  {summary.sentiment || 'neutral'}
                </span>
                {!isEditing ? (
                  <button
                    onClick={() => startEdit(summary)}
                    className="flex items-center gap-1 text-[11px] text-theme-textMuted hover:text-theme-accent border border-theme-border hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E88C64]/30 bg-theme-surface rounded-lg px-2.5 py-1 transition"
                    title="Correct AI output"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Correct</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => save(summary.id)}
                      disabled={savingId === summary.id}
                      className="flex items-center gap-1 text-[11px] text-theme-success border border-theme-success bg-theme-successMuted rounded-lg px-2.5 py-1 transition disabled:opacity-50"
                    >
                      {savingId === summary.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 text-[11px] text-theme-textMuted border border-theme-border rounded-lg px-2 py-1 transition hover:bg-theme-base"
                    >
                      <X className="w-3 h-3" />
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
                  className="w-full bg-theme-surface border border-theme-border rounded-xl p-3 text-xs text-theme-text focus:border-theme-accent focus:ring-1 focus:ring-theme-accent/15 outline-none resize-y"
                />
              </div>
            ) : (
              <>
                <p className="text-xs text-theme-text leading-relaxed whitespace-pre-wrap">{summary.summary_text}</p>
                {summary.product && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-theme-textMuted uppercase tracking-wider font-semibold">Product:</span>
                    <span className="text-theme-textMuted">{summary.product}</span>
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
