import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Category, Task } from '../../types'

export interface TaskInput {
  name: string
  color: string
  category: Category
  default_duration_min: number
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('archived', false)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    setTasks((data as Task[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(
    async (input: TaskInput): Promise<Task> => {
      const { data, error } = await supabase.from('tasks').insert(input).select().single()
      if (error) throw error
      await refresh()
      return data as Task
    },
    [refresh],
  )

  const update = useCallback(
    async (id: string, input: Partial<TaskInput>) => {
      const { error } = await supabase.from('tasks').update(input).eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const archive = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('tasks').update({ archived: true }).eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  /** 목록을 이 순서대로 재정렬 — 화면에서 옮긴 새 순서의 id 배열을 그대로 전달 */
  const reorder = useCallback(async (orderedIds: string[]) => {
    setTasks((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]))
      return orderedIds.map((id, i) => ({ ...byId.get(id)!, sort_order: i }))
    })
    await Promise.all(orderedIds.map((id, i) => supabase.from('tasks').update({ sort_order: i }).eq('id', id)))
  }, [])

  /** '바로 시작' 노출 on/off — 켤 때는 맨 뒤 순서로 추가 */
  const toggleQuickStart = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      const nextOrder =
        task.quick_start_order != null ? null : Math.max(0, ...tasks.map((t) => t.quick_start_order ?? -1)) + 1
      const { error } = await supabase.from('tasks').update({ quick_start_order: nextOrder }).eq('id', id)
      if (error) throw error
      await refresh()
    },
    [tasks, refresh],
  )

  return { tasks, loading, refresh, create, update, archive, reorder, toggleQuickStart }
}
