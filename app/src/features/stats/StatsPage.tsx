import { useMemo, useState } from 'react'
import { addDays, DAY_LABELS, formatDuration, toDateStr, weekStart } from '../../lib/time'
import { CATEGORY_LABEL } from '../../types'
import type { Category } from '../../types'
import { useStats } from './useStats'
import type { StatBox, StatSession } from './useStats'

// 검증된 참조 팔레트 (validate_palette.js 통과: light/dark)
const CATEGORY_COLOR: Record<Category, { light: string; dark: string }> = {
  deep: { light: '#2a78d6', dark: '#3987e5' },
  shallow: { light: '#1baf7a', dark: '#199e70' },
  rest: { light: '#eda100', dark: '#c98500' },
}
const CATEGORY_ORDER: Category[] = ['deep', 'shallow', 'rest']

interface DayStat {
  label: string
  plannedSec: number
  focusedSec: number
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  )
}

/** 계획(연회색) 위에 실제 몰입(파랑)을 겹친 막대 차트 */
function DualBarChart({ items }: { items: DayStat[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 560
  const H = 190
  const padL = 30
  const padT = 8
  const padB = 20
  const innerW = W - padL - 8
  const innerH = H - padT - padB
  const maxHours = Math.max(1, Math.ceil(Math.max(...items.map((i) => Math.max(i.plannedSec, i.focusedSec))) / 3600))
  const slot = innerW / items.length
  const barW = Math.min(slot * 0.5, 36)
  const y = (sec: number) => padT + innerH * (1 - sec / (maxHours * 3600))
  const tickStep = maxHours <= 4 ? 1 : Math.ceil(maxHours / 4)
  const ticks: number[] = []
  for (let t = 0; t <= maxHours; t += tickStep) ticks.push(t)

  return (
    <div className="relative">
      <div className="mb-2 flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-neutral-200 dark:bg-neutral-700" /> 계획
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#2a78d6] dark:bg-[#3987e5]" /> 실제 몰입
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - 8}
              y1={y(t * 3600)}
              y2={y(t * 3600)}
              className="stroke-neutral-200 dark:stroke-neutral-800"
              strokeWidth={1}
            />
            <text x={padL - 5} y={y(t * 3600) + 3} textAnchor="end" fontSize={10} className="fill-neutral-400">
              {t}h
            </text>
          </g>
        ))}
        {items.map((it, i) => {
          const cx = padL + i * slot + slot / 2
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent" />
              {it.plannedSec > 0 && (
                <rect
                  x={cx - barW / 2}
                  y={y(it.plannedSec)}
                  width={barW}
                  height={innerH + padT - y(it.plannedSec)}
                  rx={3}
                  className="fill-neutral-200 dark:fill-neutral-700"
                />
              )}
              {it.focusedSec > 0 && (
                <rect
                  x={cx - barW * 0.3}
                  y={y(it.focusedSec)}
                  width={barW * 0.6}
                  height={innerH + padT - y(it.focusedSec)}
                  rx={3}
                  className="fill-[#2a78d6] dark:fill-[#3987e5]"
                />
              )}
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                className={hover === i ? 'fill-neutral-900 font-bold dark:fill-white' : 'fill-neutral-400'}
              >
                {it.label}
              </text>
            </g>
          )
        })}
      </svg>
      {hover !== null && items[hover] && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-800"
          style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%` }}
        >
          <p className="font-bold">{items[hover].label}</p>
          <p className="text-neutral-500">계획 {formatDuration(items[hover].plannedSec)}</p>
          <p className="text-neutral-500">몰입 {formatDuration(items[hover].focusedSec)}</p>
        </div>
      )}
    </div>
  )
}

/** 카테고리별 몰입 시간 — 가로 막대 + 직접 라벨 */
function CategoryBars({ byCategory }: { byCategory: Record<Category, number> }) {
  const total = CATEGORY_ORDER.reduce((s, c) => s + byCategory[c], 0)
  if (total === 0) return null
  return (
    <div className="space-y-2.5">
      {CATEGORY_ORDER.map((c) => {
        const sec = byCategory[c]
        const pct = total > 0 ? (sec / total) * 100 : 0
        return (
          <div key={c} className="flex items-center gap-3 text-xs">
            <span className="w-12 shrink-0 text-neutral-500">{CATEGORY_LABEL[c]}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded"
                style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLOR[c].light }}
              />
            </div>
            <span className="w-20 shrink-0 text-right font-semibold tabular-nums">
              {sec > 0 ? formatDuration(sec) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function aggregate(sessions: StatSession[], boxes: StatBox[], keyOf: (date: string) => number, buckets: string[]) {
  const stats: DayStat[] = buckets.map((label) => ({ label, plannedSec: 0, focusedSec: 0 }))
  for (const b of boxes) {
    const k = keyOf(b.date)
    if (stats[k]) stats[k].plannedSec += (b.end_min - b.start_min) * 60
  }
  for (const s of sessions) {
    const k = keyOf(s.time_box.date)
    if (stats[k]) stats[k].focusedSec += s.focused_seconds
  }
  return stats
}

export default function StatsPage() {
  const [tab, setTab] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(new Date()) // 주/월 이동 기준

  const range = useMemo(() => {
    if (tab === 'week') {
      const start = weekStart(anchor)
      return { start, end: addDays(start, 6) }
    }
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    return { start, end }
  }, [tab, anchor])

  const startStr = toDateStr(range.start)
  const endStr = toDateStr(range.end)
  const { sessions, boxes, loading } = useStats(startStr, endStr)

  const chart = useMemo(() => {
    if (tab === 'week') {
      const keyOf = (date: string) => {
        const d = new Date(date + 'T00:00:00')
        return Math.round((d.getTime() - range.start.getTime()) / 86400000)
      }
      return aggregate(sessions, boxes, keyOf, DAY_LABELS.map((l) => l))
    }
    const weekCount = Math.ceil((range.end.getDate() - 1 + ((new Date(startStr + 'T00:00:00').getDay() + 6) % 7) + 1) / 7)
    const keyOf = (date: string) => {
      const d = new Date(date + 'T00:00:00')
      const offset = (new Date(startStr + 'T00:00:00').getDay() + 6) % 7
      return Math.floor((d.getDate() - 1 + offset) / 7)
    }
    return aggregate(sessions, boxes, keyOf, Array.from({ length: weekCount }, (_, i) => `${i + 1}주`))
  }, [tab, sessions, boxes, range, startStr])

  const totalFocused = sessions.reduce((s, x) => s + x.focused_seconds, 0)
  const totalPlanned = boxes.reduce((s, b) => s + (b.end_min - b.start_min) * 60, 0)
  const density = totalPlanned > 0 ? Math.round((totalFocused / totalPlanned) * 100) : 0
  const totalPauses = sessions.reduce((s, x) => s + x.pause_count, 0)

  const byCategory = useMemo(() => {
    const r: Record<Category, number> = { deep: 0, shallow: 0, rest: 0 }
    for (const s of sessions) r[s.time_box.task.category] += s.focused_seconds
    return r
  }, [sessions])

  const rangeLabel =
    tab === 'week'
      ? `${range.start.getMonth() + 1}.${range.start.getDate()} – ${range.end.getMonth() + 1}.${range.end.getDate()}`
      : `${range.start.getFullYear()}년 ${range.start.getMonth() + 1}월`

  function shift(dir: 1 | -1) {
    setAnchor((a) => (tab === 'week' ? addDays(a, dir * 7) : new Date(a.getFullYear(), a.getMonth() + dir, 1)))
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex rounded-lg bg-neutral-200 p-0.5 dark:bg-neutral-800">
          {(['week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                tab === t ? 'bg-white shadow-sm dark:bg-neutral-900' : 'text-neutral-500'
              }`}
            >
              {t === 'week' ? '주간' : '월간'}
            </button>
          ))}
        </div>
        <button onClick={() => shift(-1)} className="ml-auto rounded-lg px-2 py-1 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800">‹</button>
        <span className="text-sm font-semibold tabular-nums">{rangeLabel}</span>
        <button onClick={() => shift(1)} className="rounded-lg px-2 py-1 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800">›</button>
      </div>

      {loading ? (
        <p className="mt-16 text-center text-sm text-neutral-400">불러오는 중…</p>
      ) : totalPlanned === 0 && totalFocused === 0 ? (
        <p className="mt-16 text-center text-sm text-neutral-400">
          이 기간에는 기록이 없어요.
          <br />
          타임박스를 만들고 몰입을 시작해보세요.
        </p>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="총 몰입" value={formatDuration(totalFocused)} />
            <StatTile label="몰입 밀도" value={`${density}%`} sub="계획 대비 실제" />
            <StatTile label="계획한 시간" value={formatDuration(totalPlanned)} />
            <StatTile label="일시정지" value={`${totalPauses}회`} sub={`${sessions.length}세션`} />
          </div>

          <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-bold">{tab === 'week' ? '요일별' : '주별'} 계획 vs 몰입</h2>
            <DualBarChart items={chart} />
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-bold">카테고리별 몰입</h2>
            <CategoryBars byCategory={byCategory} />
          </section>
        </>
      )}
    </div>
  )
}
