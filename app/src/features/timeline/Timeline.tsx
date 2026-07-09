import { useEffect, useState } from 'react'
import { nowMin, todayStr } from '../../lib/time'
import DayColumn, { HOUR_PX } from './DayColumn'
import type { TimeBoxWithTask } from '../../types'

interface Props {
  date: string
  boxes: TimeBoxWithTask[]
  focusedByBox: Record<string, number>
  activeBoxId?: string
  onClickSlot: (startMin: number) => void
  onCreateRange: (startMin: number, endMin: number) => void
  onMove: (id: string, startMin: number, endMin: number) => void
  onSelect: (box: TimeBoxWithTask) => void
}

/** 일간 뷰 — 시간 라벨 + 하루치 DayColumn */
export default function Timeline({ date, boxes, focusedByBox, activeBoxId, onClickSlot, onCreateRange, onMove, onSelect }: Props) {
  const [now, setNow] = useState(nowMin())
  const isToday = date === todayStr()

  useEffect(() => {
    const id = setInterval(() => setNow(nowMin()), 30_000)
    return () => clearInterval(id)
  }, [])

  // 처음 열 때 아침 7시 근처로 스크롤
  useEffect(() => {
    const target = isToday ? Math.max(now - 120, 0) : 7 * 60
    window.scrollTo({ top: (target / 60) * HOUR_PX - 40 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  return (
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

      <DayColumn
        boxes={boxes}
        focusedByBox={focusedByBox}
        activeBoxId={activeBoxId}
        showNowLine={isToday}
        nowMin={now}
        onClickSlot={onClickSlot}
        onCreateRange={onCreateRange}
        onMove={onMove}
        onSelect={onSelect}
      />
    </div>
  )
}
