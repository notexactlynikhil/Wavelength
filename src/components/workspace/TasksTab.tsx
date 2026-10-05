import React, { useState } from 'react'
import { Task, TaskPriority, Customer, Subtask, TaskActivityItem } from '../../types'
import { parseTaskContent, serializeTaskDescription } from '../../utils/taskHelper'
import { 
  Plus, 
  Calendar, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  Clock, 
  Sparkles, 
  Copy, 
  Check,
  Flag,
  ListTodo,
  FileText,
  Phone,
  Mail,
  MessageSquare,
  ArrowRightCircle,
  ExternalLink,
  History,
  Info
} from 'lucide-react'

interface TasksTabProps {
  tasks: Task[];
  loading: boolean;
  customer?: Customer;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onToggleComplete: (taskId: string, currentStatus: 'pending' | 'done') => void;
  onUpdateTaskDirect?: (taskId: string, description: string, dueDate?: string, status?: 'pending' | 'done') => Promise<void>;
  onCreateFollowUp?: (suggestedTitle: string) => void;
  onViewCall?: (callId?: string) => void;
  onViewTranscript?: (callId?: string) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  tasks,
  loading,
  customer,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onUpdateTaskDirect,
  onCreateFollowUp,
  onViewCall,
  onViewTranscript
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null)
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({})

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => (prev === taskId ? null : taskId))
  }

  const handleCopyDescription = (e: React.MouseEvent, text: string, taskId: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedTaskId(taskId)
    setTimeout(() => setCopiedTaskId(null), 2000)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDetailedDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date scheduled'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getRelativeDueText = (dateStr?: string) => {
    if (!dateStr) return null
    const due = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    return `Due in ${diffDays} days`
  }

  // Check if a task is overdue
  const isOverdue = (task: Task) => {
    if (task.status === 'done' || !task.due_date) return false
    const due = new Date(task.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return due < today
  }

  // Subtask Toggle Handler
  const handleToggleSubtask = async (task: Task, subtaskId: string) => {
    if (!onUpdateTaskDirect) return
    const parsed = parseTaskContent(task)
    const updatedSubtasks = parsed.subtasks.map(st => {
      if (st.id === subtaskId) {
        return { ...st, completed: !st.completed }
      }
      return st
    })

    const targetSubtask = parsed.subtasks.find(st => st.id === subtaskId)
    const nowIso = new Date().toISOString()
    const updatedActivity: TaskActivityItem[] = [
      ...parsed.activity,
      {
        id: `act-${Date.now()}`,
        type: 'subtask_completed',
        description: targetSubtask && !targetSubtask.completed 
          ? `Completed action: "${targetSubtask.title}"`
          : `Re-opened action: "${targetSubtask?.title || ''}"`,
        timestamp: nowIso
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

    await onUpdateTaskDirect(task.id, newDescription, task.due_date, task.status)
  }

  // Add Custom Subtask
  const handleAddSubtask = async (task: Task) => {
    const text = (newSubtaskInputs[task.id] || '').trim()
    if (!text || !onUpdateTaskDirect) return

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
    await onUpdateTaskDirect(task.id, newDescription, task.due_date, task.status)
  }

  // Delete Subtask
  const handleDeleteSubtask = async (task: Task, subtaskId: string) => {
    if (!onUpdateTaskDirect) return
    const parsed = parseTaskContent(task)
    const targetSubtask = parsed.subtasks.find(st => st.id === subtaskId)
    const updatedSubtasks = parsed.subtasks.filter(st => st.id !== subtaskId)

    const updatedActivity: TaskActivityItem[] = [
      ...parsed.activity,
      {
        id: `act-${Date.now()}`,
        type: 'edited',
        description: `Removed action: "${targetSubtask?.title || ''}"`,
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

    await onUpdateTaskDirect(task.id, newDescription, task.due_date, task.status)
  }

  // Change Task Priority (Low / Medium / High)
  const handleChangePriority = async (task: Task, newPriority: TaskPriority) => {
    if (!onUpdateTaskDirect) return
    const parsed = parseTaskContent(task)
    const updatedActivity: TaskActivityItem[] = [
      ...parsed.activity,
      {
        id: `act-${Date.now()}`,
        type: 'edited',
        description: `Priority changed from ${parsed.priority.toUpperCase()} to ${newPriority.toUpperCase()}`,
        timestamp: new Date().toISOString()
      }
    ]

    const newDescription = serializeTaskDescription({
      title: parsed.title,
      details: parsed.details,
      priority: newPriority,
      taskStatus: parsed.taskStatus,
      subtasks: parsed.subtasks,
      keyContext: parsed.keyContext,
      recommendation: parsed.recommendation,
      activity: updatedActivity
    })

    await onUpdateTaskDirect(task.id, newDescription, task.due_date, task.status)
  }

  // Change Task Status (Pending / In Progress / Done)
  const handleChangeStatus = async (task: Task, newStatus: 'pending' | 'in_progress' | 'done') => {
    if (!onUpdateTaskDirect) return
    const parsed = parseTaskContent(task)
    const updatedActivity: TaskActivityItem[] = [
      ...parsed.activity,
      {
        id: `act-${Date.now()}`,
        type: 'status_changed',
        description: `Status changed to ${newStatus.replace('_', ' ').toUpperCase()}`,
        timestamp: new Date().toISOString()
      }
    ]

    const newDbStatus: 'pending' | 'done' = newStatus === 'done' ? 'done' : 'pending'

    const newDescription = serializeTaskDescription({
      title: parsed.title,
      details: parsed.details,
      priority: parsed.priority,
      taskStatus: newStatus,
      subtasks: parsed.subtasks,
      keyContext: parsed.keyContext,
      recommendation: parsed.recommendation,
      activity: updatedActivity
    })

    await onUpdateTaskDirect(task.id, newDescription, task.due_date, newDbStatus)
  }

  const renderPriorityPill = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-theme-danger bg-theme-dangerMuted border border-theme-dangerMuted px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-theme-danger animate-pulse" />
            <span>High</span>
          </span>
        )
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-theme-success bg-theme-successMuted border border-theme-successMuted px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-theme-success" />
            <span>Low</span>
          </span>
        )
      case 'medium':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-theme-accentLime bg-theme-accentLime/10 border border-theme-accentLime/20 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-theme-accentLime" />
            <span>Medium</span>
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex justify-between items-center py-2">
          <div className="h-4 w-28 bg-theme-border rounded"></div>
          <div className="h-8 w-20 bg-theme-border rounded-xl"></div>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-theme-surface border border-theme-border rounded-2xl"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 select-none animate-fadeIn">
      {/* Tab Sub-Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-theme-textMuted uppercase tracking-wider">
          Tasks Pipeline ({tasks.filter(t => t.status === 'done').length} / {tasks.length})
        </span>
        <button
          onClick={onAddTask}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accent hover:bg-theme-accentHover text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Checklist grid */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-theme-border rounded-2xl bg-theme-surface">
          <div className="p-3.5 bg-theme-accentMuted text-theme-accent border border-theme-accent/20 rounded-2xl mb-3 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-theme-text font-display">No tasks defined</h4>
          <p className="text-xs text-theme-textMuted mt-1 max-w-xs text-center leading-relaxed">
            All caught up! Create actionable items to follow up on this customer account.
          </p>
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme-border rounded-2xl divide-y divide-theme-border overflow-hidden shadow-xs">
          {tasks.map((task) => {
            const isCompleted = task.status === 'done'
            const overdue = isOverdue(task)
            const isExpanded = expandedTaskId === task.id
            const relativeDue = getRelativeDueText(task.due_date)
            const content = parseTaskContent(task)
            const completedSubtasksCount = content.subtasks.filter(st => st.completed).length

            return (
              <div 
                key={task.id} 
                className={`transition-colors duration-150 ${
                  isExpanded ? 'bg-theme-base/40' : isCompleted ? 'bg-theme-base/20' : 'hover:bg-theme-base/60'
                }`}
              >
                {/* Main Row - Collapsed View */}
                <div
                  onClick={() => toggleExpand(task.id)}
                  className="flex items-start justify-between p-3.5 cursor-pointer group gap-3.5"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpand(task.id)
                    }
                  }}
                  title="Click to view full task details"
                >
                  {/* Left: Checkbox + Title + Badges */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Primary Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleComplete(task.id, task.status)
                      }}
                      className="mt-0.5 text-theme-textMuted hover:text-theme-accent focus:outline-none transition shrink-0"
                      title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-theme-success fill-[#64866A]/10" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 hover:scale-105 transition-transform" />
                      )}
                    </button>

                    {/* Task Title summary */}
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <p className={`text-sm leading-snug break-words transition-all font-medium ${
                        isCompleted 
                          ? 'line-through text-theme-textMuted font-normal' 
                          : isExpanded
                            ? 'text-theme-accent font-semibold'
                            : 'text-theme-text group-hover:text-theme-accent'
                      }`}>
                        {content.title}
                      </p>
                      
                      {/* Meta pills preview */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Badge */}
                        {renderPriorityPill(content.priority)}

                        {/* Status badge if In Progress */}
                        {content.taskStatus === 'in_progress' && !isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-theme-accentLime bg-theme-accentLime/10 border border-theme-accentLime/20 px-2 py-0.5 rounded-md">
                            <span>In Progress</span>
                          </span>
                        )}

                        {/* Due Date */}
                        {task.due_date && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide ${
                            isCompleted 
                              ? 'text-theme-textMuted/60' 
                              : overdue 
                                ? 'text-theme-danger font-bold' 
                                : 'text-theme-textMuted'
                          }`}>
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>Due: {formatDate(task.due_date)}</span>
                            {overdue && (
                              <span className="bg-theme-dangerMuted border border-theme-dangerMuted text-theme-danger text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ml-0.5">
                                Overdue
                              </span>
                            )}
                          </span>
                        )}

                        {/* Subtasks summary pill */}
                        {content.subtasks.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-theme-textMuted bg-theme-base border border-theme-border px-2 py-0.5 rounded-md">
                            <ListTodo className="w-2.5 h-2.5 shrink-0 text-theme-textMuted" />
                            <span>{completedSubtasksCount}/{content.subtasks.length} actions</span>
                          </span>
                        )}

                        {/* AI Call Task Pill */}
                        {task.call_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-theme-accent bg-theme-accentMuted border border-theme-accent/20 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-2.5 h-2.5 shrink-0" />
                            <span>AI Call Task</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Expand toggle + Actions */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {/* Edit */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditTask(task)
                      }}
                      className="p-1.5 text-theme-textMuted hover:text-theme-text hover:bg-theme-accent/10 rounded-lg transition"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteTask(task)
                      }}
                      className="p-1.5 text-theme-textMuted hover:text-theme-danger hover:bg-theme-dangerMuted rounded-lg transition"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Chevron indicator */}
                    <div 
                      className={`p-1.5 text-theme-textMuted group-hover:text-theme-text rounded transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-theme-accent' : ''
                      }`}
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Layout */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-theme-border bg-theme-base/40 space-y-4 animate-fadeIn">
                    
                    {/* Top Controls Bar inside Expanded View */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-theme-surface border border-theme-border rounded-xl shadow-xs">
                      {/* Priority Switcher */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <Flag className="w-3.5 h-3.5 text-theme-textMuted shrink-0" />
                        <span className="text-[11px] text-theme-textMuted font-bold uppercase tracking-wider mr-1">Priority:</span>
                        <div className="flex items-center gap-1">
                          {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                            <button
                              key={p}
                              onClick={() => handleChangePriority(task, p)}
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition border ${
                                content.priority === p
                                  ? p === 'high' 
                                    ? 'bg-theme-dangerMuted text-theme-danger border-theme-danger shadow-xs'
                                    : p === 'medium'
                                      ? 'bg-theme-accentLime/15 text-theme-accentLime border-theme-accentLime shadow-xs'
                                      : 'bg-theme-successMuted text-theme-success border-theme-success shadow-xs'
                                  : 'bg-theme-surface text-theme-textMuted border-theme-border hover:text-theme-text hover:bg-theme-base'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Status Switcher */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[11px] text-theme-textMuted font-bold uppercase tracking-wider mr-1">Status:</span>
                        <div className="flex items-center gap-1">
                          {(['pending', 'in_progress', 'done'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleChangeStatus(task, st)}
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition border ${
                                (isCompleted && st === 'done') || (!isCompleted && content.taskStatus === st)
                                  ? st === 'done'
                                    ? 'bg-theme-successMuted text-theme-success border-theme-success'
                                    : st === 'in_progress'
                                      ? 'bg-theme-accentLime/15 text-theme-accentLime border-theme-accentLime'
                                      : 'bg-theme-accent/10 text-theme-accent border-theme-accent/20'
                                  : 'bg-theme-surface text-theme-textMuted border-theme-border hover:text-theme-text hover:bg-theme-base'
                              }`}
                            >
                              {st === 'in_progress' ? 'In Progress' : st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 1. Detailed Description Card */}
                    <div className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-theme-textMuted uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-theme-accent" />
                          <span>Detailed Description</span>
                        </span>

                        <button
                          onClick={(e) => handleCopyDescription(e, content.details, task.id)}
                          className="flex items-center gap-1 text-[10px] text-theme-textMuted hover:text-theme-text bg-theme-base hover:bg-theme-accent/10 px-2.5 py-1 rounded-md transition border border-theme-border"
                          title="Copy detailed task description"
                        >
                          {copiedTaskId === task.id ? (
                            <>
                              <Check className="w-3 h-3 text-theme-success" />
                              <span className="text-theme-success font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Details</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-sm text-theme-text font-normal leading-relaxed whitespace-pre-wrap select-text">
                        {content.details}
                      </p>
                    </div>

                    {/* 2. Key Context (Dynamic Extracted Information) */}
                    {Object.keys(content.keyContext).length > 0 && (
                      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-2.5 shadow-xs">
                        <div className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-theme-accent" />
                          <span className="text-[10px] font-bold text-theme-textMuted uppercase tracking-wider">
                            Key Context & Specifications
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {Object.entries(content.keyContext).map(([key, val]) => (
                            <div 
                              key={key} 
                              className="p-2.5 bg-theme-base border border-theme-border rounded-lg space-y-1"
                            >
                              <p className="text-[10px] font-bold text-theme-textMuted uppercase tracking-wider truncate">
                                {key}
                              </p>
                              <p className="text-xs font-medium text-theme-text break-words">
                                {val}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Next Actions / Dynamic Subtasks Checklist */}
                    <div className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ListTodo className="w-3.5 h-3.5 text-theme-accent" />
                          <span className="text-[10px] font-bold text-theme-textMuted uppercase tracking-wider">
                            Next Actions & Checklist
                          </span>
                          {content.subtasks.length > 0 && (
                            <span className="text-[10px] font-semibold text-theme-textMuted ml-1">
                              ({completedSubtasksCount} of {content.subtasks.length} done)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Subtasks List */}
                      {content.subtasks.length > 0 ? (
                        <div className="space-y-1.5">
                          {content.subtasks.map((st) => (
                            <div 
                              key={st.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition group/st ${
                                st.completed 
                                  ? 'bg-theme-base border-theme-border text-theme-textMuted' 
                                  : 'bg-theme-surface border-theme-border text-theme-text hover:border-theme-accent/30'
                              }`}
                            >
                              <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={st.completed}
                                  onChange={() => handleToggleSubtask(task, st.id)}
                                  className="rounded border-theme-border text-theme-accent focus:ring-0 focus:ring-offset-0 bg-theme-surface cursor-pointer"
                                />
                                <span className={`text-xs ${st.completed ? 'line-through text-theme-textMuted' : 'text-theme-text'}`}>
                                  {st.title}
                                </span>
                              </label>

                              <button
                                onClick={() => handleDeleteSubtask(task, st.id)}
                                className="p-1 text-theme-textMuted hover:text-theme-danger rounded transition opacity-0 group-hover/st:opacity-100"
                                title="Remove subtask"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-theme-textMuted italic">No specific subtasks defined.</p>
                      )}

                      {/* Add Subtask Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Add an actionable next step..."
                          value={newSubtaskInputs[task.id] || ''}
                          onChange={(e) => setNewSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddSubtask(task)
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-theme-surface border border-theme-border focus:border-theme-accent focus:ring-1 focus:ring-theme-accent/15 focus:outline-none rounded-xl text-theme-text text-xs transition placeholder:text-theme-textMuted"
                        />
                        <button
                          onClick={() => handleAddSubtask(task)}
                          disabled={!(newSubtaskInputs[task.id] || '').trim()}
                          className="px-3.5 py-2 bg-theme-accent hover:bg-theme-accentHover text-white rounded-xl text-xs font-semibold transition disabled:opacity-40 shadow-xs"
                        >
                          Add Action
                        </button>
                      </div>
                    </div>

                    {/* 4. AI Recommendation (Optional) */}
                    {content.recommendation && (
                      <div className="p-3.5 bg-theme-accent/10/30 border border-theme-accent/20 rounded-xl flex items-start gap-2.5 text-xs">
                        <Sparkles className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[10px] font-bold text-theme-accent uppercase tracking-wider">
                            AI Recommendation
                          </p>
                          <p className="text-xs text-theme-text leading-relaxed">
                            {content.recommendation}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 5. Metadata Badges & Deadline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Due Date Details */}
                      <div className="flex items-center gap-2.5 p-3 bg-theme-surface border border-theme-border rounded-xl shadow-xs">
                        <Calendar className={`w-4 h-4 shrink-0 ${overdue ? 'text-theme-danger' : 'text-theme-accent'}`} />
                        <div className="min-w-0">
                          <p className="text-[10px] text-theme-textMuted font-bold uppercase tracking-wider">Scheduled Deadline</p>
                          <p className={`text-xs font-semibold ${overdue ? 'text-theme-danger font-bold' : 'text-theme-text'}`}>
                            {formatDetailedDate(task.due_date)}
                            {relativeDue && !isCompleted && (
                              <span className="ml-1.5 text-[10px] text-theme-textMuted font-normal">({relativeDue})</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center gap-2.5 p-3 bg-theme-surface border border-theme-border rounded-xl shadow-xs">
                        <Clock className="w-4 h-4 text-theme-textMuted shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-theme-textMuted font-bold uppercase tracking-wider">Created</p>
                          <p className="text-xs text-theme-text">
                            {formatDateTime(task.created_at) || 'Recently'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 6. Source Call Link & Quick Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-theme-surface border border-theme-border rounded-xl text-xs shadow-xs">
                      {/* Source Call */}
                      {task.call_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-theme-textMuted flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-theme-accent" />
                            <span>Generated from Call</span>
                          </span>
                          {(onViewTranscript || onViewCall) && (
                            <button
                              onClick={() => onViewTranscript ? onViewTranscript(task.call_id) : onViewCall?.(task.call_id)}
                              className="flex items-center gap-1 text-[10px] font-bold text-theme-accent hover:text-theme-accentHover bg-theme-accentMuted hover:bg-theme-accent/10 px-2 py-0.5 rounded-md border border-theme-accent/20 transition"
                            >
                              <span>View Transcript</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-theme-textMuted">Manually created task</span>
                      )}

                      {/* Quick Contact Actions */}
                      {customer && (customer.phone || customer.email) && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          {customer.phone && (
                            <>
                              <a
                                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] font-semibold text-theme-success bg-theme-successMuted hover:bg-theme-successMuted px-2.5 py-1 rounded-md border border-theme-successMuted transition"
                                title="Open WhatsApp Chat"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>

                              <a
                                href={`tel:${customer.phone}`}
                                className="flex items-center gap-1 text-[10px] font-semibold text-theme-accent bg-theme-accentMuted hover:bg-theme-accent/10 px-2.5 py-1 rounded-md border border-theme-accent/20 transition"
                                title="Call Customer"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call</span>
                              </a>
                            </>
                          )}

                          {customer.email && (
                            <a
                              href={`mailto:${customer.email}`}
                              className="flex items-center gap-1 text-[10px] font-semibold text-theme-text bg-theme-base hover:bg-theme-accent/10 px-2.5 py-1 rounded-md border border-theme-border transition"
                              title="Send Email"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Email</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 7. Activity History */}
                    {content.activity.length > 0 && (
                      <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5 space-y-2 shadow-xs">
                        <div className="flex items-center gap-1.5 text-theme-textMuted">
                          <History className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Activity History</span>
                        </div>
                        <div className="space-y-1.5 pl-2.5 border-l border-theme-border">
                          {content.activity.slice(-4).map((act) => (
                            <div key={act.id} className="text-[11px] text-theme-textMuted flex items-baseline justify-between gap-2">
                              <span>{act.description}</span>
                              <span className="text-[10px] text-theme-textMuted/70 shrink-0">
                                {formatDateTime(act.timestamp)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 8. Action Bar inside Expanded View */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-theme-border">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleComplete(task.id, task.status)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                            isCompleted
                              ? 'bg-theme-surface border-theme-border text-theme-textMuted hover:bg-theme-base'
                              : 'bg-theme-successMuted border-theme-successMuted text-theme-success hover:bg-theme-successMuted'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <Circle className="w-3.5 h-3.5" />
                              <span>Re-open Task</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Completed</span>
                            </>
                          )}
                        </button>

                        {/* Create Follow-Up Button */}
                        {onCreateFollowUp && (
                          <button
                            onClick={() => onCreateFollowUp(`Follow up on: ${content.title}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accentMuted hover:bg-theme-accent/10 border border-theme-accent/25 text-theme-accent rounded-xl text-xs font-semibold transition shadow-xs"
                            title="Create a follow-up task"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            <span>Create Follow-up</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditTask(task)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-theme-surface border border-theme-border hover:bg-theme-base text-theme-textMuted hover:text-theme-text rounded-xl text-xs font-medium transition shadow-xs"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => onDeleteTask(task)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-theme-dangerMuted border border-theme-dangerMuted hover:bg-theme-danger/20 text-theme-danger rounded-xl text-xs font-medium transition shadow-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
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
    </div>
  )
}
