import { useEffect } from 'react'
import { getGlobalTasks } from '../services/workspaceService'

const PREF_KEY = 'wavelength.notificationsEnabled'
const SEEN_KEY = 'wavelength.notifiedTasks'
const CHECK_INTERVAL_MS = 5 * 60 * 1000

export function getNotificationsEnabled(): boolean {
  return localStorage.getItem(PREF_KEY) !== 'false'
}

export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(PREF_KEY, String(enabled))
}

/**
 * Periodically checks for due/overdue tasks and raises a desktop notification
 * via Electron's native Notification API.
 */
export function useTaskNotifications() {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const checkDueTasks = async () => {
      if (!getNotificationsEnabled()) return
      if (!window.electronAPI?.notify) return

      try {
        const tasks = await getGlobalTasks()
        const endOfToday = new Date()
        endOfToday.setHours(23, 59, 59, 999)

        const dueOrOverdue = tasks.filter(
          (task) => task.status === 'pending' && task.due_date && new Date(task.due_date) <= endOfToday
        )
        if (dueOrOverdue.length === 0) return

        let seen: string[] = []
        try {
          seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]')
        } catch {
          seen = []
        }

        const fresh = dueOrOverdue.filter((task) => !seen.includes(task.id))
        if (fresh.length === 0) return

        const overdueCount = fresh.filter((task) => new Date(task.due_date!) < new Date(new Date().setHours(0, 0, 0, 0))).length
        const title = overdueCount > 0 ? 'Wavelength — overdue tasks' : 'Wavelength — tasks due today'
        const body = `${fresh.length} task${fresh.length > 1 ? 's' : ''} need attention. First: ${fresh[0].description}`

        await window.electronAPI.notify(title, body)
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map((task) => task.id)]))
      } catch (err) {
        console.error('Task notification check failed:', err)
      }
    }

    checkDueTasks()
    intervalId = setInterval(checkDueTasks, CHECK_INTERVAL_MS)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])
}
