import { useEffect, useRef, useState } from 'react'
import { formatDuration, minToLabel, nowMin, snapTo, todayStr } from '../../lib/time'
import type { TimeBoxWithTask } from '../../types'

const HOUR_PX = 56
const DAY_MIN = 1440
const MIN_DUR = 15

interface Props {
  date: string
  boxes: TimeBoxWithTask[]
  focusedByBox: Record<string, number>
  activeBoxId?: string
  /** 빈 곳 클릭(단일) — startMin 슬롯에 생성 */
  onClickSlot: (startMin: number) => void
  /** 빈 곳 드래그 — 범위 지정 생성 */
  onCreateRange: (startMin: number, endMin: number) => void
  onMove: (id: string, startMin: number, endMin: number) => void
  onSelect: (box: TimeBoxWithTask) => void
}

type Drag =
  | { kind: 'create'; anchor: number; current: number; moved: boolean }
  | { kind: 'move'; box: TimeBoxWithTask; grabMin: number; start: number; end: number; moved: boolean }
  | { kind: 'resize'; box: TimeBoxWithTask; end: number; moved: boolean }

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export default function Timeline({
  date,
  boxes,
  focusedByBox,
  activeBoxId,
  onClickSlot,
  onCreateRange,
  onMove,
  onSelect,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
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

  function yToMin(clientY: number): number {
    const rect = ref.current!.getBoundingClientRect()
    return clamp(((clientY - rect.top) / HOUR_PX) * 60, 0, DAY_MIN)
  }

  // 드래그 진행 중에는 window에서 move/up 추적
  useEffect(() => {
    if (!drag) return
    document.body.classList.add('dragging')

    function onMoveEvt(e: PointerEvent) {
      const min = yToMin(e.clientY)
      setDrag((d) => {
        if (!d) return d
        if (d.kind === 'create') {
          const moved = d.moved || Math.abs(min - d.anchor) > 4
          return { ...d, current: min, moved }
        }
        if (d.kind === 'move') {
          const dur = d.box.end_min - d.box.start_min
          let start = snapTo(min - d.grabMin, 5)
          start = clamp(start, 0, DAY_MIN - dur)
          const moved = d.moved || Math.abs(start - d.box.start_min) >= 5
          return { ...d, start, end: start + dur, moved }
        }
        // resize
        let end = snapTo(min, 5)
        end = clamp(end, d.box.start_min + MIN_DUR, DAY_MIN)
        const moved = d.moved || Math.abs(end - d.box.end_min) >= 5
        return { ...d, end, moved }
      })
    }

    function onUp() {
      setDrag((d) => {
        if (!d) return null
        if (d.kind === 'create') {
          if (!d.moved) {
            onClickSlot(clamp(Math.floor(d.anchor / 30) * 30, 0, DAY_MIN - MIN_DUR))
          } else {
            const lo = snapTo(Math.min(d.anchor, d.current), 15)
            const hi = snapTo(Math.max(d.anchor, d.current), 15)
            onCreateRange(lo, Math.max(hi, lo + MIN_DUR))
          }
        } else if (d.kind === 'move') {
          if (d.moved) onMove(d.box.id, d.start, d.end)
          else onSelect(d.box)
        } else if (d.moved) {
          onMove(d.box.id, d.box.start_min, d.end)
        }
        return null
      })
    }

    window.addEventListener('pointermove', onMoveEvt)
    window.addEventListener('pointerup', onUp)
    return () => {
      document.body.classList.remove('dragging')
      window.removeEventListener('pointermove', onMoveEvt)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(drag)])

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

      {/* 타임라인 본체 */}
      <div
        ref={ref}
        className="relative flex-1 touch-none"
        style={{ height: 24 * HOUR_PX }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          setDrag({ kind: 'create', anchor: yToMin(e.clientY), current: yToMin(e.clientY), moved: false })
        }}
      >
        {/* 시간 그리드 */}
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="pointer-events-none absolute inset-x-0 border-t border-neutral-200 dark:border-neutral-800"
            style={{ top: h * HOUR_PX }}
          />
        ))}

        {/* 타임박스들 */}
        {boxes.map((b) => {
          const isDragging = drag && drag.kind !== 'create' && drag.box.id === b.id
          const start = isDragging && drag.kind === 'move' ? drag.start : b.start_min
          const end = isDragging ? (drag.kind === 'move' ? drag.end : drag.end) : b.end_min
          const focused = focusedByBox[b.id] ?? 0
          const isActive = b.id === activeBoxId
          const compact = end - start < 40
          return (
            <div
              key={b.id}
              className={`absolute inset-x-1 cursor-grab overflow-hidden rounded-lg border-l-4 px-2 ${compact ? 'py-0' : 'py-1'} text-white shadow-sm ${isDragging ? 'z-30 opacity-90 shadow-lg' : 'z-10'}`}
              style={{
                top: (start / 60) * HOUR_PX + 1,
                height: ((end - start) / 60) * HOUR_PX - 2,
                backgroundColor: b.task.color + 'd9',
                borderLeftColor: b.task.color,
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                e.stopPropagation()
                setDrag({
                  kind: 'move',
                  box: b,
                  grabMin: yToMin(e.clientY) - b.start_min,
                  start: b.start_min,
                  end: b.end_min,
                  moved: false,
                })
              }}
            >
              <div className="flex items-center gap-1.5">
                {isActive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
                <p className="truncate text-xs font-bold leading-4">{b.task.name}</p>
              </div>
              {!compact && (
                <p className="text-[10px] leading-4 opacity-80">
                  {minToLabel(start)}–{minToLabel(end)}
                  {focused > 0 && ` · 몰입 ${formatDuration(focused)}`}
                </p>
              )}
              {/* 리사이즈 핸들 */}
              <div
                className="absolute inset-x-0 bottom-0 h-2.5 cursor-ns-resize"
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  e.stopPropagation()
                  setDrag({ kind: 'resize', box: b, end: b.end_min, moved: false })
                }}
              />
            </div>
          )
        })}

        {/* 드래그 생성 고스트 */}
        {drag?.kind === 'create' && drag.moved && (
          <div
            className="pointer-events-none absolute inset-x-1 z-20 rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-400/20"
            style={{
              top: (Math.min(drag.anchor, drag.current) / 60) * HOUR_PX,
              height: (Math.abs(drag.current - drag.anchor) / 60) * HOUR_PX,
            }}
          />
        )}

        {/* 현재 시각 표시선 */}
        {isToday && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
            style={{ top: (now / 60) * HOUR_PX }}
          >
            <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
            <div className="h-px flex-1 bg-red-500" />
          </div>
        )}
      </div>
    </div>
  )
}
