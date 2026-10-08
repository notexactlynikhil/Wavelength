import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeSync } from '../contexts/RealtimeSyncContext'
import { useTaskNotifications } from '../hooks/useTaskNotifications'

import { LambdaLogo } from '../components/LambdaLogo'

export type TabType = 'dashboard' | 'customers' | 'tasks' | 'search' | 'recordings' | 'settings';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const navItems = [
  { id: 'dashboard' as TabType, label: 'Overview' },
  { id: 'customers' as TabType, label: 'Customers' },
  { id: 'tasks' as TabType, label: 'Tasks' },
  { id: 'recordings' as TabType, label: 'Recordings' },
  { id: 'search' as TabType, label: 'Search' },
  { id: 'settings' as TabType, label: 'Settings' },
] as const;

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab
}) => {
  const { user, signOut } = useAuth()
  const { status: syncStatus } = useRealtimeSync()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  useTaskNotifications()

  // Global keyboard shortcut: Cmd+K / Ctrl+K opens transcript search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setActiveTab('search')
      }
      if (e.key === 'Escape') {
        setProfileMenuOpen(false)
        setNotifOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveTab])

  const displayName = user?.user_metadata?.name || 'User';
  const displayEmail = user?.email || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setProfileMenuOpen(false)
    const { error } = await signOut()
    if (error) {
      alert('Failed to log out: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen w-full bg-surface-container-lowest text-on-surface relative">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 h-[450px] overflow-hidden z-0">
        <div className="absolute -top-[180px] -left-[140px] w-[560px] h-[560px] rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute -top-[200px] right-[2%] w-[620px] h-[620px] rounded-full bg-tertiary-container/10 blur-[140px]" />
        <div className="absolute top-[40px] left-1/2 -translate-x-1/2 w-[720px] h-[240px] rounded-full bg-surface-tint/5 blur-[120px]" />
      </div>

      {/* Fixed Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="h-20 max-w-[1440px] mx-auto px-8 flex items-center justify-between gap-5">

          {/* Left: Brand Identity */}
          <div className="flex items-center min-w-[200px]">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-3 group text-left transition-transform active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary group-hover:border-primary/50 group-hover:bg-primary/20 transition-all shadow-[0_0_16px_rgba(208,188,255,0.18)]">
                <LambdaLogo className="w-5 h-5 text-primary" />
              </div>
              <span className="font-display font-bold tracking-tight text-white text-lg group-hover:text-primary transition-colors">
                Wavelength
              </span>
            </button>
          </div>

          {/* Center: Pill navigation */}
          <div className="hidden md:flex items-center justify-center flex-1">
            <nav className="flex items-center gap-1.5 p-1.5 rounded-full bg-surface-container-low shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
              {navItems.map((item) => {
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`px-4 py-1.5 rounded-full font-label-md text-label-md transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-surface-container-lowest font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Right: Actions + Profile */}
          <div className="flex items-center justify-end gap-2 min-w-[200px]">
            {/* Search */}
            <button
              onClick={() => setActiveTab('search')}
              aria-label="Global Search"
              title="Search transcripts (Ctrl+K)"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileMenuOpen(false) }}
                aria-label="Notifications"
                className="relative w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-2xl z-50 overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-outline-variant/30">
                      <span className="font-headline-sm text-headline-sm text-white">Notifications</span>
                    </div>
                    <div className="p-4 text-center text-on-surface-variant font-body-sm text-body-sm">
                      You're all caught up ✓
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sync Status */}
            <div
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-low text-secondary"
              title={`Sync: ${syncStatus}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={syncStatus === 'connecting' ? 'animate-spin' : ''}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </div>

            <div className="h-6 w-px bg-surface-container-high mx-1 hidden sm:block" />

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileMenuOpen(!profileMenuOpen); setNotifOpen(false) }}
                aria-label="User Profile"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-primary/40 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center border border-primary/30">
                  {avatarLetter}
                </div>
              </button>

              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-2xl z-50 overflow-hidden animate-fadeIn" role="menu">
                    <div className="p-4 border-b border-outline-variant/30">
                      <div className="font-headline-sm text-headline-sm text-white truncate">{displayName}</div>
                      <div className="font-body-sm text-body-sm text-outline truncate mt-0.5">{displayEmail}</div>
                    </div>

                    <div className="p-2 border-b border-outline-variant/30 flex items-center justify-between text-label-sm font-label-sm px-4 py-2">
                      <span className="text-on-surface-variant">Sync Status</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          syncStatus === 'connected' ? 'bg-secondary' : syncStatus === 'connecting' ? 'bg-primary animate-pulse' : 'bg-error'
                        }`} />
                        <span className={`font-medium ${syncStatus === 'connected' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                          {syncStatus === 'connected' ? 'Active' : syncStatus === 'connecting' ? 'Connecting' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2" role="none">
                      <button
                        role="menuitem"
                        onClick={() => { setProfileMenuOpen(false); setActiveTab('settings') }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-label-md font-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <span>Settings</span>
                      </button>
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-label-md font-label-md text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <div className="md:hidden flex items-center justify-around px-4 pb-2 pt-1 border-t border-outline-variant/20">
          {navItems.slice(0, 5).map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1 rounded-full text-label-sm font-label-sm transition-all ${
                  isActive ? 'bg-white text-surface-container-lowest font-bold' : 'text-on-surface-variant'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full pt-20 max-w-[1440px] mx-auto px-8">
        <div className="flex flex-col w-full pb-8 animate-fadeIn">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-[1440px] mx-auto px-8 mt-8 pb-8">
        <div className="rounded-2xl bg-surface-container-low/60 backdrop-blur-md px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">© 2025 Wavelength AI Inc.</span>
            <span className="text-outline text-label-sm hidden sm:inline">•</span>
            <span className="font-label-sm text-label-sm text-outline">Autonomous CRM Engine</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setActiveTab('settings')} className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">System Status</button>
            <button onClick={() => setActiveTab('recordings')} className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">Intelligence API</button>
            <button onClick={() => setActiveTab('settings')} className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">Security & Trust</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
