import { useEffect, useMemo, useState } from 'react'
import { addDays, DAY_LABELS, nowMin, todayStr, toDateStr } from '../../lib/time'
import DayColumn, { HOUR_PX } from './DayColumn'
import type { TimeBoxWithTask } from '../../types'

interface Props {
  /** 해당 주의 월요일 (YYYY-MM-DD) */
  weekStartStr: string
  /** 7일치 전체 타임박스 */
  boxes: TimeBoxWithTask[]
  focusedByBox: Record<string, number>
  activeBoxId?: string
  onClickSlot: (date: string, startMin: number) => void
  onCreateRange: (date: string, startMin: number, endMin: number) => void
  onMove: (id: string, startMin: number, endMin: number) => void
  onSelect: (box: TimeBoxWithTask) => void
}

/** 주간 뷰 — 요일별 DayColumn을 나란히 배치 (구글 캘린더 주간 뷰 스타일) */
export default function WeekTimeline({
  weekStartStr,
  boxes,
  focusedByBox,
  activeBoxId,
  onClickSlot,
  onCreateRange,
  onMove,
  onSelect,
}: Props) {
  const [now, setNow] = useState(nowMin())
  const today = todayStr()

  useEffect(() => {
    const id = setInterval(() => setNow(nowMin()), 30_000)
    return () => clearInterval(id)
  }, [])

  const days = useMemo(() => {
    const base = new Date(weekStartStr + 'T00:00:00')
    return Array.from({ length: 7 }, (_, i) => toDateStr(addDays(base, i)))
  }, [weekStartStr])

  const boxesByDate = useMemo(() => {
    const map: Record<string, TimeBoxWithTask[]> = {}
    for (const d of days) map[d] = []
    for (const b of boxes) {
      if (map[b.date]) map[b.date].push(b)
    }
    return map
  }, [boxes, days])

  // 이번 주 처음 열 때 아침 7시(오늘이 포함되면 지금 시각) 근처로 스크롤
  useEffect(() => {
    const target = days.includes(today) ? Math.max(now - 120, 0) : 7 * 60
    window.scrollTo({ top: (target / 60) * HOUR_PX - 40 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartStr])

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="flex">
        <div className="w-12 shrink-0" />
        {days.map((d) => {
          const dt = new Date(d + 'T00:00:00')
          const isToday = d === today
          return (
            <div
              key={d}
              className={`flex-1 pb-1.5 text-center text-xs font-medium ${isToday ? 'text-indigo-500' : 'text-neutral-400'}`}
            >
              {DAY_LABELS[(dt.getDay() + 6) % 7]}{' '}
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${isToday ? 'bg-indigo-500 font-bold text-white' : ''}`}
              >
                {dt.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex">
        {/* 시간 라벨 */}
        <div className="w-12 shrink-0 select-none">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ height: HOUR_PX }} className="relative">
              <span className="absolute -top-2 right-2 text-[11px] text-neutral-400">
                {String(h).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        {days.map((d, i) => (
          <DayColumn
            key={d}
            className={i > 0 ? 'border-l border-neutral-100 dark:border-neutral-900' : ''}
            boxes={boxesByDate[d]}
            focusedByBox={focusedByBox}
            activeBoxId={activeBoxId}
            showNowLine={d === today}
            nowMin={now}
            onClickSlot={(start) => onClickSlot(d, start)}
            onCreateRange={(start, end) => onCreateRange(d, start, end)}
            onMove={onMove}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
