import React from 'react'
import { Customer, CallSummary } from '../../types'
import { CallInsights } from './CallInsights'
import { Mail, Phone, Building2, Calendar, Shield, Sparkles } from 'lucide-react'

type SummaryWithCall = CallSummary & { call?: { started_at?: string; customer_id?: string } }

interface OverviewTabProps {
  customer: Customer;
  summaries?: SummaryWithCall[];
  summariesLoading?: boolean;
  onUpdateSummary?: (id: string, updates: { summary_text?: string }) => Promise<void>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  customer,
  summaries = [],
  summariesLoading = false,
  onUpdateSummary
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const items = [
    { label: 'Email Address', value: customer.email, icon: Mail, type: 'email' },
    { label: 'Phone Number', value: customer.phone, icon: Phone, type: 'phone' },
    { label: 'Company / Organization', value: customer.company, icon: Building2, type: 'text' },
    { label: 'Profile Registered', value: formatDate(customer.created_at), icon: Calendar, type: 'text' },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
        
        {/* Left Columns: Metadata list */}
        <div className="lg:col-span-2 bg-surface-container-low border border-outline-variant/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container">
            <h3 className="font-headline-sm text-sm font-bold text-white uppercase tracking-wider font-display">
              Customer Profile Dossier
            </h3>
            <span className="text-xs text-outline font-medium">Verified Identity</span>
          </div>
          
          <div className="divide-y divide-surface-container">
            {items.map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} className="grid grid-cols-3 py-3.5 first:pt-1 last:pb-1 items-start">
                  <span className="text-xs font-semibold text-outline flex items-center gap-2 mt-0.5">
                    <Icon className="w-4 h-4 text-outline" />
                    <span>{item.label}</span>
                  </span>
                  
                  <span className="col-span-2 text-xs md:text-sm text-white break-all pl-2 font-medium">
                    {item.value ? (
                      item.type === 'email' ? (
                        <a href={`mailto:${item.value}`} className="text-primary hover:underline font-semibold">
                          {item.value}
                        </a>
                      ) : (
                        item.value
                      )
                    ) : (
                      <span className="text-outline italic text-xs">Not specified</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Tags & Info Card */}
        <div className="bg-surface-container-low border border-outline-variant/40 rounded-3xl p-6 md:p-8 flex flex-col justify-between space-y-6 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-container">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="font-headline-sm text-sm font-bold text-white uppercase tracking-wider font-display">
                Assigned Tags
              </h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {customer.tags && customer.tags.length > 0 ? (
                customer.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="bg-primary/15 text-primary border border-primary/25 text-xs font-semibold px-3 py-1 rounded-full tracking-wide"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-outline italic">No tags assigned to this customer.</span>
              )}
            </div>
          </div>

          <div className="p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-xs text-on-surface-variant leading-relaxed font-sans mt-auto">
            Use the edit action on the Customers directory to update profile fields, email routes, or deal tags.
          </div>
        </div>
      </div>

      {/* AI Call Insights with manual correction */}
      <section className="bg-surface-container-low border border-outline-variant/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline-sm text-sm font-bold text-white uppercase tracking-wider font-display">
                AI Call Insights & Synthesis
              </h3>
              <p className="text-xs text-on-surface-variant">Real-time LLM meeting summaries and customer sentiment extractions</p>
            </div>
          </div>
          <span className="text-xs text-secondary font-semibold hidden sm:inline">Telemetry Active</span>
        </div>
        <CallInsights summaries={summaries} loading={summariesLoading} onUpdate={onUpdateSummary!} />
      </section>
    </div>
  )
}
