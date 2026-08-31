import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/** weekStartStr 주에 적용되는 목표(해당 주 이전 가장 최근 설정값)를 가져오고 수정한다 */
export function useWeeklyGoal(weekStartStr: string) {
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGoal = useCallback(async (): Promise<number | null> => {
    const { data } = await supabase
      .from('weekly_goals')
      .select('target_minutes')
      .lte('week_start', weekStartStr)
      .order('week_start', { ascending: false })
      .limit(1)
    return data && data.length > 0 ? data[0].target_minutes : null
  }, [weekStartStr])

  const reload = useCallback(() => {
    setLoading(true)
    fetchGoal().then((v) => {
      setTargetMinutes(v)
      setLoading(false)
    })
  }, [fetchGoal])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchGoal().then((v) => {
      if (cancelled) return
      setTargetMinutes(v)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchGoal])

  const saveGoal = useCallback(
    async (minutes: number) => {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) return
      await supabase
        .from('weekly_goals')
        .upsert({ user_id: userId, week_start: weekStartStr, target_minutes: minutes }, { onConflict: 'user_id,week_start' })
      reload()
    },
    [weekStartStr, reload]
  )

  return { targetMinutes, loading, saveGoal }
}
