import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { MeetingRecording, Customer } from '../types'
import { fetchMeetingRecordings, assignRecordingToCustomer, getRecordingPublicUrl } from '../services/db'
import { processRecording, isRecordingStale } from '../services/aiPipelineService'
import { useRealtimeSync } from '../contexts/RealtimeSyncContext'
import { Mic, Link as LinkIcon, Calendar, Clock, RefreshCw, Play, Loader2, AlertCircle, CheckCircle2, RotateCw, UserX } from 'lucide-react'

const getProcessingBadge = (status: string, stale: boolean = false) => {
  if (stale) {
    return { label: 'Stale / Retry', classes: 'bg-theme-accentLime/10 text-theme-accentLime border-[#C28A3D]/25' }
  }
  const mappings: Record<string, { label: string; classes: string }> = {
    processing:          { label: 'Processing',        classes: 'bg-theme-accent/10 text-theme-accent border-theme-accent/25' },
    transcribing:        { label: 'Transcribing',      classes: 'bg-theme-accent/10 text-theme-accent border-theme-accent/30' },
    analyzing:           { label: 'Analyzing',         classes: 'bg-theme-accentLime/10 text-theme-accentLime border-[#C59A5F]/30' },
    customer_resolving:  { label: 'Resolving Customer',classes: 'bg-theme-accentLime/10 text-theme-accentLime border-[#C28A3D]/25' },
    needs_customer:      { label: 'Needs Customer',    classes: 'bg-theme-dangerMuted text-theme-danger border-theme-dangerMuted' },
    processed:           { label: 'Processed',         classes: 'bg-theme-successMuted text-theme-success border-theme-success' },
    failed:              { label: 'Failed',             classes: 'bg-theme-dangerMuted text-theme-danger border-theme-dangerMuted' },
    uploaded:            { label: 'Queued',             classes: 'bg-theme-base text-theme-textMuted border-theme-border' },
  }
  return mappings[status] || null
}

const IN_PROGRESS_STATUSES = new Set(['uploading', 'processing', 'transcribing', 'analyzing', 'customer_resolving'])

const isActivelyProcessing = (rec: MeetingRecording) => {
  return IN_PROGRESS_STATUSES.has(rec.status) && !isRecordingStale(rec)
}

