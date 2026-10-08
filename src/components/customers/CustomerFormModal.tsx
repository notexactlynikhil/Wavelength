import React, { useState, useEffect } from 'react'
import { Customer } from '../../types'
import { X, Mail, Phone, Building2, User, Tag, AlertCircle } from 'lucide-react'

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Customer, 'id' | 'created_at' | 'owner_id'>) => Promise<void>;
  customer?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customer
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [tagsString, setTagsString] = useState('')

  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setValidationError(null)
      if (customer) {
        setName(customer.name)
        setEmail(customer.email || '')
        setPhone(customer.phone || '')
        setCompany(customer.company || '')
        setTagsString(customer.tags ? customer.tags.join(', ') : '')
      } else {
        setName('')
        setEmail('')
        setPhone('')
        setCompany('')
        setTagsString('')
      }
    }
  }, [customer, isOpen])

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

    if (!name.trim()) {
      setValidationError('Customer name is required.')
      return
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        setValidationError('Please provide a valid email address.')
        return
      }
    }

    setLoading(true)

    const tagsArray = tagsString
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        tags: tagsArray,
      })
      onClose()
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to save customer profiles.')
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
        className="bg-surface-container-low border border-outline-variant/60 rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-slideUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-container flex items-center justify-between shrink-0">
          <div>
            <h2 id="customer-modal-title" className="font-headline-md text-lg font-bold text-white font-display">
              {customer ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Enter customer metadata for autonomous telemetry tracking
            </p>
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

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {validationError && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-error/10 border border-error/25 text-error text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Full Name <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="Sarah Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="sarah@apexglobal.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Phone Number</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                placeholder="+1 (555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
              />
            </div>
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Company / Organization</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                <Building2 className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Apex Global Systems"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center justify-between">
              <span>Tags</span>
              <span className="text-[10px] text-outline lowercase font-normal">comma separated</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                <Tag className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Enterprise, High Priority, Q3 Renewal"
                value={tagsString}
                onChange={(e) => setTagsString(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
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
                customer ? 'Save Changes' : 'Create Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
