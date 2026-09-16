import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { nowMin } from '../../lib/time'
import type { FocusSession, TimeBoxWithTask } from '../../types'

export interface ActiveFocus {
  session: FocusSession
  timeBox: TimeBoxWithTask
}

interface FocusValue {
  active: ActiveFocus | null
  loading: boolean
  /** 실제 몰입 누적 초 (진행 중이면 실시간 반영) */
  focusedLive: number
  start: (timeBox: TimeBoxWithTask) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  /** 세션이 종료될 때마다 증가 — 목록 갱신 트리거용 */
  version: number
}

const FocusContext = createContext<FocusValue | null>(null)

function liveSeconds(session: FocusSession): number {
  let sec = session.focused_seconds
  if (session.state === 'running' && session.last_resumed_at) {
    sec += (Date.now() - new Date(session.last_resumed_at).getTime()) / 1000
  }
  return Math.floor(sec)
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const { session: authSession } = useAuth()
  const [active, setActive] = useState<ActiveFocus | null>(null)
  const [loading, setLoading] = useState(true)
  const [focusedLive, setFocusedLive] = useState(0)
  const [version, setVersion] = useState(0)

  // 진행/일시정지 중인 세션 복원 (다른 기기에서 시작한 것도 포함)
  const restore = useCallback(async () => {
    if (!authSession) {
      setActive(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('focus_sessions')
      .select('*, time_box:time_boxes(*, task:tasks(*))')
      .in('state', ['running', 'paused'])
      .order('started_at', { ascending: false })
      .limit(1)
    const row = data?.[0]
    if (row) {
      const { time_box, ...sess } = row
      setActive({ session: sess as FocusSession, timeBox: time_box as TimeBoxWithTask })
    } else {
      setActive(null)
    }
    setLoading(false)
  }, [authSession])

  useEffect(() => {
    restore()
  }, [restore])

  // 1초 틱 — timestamp 기반이라 백그라운드 탭에서도 왜곡 없음
  useEffect(() => {
    if (!active) {
      setFocusedLive(0)
      return
    }
    setFocusedLive(liveSeconds(active.session))
    if (active.session.state !== 'running') return
    const id = setInterval(() => setFocusedLive(liveSeconds(active.session)), 1000)
    return () => clearInterval(id)
  }, [active])

  const start = useCallback(
    async (timeBox: TimeBoxWithTask) => {
      // 기존 세션이 있으면 먼저 종료
      if (active) {
        await stopSession(active.session, active.timeBox)
      }
      // 타임박스 시작 시각을 실제 몰입 시작 시각으로 보정 (계획보다 이르든 늦든)
      const startMin = nowMin()
      const endMin = Math.max(timeBox.end_min, startMin + 1)
      await supabase.from('time_boxes').update({ start_min: startMin, end_min: endMin }).eq('id', timeBox.id)
      const syncedBox = { ...timeBox, start_min: startMin, end_min: endMin }

      const { data, error } = await supabase
        .from('focus_sessions')
        .insert({
          time_box_id: timeBox.id,
          state: 'running',
          last_resumed_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      await supabase
        .from('tasks')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', timeBox.task_id)
      setActive({ session: data as FocusSession, timeBox: syncedBox })
      setVersion((v) => v + 1)
    },
    [active],
  )

  const pause = useCallback(async () => {
    if (!active || active.session.state !== 'running') return
    const focused = liveSeconds(active.session)
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({
        state: 'paused',
        focused_seconds: focused,
        last_resumed_at: null,
        pause_count: active.session.pause_count + 1,
      })
      .eq('id', active.session.id)
      .select()
      .single()
    if (error) throw error
    setActive({ ...active, session: data as FocusSession })
  }, [active])

  const resume = useCallback(async () => {
    if (!active || active.session.state !== 'paused') return
    const { data, error } = await supabase
      .from('focus_sessions')
      .update({ state: 'running', last_resumed_at: new Date().toISOString() })
      .eq('id', active.session.id)
      .select()
      .single()
    if (error) throw error
    setActive({ ...active, session: data as FocusSession })
  }, [active])

  const stop = useCallback(async () => {
    if (!active) return
    await stopSession(active.session, active.timeBox)
    setActive(null)
    setVersion((v) => v + 1)
  }, [active])

  return (
    <FocusContext.Provider value={{ active, loading, focusedLive, start, pause, resume, stop, version }}>
      {children}
    </FocusContext.Provider>
  )
}

async function stopSession(session: FocusSession, timeBox: TimeBoxWithTask) {
  await supabase
    .from('focus_sessions')
    .update({
      state: 'done',
      focused_seconds: liveSeconds(session),
      last_resumed_at: null,
      ended_at: new Date().toISOString(),
    })
    .eq('id', session.id)
  // 타임박스 종료 시각을 실제 몰입 종료 시각으로 보정 (계획보다 이르든 늦든)
  const endMin = Math.max(nowMin(), timeBox.start_min + 1)
  await supabase.from('time_boxes').update({ end_min: endMin }).eq('id', timeBox.id)
}

export function useFocus(): FocusValue {
  const v = useContext(FocusContext)
  if (!v) throw new Error('useFocus must be used within FocusProvider')
  return v
}
