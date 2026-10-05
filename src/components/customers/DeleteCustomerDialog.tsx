import React, { useState } from 'react'
import { Customer } from '../../types'
import { AlertTriangle, X } from 'lucide-react'

interface DeleteCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  customer?: Customer | null;
}

export const DeleteCustomerDialog: React.FC<DeleteCustomerDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  customer
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

  if (!isOpen || !customer) return null

  const handleDelete = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      await onConfirm()
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete customer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-theme-base/80 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div 
        className="bg-theme-surface border border-theme-border rounded-2xl w-full max-w-md shadow-xl relative z-10 overflow-hidden animate-slideUp"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
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

        {/* Dialog Body */}
        <div className="p-6 text-center space-y-4">
          
          {/* Warning Icon Banner */}
          <div className="inline-flex items-center justify-center p-3 bg-theme-dangerMuted text-theme-danger border border-theme-dangerMuted rounded-full">
            <AlertTriangle className="w-6 h-6" />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-theme-text font-display">Delete Customer</h3>
            <p className="text-xs text-theme-textMuted max-w-xs mx-auto leading-relaxed">
              Are you sure you want to delete <span className="text-theme-text font-bold">{customer.name}</span>? This action is permanent.
            </p>
          </div>

          {/* Alert Message */}
          <div className="p-3 bg-theme-base border border-theme-border rounded-xl text-left text-[11px] text-theme-textMuted leading-normal">
            <strong className="text-theme-text">Warning:</strong> Deleting this customer will automatically remove all associated calls, transcripts, deals, and tasks under database cascade rules.
          </div>

          {/* Error Message (if failed) */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-theme-dangerMuted border border-theme-dangerMuted text-theme-danger text-xs text-left">
              {errorMsg}
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 text-sm font-semibold text-theme-textMuted hover:text-theme-text border border-theme-border bg-theme-surface hover:bg-theme-base rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-2 bg-theme-danger hover:bg-theme-danger text-white rounded-xl text-sm font-semibold shadow-xs transition flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin" />
              ) : (
                'Delete User'
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
