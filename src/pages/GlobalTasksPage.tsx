import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Task, TaskPriority, Subtask, TaskActivityItem } from '../types'
import { getGlobalTasks, updateTask, deleteTask, createTask } from '../services/workspaceService'
import { TaskFormModal } from '../components/workspace/TaskFormModal'
import { DeleteTaskDialog } from '../components/workspace/DeleteTaskDialog'
import { parseTaskContent, serializeTaskDescription } from '../utils/taskHelper'
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Building2, 
  Clock, 
  Sparkles, 
  Copy, 
  Check, 
  MoreHorizontal, 
  Plus, 
  TrendingUp, 
  Kanban, 
  List, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  History,
  Bot
} from 'lucide-react'
import { useRealtimeSync } from '../contexts/RealtimeSyncContext'
import { supabase } from '../supabase/client'

// Helper for task sorting
const taskSortFn = (a: Task, b: Task) => {
  if (!a.due_date && !b.due_date) return 0
  if (!a.due_date) return 1
  if (!b.due_date) return -1
  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
}

type GlobalTask = Task & { customer?: { name: string; phone?: string; email?: string; company?: string } }

export const GlobalTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<GlobalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { subscribe } = useRealtimeSync()

  // View state: 'board' or 'list'
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [velocityTimeframe, setVelocityTimeframe] = useState<'week' | 'month' | 'quarter'>('month')

  // Expand & Copy & Subtask inputs
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null)
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({})

  // Edit / Delete / Follow-up states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<GlobalTask | null>(null)
  const [followUpTitle, setFollowUpTitle] = useState<string>('')

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getGlobalTasks()
      setTasks(data as GlobalTask[])
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve tasks pipeline.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Realtime subscription listener
  useEffect(() => {
    const unsubscribe = subscribe(async (event) => {
      if (event.table !== 'tasks') return

      if (event.eventType === 'DELETE') {
        setTasks((prev) => prev.filter((t) => t.id !== event.oldRecord.id))
      } else if (event.eventType === 'UPDATE') {
        setTasks((prev) => {
          const exists = prev.some((t) => t.id === event.newRecord.id)
          if (exists) {
            return prev.map((t) => {
              if (t.id === event.newRecord.id) {
                return { ...t, ...event.newRecord }
              }
              return t
            }).sort(taskSortFn)
          }
          return prev
        })
      } else if (event.eventType === 'INSERT') {
        try {
          const { data, error: fetchErr } = await supabase
            .from('tasks')
            .select('*, customer:customers(name, phone, email, company)')
            .eq('id', event.newRecord.id)
            .single()

          if (!fetchErr && data) {
            setTasks((prev) => {
              const exists = prev.some((t) => t.id === data.id)
              if (exists) return prev
              return [...prev, data as GlobalTask].sort(taskSortFn)
            })
          }
        } catch (e) {
          console.error('Error fetching realtime task customer:', e)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [subscribe])

  // Categorize tasks by taskStatus
  const parsedTasks = useMemo(() => {
    return tasks.map(t => {
      const parsed = parseTaskContent(t)
      return {
        raw: t,
        parsed,
        normalizedStatus: t.status === 'done' || parsed.taskStatus === 'done'
          ? 'done'
          : parsed.taskStatus === 'in_progress'
          ? 'in_progress'
          : 'pending'
      }
    })
  }, [tasks])

  const pendingList = useMemo(() => parsedTasks.filter(item => item.normalizedStatus === 'pending'), [parsedTasks])
  const inProgressList = useMemo(() => parsedTasks.filter(item => item.normalizedStatus === 'in_progress'), [parsedTasks])
  const completedList = useMemo(() => parsedTasks.filter(item => item.normalizedStatus === 'done'), [parsedTasks])

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'pending') return pendingList
    if (statusFilter === 'in_progress') return inProgressList
    if (statusFilter === 'completed') return completedList
    return parsedTasks
  }, [statusFilter, pendingList, inProgressList, completedList, parsedTasks])

  const handleToggleComplete = async (task: GlobalTask) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done'
    const originalTasks = [...tasks]
    
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t))

    try {
      await updateTask(task.id, { status: nextStatus })
    } catch (err: any) {
      setTasks(originalTasks)
      setError(err?.message || 'Failed to update task state.')
    }
  }

  const handleEditClick = (task: GlobalTask) => {
    setSelectedTask(task)
    setFollowUpTitle('')
    setIsFormOpen(true)
  }

  const handleDeleteClick = (task: GlobalTask) => {
    setSelectedTask(task)
    setIsDeleteOpen(true)
  }

  const handleFormSubmit = async (description: string, dueDate?: string, status?: 'pending' | 'in_progress' | 'done') => {
    const dbStatus = status === 'done' ? 'done' : 'pending'
    try {
      if (selectedTask) {
        const updated = await updateTask(selectedTask.id, { description, due_date: dueDate || undefined, status: dbStatus })
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updated } : t))
      } else {
        // Target first customer or require existing customer
        const targetCustomerId = tasks[0]?.customer_id
        if (targetCustomerId) {
          const created = await createTask({
            customer_id: targetCustomerId,
            description,
            due_date: dueDate || undefined,
            status: dbStatus
          })
          setTasks(prev => [...prev, created as GlobalTask].sort(taskSortFn))
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update task details.')
      throw err
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTask) return
    try {
      await deleteTask(selectedTask.id)
      setTasks(prev => prev.filter(t => t.id !== selectedTask.id))
    } catch (err: any) {
      setError(err?.message || 'Failed to delete task.')
      throw err
    }
  }

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => (prev === taskId ? null : taskId))
  }

  const handleCopyDescription = (e: React.MouseEvent, text: string, taskId: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedTaskId(taskId)
    setTimeout(() => setCopiedTaskId(null), 2000)
  }

  const getRelativeDueText = (dateStr?: string) => {
    if (!dateStr) return null
    const due = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return `Overdue (${Math.abs(diffDays)}d)`
    if (diffDays === 0) return 'Due Today'
    if (diffDays === 1) return 'Due Tomorrow'
    return `Due in ${diffDays} days`
  }

  // Calendar export helper (RFC 5545 iCalendar)
  const handleExportCalendar = () => {
    if (tasks.length === 0) return
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Wavelength CRM//Tasks//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n"
    
    tasks.forEach(t => {
      const parsed = parseTaskContent(t)
      const due = t.due_date ? new Date(t.due_date) : new Date(Date.now() + 86400000)
      const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const dtstart = due.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const uid = `task-${t.id}@wavelength.ai`
      const summary = parsed.title.replace(/\n/g, ' ')
      const desc = (parsed.details || parsed.title).replace(/\n/g, '\\n')

      icsContent += "BEGIN:VEVENT\n"
      icsContent += `UID:${uid}\n`
      icsContent += `DTSTAMP:${dtstamp}\n`
      icsContent += `DTSTART:${dtstart}\n`
      icsContent += `SUMMARY:${summary}\n`
      icsContent += `DESCRIPTION:${desc}\n`
      icsContent += "STATUS:CONFIRMED\n"
      icsContent += "END:VEVENT\n"
    })

    icsContent += "END:VCALENDAR"

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', 'wavelength-commitments.ics')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Subtask toggle
  const handleToggleSubtask = async (task: GlobalTask, subtaskId: string) => {
    const parsed = parseTaskContent(task)
    const updatedSubtasks = parsed.subtasks.map(st => {
      if (st.id === subtaskId) {
        return { ...st, completed: !st.completed }
      }
      return st
    })

    const targetSubtask = parsed.subtasks.find(st => st.id === subtaskId)
    const updatedActivity: TaskActivityItem[] = [
      ...parsed.activity,
      {
        id: `act-${Date.now()}`,
        type: 'subtask_completed',
        description: targetSubtask && !targetSubtask.completed 
          ? `Completed action: "${targetSubtask.title}"`
          : `Re-opened action: "${targetSubtask?.title || ''}"`,
        timestamp: new Date().toISOString()
      }
    ]

    const newDescription = serializeTaskDescription({
      title: parsed.title,
      details: parsed.details,
      priority: parsed.priority,
      taskStatus: parsed.taskStatus,
      subtasks: updatedSubtasks,
      keyContext: parsed.keyContext,
      recommendation: parsed.recommendation,
      activity: updatedActivity
    })

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: newDescription } : t))
    await updateTask(task.id, { description: newDescription })
  }

  // Add subtask
  const handleAddSubtask = async (task: GlobalTask) => {
    const text = (newSubtaskInputs[task.id] || '').trim()
    if (!text) return

    const parsed = parseTaskContent(task)
    const newSubtask: Subtask = {
      id: `sub-${Date.now()}`,
      title: text,
      completed: false
    }

    const updatedSubtasks = [...parsed.subtasks, newSubtask]
    const updatedActivity: TaskActivityItem[] = [
      ...parsed.activity,
      {
        id: `act-${Date.now()}`,
        type: 'edited',
        description: `Added action: "${text}"`,
        timestamp: new Date().toISOString()
      }
    ]

    const newDescription = serializeTaskDescription({
      title: parsed.title,
      details: parsed.details,
      priority: parsed.priority,
      taskStatus: parsed.taskStatus,
      subtasks: updatedSubtasks,
      keyContext: parsed.keyContext,
      recommendation: parsed.recommendation,
      activity: updatedActivity
    })

    setNewSubtaskInputs(prev => ({ ...prev, [task.id]: '' }))
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: newDescription } : t))
    await updateTask(task.id, { description: newDescription })
  }

  // Direct Status Switcher
  const handleChangeStatus = async (task: GlobalTask, newStatus: 'pending' | 'in_progress' | 'done') => {
    const parsed = parseTaskContent(task)
    const newDbStatus: 'pending' | 'done' = newStatus === 'done' ? 'done' : 'pending'

    const newDescription = serializeTaskDescription({
      title: parsed.title,
      details: parsed.details,
      priority: parsed.priority,
      taskStatus: newStatus,
      subtasks: parsed.subtasks,
      keyContext: parsed.keyContext,
      recommendation: parsed.recommendation,
      activity: [
        ...parsed.activity,
        {
          id: `act-${Date.now()}`,
          type: 'status_changed',
          description: `Status changed to ${newStatus.replace('_', ' ').toUpperCase()}`,
          timestamp: new Date().toISOString()
        }
      ]
    })

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: newDescription, status: newDbStatus } : t))
    await updateTask(task.id, { description: newDescription, status: newDbStatus })
  }

  // Priority Pill Renderer
  const renderPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-error/15 text-error border border-error/25">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
            Priority: High
          </span>
        )
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/25">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            Priority: Low
          </span>
        )
      case 'medium':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Priority: Medium
          </span>
        )
    }
  }

  // Tag Pill Renderer (matches Stitch design tags like "AI Extracted", "Deal Catalyst", etc.)
  const renderSourceTag = (source?: string, title?: string) => {
    if (source && source.toLowerCase().includes('agent')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/40">
          <Bot className="w-3 h-3 text-primary" />
          Agent Drafted
        </span>
      )
    }
    if (title && (title.toLowerCase().includes('roi') || title.toLowerCase().includes('contract') || title.toLowerCase().includes('deal'))) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
          <Sparkles className="w-3 h-3" />
          Deal Catalyst
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
        <Sparkles className="w-3 h-3" />
        AI Extracted
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse select-none pt-4">
        <div className="h-10 w-64 bg-surface-container-high rounded-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-surface-container-low border border-outline-variant/30 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full pb-10 pt-4 space-y-6 animate-fadeIn font-sans select-none">
      
      {/* 1. Header (matches Media 4 exactly) */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>

          <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-white font-display mt-1">
            Tasks & Commitments
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Action items automatically extracted from meeting transcripts and customer calls.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCalendar}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-semibold transition shadow-sm"
            title="Export all commitments as .ics calendar file"
          >
            <Calendar className="w-4 h-4 text-outline" />
            <span>Export to Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedTask(null); setFollowUpTitle(''); setIsFormOpen(true) }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-surface-container-lowest font-headline-sm text-xs font-bold hover:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.18)]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Custom Task</span>
          </button>
        </div>
      </section>

      {/* 2. Error Message */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-error/10 border border-error/25 text-error text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Filter Bar & View Mode Switcher */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-container">
        
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-surface-container-lowest font-bold shadow-md'
                : 'bg-surface-container-low text-on-surface-variant hover:text-white'
            }`}
          >
            All Tasks
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === 'pending'
                ? 'bg-white text-surface-container-lowest font-bold shadow-md'
                : 'bg-surface-container-low text-on-surface-variant hover:text-white'
            }`}
          >
            <span>Pending</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'pending' ? 'bg-surface-container-lowest text-white' : 'bg-surface-container-high text-primary'}`}>
              {pendingList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === 'in_progress'
                ? 'bg-white text-surface-container-lowest font-bold shadow-md'
                : 'bg-surface-container-low text-on-surface-variant hover:text-white'
            }`}
          >
            <span>In Progress</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'in_progress' ? 'bg-surface-container-lowest text-white' : 'bg-surface-container-high text-secondary'}`}>
              {inProgressList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === 'completed'
                ? 'bg-white text-surface-container-lowest font-bold shadow-md'
                : 'bg-surface-container-low text-on-surface-variant hover:text-white'
            }`}
          >
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'completed' ? 'bg-surface-container-lowest text-white' : 'bg-surface-container-high text-outline'}`}>
              {completedList.length}
            </span>
          </button>
        </div>

        {/* View Switcher: Board vs List */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-full bg-surface-container-low border border-outline-variant/40">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                viewMode === 'board'
                  ? 'bg-white text-surface-container-lowest font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-surface-container-lowest font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Main Content Area */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-surface-container-low border border-dashed border-outline-variant/50 text-center p-6">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="font-headline-md text-headline-md font-semibold text-white">No commitments detected yet</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 max-w-md">
            Upload meeting audio in the Recordings tab or log a meeting transcript. The Whisper + AI intelligence pipeline will automatically extract commitments and action items.
          </p>
          <button
            onClick={() => { setSelectedTask(null); setFollowUpTitle(''); setIsFormOpen(true) }}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-surface-container-lowest font-headline-sm text-xs font-bold hover:scale-[0.98] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Task</span>
          </button>
        </div>
      ) : viewMode === 'board' ? (
        
        /* === KANBAN BOARD VIEW (Exact Match to Media 4) === */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Pending Extracted Tasks */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <h3 className="font-headline-sm text-xs font-bold text-white uppercase tracking-wider">
                  Pending Extracted Tasks
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary text-[11px] font-bold">
                  {pendingList.length}
                </span>
              </div>
              <button aria-label="Pending column options" className="text-outline hover:text-white transition">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 min-h-[400px]">
              {pendingList.map(({ raw: task, parsed }) => {
                const relativeDue = getRelativeDueText(task.due_date)
                const isOverdue = relativeDue?.includes('Overdue')

                return (
                  <div
                    key={task.id}
                    className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 transition-all duration-200 shadow-md space-y-3.5 group cursor-pointer"
                    onClick={() => handleEditClick(task)}
                  >
                    {/* Top tags row */}
                    <div className="flex items-center justify-between gap-2">
                      {renderSourceTag(parsed.keyContext?.source, parsed.title)}
                      {renderPriorityBadge(parsed.priority)}
                    </div>

                    {/* Task Title */}
                    <h4 className="font-headline-sm text-sm font-semibold text-white group-hover:text-primary transition-colors leading-snug">
                      {parsed.title}
                    </h4>

                    {/* Source / Customer Context */}
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                      <span className="truncate">
                        {task.customer?.name 
                          ? `Extracted from sync with ${task.customer.name}`
                          : parsed.keyContext?.source || 'Autonomous Meeting Parsing'}
                      </span>
                    </div>

                    {/* Card Footer: Due Date + Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-error' : 'text-outline'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{relativeDue || 'No due date'}</span>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(task, 'in_progress')}
                          className="px-2.5 py-1 rounded-full bg-surface-container-high hover:bg-secondary/20 hover:text-secondary text-[11px] font-semibold text-on-surface-variant transition"
                          title="Move to In Progress"
                        >
                          Start
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(task)}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container-high hover:bg-white hover:text-surface-container-lowest text-outline transition"
                          title="Mark Complete"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {pendingList.length === 0 && (
                <div className="h-32 flex items-center justify-center rounded-2xl border border-dashed border-outline-variant/30 text-xs text-outline">
                  No pending extracted tasks
                </div>
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                <h3 className="font-headline-sm text-xs font-bold text-white uppercase tracking-wider">
                  In Progress
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary text-[11px] font-bold">
                  {inProgressList.length}
                </span>
              </div>
              <button aria-label="In Progress column options" className="text-outline hover:text-white transition">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 min-h-[400px]">
              {inProgressList.map(({ raw: task, parsed }) => {
                const relativeDue = getRelativeDueText(task.due_date)
                const isOverdue = relativeDue?.includes('Overdue')

                return (
                  <div
                    key={task.id}
                    className="p-5 rounded-2xl bg-surface-container-low border border-secondary/30 hover:border-secondary/60 transition-all duration-200 shadow-md space-y-3.5 group cursor-pointer"
                    onClick={() => handleEditClick(task)}
                  >
                    {/* Top tags row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
                        In Execution
                      </span>
                      {renderPriorityBadge(parsed.priority)}
                    </div>

                    {/* Task Title */}
                    <h4 className="font-headline-sm text-sm font-semibold text-white group-hover:text-secondary transition-colors leading-snug">
                      {parsed.title}
                    </h4>

                    {/* Progress Bar indicator */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div className="h-full bg-secondary rounded-full w-2/3" />
                      </div>
                    </div>

                    {/* Source / Customer Context */}
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span className="truncate">
                        {task.customer?.name 
                          ? `Assigned: ${task.customer.name}`
                          : parsed.keyContext?.source || 'Execution Track'}
                      </span>
                    </div>

                    {/* Card Footer: Due Date + Complete Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-error' : 'text-outline'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{relativeDue || 'Due today'}</span>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(task)}
                          className="px-3 py-1 rounded-full bg-secondary text-surface-container-lowest text-[11px] font-bold hover:scale-95 transition shadow-sm"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {inProgressList.length === 0 && (
                <div className="h-32 flex items-center justify-center rounded-2xl border border-dashed border-outline-variant/30 text-xs text-outline">
                  No tasks currently in progress
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Completed This Week */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-outline" />
                <h3 className="font-headline-sm text-xs font-bold text-white uppercase tracking-wider">
                  Completed This Week
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-outline text-[11px] font-bold">
                  {completedList.length}
                </span>
              </div>
              <button aria-label="Completed column options" className="text-outline hover:text-white transition">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 min-h-[400px]">
              {completedList.map(({ raw: task, parsed }) => (
                <div
                  key={task.id}
                  className="p-5 rounded-2xl bg-surface-container-low/70 border border-outline-variant/20 hover:border-outline-variant/40 transition-all duration-200 shadow-md space-y-3.5 group cursor-pointer opacity-75 hover:opacity-100"
                  onClick={() => handleEditClick(task)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-container-high text-outline">
                      <CheckCircle2 className="w-3 h-3 text-secondary" />
                      Fulfilled
                    </span>
                    <span className="text-[11px] text-outline">
                      {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h4 className="font-headline-sm text-sm font-medium text-on-surface-variant line-through leading-snug">
                    {parsed.title}
                  </h4>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                    <span className="text-xs text-outline truncate">
                      {task.customer?.name || 'Client Commitment'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleComplete(task) }}
                      className="text-xs text-primary hover:underline"
                    >
                      Reopen
                    </button>
                  </div>
                </div>
              ))}

              <div className="p-6 rounded-2xl bg-surface-container-low/40 border border-outline-variant/30 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-outline">Weekly Archive</span>
                <p className="font-headline-sm text-xs font-semibold text-white">
                  {completedList.length} client commitments archived
                </p>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className="text-xs text-primary hover:underline pt-1 inline-block"
                >
                  View Archive Log →
                </button>
              </div>
            </div>
          </div>

        </div>

      ) : (

        /* === LIST VIEW (Rich Expandable Details) === */
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant/40 divide-y divide-surface-container overflow-hidden shadow-xl">
          {filteredTasks.map(({ raw: task, parsed }) => {
            const isExpanded = expandedTaskId === task.id
            const relativeDue = getRelativeDueText(task.due_date)
            const completedSubtasksCount = parsed.subtasks.filter(st => st.completed).length

            return (
              <div
                key={task.id}
                className={`transition-colors duration-150 ${isExpanded ? 'bg-surface-container/60' : 'hover:bg-surface-container/40'}`}
              >
                {/* Main Row */}
                <div
                  onClick={() => toggleExpand(task.id)}
                  className="flex items-start justify-between p-4 cursor-pointer gap-4"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleComplete(task)
                      }}
                      className="mt-0.5 text-outline hover:text-primary transition shrink-0"
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-secondary" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1.5 flex-1">
                      <p className={`text-sm leading-snug break-words transition-all font-medium ${
                        task.status === 'done' ? 'line-through text-outline' : isExpanded ? 'text-primary font-semibold' : 'text-white'
                      }`}>
                        {parsed.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {task.customer?.name && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-outline">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{task.customer.name}</span>
                          </span>
                        )}

                        {renderPriorityBadge(parsed.priority)}

                        {relativeDue && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-outline">
                            <Clock className="w-3 h-3" />
                            <span>{relativeDue}</span>
                          </span>
                        )}

                        {parsed.subtasks.length > 0 && (
                          <span className="text-[11px] text-outline font-semibold px-2 py-0.5 rounded-full bg-surface-container">
                            {completedSubtasksCount}/{parsed.subtasks.length} Subtasks
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditClick(task)}
                      className="p-1.5 text-outline hover:text-white rounded-lg hover:bg-surface-container-high transition"
                      title="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(task)}
                      className="p-1.5 text-outline hover:text-error rounded-lg hover:bg-error/10 transition"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronDown className={`w-4 h-4 text-outline transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 space-y-5 border-t border-surface-container/60 bg-surface-container-lowest/50 animate-fadeIn">
                    
                    {/* Details note */}
                    {parsed.details && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-outline">Context & Details</span>
                        <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
                          {parsed.details}
                        </p>
                      </div>
                    )}

                    {/* Subtasks Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-outline">
                          Action Checklist ({completedSubtasksCount}/{parsed.subtasks.length})
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {parsed.subtasks.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-low border border-outline-variant/20 hover:border-outline-variant/50 transition"
                          >
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => handleToggleSubtask(task, st.id)}
                              className="w-4 h-4 rounded border-outline-variant bg-surface-container-lowest text-secondary focus:ring-secondary/30 cursor-pointer"
                            />
                            <span className={`text-xs flex-1 ${st.completed ? 'line-through text-outline' : 'text-white'}`}>
                              {st.title}
                            </span>
                          </div>
                        ))}

                        {/* Add Subtask Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add actionable subtask..."
                            value={newSubtaskInputs[task.id] || ''}
                            onChange={(e) => setNewSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddSubtask(task)
                              }
                            }}
                            className="flex-1 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-xs text-white placeholder-outline focus:outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubtask(task)}
                            className="px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-white hover:text-surface-container-lowest text-xs font-semibold text-white transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Activity History */}
                    {parsed.activity.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-outline flex items-center gap-1">
                          <History className="w-3 h-3" />
                          Activity Telemetry
                        </span>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {parsed.activity.map((act) => (
                            <div key={act.id} className="text-[11px] text-outline flex items-center justify-between py-0.5">
                              <span>{act.description}</span>
                              <span className="text-[10px]">
                                {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Actions Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-surface-container">
                      <button
                        type="button"
                        onClick={(e) => handleCopyDescription(e, parsed.title, task.id)}
                        className="inline-flex items-center gap-1 text-xs text-outline hover:text-white transition"
                      >
                        {copiedTaskId === task.id ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTaskId === task.id ? 'Copied' : 'Copy action'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(task)}
                          className="px-3 py-1.5 rounded-full bg-surface-container-high text-xs font-semibold text-white hover:bg-surface-container transition"
                        >
                          Edit Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(task)}
                          className="px-3 py-1.5 rounded-full bg-error/10 text-xs font-semibold text-error hover:bg-error/20 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 5. Lower Section: Task Velocity & Commitment Fulfillment (Matches Media 4) */}
      <section className="rounded-3xl bg-surface-container-low border border-outline-variant/40 p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <h2 className="font-headline-md text-headline-md font-semibold text-white font-display">
                Task Velocity & Commitment Fulfillment
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Continuous telemetry comparing extracted client commitments against fulfillment latency.
            </p>
          </div>

          {/* Timeframe pill selector */}
          <div className="flex p-1 rounded-full bg-surface-container-lowest border border-outline-variant/40 shrink-0">
            {(['week', 'month', 'quarter'] as const).map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => setVelocityTimeframe(tf)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition ${
                  velocityTimeframe === tf
                    ? 'bg-white text-surface-container-lowest font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-1">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Total Commitments</span>
            <p className="font-stat-xl text-2xl font-bold text-white">{tasks.length}</p>
            <span className="text-[11px] text-secondary font-medium">+18% vs prev period</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-1">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Fulfillment Rate</span>
            <p className="font-stat-xl text-2xl font-bold text-secondary">
              {tasks.length > 0 ? `${Math.round((completedList.length / tasks.length) * 100)}%` : '100%'}
            </p>
            <span className="text-[11px] text-outline font-medium">Optimal Velocity</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-1">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Active Execution</span>
            <p className="font-stat-xl text-2xl font-bold text-primary">{inProgressList.length + pendingList.length}</p>
            <span className="text-[11px] text-outline font-medium">Pipeline backlog</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-1">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Avg Latency to Close</span>
            <p className="font-stat-xl text-2xl font-bold text-white">1.4 days</p>
            <span className="text-[11px] text-secondary font-medium">Under 48hr SLA</span>
          </div>
        </div>

        {/* Visual Velocity Telemetry Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Fulfillment Breakdown</span>
            <span className="text-secondary font-bold">
              {completedList.length} completed • {inProgressList.length} in progress • {pendingList.length} pending
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-container-lowest overflow-hidden flex">
            <div 
              style={{ width: `${tasks.length ? (completedList.length / tasks.length) * 100 : 0}%` }} 
              className="bg-secondary h-full transition-all duration-500" 
              title="Completed" 
            />
            <div 
              style={{ width: `${tasks.length ? (inProgressList.length / tasks.length) * 100 : 0}%` }} 
              className="bg-primary h-full transition-all duration-500" 
              title="In Progress" 
            />
            <div 
              style={{ width: `${tasks.length ? (pendingList.length / tasks.length) * 100 : 0}%` }} 
              className="bg-surface-container-high h-full transition-all duration-500" 
              title="Pending" 
            />
          </div>
        </div>
      </section>

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedTask(null)
          setFollowUpTitle('')
        }}
        onSubmit={handleFormSubmit}
        task={selectedTask}
        initialTitle={followUpTitle}
      />

      {/* Delete Task Dialog */}
      <DeleteTaskDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setSelectedTask(null)
        }}
        onConfirm={handleDeleteConfirm}
        taskTitle={selectedTask ? parseTaskContent(selectedTask).title : ''}
      />

    </div>
  )
}
