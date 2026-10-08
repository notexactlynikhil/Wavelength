import React, { useEffect, useState } from 'react'
import { fetchDashboardData, DashboardData, fetchCallsPerDay, CallsPerDay } from '../services/db'
import { useAuth } from '../contexts/AuthContext'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface DashboardPageProps {
  onNavigateToCustomers?: () => void;
  onNavigateToTasks?: () => void;
}

// Mini bar chart component
const SparkLine: React.FC<{ data: CallsPerDay[] }> = ({ data }) => {
  if (!data || data.length < 2) {
    return (
      <div className="w-full h-14 flex items-end justify-between gap-1">
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/15"
            style={{
              height: `${20 + Math.random() * 30}%`,
              borderRadius: '3px 3px 0 0'
            }}
          />
        ))}
      </div>
    )
  }
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="w-full h-14 flex items-end justify-between gap-1">
      {data.map((d, i) => {
        const pct = Math.max(12, (d.count / max) * 100)
        const isLast = i === data.length - 1
        return (
          <div
            key={i}
            className="flex-1 transition-all duration-300"
            style={{
              height: `${pct}%`,
              borderRadius: '3px 3px 0 0',
              background: isLast
                ? 'linear-gradient(180deg, #9ddf2e 0%, rgba(157,223,46,0.5) 100%)'
                : `rgba(208, 188, 255, ${0.25 + (i / data.length) * 0.45})`,
              boxShadow: isLast ? '0 0 10px rgba(157,223,46,0.35), 0 0 4px rgba(157,223,46,0.2)' : undefined
            }}
          />
        )
      })}
    </div>
  )
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToCustomers,
  onNavigateToTasks
}) => {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [callsPerDay, setCallsPerDay] = useState<CallsPerDay[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month')

  const periodDays: Record<'week' | 'month' | 'year', number> = { week: 7, month: 30, year: 365 }

  const loadData = async (silent = false, period: 'week' | 'month' | 'year' = timePeriod) => {
    if (!silent) setLoading(true)
    setErrorMsg(null)
    try {
      const [result, calls] = await Promise.all([
        fetchDashboardData(),
        fetchCallsPerDay(periodDays[period])
      ])
      setData(result)
      setCallsPerDay(calls)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { loadData(false, timePeriod) }, [timePeriod])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadData(true, timePeriod)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const userName = user?.user_metadata?.name || 'Partner';
  const firstName = userName.split(' ')[0];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse select-none pt-4">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-surface-container rounded-full" />
            <div className="h-10 w-72 bg-surface-container rounded-full" />
            <div className="h-4 w-64 bg-surface-container/60 rounded-full" />
          </div>
          <div className="h-10 w-32 bg-surface-container rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 h-52 bg-surface-container-low rounded-2xl" />
          <div className="lg:col-span-8 h-52 bg-surface-container-low rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-80 bg-surface-container-low rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const todayCallsCount = data?.stats.todayCallsCount ?? 0
  const totalCustomers = data?.stats.totalCustomers ?? 0
  const pendingTasks = data?.stats.pendingTasksCount ?? 0

  return (
    <div className="flex flex-col w-full pb-8 pt-4">

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-error-container/20 border border-error/20 text-error text-xs mb-6 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* === TOP SECTION: Header + Time Filter === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 mb-6">
        <div className="flex flex-col">
          <h1 className="font-display font-bold text-4xl text-white tracking-tight leading-tight">
            Welcome back, <span className="text-on-surface-variant font-normal">{firstName}</span>
          </h1>
          <p className="font-body-md text-body-md text-outline mt-1">
            Here is your sales intelligence and customer activity pulse for today.
          </p>
        </div>

        {/* Time filter — tab style */}
        <div className="flex items-center gap-0 border-b border-outline-variant/40 self-start md:self-auto">
          {(['week', 'month', 'year'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-5 py-2 font-label-md text-label-md transition-all capitalize relative ${
                timePeriod === period
                  ? 'text-white font-semibold'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
              {timePeriod === period && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* === PRIMARY GRID: KPI + Chart === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">

        {/* Left KPI Block (4 cols) */}
        <div className="lg:col-span-4 bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between shadow-[0_12px_32px_-4px_rgba(0,0,0,0.5)]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-label-md text-outline">Total Pipeline Intelligence</span>
              <span className="px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant/40 text-on-surface-variant font-label-sm text-label-sm">Live Sync</span>
            </div>

            {/* Stat */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-4xl font-bold text-white tracking-tight font-display">
                {totalCustomers.toLocaleString()}
                <span className="text-on-surface-variant font-light text-2xl ml-1">accounts</span>
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline">
              Active tasks identified: <span className="text-white font-medium">{pendingTasks} pending</span>
            </p>

            {/* 3 mini KPIs */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div
                onClick={onNavigateToCustomers}
                className="bg-surface-container rounded-xl p-3 text-center cursor-pointer hover:bg-surface-container-high transition-colors group"
              >
                <div className="text-2xl font-bold text-primary font-display group-hover:text-primary-fixed transition-colors">{totalCustomers}</div>
                <div className="font-label-sm text-label-sm text-outline mt-0.5">Customers</div>
              </div>
              <div
                onClick={onNavigateToTasks}
                className="bg-surface-container rounded-xl p-3 text-center cursor-pointer hover:bg-surface-container-high transition-colors group"
              >
                <div className="text-2xl font-bold text-white font-display">{pendingTasks}</div>
                <div className="font-label-sm text-label-sm text-outline mt-0.5">Tasks</div>
              </div>
              <div className="bg-surface-container rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-secondary font-display">{todayCallsCount}</div>
                <div className="font-label-sm text-label-sm text-outline mt-0.5">Calls Today</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-5">
            <button
              onClick={onNavigateToCustomers}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-surface-container-lowest font-label-md text-label-md font-bold hover:bg-neutral-200 transition-all hover:scale-[0.99] shadow-[0_0_20px_rgba(255,255,255,0.18)]"
            >
              <span>View Customers</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-white hover:bg-surface-bright transition-colors disabled:opacity-50"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right Chart Block (8 cols) */}
        <div className="lg:col-span-8 bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between shadow-[0_12px_32px_-4px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

            {/* Sub-metric 1: Calls (5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-between h-full">
              <div>
                <span className="font-body-sm text-body-sm text-outline">Calls Analyzed</span>
                <div className="text-3xl font-bold text-white mt-1 mb-2 font-display">
                  {todayCallsCount} <span className="text-on-surface-variant font-light text-xl">today</span>
                </div>
                <div className="inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                  Live tracking active
                </div>
              </div>
              <div className="mt-4">
                {/* Processing status bar */}
                <div className="relative w-full h-11 rounded-xl bg-gradient-to-r from-primary-container via-tertiary-container to-primary shadow-[0_0_24px_rgba(160,120,255,0.35)] flex items-center px-4 overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 opacity-30 animate-pulse" />
                  <span className="font-label-sm text-label-sm text-white font-semibold relative z-10 tracking-wide uppercase">
                    {isRefreshing ? 'Refreshing Data...' : 'Processing Real-Time Streams'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 font-label-sm text-label-sm text-outline">
                  <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                  <span className="text-white font-medium">{todayCallsCount} Analyzed</span>
                </div>
              </div>
            </div>

            {/* Sub-metric 2: Call activity chart (7 cols) */}
            <div className="md:col-span-7 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-body-sm text-body-sm text-outline">Call Activity ({periodDays[timePeriod]} days)</span>
                    <span className="font-label-sm text-label-sm text-outline/60">· {timePeriod} view</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    {callsPerDay.length > 0 ? `${callsPerDay.reduce((a, b) => a + b.count, 0)} total` : 'Loading...'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-white mt-1 mb-1 font-display">
                  {callsPerDay.reduce((a, b) => a + b.count, 0)} <span className="text-on-surface-variant font-light text-xl">calls</span>
                </div>
              </div>

              {/* Equalizer / chart */}
              <div className="relative w-full mt-3">
                <div className="w-full border-t border-dashed border-outline-variant/60 my-2" />
                <SparkLine data={callsPerDay} />
                <div className="flex justify-between items-center mt-2 font-label-sm text-label-sm text-outline">
                  <span className="text-white font-medium">All systems live</span>
                  <span>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === LOWER CARDS GRID === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* CARD 1: Analytics (4 cols) */}
        <div className="lg:col-span-4 bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between shadow-[0_12px_32px_-4px_rgba(0,0,0,0.5)] min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d0bcff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <h2 className="font-headline-sm text-headline-sm text-white font-semibold">Analytics</h2>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-secondary" />
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Active Customers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-outline" />
                <span className="font-label-sm text-label-sm text-outline font-medium">Pending Tasks</span>
              </div>
            </div>

            {/* SVG chart */}
            <div className="relative w-full h-44 mt-2">
              {/* Tooltip */}
              <div className="absolute top-2 right-8 z-20 flex flex-col gap-1 p-2 rounded-xl bg-surface-container-highest/95 border border-outline-variant/40 shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-white">
                  <span className="w-1.5 h-3 bg-secondary rounded-sm" />
                  <span className="font-semibold">{totalCustomers} customers</span>
                </div>
                <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline">
                  <span className="w-1.5 h-3 bg-outline rounded-sm" />
                  <span>{pendingTasks} tasks</span>
                </div>
              </div>
              <svg className="w-full h-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 340 130">
                <defs>
                  <linearGradient id="neonGlowDB" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#9ddf2e" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#9ddf2e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0 85 C 40 85, 60 100, 100 80 C 130 65, 150 25, 180 35 C 220 50, 240 100, 280 85 C 310 75, 330 80, 340 85 L 340 130 L 0 130 Z" fill="url(#neonGlowDB)" />
                <path d="M 0 95 C 40 95, 70 80, 110 95 C 140 108, 170 85, 200 95 C 230 105, 260 90, 290 100 C 315 110, 330 95, 340 105" fill="none" stroke="#958ea0" strokeDasharray="4 4" strokeWidth="2" />
                <path d="M 0 85 C 40 85, 60 100, 100 80 C 130 65, 150 25, 180 35 C 220 50, 240 100, 280 85 C 310 75, 330 80, 340 85" fill="none" stroke="#9ddf2e" strokeWidth="2.5" />
                <circle cx="180" cy="35" fill="#ffffff" r="4" stroke="#9ddf2e" strokeWidth="2" />
                <circle cx="280" cy="85" fill="#ffffff" r="3.5" />
                <line stroke="#494454" strokeDasharray="2 3" x1="280" x2="280" y1="85" y2="130" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between text-outline font-label-sm text-label-sm pt-2">
            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
          </div>
        </div>

        {/* CARD 2: Recent Customers (4 cols) */}
        <div className="lg:col-span-4 bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between shadow-[0_12px_32px_-4px_rgba(0,0,0,0.5)] min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cebdff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <h2 className="font-headline-sm text-headline-sm text-white font-semibold">Recent Customers</h2>
              </div>
              <button
                onClick={onNavigateToCustomers}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-white hover:bg-surface-container transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </button>
            </div>

            {!data?.recentCustomers || data.recentCustomers.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-outline-variant/30 rounded-xl bg-surface-container/30">
                <p className="font-body-sm text-body-sm text-outline">No customers registered yet.</p>
                <button
                  onClick={onNavigateToCustomers}
                  className="mt-3 px-4 py-2 rounded-full bg-primary/20 text-primary font-label-sm text-label-sm hover:bg-primary/30 transition-colors"
                >
                  Add your first customer
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.recentCustomers.slice(0, 5).map((cust) => {
                  const initials = cust.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <div key={cust.id} className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-surface-container transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-body-md text-body-md text-white font-medium truncate group-hover:text-primary transition-colors">
                            {cust.name}
                          </div>
                          {cust.company && (
                            <div className="font-body-sm text-body-sm text-outline truncate">{cust.company}</div>
                          )}
                        </div>
                      </div>
                      {cust.tags && cust.tags.length > 0 && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                          {cust.tags[0]}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {onNavigateToCustomers && (
            <div className="pt-3 border-t border-surface-container">
              <button
                onClick={onNavigateToCustomers}
                className="inline-flex items-center gap-1 text-primary hover:text-primary-fixed font-label-sm text-label-sm font-semibold transition-colors"
              >
                <span>View all {totalCustomers} customers</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* CARD 3: Pending Tasks (4 cols) */}
        <div className="lg:col-span-4 bg-surface-container-low rounded-2xl p-6 flex flex-col justify-between shadow-[0_12px_32px_-4px_rgba(0,0,0,0.5)] min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d0bcff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <h2 className="font-headline-sm text-headline-sm text-white font-semibold">Pending Action Items</h2>
              </div>
              <button
                onClick={onNavigateToTasks}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-white hover:bg-surface-container transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </button>
            </div>

            {!data?.pendingTasks || data.pendingTasks.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-outline-variant/30 rounded-xl bg-surface-container/30">
                <p className="font-body-sm text-body-sm text-secondary font-medium">All tasks completed ✓</p>
                <p className="font-body-sm text-body-sm text-outline mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start justify-between py-2 px-2 rounded-xl hover:bg-surface-container transition-colors group">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="w-4 h-4 rounded-full border-2 border-primary/40 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-body-sm text-body-sm text-white font-medium leading-snug line-clamp-2">
                          {task.description}
                        </p>
                        {task.due_date && (
                          <span className="font-label-sm text-label-sm text-outline mt-0.5 block">
                            Due: {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`flex-shrink-0 ml-2 px-2 py-0.5 rounded-md font-label-sm text-label-sm font-semibold border ${
                      task.status === 'done' 
                        ? 'bg-secondary/10 text-secondary border-secondary/20' 
                        : (task.status as string) === 'in_progress' 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : 'bg-surface-container-high text-outline border-outline-variant/30'
                    }`}>
                      {(task.status as string) === 'in_progress' ? 'In Progress' : task.status === 'done' ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {onNavigateToTasks && (
            <div className="pt-3 border-t border-surface-container">
              <button
                onClick={onNavigateToTasks}
                className="inline-flex items-center gap-1 text-primary hover:text-primary-fixed font-label-sm text-label-sm font-semibold transition-colors"
              >
                <span>View all {pendingTasks} action items</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
