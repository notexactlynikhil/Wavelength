import React from 'react'
import { Customer } from '../../types'
import { CustomerCard } from './CustomerCard'
import { Users, Plus } from 'lucide-react'

interface CustomerListProps {
  customers: Customer[];
  loading: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAddClick: () => void;
  onSelect: (customer: Customer) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  loading,
  onEdit,
  onDelete,
  onAddClick,
  onSelect
}) => {
  
  // Loading Skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse select-none">
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="h-[210px] bg-theme-surface border border-theme-border rounded-2xl p-5 space-y-4">
            {/* Header skeleton */}
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-theme-border/60 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-theme-border/70 rounded w-3/4" />
                <div className="h-3 bg-theme-border/50 rounded w-1/2" />
              </div>
            </div>
            {/* Info skeleton */}
            <div className="space-y-2.5 pt-3 border-t border-theme-border/80">
              <div className="h-3 bg-theme-border/60 rounded w-5/6" />
              <div className="h-3 bg-theme-border/50 rounded w-2/3" />
            </div>
            {/* Footer skeleton */}
            <div className="flex justify-between items-center pt-3 border-t border-theme-border/80">
              <div className="h-3 bg-theme-border/60 rounded w-1/3" />
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-theme-border/60 rounded-lg" />
                <div className="w-7 h-7 bg-theme-border/60 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty State
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center select-none border border-dashed border-theme-border rounded-2xl bg-theme-surface">
        <div className="p-4 bg-theme-accent/10 text-theme-accent border border-theme-accent/20 rounded-2xl mb-4 shadow-sm">
          <Users className="w-9 h-9" />
        </div>
        <h3 className="text-xl font-bold text-theme-text mb-2 font-display">No customers yet</h3>
        <p className="text-sm text-theme-textMuted max-w-sm mb-6 leading-relaxed">
          Create customer profiles to organize call history, track deals, and assign tasks.
        </p>
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-accent hover:bg-theme-accentHover text-white rounded-xl text-sm font-semibold transition shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>
    )
  }

  // Standard Grid Render
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {customers.map((cust) => (
        <CustomerCard
          key={cust.id}
          customer={cust}
          onEdit={onEdit}
          onDelete={onDelete}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
