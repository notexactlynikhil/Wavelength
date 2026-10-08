import React, { useState } from 'react'
import { useCustomers } from '../hooks/useCustomers'
import { CustomerFormModal } from '../components/customers/CustomerFormModal'
import { DeleteCustomerDialog } from '../components/customers/DeleteCustomerDialog'
import { CustomerWorkspacePage } from './CustomerWorkspacePage'
import { AlertCircle } from 'lucide-react'
import { Customer } from '../types'

export const CustomersPage: React.FC = () => {
  const {
    customers,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    sortOrder,
    setSortOrder,
    totalCount,
    hasNextPage,
    addCustomer,
    editCustomer,
    removeCustomer,
  } = useCustomers()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCustomerForWorkspace, setSelectedCustomerForWorkspace] = useState<Customer | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const handleAddClick = () => { setSelectedCustomer(null); setIsFormOpen(true) }
  const handleEditClick = (cust: Customer) => { setSelectedCustomer(cust); setIsFormOpen(true) }
  const handleDeleteClick = (cust: Customer) => { setSelectedCustomer(cust); setIsDeleteOpen(true) }

  const handleFormSubmit = async (data: Omit<Customer, 'id' | 'created_at' | 'owner_id'>) => {
    if (selectedCustomer) { await editCustomer(selectedCustomer.id, data) }
    else { await addCustomer(data) }
  }

  const handleDeleteConfirm = async () => {
    if (selectedCustomer) { await removeCustomer(selectedCustomer.id) }
  }

  const totalPages = Math.ceil(totalCount / 20) || 1

  if (selectedCustomerForWorkspace) {
    return (
      <CustomerWorkspacePage
        customer={selectedCustomerForWorkspace}
        onBack={() => setSelectedCustomerForWorkspace(null)}
      />
    )
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex flex-col w-full pb-8 pt-4">

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-error-container/20 border border-error/20 text-error text-xs mb-6 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* === TOP HEADER === */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 pt-2">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary mr-1.5" />
              Directory Matrix
            </span>
            <span className="text-outline font-label-sm text-label-sm">• Live Sync Active</span>
          </div>
          <h1 className="font-display font-bold text-4xl text-white tracking-tight">Customers</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage enterprise customer relationships, deal stages, and AI call intelligence.
          </p>

          {/* Quick stats pills */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low font-label-md text-label-md">
              <span className="font-semibold text-white">{totalCount}</span>
              <span className="text-on-surface-variant font-normal">Total Accounts</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low font-label-md text-label-md">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-semibold text-white">{customers.length}</span>
              <span className="text-on-surface-variant font-normal">Showing</span>
            </div>
            {loading && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low font-label-md text-label-md text-primary">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              className="w-full pl-9 pr-4 py-2 rounded-full bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-all"
              placeholder="Search accounts, names..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Sort filter */}
          <div className="relative">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbc3d7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span>{sortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#958ea0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-surface-container-high p-1.5 shadow-xl z-50">
                  <button
                    className="w-full text-left px-3 py-2 rounded-xl text-label-md font-label-md hover:bg-surface-container text-white transition-colors"
                    onClick={() => { setSortOrder('asc'); setFilterOpen(false) }}
                  >A → Z (Name)</button>
                  <button
                    className="w-full text-left px-3 py-2 rounded-xl text-label-md font-label-md hover:bg-surface-container text-on-surface-variant transition-colors"
                    onClick={() => { setSortOrder('desc'); setFilterOpen(false) }}
                  >Z → A (Name)</button>
                </div>
              </>
            )}
          </div>

          {/* Add customer CTA */}
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-surface-container-lowest font-headline-sm text-headline-sm hover:scale-[0.98] transition-transform shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Add Customer</span>
          </button>
        </div>
      </section>

      {/* === MAIN TABLE CARD === */}
      <section className="rounded-2xl bg-surface-container-low p-6 shadow-xl overflow-hidden">
        {/* Table header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-white font-semibold">Customer Relationships</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">All accounts in your pipeline</p>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading && customers.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-surface-container rounded-xl animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/30">
            <svg className="mx-auto mb-3 text-outline" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p className="font-headline-sm text-headline-sm text-white">No customers found</p>
            <p className="font-body-sm text-body-sm text-outline mt-1">
              {search ? `No results for "${search}"` : 'Add your first customer to get started.'}
            </p>
            {!search && (
              <button
                onClick={handleAddClick}
                className="mt-4 px-5 py-2 rounded-full bg-white text-surface-container-lowest font-label-md text-label-md font-bold hover:bg-neutral-200 transition-all"
              >
                Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-outline font-label-sm text-label-sm uppercase tracking-wider bg-surface-container-lowest/40">
                  <th className="py-3.5 px-4 rounded-l-full">Customer & Company</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4">Added</th>
                  <th className="py-3.5 px-4 rounded-r-full text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <React.Fragment key={cust.id}>
                    <tr
                      className="group hover:bg-surface-container transition-colors cursor-pointer"
                      onClick={() => setSelectedCustomerForWorkspace(cust)}
                    >
                      <td className="py-4 px-4 rounded-l-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-headline-sm text-headline-sm font-bold flex items-center justify-center shrink-0">
                            {getInitials(cust.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm text-white font-medium group-hover:text-primary transition-colors">
                              {cust.name}
                            </span>
                            {cust.company && (
                              <span className="font-body-sm text-body-sm text-on-surface-variant">{cust.company}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {cust.email || <span className="text-outline italic">No email</span>}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {cust.phone || <span className="text-outline italic">No phone</span>}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {cust.tags && cust.tags.length > 0 ? (
                            cust.tags.slice(0, 2).map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-outline font-label-sm text-label-sm italic">No tags</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {new Date(cust.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right rounded-r-xl whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            className="px-3 py-1 rounded-full bg-surface-container-high hover:bg-white hover:text-surface-container-lowest text-on-surface font-label-sm text-label-sm transition-all"
                            onClick={(e) => { e.stopPropagation(); setSelectedCustomerForWorkspace(cust) }}
                          >
                            Open
                          </button>
                          <button
                            aria-label={`Edit ${cust.name}`}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent hover:bg-surface-container-high text-outline hover:text-white transition-colors"
                            onClick={(e) => { e.stopPropagation(); handleEditClick(cust) }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            aria-label={`Delete ${cust.name}`}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent hover:bg-error-container/30 text-outline hover:text-error transition-colors"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(cust) }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Spacer row */}
                    <tr className="h-1.5"><td colSpan={6} /></tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-outline font-label-sm text-label-sm">
              <span>Showing <strong className="text-white">{customers.length} of {totalCount}</strong> accounts</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-high text-outline hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              {[...Array(Math.min(totalPages, 3))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md transition-colors ${
                      page === pageNum
                        ? 'bg-white text-surface-container-lowest font-bold'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              {totalPages > 3 && <span className="text-outline text-label-sm">...</span>}

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNextPage || loading}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Form Modal */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        customer={selectedCustomer}
      />

      {/* Delete Dialog */}
      <DeleteCustomerDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        customer={selectedCustomer}
      />
    </div>
  )
}
