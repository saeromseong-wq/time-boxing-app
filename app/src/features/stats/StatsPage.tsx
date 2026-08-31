import { useMemo, useState } from 'react'
import { addDays, formatDuration, toDateStr, weekStart } from '../../lib/time'
import { CATEGORY_LABEL } from '../../types'
import type { Category } from '../../types'
import { useStats } from './useStats'
import type { StatBox } from './useStats'
import { useWeeklyGoal } from './useWeeklyGoal'
import { useTrend } from './useTrend'

// 검증된 참조 팔레트 (validate_palette.js 통과: light/dark)
const CATEGORY_COLOR: Record<Category, { light: string; dark: string }> = {
  deep: { light: '#2a78d6', dark: '#3987e5' },
  shallow: { light: '#1baf7a', dark: '#199e70' },
  rest: { light: '#eda100', dark: '#c98500' },
}
const CATEGORY_ORDER: Category[] = ['deep', 'shallow', 'rest']
const OTHER_COLOR = '#a3a3a3'

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  )
}

/** 카테고리/태스크별 시간 — 가로 막대 + 직접 라벨 */
function ShareBars({ items }: { items: { key: string; label: string; color: string; sec: number }[] }) {
  const total = items.reduce((s, i) => s + i.sec, 0)
  if (total === 0) return <p className="text-xs text-neutral-400">기록이 없어요.</p>
  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const pct = total > 0 ? (it.sec / total) * 100 : 0
        return (
          <div key={it.key} className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 truncate text-neutral-500" title={it.label}>
              {it.label}
            </span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: it.color }} />
            </div>
            <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
              {it.sec > 0 ? `${formatDuration(it.sec)} · ${Math.round(pct)}%` : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** 태스크별 시간 비중 — 도넛 + 범례 (상위 6개 + 기타) */
function TaskDonut({ items }: { items: { id: string; label: string; color: string; sec: number }[] }) {
  const total = items.reduce((s, i) => s + i.sec, 0)
  if (total === 0) return <p className="text-xs text-neutral-400">기록이 없어요.</p>

  const sorted = [...items].sort((a, b) => b.sec - a.sec)
  const top = sorted.slice(0, 6)
  const restSec = sorted.slice(6).reduce((s, i) => s + i.sec, 0)
  const segments = restSec > 0 ? [...top, { id: '__other', label: '기타', color: OTHER_COLOR, sec: restSec }] : top

  const size = 140
  const r = 52
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  let acc = 0

  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={20} className="stroke-neutral-100 dark:stroke-neutral-800" />
        {segments.map((seg) => {
          const frac = seg.sec / total
          const len = frac * circumference
          const dasharray = `${len} ${circumference - len}`
          const dashoffset = -acc
          acc += len
          return (
            <circle
              key={seg.id}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={20}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
            />
          )
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5 text-xs">
        {segments.map((seg) => (
          <div key={seg.id} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-300" title={seg.label}>
              {seg.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-neutral-500">
              {Math.round((seg.sec / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface WeekPoint {
  label: string
  totalSec: number
  deepSec: number
}

/** 최근 N주 몰입/딥워크 시간 추이 — 라인 차트 */
function TrendChart({ points }: { points: WeekPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 560
  const H = 180
  const padL = 30
  const padT = 10
  const padB = 20
  const innerW = W - padL - 8
  const innerH = H - padT - padB
  const maxHours = Math.max(1, Math.ceil(Math.max(...points.map((p) => p.totalSec)) / 3600))
  const slot = innerW / Math.max(1, points.length - 1)
  const x = (i: number) => padL + i * slot
  const y = (sec: number) => padT + innerH * (1 - sec / (maxHours * 3600))
  const tickStep = maxHours <= 4 ? 1 : Math.ceil(maxHours / 4)
  const ticks: number[] = []
  for (let t = 0; t <= maxHours; t += tickStep) ticks.push(t)

  function path(getSec: (p: WeekPoint) => number) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(getSec(p))}`).join(' ')
  }

  return (
    <div className="relative">
      <div className="mb-2 flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-neutral-300 dark:bg-neutral-600" /> 총 몰입
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#2a78d6] dark:bg-[#3987e5]" /> 딥워크
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y(t * 3600)} y2={y(t * 3600)} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth={1} />
            <text x={padL - 5} y={y(t * 3600) + 3} textAnchor="end" fontSize={10} className="fill-neutral-400">
              {t}h
            </text>
          </g>
        ))}
        <path d={path((p) => p.totalSec)} fill="none" strokeWidth={2} className="stroke-neutral-300 dark:stroke-neutral-600" />
        <path d={path((p) => p.deepSec)} fill="none" strokeWidth={2} className="stroke-[#2a78d6] dark:stroke-[#3987e5]" />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={x(i) - slot / 2} y={padT} width={slot} height={innerH} fill="transparent" />
            <circle cx={x(i)} cy={y(p.totalSec)} r={2.5} className="fill-neutral-400 dark:fill-neutral-500" />
            <circle cx={x(i)} cy={y(p.deepSec)} r={2.5} className="fill-[#2a78d6] dark:fill-[#3987e5]" />
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} className={hover === i ? 'fill-neutral-900 font-bold dark:fill-white' : 'fill-neutral-400'}>
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-800"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="font-bold">{points[hover].label}</p>
          <p className="text-neutral-500">총 몰입 {formatDuration(points[hover].totalSec)}</p>
          <p className="text-neutral-500">딥워크 {formatDuration(points[hover].deepSec)}</p>
        </div>
      )}
    </div>
  )
}

/** 시간대별(0~23시) 몰입 시간 — 미니 막대 */
function HourHeatmap({ byHour }: { byHour: number[] }) {
  const max = Math.max(1, ...byHour)
  return (
    <div>
      <div className="flex h-16 items-end gap-[2px]">
        {byHour.map((sec, h) => (
          <div key={h} className="group relative flex-1">
            <div
              className="rounded-t bg-[#2a78d6] dark:bg-[#3987e5]"
              style={{ height: `${Math.max(2, (sec / max) * 100)}%`, opacity: sec > 0 ? 0.35 + 0.65 * (sec / max) : 0.15 }}
            />
            <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block dark:bg-neutral-700">
              {h}시 · {formatDuration(sec)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>24시</span>
      </div>
    </div>
  )
}

function GoalProgressCard({ weekStartStr, focusedSec }: { weekStartStr: string; focusedSec: number }) {
  const { targetMinutes, loading, saveGoal } = useWeeklyGoal(weekStartStr)
  const [editing, setEditing] = useState(false)
  const [hoursInput, setHoursInput] = useState('')

  if (loading) return null

  function startEdit() {
    setHoursInput(targetMinutes ? String(targetMinutes / 60) : '')
    setEditing(true)
  }

  async function submit() {
    const hours = parseFloat(hoursInput)
    if (!hours || hours <= 0) return
    await saveGoal(Math.round(hours * 60))
    setEditing(false)
  }

  if (editing) {
    return (
      <section className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-bold">이번 주 몰입 목표</h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={0.5}
            min={0.5}
            autoFocus
            value={hoursInput}
            onChange={(e) => setHoursInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-24 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
            placeholder="시간"
          />
          <span className="text-sm text-neutral-500">시간 / 주</span>
          <button onClick={submit} className="ml-auto rounded-lg bg-neutral-900 px-3 py-1 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
            저장
          </button>
          <button onClick={() => setEditing(false)} className="rounded-lg px-2 py-1 text-sm text-neutral-400">
            취소
          </button>
        </div>
      </section>
    )
  }

  if (targetMinutes === null) {
    return (
      <section className="mb-5 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-center dark:border-neutral-700 dark:bg-neutral-900">
        <p className="mb-2 text-sm text-neutral-500">이번 주 몰입 목표를 설정해보세요.</p>
        <button onClick={startEdit} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
          목표 설정하기
        </button>
      </section>
    )
  }

  const targetSec = targetMinutes * 60
  const pct = Math.min(100, Math.round((focusedSec / targetSec) * 100))
  return (
    <section className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold">이번 주 몰입 목표</h2>
        <button onClick={startEdit} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
          수정
        </button>
      </div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-lg font-bold tabular-nums">
          {formatDuration(focusedSec)} <span className="text-sm font-normal text-neutral-400">/ {formatDuration(targetSec)}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-neutral-500">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  )
}

function shareByCategory(boxes: StatBox[]) {
  const r: Record<Category, number> = { deep: 0, shallow: 0, rest: 0 }
  for (const b of boxes) r[b.task.category] += (b.end_min - b.start_min) * 60
  return CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORY_LABEL[c], color: CATEGORY_COLOR[c].light, sec: r[c] }))
}

function shareByTask(boxes: StatBox[]) {
  const m = new Map<string, { id: string; label: string; color: string; sec: number }>()
  for (const b of boxes) {
    const t = b.task
    const cur = m.get(t.id) ?? { id: t.id, label: t.name, color: t.color, sec: 0 }
    cur.sec += (b.end_min - b.start_min) * 60
    m.set(t.id, cur)
  }
  return Array.from(m.values())
}

function median(nums: number[]) {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function computeStreak(dates: Set<string>): number {
  const today = new Date()
  let cursor = toDateStr(today)
  if (!dates.has(cursor)) {
    cursor = toDateStr(addDays(today, -1))
  }
  let streak = 0
  let d = new Date(cursor + 'T00:00:00')
  while (dates.has(toDateStr(d))) {
    streak++
    d = addDays(d, -1)
  }
  return streak
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
  const { sessions: trendSessions, loading: trendLoading } = useTrend()

  const totalFocused = sessions.reduce((s, x) => s + x.focused_seconds, 0)
  const totalPlanned = boxes.reduce((s, b) => s + (b.end_min - b.start_min) * 60, 0)

  const categoryShare = useMemo(() => shareByCategory(boxes), [boxes])
  const taskShare = useMemo(() => shareByTask(boxes), [boxes])

  const sessionLens = useMemo(() => sessions.map((s) => s.focused_seconds).filter((s) => s > 0), [sessions])
  const avgSessionSec = sessionLens.length > 0 ? sessionLens.reduce((a, b) => a + b, 0) / sessionLens.length : 0
  const medianSessionSec = median(sessionLens)

  const trendPoints = useMemo<WeekPoint[]>(() => {
    const thisWeekStart = weekStart(new Date())
    const weeks = 8
    const buckets: WeekPoint[] = Array.from({ length: weeks }, (_, i) => {
      const ws = addDays(thisWeekStart, -(weeks - 1 - i) * 7)
      return { label: `${ws.getMonth() + 1}/${ws.getDate()}`, totalSec: 0, deepSec: 0 }
    })
    for (const s of trendSessions) {
      const d = new Date(s.date + 'T00:00:00')
      const idx = weeks - 1 - Math.floor((thisWeekStart.getTime() - weekStart(d).getTime()) / (7 * 86400000))
      if (idx < 0 || idx >= weeks) continue
      buckets[idx].totalSec += s.focused_seconds
      if (s.category === 'deep') buckets[idx].deepSec += s.focused_seconds
    }
    return buckets
  }, [trendSessions])

  const byHour = useMemo(() => {
    const r = Array(24).fill(0)
    for (const s of trendSessions) {
      const h = Math.floor((s.start_min % 1440) / 60)
      r[h] += s.focused_seconds
    }
    return r
  }, [trendSessions])

  const streak = useMemo(() => {
    const dates = new Set(trendSessions.filter((s) => s.focused_seconds > 0).map((s) => s.date))
    return computeStreak(dates)
  }, [trendSessions])

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
          {tab === 'week' && <GoalProgressCard weekStartStr={startStr} focusedSec={totalFocused} />}

          <div className="mb-5 grid grid-cols-3 gap-2">
            <StatTile label="총 몰입" value={formatDuration(totalFocused)} />
            <StatTile
              label="평균 세션 길이"
              value={sessionLens.length > 0 ? formatDuration(avgSessionSec) : '—'}
              sub={sessionLens.length > 0 ? `중앙값 ${formatDuration(medianSessionSec)}` : undefined}
            />
            <StatTile label="몰입 스트릭" value={`${streak}일`} sub="연속 기록" />
          </div>

          <section className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-bold">카테고리별 시간</h2>
            <ShareBars items={categoryShare} />
          </section>

          <section className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-bold">태스크별 시간</h2>
            <TaskDonut items={taskShare} />
          </section>

          <section className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-bold">최근 8주 몰입 추이</h2>
            {trendLoading ? <p className="text-xs text-neutral-400">불러오는 중…</p> : <TrendChart points={trendPoints} />}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-bold">시간대별 몰입 패턴 (최근 8주)</h2>
            {trendLoading ? <p className="text-xs text-neutral-400">불러오는 중…</p> : <HourHeatmap byHour={byHour} />}
          </section>
        </>
      )}
    </div>
  )
}
