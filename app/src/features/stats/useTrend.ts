import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { addDays, toDateStr, weekStart } from '../../lib/time'
import type { Category } from '../../types'

export interface TrendSession {
  focused_seconds: number
  date: string
  start_min: number
  category: Category
}

const WEEKS = 8

/** 오늘이 속한 주를 마지막 주로 한 최근 WEEKS주간의 완료 세션 (요일/시간대 무관 raw 데이터) */
export function useTrend() {
  const [sessions, setSessions] = useState<TrendSession[]>([])
  const [loading, setLoading] = useState(true)

  const thisWeekStart = weekStart(new Date())
  const rangeStart = addDays(thisWeekStart, -(WEEKS - 1) * 7)
  const rangeEnd = addDays(thisWeekStart, 6)
  const startStr = toDateStr(rangeStart)
  const endStr = toDateStr(rangeEnd)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('focus_sessions')
      .select('focused_seconds, time_box:time_boxes!inner(date, start_min, task:tasks(category))')
      .eq('state', 'done')
      .gte('time_box.date', startStr)
      .lte('time_box.date', endStr)
      .then(({ data }) => {
        if (cancelled) return
        const rows = (data as unknown as { focused_seconds: number; time_box: { date: string; start_min: number; task: { category: Category } } }[]) ?? []
        setSessions(
          rows.map((r) => ({
            focused_seconds: r.focused_seconds,
            date: r.time_box.date,
            start_min: r.time_box.start_min,
            category: r.time_box.task.category,
          }))
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [startStr, endStr])

  return { sessions, loading, weeks: WEEKS, rangeStart }
}
