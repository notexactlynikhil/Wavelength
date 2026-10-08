import React, { useState, useEffect } from 'react'
import { Task, TaskPriority } from '../../types'
import { parseTaskContent, serializeTaskDescription } from '../../utils/taskHelper'
import { X, Calendar, AlertCircle, Clock, Flag, CheckCircle2 } from 'lucide-react'

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string, dueDate?: string, status?: 'pending' | 'in_progress' | 'done') => Promise<void>;
  task?: Task | null;
  initialTitle?: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  initialTitle
}) => {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'done'>('pending')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setValidationError(null)
      if (task) {
        const parsed = parseTaskContent(task)
        setTitle(parsed.title)
        setDetails(parsed.details !== parsed.title ? parsed.details : '')
        setPriority(parsed.priority || 'medium')
        setStatus(parsed.taskStatus || 'pending')

        if (task.due_date) {
          const d = new Date(task.due_date)
          setDueDate(d.toISOString().split('T')[0])
          const hours = String(d.getHours()).padStart(2, '0')
          const mins = String(d.getMinutes()).padStart(2, '0')
          if (hours !== '00' || mins !== '00') {
            setDueTime(`${hours}:${mins}`)
          } else {
            setDueTime('')
          }
        } else {
          setDueDate('')
          setDueTime('')
        }
      } else {
        setTitle(initialTitle || '')
        setDetails('')
        setPriority('medium')
        setStatus('pending')
        setDueDate('')
        setDueTime('')
      }
    }
  }, [task, isOpen, initialTitle])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!title.trim()) {
      setValidationError('Task title is required.')
      return
    }

    setLoading(true)

    try {
      const existingParsed = task ? parseTaskContent(task) : null
      const nowIso = new Date().toISOString()

      const newActivity = existingParsed?.activity ? [...existingParsed.activity] : []
      if (task) {
        newActivity.push({
          id: `act-${Date.now()}`,
          type: 'edited',
          description: `Updated task details & parameters`,
          timestamp: nowIso
        })
      } else {
        newActivity.push({
          id: `act-${Date.now()}`,
          type: 'created',
          description: 'Created commitment item',
          timestamp: nowIso
        })
      }

      const finalDescription = serializeTaskDescription({
        title: title.trim(),
        details: details.trim(),
        priority,
        taskStatus: status,
        subtasks: existingParsed?.subtasks || [],
        keyContext: existingParsed?.keyContext || {},
        recommendation: existingParsed?.recommendation,
        activity: newActivity
      })

      let finalDueDate: string | undefined = undefined
      if (dueDate) {
        if (dueTime) {
          finalDueDate = new Date(`${dueDate}T${dueTime}:00`).toISOString()
        } else {
          finalDueDate = new Date(`${dueDate}T12:00:00`).toISOString()
        }
      }

      await onSubmit(finalDescription, finalDueDate, status)
      onClose()
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to save task details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div 
        className="bg-surface-container-low border border-outline-variant/60 rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-slideUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-container flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="task-modal-title" className="font-headline-md text-base font-bold text-white font-display">
                {task ? 'Edit Commitment' : initialTitle ? 'Create Follow-up Action' : 'Add New Commitment'}
              </h2>
              <p className="text-xs text-on-surface-variant">Configure action parameters and deadline schedule</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-white hover:bg-surface-container transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {validationError && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-error/10 border border-error/25 text-error text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Task Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center justify-between">
              <span>Action / Commitment Title <span className="text-primary">*</span></span>
              <span className="text-[10px] text-outline font-normal">Concise deliverable</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Deliver revised MSA redlines to legal counsel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
            />
          </div>

          {/* Description & Context */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center justify-between">
              <span>Detailed Context & Notes</span>
              <span className="text-[10px] text-outline font-normal">Optional</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add customer requirements, conversation excerpts, or specific instructions..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition resize-none"
            />
          </div>

          {/* Priority and Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-outline" />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={loading}
                className="w-full px-3.5 py-2 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl text-xs text-white font-medium transition"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-outline" />
                <span>Execution State</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'pending' | 'in_progress' | 'done')}
                disabled={loading}
                className="w-full px-3.5 py-2 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl text-xs text-white font-medium transition"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Completed</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-outline" />
                <span>Target Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl text-xs text-white transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-outline" />
                <span>Target Time</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl text-xs text-white transition"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-on-surface-variant hover:text-white bg-surface-container hover:bg-surface-container-high transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-white text-surface-container-lowest font-headline-sm text-xs font-bold rounded-full transition hover:bg-slate-100 hover:scale-[0.99] active:scale-[0.98] shadow-md disabled:opacity-50"
            >
              {loading ? (
                <span className="border-2 border-surface-container-lowest border-t-transparent w-4 h-4 rounded-full animate-spin" />
              ) : (
                task ? 'Save Changes' : 'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
