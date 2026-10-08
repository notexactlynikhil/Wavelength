import React, { useState } from 'react'
import { Customer, Task, AIPipelineResponse } from '../types'
import { useWorkspace } from '../hooks/useWorkspace'
import { OverviewTab } from '../components/workspace/OverviewTab'
import { CallsTab } from '../components/workspace/CallsTab'
import { TasksTab } from '../components/workspace/TasksTab'
import { TranscriptTab } from '../components/workspace/TranscriptTab'
import { TaskFormModal } from '../components/workspace/TaskFormModal'
import { DeleteTaskDialog } from '../components/workspace/DeleteTaskDialog'
import { exportCustomerCsv, exportCustomerPdf } from '../services/exportService'
import { ArrowLeft, User, PhoneCall, CheckSquare, AlertCircle, Download, FileText, Loader2, Mic, Building2 } from 'lucide-react'

interface CustomerWorkspacePageProps {
  customer: Customer;
  onBack: () => void;
}

export const CustomerWorkspacePage: React.FC<CustomerWorkspacePageProps> = ({
  customer,
  onBack
}) => {
  const {
    activeTab,
    setActiveTab,
    calls,
    recordings,
    tasks,
    summaries,
    loading,
    error,
    addTask,
    editTask,
    toggleTaskComplete,
    removeTask,
    editSummary
  } = useWorkspace(customer.id)

  // Modals Open & Selection States
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [lastTranscriptResult, setLastTranscriptResult] = useState<AIPipelineResponse | null>(null)

  const [followUpTitle, setFollowUpTitle] = useState<string>('')

  const exportPayload = { customer, calls, summaries, tasks }

  const handleExportCsv = () => {
    setExportError(null)
    try {
      exportCustomerCsv(exportPayload)
    } catch (err: any) {
      setExportError(err?.message || 'CSV export failed.')
    }
  }

  const handleExportPdf = async () => {
    setExportError(null)
    setExportingPdf(true)
    try {
      await exportCustomerPdf(exportPayload)
    } catch (err: any) {
      setExportError(err?.message || 'PDF export failed.')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleAddTaskClick = () => {
    setSelectedTask(null)
    setFollowUpTitle('')
    setIsTaskFormOpen(true)
  }

  const handleCreateFollowUpClick = (suggestedTitle: string) => {
    setSelectedTask(null)
    setFollowUpTitle(suggestedTitle)
    setIsTaskFormOpen(true)
  }

  const handleEditTaskClick = (task: Task) => {
    setSelectedTask(task)
    setFollowUpTitle('')
    setIsTaskFormOpen(true)
  }

  const handleDeleteTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsDeleteTaskOpen(true)
  }

  const handleTaskFormSubmit = async (description: string, dueDate?: string, status?: 'pending' | 'in_progress' | 'done') => {
    const dbStatus = status === 'done' ? 'done' : 'pending'
    if (selectedTask) {
      await editTask(selectedTask.id, description, dueDate, dbStatus)
    } else {
      await addTask(description, dueDate, dbStatus)
    }
  }

  const handleUpdateTaskDirect = async (taskId: string, description: string, dueDate?: string, status?: 'pending' | 'done') => {
    await editTask(taskId, description, dueDate, status)
  }

  const handleDeleteTaskConfirm = async () => {
    if (selectedTask) {
      await removeTask(selectedTask.id)
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Render tab contents based on active selection
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            customer={customer}
            summaries={summaries}
            summariesLoading={loading}
            onUpdateSummary={editSummary}
          />
        )
      case 'calls':
        return <CallsTab calls={calls} recordings={recordings} loading={loading} customerId={customer.id} onTranscriptResult={setLastTranscriptResult} />
      case 'transcript':
        return <TranscriptTab calls={calls} lastResult={lastTranscriptResult} />
      case 'tasks':
        return (
          <TasksTab
            tasks={tasks}
            loading={loading}
            customer={customer}
            onAddTask={handleAddTaskClick}
            onEditTask={handleEditTaskClick}
            onDeleteTask={handleDeleteTaskClick}
            onToggleComplete={toggleTaskComplete}
            onUpdateTaskDirect={handleUpdateTaskDirect}
            onCreateFollowUp={handleCreateFollowUpClick}
            onViewCall={() => setActiveTab('calls')}
            onViewTranscript={() => setActiveTab('transcript')}
          />
        )
      default:
        return null
    }
  }

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'calls', label: 'Calls', icon: PhoneCall, count: calls.length },
    { id: 'transcript', label: 'Transcript & AI', icon: Mic },
    { id: 'tasks', label: 'Commitments', icon: CheckSquare, count: tasks.filter(t => t.status === 'pending').length },
  ] as const

  return (
    <div className="flex flex-col w-full pb-10 pt-4 space-y-6 animate-fadeIn font-sans select-none">
      
      {/* 1. Top Header: Back button + Customer Identity + Export Actions */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Customers Directory"
            className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 flex items-center justify-center text-on-surface hover:text-white transition shadow-sm"
            title="Back to Customers Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/20 text-primary font-headline-sm text-sm font-bold flex items-center justify-center shrink-0 border border-primary/30">
              {getInitials(customer.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-lg text-xl md:text-2xl font-bold tracking-tight text-white font-display">
                  {customer.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary text-[11px] font-semibold border border-secondary/30">
                  Active Account
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-0.5">
                {customer.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-outline" />
                    <span>{customer.company}</span>
                  </span>
                )}
                {customer.email && (
                  <span>• {customer.email}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2.5 shrink-0 pl-12 md:pl-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-semibold transition shadow-xs"
            title="Export customer history as CSV"
          >
            <Download className="w-3.5 h-3.5 text-outline" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-semibold transition disabled:opacity-50 shadow-xs"
            title="Export customer dossier as PDF"
          >
            {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <FileText className="w-3.5 h-3.5 text-outline" />}
            <span>Export PDF</span>
          </button>
        </div>
      </section>

      {/* 2. Error Alerts */}
      {exportError && (
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-error/10 border border-error/25 text-error text-xs shrink-0 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <span>{exportError}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-error/10 border border-error/25 text-error text-xs shrink-0 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Workspace Tab Navigation (Stitch Pill Style) */}
      <section className="flex p-1 rounded-full bg-surface-container-low border border-outline-variant/40 w-fit">
        {tabItems.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-surface-container-lowest font-bold shadow-md'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-surface-container-lowest text-white' : 'bg-surface-container-high text-primary'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </section>

      {/* 4. Tab Layout Container */}
      <div className="flex-1 min-h-0 pt-1">
        {renderTabContent()}
      </div>

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false)
          setFollowUpTitle('')
        }}
        onSubmit={handleTaskFormSubmit}
        task={selectedTask}
        initialTitle={followUpTitle}
      />

      {/* Delete Task Dialog */}
      <DeleteTaskDialog
        isOpen={isDeleteTaskOpen}
        onClose={() => setIsDeleteTaskOpen(false)}
        onConfirm={handleDeleteTaskConfirm}
      />

    </div>
  )
}
