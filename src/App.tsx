import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { DashboardLayout, TabType } from './layouts/DashboardLayout'
import { RealtimeSyncProvider } from './contexts/RealtimeSyncContext'
import { DashboardPage } from './pages/DashboardPage'
import { CustomersPage } from './pages/CustomersPage'
import { GlobalTasksPage } from './pages/GlobalTasksPage'
import { RecordingsPage } from './pages/RecordingsPage'
import { TranscriptSearchPage } from './pages/TranscriptSearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { LambdaLogo } from './components/LambdaLogo'

const AppContent: React.FC = () => {
  const { session, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-container-lowest gap-5">
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-[0_0_24px_rgba(208,188,255,0.25)]">
            <LambdaLogo className="w-8 h-8 text-primary" />
          </div>
          <div className="absolute -inset-2 border-2 border-primary/20 border-t-primary rounded-3xl animate-spin" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-white tracking-tight text-lg">Wavelength</span>
        </div>
        <p className="text-[11px] font-semibold tracking-wider text-outline uppercase animate-pulse">
          Initializing telemetry pipeline...
        </p>
      </div>
    )
  }

  if (!session) {
    return <AuthPage />
  }

  // Helper renderer for active page contents
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage 
            onNavigateToCustomers={() => setActiveTab('customers')}
            onNavigateToTasks={() => setActiveTab('tasks')}
          />
        )
      case 'customers':
        return <CustomersPage />
      case 'tasks':
        return <GlobalTasksPage />
      case 'search':
        return <TranscriptSearchPage />
      case 'recordings':
        return <RecordingsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return null
    }
  }

  return (
    <RealtimeSyncProvider>
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="flex-1 min-h-0 h-full animate-fadeIn transition-opacity duration-200">
          {renderContent()}
        </div>
      </DashboardLayout>
    </RealtimeSyncProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
