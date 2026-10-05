import React, { useState } from 'react'
import { Task } from '../../types'
import { AlertTriangle, X } from 'lucide-react'

interface DeleteTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  task?: Task | null;
}

export const DeleteTaskDialog: React.FC<DeleteTaskDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  task
}) => {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !task) return null

  const handleDelete = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      await onConfirm()
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete task.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-theme-base/80 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div 
        className="bg-theme-surface border border-theme-border rounded-2xl w-full max-w-sm shadow-xl relative z-10 overflow-hidden animate-slideUp"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
      >
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 text-theme-textMuted hover:text-theme-text rounded-lg hover:bg-theme-base transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          
          {/* Icon */}
          <div className="inline-flex items-center justify-center p-3 bg-theme-dangerMuted text-theme-danger border border-theme-dangerMuted rounded-full">
            <AlertTriangle className="w-5 h-5" />
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider font-display">Delete Task</h3>
            <p className="text-xs text-theme-textMuted max-w-xs mx-auto leading-normal">
              Are you sure you want to delete this task? This action is permanent and cannot be undone.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 bg-theme-dangerMuted border border-theme-dangerMuted rounded-xl text-xs text-theme-danger text-left">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 text-xs font-semibold text-theme-textMuted hover:text-theme-text border border-theme-border bg-theme-surface hover:bg-theme-base rounded-xl transition shadow-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-2 bg-theme-danger hover:bg-theme-danger text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin" />
              ) : (
                'Delete Task'
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
