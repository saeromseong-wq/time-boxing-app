import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Task, TimeBoxWithTask } from '../../types'

export function useTimeBoxes(date: string, refreshKey = 0) {
  const [boxes, setBoxes] = useState<TimeBoxWithTask[]>([])
  /** 타임박스별 완료 세션의 몰입 초 합계 */
  const [focusedByBox, setFocusedByBox] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('time_boxes')
      .select('*, task:tasks(*)')
      .eq('date', date)
      .order('start_min')
    const list = (data as TimeBoxWithTask[]) ?? []
    setBoxes(list)

    if (list.length > 0) {
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('time_box_id, focused_seconds')
        .eq('state', 'done')
        .in('time_box_id', list.map((b) => b.id))
      const sums: Record<string, number> = {}
      for (const s of sessions ?? []) {
        sums[s.time_box_id] = (sums[s.time_box_id] ?? 0) + s.focused_seconds
      }
      setFocusedByBox(sums)
    } else {
      setFocusedByBox({})
    }
    setLoading(false)
  }, [date])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh, refreshKey])

  const create = useCallback(
    async (task: Task, startMin: number, endMin: number): Promise<TimeBoxWithTask> => {
      const { data, error } = await supabase
        .from('time_boxes')
        .insert({ task_id: task.id, date, start_min: startMin, end_min: endMin })
        .select()
        .single()
      if (error) throw error
      await refresh()
      return { ...data, task } as TimeBoxWithTask
    },
    [date, refresh],
  )

  const updateTimes = useCallback(
    async (id: string, startMin: number, endMin: number) => {
      // 드래그 반응성을 위해 낙관적 갱신
      setBoxes((prev) =>
        prev.map((b) => (b.id === id ? { ...b, start_min: startMin, end_min: endMin } : b)),
      )
      const { error } = await supabase
        .from('time_boxes')
        .update({ start_min: startMin, end_min: endMin })
        .eq('id', id)
      if (error) await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('time_boxes').delete().eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  return { boxes, focusedByBox, loading, refresh, create, updateTimes, remove }
}
