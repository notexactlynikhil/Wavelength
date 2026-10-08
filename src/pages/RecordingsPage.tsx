import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase/client'
import { MeetingRecording, Customer } from '../types'
import { fetchMeetingRecordings, assignRecordingToCustomer, getRecordingPublicUrl, deleteRecording } from '../services/db'
import { processRecording, isRecordingStale } from '../services/aiPipelineService'
import { useRealtimeSync } from '../contexts/RealtimeSyncContext'
import { Loader2, AlertCircle, CheckCircle2, RotateCw, UserX, Trash2, ChevronDown, Check, Search, UserPlus } from 'lucide-react'

const getProcessingBadge = (status: string, stale: boolean = false) => {
  if (stale) return { label: 'Stale / Retry', classes: 'bg-primary/10 text-primary border-primary/25' }
  const mappings: Record<string, { label: string; classes: string }> = {
    processing:         { label: 'Processing',        classes: 'bg-primary/10 text-primary border-primary/25' },
    transcribing:       { label: 'Transcribing',      classes: 'bg-tertiary/10 text-tertiary border-tertiary/30' },
    analyzing:          { label: 'Analyzing',         classes: 'bg-secondary/10 text-secondary border-secondary/30' },
    customer_resolving: { label: 'Resolving Customer',classes: 'bg-primary/10 text-primary border-primary/25' },
    needs_customer:     { label: 'Needs Customer',    classes: 'bg-error-container/30 text-error border-error/30' },
    processed:          { label: 'Processed',         classes: 'bg-secondary/10 text-secondary border-secondary/20' },
    failed:             { label: 'Failed',             classes: 'bg-error-container/30 text-error border-error/30' },
    uploaded:           { label: 'Queued',             classes: 'bg-surface-container text-outline border-outline-variant' },
  }
  return mappings[status] || null
}

const IN_PROGRESS_STATUSES = new Set(['uploading', 'processing', 'transcribing', 'analyzing', 'customer_resolving'])

const isActivelyProcessing = (rec: MeetingRecording) =>
  IN_PROGRESS_STATUSES.has(rec.status) && !isRecordingStale(rec)

const getPlatformLabel = (platform: string) => {
  const labels: Record<string, string> = {
    google_meet: 'Google Meet',
    ms_teams: 'Microsoft Teams',
    zoom: 'Zoom',
    audio_upload: 'Audio Upload',
  }
  return labels[platform] || 'Meeting'
}

const getPlatformIcon = (platform: string) => {
  if (platform === 'google_meet') return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19.1C5.12 19.56 12 19.56 12 19.56s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
  )
  if (platform === 'zoom') return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
  )
}

/** Deterministic avatar colour */
const avatarColor = (name: string) => {
  const palette = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#3b82f6','#10b981']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const WAVEFORM_BARS = Array.from({ length: 60 }, (_, i) => {
  const env = Math.sin((i / 60) * Math.PI)
  return 0.15 + env * 0.75 * (0.5 + 0.5 * Math.sin(i * 2.3 + 1.1))
})

interface PlayerProps { src: string; duration: number }

