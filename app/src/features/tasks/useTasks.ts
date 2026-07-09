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
      .order('last_used_at', { ascending: false, nullsFirst: false })
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

  return { tasks, loading, refresh, create, update, archive }
}
