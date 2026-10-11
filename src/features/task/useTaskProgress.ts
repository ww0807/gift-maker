import { useEffect, useState } from 'react'
import { getTask, hasRemoteApi, type TaskProgress } from './taskApi'
import { mockTaskProgress } from './mockProgress'

export function useTaskProgress(taskId: string) {
  const [task, setTask] = useState<TaskProgress | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const next = hasRemoteApi ? await getTask(taskId) : mockTaskProgress(taskId)
        if (active) {
          setTask(next)
          setError('')
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : '读取任务状态失败')
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 3000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [taskId])

  return { task, error }
}