export const RecordingsPage: React.FC = () => {
  const [recordings, setRecordings] = useState<MeetingRecording[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processError, setProcessError] = useState<{ id: string; message: string } | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const recs = await fetchMeetingRecordings()
      setRecordings(recs || [])

      const { data: custs } = await supabase.from('customers').select('*').order('name')
      setCustomers(custs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const { subscribe } = useRealtimeSync()

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.table !== 'meeting_recordings') return
      if (event.eventType === 'INSERT') {
        setRecordings(prev => [event.newRecord, ...prev].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()))
      } else if (event.eventType === 'UPDATE') {
        setRecordings(prev => prev.map(r => r.id === event.newRecord.id ? { ...r, ...event.newRecord } : r).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()))
      } else if (event.eventType === 'DELETE') {
        setRecordings(prev => prev.filter(r => r.id !== event.oldRecord.id))
      }
    })
    return () => unsubscribe()
  }, [subscribe])

  const handleAssign = async (recordingId: string, customerId: string) => {
    setAssigningId(recordingId)
    try {
      const updated = await assignRecordingToCustomer(recordingId, customerId || null)
      setRecordings(prev => prev.map(r => r.id === recordingId ? { ...r, ...updated } : r))
    } catch (e) {
      console.error('Failed to assign:', e)
    } finally {
      setAssigningId(null)
    }
  }

  const handleProcess = async (rec: MeetingRecording) => {
    setProcessError(null)
    setProcessingId(rec.id)
    setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'processing', last_error: null } : r))
    try {
      await processRecording(rec)
      setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'processed', last_error: null } : r))
    } catch (e: any) {
      const message = e?.message || 'Processing failed'
      setProcessError({ id: rec.id, message })
      setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, status: r.status === 'needs_customer' ? 'needs_customer' : 'failed', last_error: message } : r))
    } finally {
      setProcessingId(null)
    }
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-theme-textMuted text-xs font-semibold animate-pulse">
        Loading meeting recordings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center select-none">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-theme-text font-display">Recordings</h1>
          <p className="text-xs text-theme-textMuted mt-0.5">Manage and assign synced meeting recordings from the browser extension</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          aria-label="Refresh recordings"
          className="p-2.5 bg-theme-surface hover:bg-theme-base border border-theme-border rounded-xl text-theme-textMuted hover:text-theme-accent transition shadow-xs disabled:opacity-50"
          title="Refresh recordings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-theme-accent' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {recordings.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-theme-border rounded-xl bg-theme-surface text-theme-textMuted shadow-xs">
            <p className="text-sm font-semibold text-theme-text font-display">No recordings found</p>
            <p className="text-xs mt-1 text-theme-textMuted">Recordings synced via the Wavelength Chrome Extension will automatically appear here.</p>
          </div>
        ) : (
          recordings.map(rec => (
            <div key={rec.id} className="bg-theme-surface p-5 rounded-xl border border-theme-border flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:-translate-y-[2px] transition">

              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#432C24] text-[#E88C64] rounded-xl shrink-0">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-theme-text font-display">
                      {rec.platform === 'google_meet' ? 'Google Meet' : rec.platform === 'ms_teams' ? 'Microsoft Teams' : rec.platform === 'zoom' ? 'Zoom' : rec.platform === 'audio_upload' ? 'Audio Upload' : 'Meeting'}
                    </h3>
                    <p className="text-xs text-theme-textMuted truncate max-w-sm">{rec.meeting_url || 'No URL recorded'}</p>
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-theme-textMuted font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-theme-textMuted/70" />
                    <span>{new Date(rec.started_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-theme-textMuted/70" />
                    <span>{formatDuration(rec.duration_seconds)}</span>
                  </div>
                </div>

                {/* Needs-customer resolution panel */}
                {rec.status === 'needs_customer' && (
                  <div className="p-3.5 rounded-xl bg-theme-dangerMuted border border-theme-dangerMuted space-y-2">
                    <div className="flex items-center gap-2 text-theme-danger text-xs font-semibold">
                      <UserX className="w-4 h-4" />
                      <span>Customer Assignment Required</span>
                    </div>
                    {rec.ai_customer_name && (
                      <p className="text-xs text-theme-textMuted">
                        Transcript mentions: <span className="text-theme-text font-semibold">"{rec.ai_customer_name}"</span>
                        {rec.candidate_customer_ids && rec.candidate_customer_ids.length > 1 && (
                          <span className="ml-1 text-theme-danger">({rec.candidate_customer_ids.length} customers match — ambiguous)</span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-theme-textMuted">Select a customer below and click Process to complete.</p>
                  </div>
                )}

                <div className="w-full max-w-md pt-1">
                  <audio controls className="w-full h-8" src={getRecordingPublicUrl(rec.storage_path)} />
                </div>
              </div>

              <div className="w-full sm:w-64 shrink-0 flex flex-col gap-2">
                <label className="text-xs font-semibold text-theme-textMuted uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-theme-textMuted/70" /> Assign to Customer
                </label>
                <select
                  value={rec.customer_id || ''}
                  onChange={(e) => handleAssign(rec.id, e.target.value)}
                  disabled={assigningId === rec.id || isActivelyProcessing(rec)}
                  className="w-full bg-theme-base border border-theme-border text-xs text-theme-text rounded-lg p-2.5 focus:border-theme-accent outline-none transition"
                >
                  <option value="">-- Unassigned --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {assigningId === rec.id && <span className="text-[10px] text-theme-accent animate-pulse">Assigning customer...</span>}

                <div className="flex items-center gap-2 pt-1">
                  {(() => {
                    const stale = isRecordingStale(rec)
                    const badge = getProcessingBadge(rec.status, stale)
                    return badge ? (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 border rounded-md uppercase tracking-wider ${badge.classes}`}>
                        {isActivelyProcessing(rec) && <Loader2 className="w-3 h-3 animate-spin" />}
                        {rec.status === 'processed' && <CheckCircle2 className="w-3 h-3" />}
                        {(rec.status === 'failed' || rec.status === 'needs_customer' || stale) && <AlertCircle className="w-3 h-3" />}
                        {badge.label}
                      </span>
                    ) : null
                  })()}
                  <button
                    onClick={() => handleProcess(rec)}
                    disabled={
                      processingId === rec.id ||
                      isActivelyProcessing(rec) ||
                      // needs_customer requires a customer to be assigned first
                      (rec.status === 'needs_customer' && !rec.customer_id)
                    }
                    title={
                      rec.status === 'needs_customer' && !rec.customer_id
                        ? 'Assign a customer first'
                        : isActivelyProcessing(rec)
                        ? 'Processing in progress...'
                        : 'Run local AI pipeline'
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-theme-accent hover:bg-theme-accentHover active:bg-theme-accentHover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition shadow-xs"
                  >
                    {processingId === rec.id || isActivelyProcessing(rec) ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : rec.status === 'failed' || rec.status === 'needs_customer' || isRecordingStale(rec) ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>{rec.status === 'needs_customer' ? 'Process Now' : 'Retry'}</span>
                      </>
                    ) : rec.status === 'processed' ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Reprocess</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Process</span>
                      </>
                    )}
                  </button>
                </div>

                {processError?.id === rec.id && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-theme-dangerMuted border border-theme-dangerMuted text-theme-danger text-[10px] leading-snug">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{processError.message}</span>
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  )
}
