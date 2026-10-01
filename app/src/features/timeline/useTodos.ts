import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { DailyTodo, TimeBoxTodo } from '../../types'

/** 연동된 항목(daily_todo_id 있음)은 완료 여부를 데일리 쪽 done을 그대로 따른다 */
export function effectiveDone(todo: TimeBoxTodo, dailyTodos: DailyTodo[]): boolean {
  if (!todo.daily_todo_id) return todo.done
  return dailyTodos.find((d) => d.id === todo.daily_todo_id)?.done ?? todo.done
}

/** date의 오늘의 할 일(daily_todos) + timeBoxIds에 속한 타임박스별 할 일(time_box_todos) */
export function useTodos(date: string, timeBoxIds: string[]) {
  const [dailyTodos, setDailyTodos] = useState<DailyTodo[]>([])
  const [timeBoxTodos, setTimeBoxTodos] = useState<TimeBoxTodo[]>([])
  const idsKey = timeBoxIds.join(',')

  const refreshDaily = useCallback(async () => {
    if (!date) {
      setDailyTodos([])
      return
    }
    const { data } = await supabase
      .from('daily_todos')
      .select('*')
      .eq('date', date)
      .order('sort_order', { ascending: true })
    setDailyTodos((data as DailyTodo[]) ?? [])
  }, [date])

  const refreshBoxTodos = useCallback(async () => {
    const ids = idsKey ? idsKey.split(',') : []
    if (ids.length === 0) {
      setTimeBoxTodos([])
      return
    }
    const { data } = await supabase
      .from('time_box_todos')
      .select('*')
      .in('time_box_id', ids)
      .order('sort_order', { ascending: true })
    setTimeBoxTodos((data as TimeBoxTodo[]) ?? [])
  }, [idsKey])

  useEffect(() => {
    refreshDaily()
  }, [refreshDaily])

  useEffect(() => {
    refreshBoxTodos()
  }, [refreshBoxTodos])

  const addDailyTodo = useCallback(
    async (text: string) => {
      const { error } = await supabase
        .from('daily_todos')
        .insert({ date, text, sort_order: dailyTodos.length })
      if (error) throw error
      await refreshDaily()
    },
    [date, dailyTodos.length, refreshDaily],
  )

  const toggleDailyTodo = useCallback(
    async (todo: DailyTodo) => {
      setDailyTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)))
      const { error } = await supabase.from('daily_todos').update({ done: !todo.done }).eq('id', todo.id)
      if (error) await refreshDaily()
    },
    [refreshDaily],
  )

  const removeDailyTodo = useCallback(
    async (id: string) => {
      // 연동된 타임박스 항목도 DB에서 on delete cascade로 함께 삭제된다
      setDailyTodos((prev) => prev.filter((t) => t.id !== id))
      setTimeBoxTodos((prev) => prev.filter((t) => t.daily_todo_id !== id))
      const { error } = await supabase.from('daily_todos').delete().eq('id', id)
      if (error) {
        await refreshDaily()
        await refreshBoxTodos()
      }
    },
    [refreshDaily, refreshBoxTodos],
  )

  const addTimeBoxTodo = useCallback(
    async (timeBoxId: string, text: string) => {
      const sortOrder = timeBoxTodos.filter((t) => t.time_box_id === timeBoxId).length
      const { error } = await supabase
        .from('time_box_todos')
        .insert({ time_box_id: timeBoxId, text, sort_order: sortOrder })
      if (error) throw error
      await refreshBoxTodos()
    },
    [timeBoxTodos, refreshBoxTodos],
  )

  const importDailyTodo = useCallback(
    async (timeBoxId: string, dailyTodo: DailyTodo) => {
      const sortOrder = timeBoxTodos.filter((t) => t.time_box_id === timeBoxId).length
      const { error } = await supabase.from('time_box_todos').insert({
        time_box_id: timeBoxId,
        daily_todo_id: dailyTodo.id,
        text: dailyTodo.text,
        sort_order: sortOrder,
      })
      if (error) throw error
      await refreshBoxTodos()
    },
    [timeBoxTodos, refreshBoxTodos],
  )

  const toggleTimeBoxTodo = useCallback(
    async (todo: TimeBoxTodo) => {
      if (todo.daily_todo_id) {
        const daily = dailyTodos.find((d) => d.id === todo.daily_todo_id)
        if (daily) {
          await toggleDailyTodo(daily)
          return
        }
      }
      setTimeBoxTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)))
      const { error } = await supabase.from('time_box_todos').update({ done: !todo.done }).eq('id', todo.id)
      if (error) await refreshBoxTodos()
    },
    [dailyTodos, toggleDailyTodo, refreshBoxTodos],
  )

  const removeTimeBoxTodo = useCallback(
    async (id: string) => {
      setTimeBoxTodos((prev) => prev.filter((t) => t.id !== id))
      const { error } = await supabase.from('time_box_todos').delete().eq('id', id)
      if (error) await refreshBoxTodos()
    },
    [refreshBoxTodos],
  )

  const refresh = useCallback(async () => {
    await Promise.all([refreshDaily(), refreshBoxTodos()])
  }, [refreshDaily, refreshBoxTodos])

  return {
    refresh,
    dailyTodos,
    timeBoxTodos,
    addDailyTodo,
    toggleDailyTodo,
    removeDailyTodo,
    addTimeBoxTodo,
    importDailyTodo,
    toggleTimeBoxTodo,
    removeTimeBoxTodo,
  }
}
