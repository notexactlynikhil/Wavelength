import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRealtimeSync } from '../contexts/RealtimeSyncContext'
import { useTaskNotifications } from '../hooks/useTaskNotifications'
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Settings as SettingsIcon, 
  LogOut, 
  Mic, 
  Search,
  Sparkles
} from 'lucide-react'
import { LambdaLogo } from '../components/LambdaLogo'

export type TabType = 'dashboard' | 'customers' | 'tasks' | 'search' | 'recordings' | 'settings';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab 
}) => {
  const { user, signOut } = useAuth()
  const { status: syncStatus } = useRealtimeSync()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  useTaskNotifications()

  // Global keyboard shortcut: Cmd+K / Ctrl+K opens transcript search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setActiveTab('search')
      }
      if (e.key === 'Escape' && profileMenuOpen) {
        setProfileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveTab, profileMenuOpen])

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'recordings', label: 'Recordings', icon: Mic },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];

  // Extract first letter of name or email for profile fallback avatar
  const displayName = user?.user_metadata?.name || 'User';
  const displayEmail = user?.email || '';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      alert('Failed to log out: ' + error.message)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1C1917] text-[#F5F5F4] overflow-hidden font-sans relative">
      
      {/* Top Header */}
      <header className="h-14 shrink-0 bg-[#292522] border-b border-[#44403C] px-4 md:px-8 flex items-center justify-between z-10 shadow-[0_1px_2px_rgba(41,37,34,0.02)]">
        {/* Left: Logo & Breadcrumbs */}
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#432C24] text-[#E88C64] flex items-center justify-center font-bold text-base shadow-sm">
              <LambdaLogo className="w-5 h-5 text-[#E88C64]" />
            </div>
            <span className="text-base font-bold text-[#F5F5F4] tracking-tight font-display hidden sm:block">Wavelength</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium ml-2 border-l border-[#44403C] pl-4">
            <span className="text-[#A8A29E]">{activeItem.label}</span>
          </div>
        </div>

        {/* Right: Quick Actions & Profile */}
        <div className="flex items-center gap-3">
          {activeTab !== 'search' && (
            <button
              onClick={() => setActiveTab('search')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1C1917] hover:bg-[#332F2C] text-[#A8A29E] hover:text-[#F5F5F4] text-xs font-medium border border-[#44403C] transition shadow-xs"
              title="Search call transcripts (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search transcripts</span>
              <kbd className="text-[10px] bg-[#292522] px-1.5 py-0.5 rounded border border-[#44403C] text-[#A8A29E]">Ctrl+K</kbd>
            </button>
          )}

          <div className="w-px h-5 bg-[#E8E1D8]" />

          {/* User Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-7 h-7 rounded-full bg-[#E88C64]/30 text-[#F5F5F5] flex items-center justify-center font-bold text-xs select-none shadow-xs hover:ring-2 ring-[#E88C64]/30 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#E88C64]"
              title={`${displayName} (${displayEmail})`}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
            >
              {avatarLetter}
            </button>
            
            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 mt-2 w-56 bg-[#292522] border border-[#44403C] rounded-2xl shadow-lg z-50 overflow-hidden animate-fadeIn" role="menu">
                  <div className="p-3 border-b border-[#44403C]">
                    <div className="text-sm font-semibold text-[#F5F5F4] truncate">{displayName}</div>
                    <div className="text-xs text-[#A8A29E] truncate">{displayEmail}</div>
                  </div>
                  
                  <div className="p-2 border-b border-[#44403C] flex items-center justify-between text-xs" role="none">
                    <span className="text-[#A8A29E] font-medium px-1">Sync State</span>
                    <div className="flex items-center gap-1.5 px-1">
                      <span className={`w-2 h-2 rounded-full ${
                        syncStatus === 'connected' ? 'bg-[#64866A]' : syncStatus === 'connecting' ? 'bg-[#C28A3D] animate-pulse' : 'bg-[#EF4444]'
                      }`} />
                      <span className={`font-medium ${syncStatus === 'connected' ? 'text-[#64866A]' : 'text-[#A8A29E]'}`}>
                        {syncStatus === 'connected' ? 'Active' : syncStatus === 'connecting' ? 'Connecting' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-1" role="none">
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A8A29E] hover:text-[#EF4444] hover:bg-[#3F2222] transition-all outline-none focus-visible:bg-[#1C1917]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative min-w-0 bg-[#1C1917]">
        {/* pb-24 adds safe spacing for the floating pill navigation at the bottom */}
        <div className="max-w-7xl mx-auto h-full flex flex-col pb-24">
          {children}
        </div>
      </main>

      {/* Floating Pill Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div 
          className="flex items-center gap-1.5 p-2 bg-[#292522] rounded-full shadow-xl shadow-black/20 border border-[#403B36]"
          role="tablist"
          aria-label="Main Navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center rounded-full transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[#E88C64] ${
                  isActive 
                    ? 'bg-[#432C24] text-[#E88C64] px-4 py-2.5 shadow-sm' 
                    : 'text-[#C5BEB6] hover:text-white hover:bg-[#403B36] p-2.5'
                }`}
                title={item.label}
              >
                <Icon className={`shrink-0 transition-transform duration-300 ${isActive ? 'w-4.5 h-4.5 scale-105' : 'w-5 h-5'}`} />
                <span 
                  className={`overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 ease-out ${
                    isActive ? 'ml-2.5 max-w-[150px] opacity-100' : 'max-w-0 opacity-0 ml-0'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
