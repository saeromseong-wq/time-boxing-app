import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Category } from '../../types'

export interface StatSession {
  focused_seconds: number
  pause_count: number
  time_box: { date: string; start_min: number; end_min: number; task: { category: Category } }
}

export interface StatBox {
  date: string
  start_min: number
  end_min: number
  task: { category: Category }
}

/** [startStr, endStr] 범위(포함)의 완료 세션 + 계획 타임박스 */
export function useStats(startStr: string, endStr: string) {
  const [sessions, setSessions] = useState<StatSession[]>([])
  const [boxes, setBoxes] = useState<StatBox[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase
        .from('focus_sessions')
        .select('focused_seconds, pause_count, time_box:time_boxes!inner(date, start_min, end_min, task:tasks(category))')
        .eq('state', 'done')
        .gte('time_box.date', startStr)
        .lte('time_box.date', endStr),
      supabase
        .from('time_boxes')
        .select('date, start_min, end_min, task:tasks(category)')
        .gte('date', startStr)
        .lte('date', endStr),
    ]).then(([s, b]) => {
      if (cancelled) return
      setSessions((s.data as unknown as StatSession[]) ?? [])
      setBoxes((b.data as unknown as StatBox[]) ?? [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [startStr, endStr])

  return { sessions, boxes, loading }
}
