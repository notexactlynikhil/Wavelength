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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div 
        className="bg-surface-container-low border border-outline-variant/60 rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden animate-slideUp"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-white hover:bg-surface-container transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dialog Body */}
        <div className="p-6 sm:p-8 text-center space-y-4">
          {/* Warning Icon Banner */}
          <div className="inline-flex items-center justify-center p-3.5 bg-error/15 text-error border border-error/30 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h3 id="delete-dialog-title" className="font-headline-md text-lg font-bold text-white font-display">
              Delete Customer
            </h3>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
              Are you sure you want to permanently delete <span className="text-white font-bold">{customer.name}</span>?
            </p>
          </div>

          {/* Alert Message */}
          <div className="p-3.5 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl text-left text-xs text-on-surface-variant leading-relaxed">
            <strong className="text-error font-semibold">Cascade Warning:</strong> Removing this customer will automatically purge all linked meeting recordings, transcripts, intelligence summaries, and commitments.
          </div>

          {/* Error Message (if failed) */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-error/15 border border-error/30 text-error text-xs text-left">
              {errorMsg}
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-full text-xs font-semibold text-on-surface-variant hover:text-white bg-surface-container hover:bg-surface-container-high transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-2.5 rounded-full bg-error hover:bg-error/90 text-surface-container-lowest font-headline-sm text-xs font-bold shadow-md transition flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <span className="border-2 border-surface-container-lowest border-t-transparent w-4 h-4 rounded-full animate-spin" />
              ) : (
                'Confirm Delete'
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