const CustomAudioPlayer: React.FC<PlayerProps> = ({ src, duration }) => {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const waveRef  = React.useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = React.useState(false)
  const [current, setCurrent] = React.useState(0)
  const [total,   setTotal]   = React.useState(duration)
  const [speed,   setSpeed]   = React.useState(1)
  const [muted,   setMuted]   = React.useState(false)

  const fmt = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`
  const progress = total > 0 ? Math.min(current / total, 1) : 0

  useEffect(() => {
    const a = audioRef.current; if (!a) return
    const onTime = () => setCurrent(a.currentTime)
    const onMeta = () => setTotal(isFinite(a.duration) ? a.duration : duration)
    const onEnd  = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    return () => { a.removeEventListener('timeupdate',onTime); a.removeEventListener('loadedmetadata',onMeta); a.removeEventListener('ended',onEnd) }
  }, [duration])

  const togglePlay = async () => {
    const a = audioRef.current; if (!a) return
    if (playing) { a.pause(); setPlaying(false) } else { await a.play(); setPlaying(true) }
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a || !waveRef.current) return
    const rect  = waveRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    a.currentTime = ratio * total; setCurrent(ratio * total)
  }
  const skipBack  = () => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15) }
  const skipFwd   = () => { if (audioRef.current) audioRef.current.currentTime = Math.min(total, audioRef.current.currentTime + 15) }
  const cycleSpeed = () => {
    const speeds = [1,1.2,1.5,2]
    const next   = speeds[(speeds.indexOf(speed)+1)%speeds.length]
    setSpeed(next); if (audioRef.current) audioRef.current.playbackRate = next
  }
  const toggleMute = () => { if (audioRef.current) audioRef.current.muted = !muted; setMuted(m=>!m) }

  return (
    <div className="w-full mt-3 select-none">
      <audio ref={audioRef} src={src} preload="metadata" />
      {/* Waveform */}
      <div ref={waveRef} className="relative w-full h-14 flex items-end gap-[2px] cursor-pointer rounded-lg overflow-hidden" onClick={seek}>
        {WAVEFORM_BARS.map((h,i) => {
          const ratio    = i/WAVEFORM_BARS.length
          const filled   = ratio < progress
          const isCursor = Math.abs(ratio - progress) < 0.018
          return (
            <div key={i} className="flex-1 rounded-sm" style={{
              height:`${h*100}%`,
              background: isCursor ? '#ffffff' : filled ? 'rgba(139,92,246,0.85)' : 'rgba(255,255,255,0.13)',
              boxShadow: isCursor ? '0 0 8px #fff' : undefined,
            }} />
          )
        })}
      </div>
      {/* Controls */}
      <div className="flex items-center gap-3 mt-2">
        <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition shrink-0">
          {playing
            ? <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
        </button>
        <button onClick={skipBack} title="Back 15s" className="text-white/40 hover:text-white transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
        </button>
        <button onClick={skipFwd} title="Forward 15s" className="text-white/40 hover:text-white transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.51"/></svg>
        </button>
        <span className="flex-1 text-[11px] text-white/55 tabular-nums">{fmt(current)} / {fmt(total)}</span>
        <button onClick={cycleSpeed} className="text-[11px] font-bold text-white/55 hover:text-white px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 transition">{speed}x</button>
        <button onClick={toggleMute} className="text-white/40 hover:text-white transition">
          {muted
            ? <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
        </button>
      </div>
    </div>
  )
}

interface AssignCustomerDropdownProps {
  recordingId: string
  selectedCustomerId?: string | null
  customers: Customer[]
  disabled?: boolean
  isSaving?: boolean
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onAssign: (recordingId: string, customerId: string) => void
}

const AssignCustomerDropdown: React.FC<AssignCustomerDropdownProps> = ({
  recordingId,
  selectedCustomerId,
  customers,
  disabled = false,
  isSaving = false,
  isOpen,
  onToggle,
  onClose,
  onAssign,
}) => {
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      return
    }
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && customers.length > 4 && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, customers.length])

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && onToggle()}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={selectedCustomer ? `Assigned to ${selectedCustomer.name}` : 'Assign to a customer'}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
          isOpen
            ? 'bg-primary/20 border-primary/50 text-white ring-2 ring-primary/20 shadow-lg shadow-primary/10'
            : selectedCustomer
            ? 'bg-white/[0.05] hover:bg-white/[0.09] border-white/12 text-white shadow-sm'
            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/8 text-white/50 hover:text-white/80'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {selectedCustomer ? (
          <div className="flex items-center gap-2 min-w-0 max-w-[160px] sm:max-w-[200px]">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-sm ring-1 ring-white/15"
              style={{ background: avatarColor(selectedCustomer.name) }}
            >
              {initials(selectedCustomer.name)}
            </span>
            <span className="truncate font-semibold text-white text-[12px]">{selectedCustomer.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white/80 transition-colors">
            <UserPlus className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[12px]">Unassigned</span>
          </div>
        )}

        {isSaving ? (
          <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0 ml-0.5" />
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-transform duration-200 shrink-0 ml-0.5 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-2 z-50 w-64 sm:w-72 rounded-2xl bg-[#0f111e]/98 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 ring-1 ring-white/10 animate-in fade-in-50 zoom-in-95 duration-150 origin-top-left"
        >
          {/* Header */}
          <div className="px-2 pt-1 pb-1.5 flex items-center justify-between text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            <span>Assign Recording</span>
            <span className="text-[10px] text-white/30 lowercase font-normal">{customers.length} total</span>
          </div>

          {/* Search bar */}
          {customers.length > 4 && (
            <div className="relative mb-1.5">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary/50 focus:bg-white/[0.08] transition"
              />
            </div>
          )}

          {/* Unassign option */}
          <button
            type="button"
            role="option"
            aria-selected={!selectedCustomerId}
            onClick={() => {
              onAssign(recordingId, '')
              onClose()
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition text-left ${
              !selectedCustomerId
                ? 'bg-primary/20 text-white font-medium border border-primary/30'
                : 'text-white/60 hover:bg-white/8 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                <UserX className="w-3 h-3" />
              </div>
              <span className="text-white/70 font-normal">-- Unassigned --</span>
            </div>
            {!selectedCustomerId && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </button>

          <div className="h-px bg-white/10 my-1.5" />

          {/* Customer list */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
            {filteredCustomers.length === 0 ? (
              <div className="py-4 text-center text-xs text-white/40">
                {search ? `No customer found matching "${search}"` : 'No customers created yet'}
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isSelected = c.id === selectedCustomerId
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onAssign(recordingId, c.id)
                      onClose()
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition text-left group ${
                      isSelected
                        ? 'bg-primary/20 text-white font-medium border border-primary/30'
                        : 'text-white/80 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm ring-1 ring-white/10"
                        style={{ background: avatarColor(c.name) }}
                      >
                        {initials(c.name)}
                      </span>
                      <div className="min-w-0">
                        <span className="truncate block font-semibold text-white leading-tight">{c.name}</span>
                        {c.email && (
                          <span className="text-[10px] text-white/40 block truncate leading-tight mt-0.5">{c.email}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const RecordingsPage: React.FC = () => {
  const [recordings, setRecordings] = useState<MeetingRecording[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [openDropdownRecordingId, setOpenDropdownRecordingId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processError, setProcessError] = useState<{ id: string; message: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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

  useEffect(() => { loadData() }, [])

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

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setConfirmDeleteId(null)
    setDeletingId(id)
    // Optimistic removal
    setRecordings(prev => prev.filter(r => r.id !== id))
    try {
      await deleteRecording(id)
    } catch (e) {
      console.error('Delete failed:', e)
      // Re-fetch on error to restore the list
      loadData()
    } finally {
      setDeletingId(null)
    }
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const filteredRecordings = recordings.filter(rec => {
    if (!searchTerm) return true
    const platform = getPlatformLabel(rec.platform).toLowerCase()
    const customer = customers.find(c => c.id === rec.customer_id)?.name?.toLowerCase() || ''
    const url = (rec.meeting_url || '').toLowerCase()
    const term = searchTerm.toLowerCase()
    return platform.includes(term) || customer.includes(term) || url.includes(term)
  })

  // Pipeline stats
  const processed = recordings.filter(r => r.status === 'processed').length
  const transcribing = recordings.filter(r => r.status === 'transcribing' || r.status === 'analyzing').length
  const needsAction = recordings.filter(r => r.status === 'needs_customer' || r.status === 'failed').length

  return (
    <div className="flex flex-col w-full pb-8 pt-4 space-y-6">

      {/* === TOP HEADER === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
              Whisper v3 Active
            </span>
            <span className="font-label-sm text-label-sm text-outline">Neural Pipeline Live</span>
          </div>
          <h1 className="font-display font-bold text-4xl text-white tracking-tight">Meeting Recordings</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">
            Audio intelligence, Whisper transcripts, and automated CRM insight pipeline.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* === PIPELINE STATUS BAR === */}
      <div className="w-full bg-surface-container-low rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Real-time Telemetry</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Neural Ingestion Pipeline</span>
            </div>
          </div>

          {/* Pipeline stages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-4xl">
            <div className="bg-surface-container rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Audio Captured</span>
                <CheckCircle2 className="text-secondary" width={16} height={16} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">{recordings.length}</span>
                <span className="font-label-sm text-label-sm text-outline">calls</span>
              </div>
              <div className="w-full bg-surface-container-high h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-secondary h-full rounded-full w-full" />
              </div>
            </div>

            <div className="bg-surface-container rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-primary">Transcribing</span>
                {transcribing > 0 && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-md text-headline-md text-primary font-bold">{transcribing}</span>
                <span className="font-label-sm text-label-sm text-primary-fixed-dim">active</span>
              </div>
              <div className="w-full bg-surface-container-high h-1 rounded-full mt-2 overflow-hidden">
                <div className={`bg-primary h-full rounded-full ${transcribing > 0 ? 'animate-pulse' : ''}`} style={{ width: transcribing > 0 ? '75%' : '0%' }} />
              </div>
            </div>

            <div className="bg-surface-container rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-error">Needs Action</span>
                {needsAction > 0 && <AlertCircle className="text-error" width={16} height={16} />}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">{needsAction}</span>
                <span className="font-label-sm text-label-sm text-outline">flagged</span>
              </div>
              <div className="w-full bg-surface-container-high h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-error h-full rounded-full" style={{ width: needsAction > 0 ? `${Math.min(100, needsAction * 20)}%` : '0%' }} />
              </div>
            </div>

            <div className="bg-surface-container rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">CRM Synced</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ddf2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">{processed}</span>
                <span className="font-label-sm text-label-sm text-secondary">
                  {recordings.length > 0 ? `${Math.round((processed / recordings.length) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-secondary-container h-full rounded-full" style={{ width: recordings.length > 0 ? `${(processed / recordings.length) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === RECORDINGS LIST === */}
      <div className="w-full bg-surface-container-low rounded-2xl p-6 shadow-xl">
        {/* Header with search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Recording Archives</h3>
            <p className="font-body-sm text-body-sm text-outline">Manage and assign synced meeting recordings from the browser extension.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <svg className="absolute left-3 text-outline" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                className="bg-surface-container text-on-surface placeholder:text-outline text-body-sm font-body-sm rounded-full pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-primary w-64 transition-all"
                placeholder="Search recordings..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading && recordings.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-52 bg-surface-container rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/30">
            <svg className="mx-auto mb-3 text-outline" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            <p className="font-headline-sm text-headline-sm text-white">No recordings found</p>
            <p className="font-body-sm text-body-sm text-outline mt-1">
              {searchTerm ? `No results for "${searchTerm}"` : 'Recordings synced via the Wavelength Chrome Extension will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecordings.map(rec => {
              const stale            = isRecordingStale(rec)
              const badge            = getProcessingBadge(rec.status, stale)
              const assignedCustomer = customers.find(c => c.id === rec.customer_id)

              const participants: string[] = assignedCustomer
                ? [assignedCustomer.name, getPlatformLabel(rec.platform)]
                : [getPlatformLabel(rec.platform)]

              const dateStr     = new Date(rec.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const timeStr     = new Date(rec.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const title       = assignedCustomer ? `${assignedCustomer.name} — ${getPlatformLabel(rec.platform)}` : getPlatformLabel(rec.platform)
              const sourceLabel = rec.meeting_url ? `Source: ${getPlatformLabel(rec.platform)} (${rec.meeting_url.slice(0,30)}…)` : `Source: ${getPlatformLabel(rec.platform)}`

              const isDropdownOpen = openDropdownRecordingId === rec.id

              return (
                <div
                  key={rec.id}
                  className={`rounded-2xl transition-all ${isDropdownOpen ? 'relative z-30' : 'relative z-10'}`}
                  style={{ background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 55%,#0f3460 100%)', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 8px 32px rgba(0,0,0,0.45)' }}
                >
                  {/* Card body */}
                  <div className="p-5">
                    {/* Row 1: badge + date · icons */}
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {badge ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.classes}`}>
                            {isActivelyProcessing(rec) && <Loader2 className="w-3 h-3 animate-spin" />}
                            {rec.status === 'processed' && <CheckCircle2 className="w-3 h-3" />}
                            {(rec.status === 'failed' || rec.status === 'needs_customer' || stale) && <AlertCircle className="w-3 h-3" />}
                            {badge.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-surface-container text-outline border-outline-variant">Recording</span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-white/45 font-medium">
                          <span className="w-3.5 h-3.5 inline-flex items-center text-white/60 shrink-0">
                            {getPlatformIcon(rec.platform)}
                          </span>
                          <span>{dateStr}, {timeStr}</span>
                          {rec.duration_seconds > 0 && <span className="opacity-60">({formatDuration(rec.duration_seconds)})</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/35 hover:text-white transition">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/35 hover:text-white transition">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Title */}
                    <h2 className="text-white font-bold text-[18px] leading-tight tracking-tight mb-3">{title}</h2>

                    {/* Row 3: Avatars + source */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="flex -space-x-2 shrink-0">
                        {participants.slice(0,3).map((name,i) => (
                          <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[#1a1a2e]" style={{ background: avatarColor(name) }} title={name}>
                            {initials(name)}
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] text-white/65 leading-tight truncate">{participants.join(', ')}</p>
                        <p className="text-[10px] text-white/30 leading-tight truncate">{sourceLabel}</p>
                      </div>
                    </div>

                    {/* Audio player */}
                    <CustomAudioPlayer src={getRecordingPublicUrl(rec.storage_path)} duration={rec.duration_seconds} />

                    {/* Needs customer */}
                    {rec.status === 'needs_customer' && (
                      <div className="mt-3 p-3 rounded-xl bg-error/10 border border-error/20">
                        <div className="flex items-center gap-2 text-error text-xs font-semibold"><UserX className="w-4 h-4" /><span>Customer Assignment Required</span></div>
                        {rec.ai_customer_name && (
                          <p className="text-xs text-white/55 mt-1">Transcript mentions: <span className="text-white font-semibold">"{rec.ai_customer_name}"</span>{rec.candidate_customer_ids && rec.candidate_customer_ids.length > 1 && <span className="ml-1 text-error">({rec.candidate_customer_ids.length} matches — ambiguous)</span>}</p>
                        )}
                        {rec.candidate_customer_ids && rec.candidate_customer_ids.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[11px] text-white/50">Suggestions:</span>
                            {rec.candidate_customer_ids.map(cId => {
                              const match = customers.find(c => c.id === cId)
                              if (!match) return null
                              return (
                                <button
                                  key={cId}
                                  type="button"
                                  onClick={() => handleAssign(rec.id, cId)}
                                  disabled={assigningId === rec.id || isActivelyProcessing(rec)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white border border-white/15 transition active:scale-95 disabled:opacity-50"
                                >
                                  <span className="w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ background: avatarColor(match.name) }}>
                                    {initials(match.name)}
                                  </span>
                                  <span>{match.name}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom action bar */}
                  <div className="px-5 pb-4 pt-3 border-t border-white/5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider whitespace-nowrap">Assign</span>
                      <AssignCustomerDropdown
                        recordingId={rec.id}
                        selectedCustomerId={rec.customer_id}
                        customers={customers}
                        disabled={assigningId === rec.id || isActivelyProcessing(rec)}
                        isSaving={assigningId === rec.id}
                        isOpen={openDropdownRecordingId === rec.id}
                        onToggle={() => setOpenDropdownRecordingId(prev => prev === rec.id ? null : rec.id)}
                        onClose={() => setOpenDropdownRecordingId(null)}
                        onAssign={handleAssign}
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                      <button onClick={() => handleProcess(rec)} disabled={processingId===rec.id||isActivelyProcessing(rec)||(rec.status==='needs_customer'&&!rec.customer_id)} title={rec.status==='needs_customer'&&!rec.customer_id?'Assign a customer first':isActivelyProcessing(rec)?'Processing in progress...':'Run local AI pipeline'} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/20 hover:bg-primary/30 active:bg-primary/40 disabled:opacity-40 disabled:cursor-not-allowed text-primary font-semibold text-xs rounded-xl transition border border-primary/25 whitespace-nowrap shrink-0 shadow-sm">
                        {processingId===rec.id||isActivelyProcessing(rec) ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Processing…</span></>)
                          : rec.status==='failed'||rec.status==='needs_customer'||stale ? (<><RotateCw className="w-3.5 h-3.5" /><span>{rec.status==='needs_customer'?'Process Now':'Retry'}</span></>)
                          : rec.status==='processed' ? (<><RotateCw className="w-3.5 h-3.5" /><span>Reprocess</span></>)
                          : (<><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Process</span></>)}
                      </button>

                      {confirmDeleteId === rec.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleDelete(rec.id)} disabled={deletingId===rec.id} className="flex items-center gap-1 px-2.5 py-1.5 bg-error/20 hover:bg-error/30 text-error font-semibold text-xs rounded-xl transition border border-error/30 disabled:opacity-50"><Trash2 className="w-3 h-3" /> Confirm</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1.5 text-xs text-white/40 hover:text-white rounded-xl border border-white/10 hover:border-white/20 transition">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(rec.id)} disabled={isActivelyProcessing(rec)||deletingId===rec.id} title="Delete this recording" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/25 hover:text-error hover:bg-error/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition border border-white/8 hover:border-error/25 shrink-0"><Trash2 className="w-3 h-3" /></button>
                      )}
                    </div>

                    {processError?.id === rec.id && (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-error/10 border border-error/20 text-error text-[10px] leading-snug w-full mt-2"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{processError.message}</span></div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
