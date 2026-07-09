import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFocus } from './FocusContext'
import { formatClock, formatDuration } from '../../lib/time'

/** 비주얼 타이머: 남은 시간만큼 색이 찬 파이가 줄어듦 */
function TimerPie({ fraction, color, overtime }: { fraction: number; color: string; overtime: boolean }) {
  const size = 280
  const c = size / 2
  const r = c - 8
  const f = Math.min(Math.max(fraction, 0), 1)

  let slice = null
  if (overtime || f >= 1) {
    slice = <circle cx={c} cy={c} r={r} fill={overtime ? '#ef4444' : color} opacity={0.9} />
  } else if (f > 0.001) {
    const angle = f * 2 * Math.PI
    const x = c + r * Math.sin(angle)
    const y = c - r * Math.cos(angle)
    const largeArc = f > 0.5 ? 1 : 0
    slice = (
      <path
        d={`M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y} Z`}
        fill={color}
        opacity={0.9}
      />
    )
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-64 sm:w-72">
      <circle cx={c} cy={c} r={r} className="fill-neutral-200 dark:fill-neutral-800" />
      {slice}
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={2} className="stroke-neutral-300 dark:stroke-neutral-700" />
    </svg>
  )
}

interface Summary {
  taskName: string
  color: string
  plannedSec: number
  focusedSec: number
  pauseCount: number
}

export default function TimerPage() {
  const { active, loading, focusedLive, pause, resume, stop } = useFocus()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)

  if (summary) {
    const density = summary.plannedSec > 0 ? Math.round((summary.focusedSec / summary.plannedSec) * 100) : 0
    return (
      <div className="mx-auto mt-16 max-w-sm text-center">
        <p className="text-sm text-neutral-400">몰입 종료</p>
        <h1 className="mt-1 text-xl font-bold">{summary.taskName}</h1>
        <div className="mt-8 space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex justify-between">
            <span className="text-neutral-400">계획</span>
            <span className="font-semibold">{formatDuration(summary.plannedSec)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">실제 몰입</span>
            <span className="font-semibold" style={{ color: summary.color }}>
              {formatDuration(summary.focusedSec)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">몰입 밀도</span>
            <span className="font-semibold">{density}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">일시정지</span>
            <span className="font-semibold">{summary.pauseCount}회</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          확인
        </button>
      </div>
    )
  }

  if (loading) return <p className="mt-32 text-center text-sm text-neutral-400">불러오는 중…</p>

  if (!active) {
    return (
      <div className="mt-32 text-center text-sm text-neutral-400">
        진행 중인 몰입이 없어요.
        <br />
        <Link to="/" className="mt-2 inline-block font-semibold text-indigo-500">
          타임라인에서 시작하기 →
        </Link>
      </div>
    )
  }

  const running = active.session.state === 'running'
  const plannedSec = (active.timeBox.end_min - active.timeBox.start_min) * 60
  const remaining = plannedSec - focusedLive
  const overtime = remaining < 0

  async function handleStop() {
    if (!active) return
    setSummary({
      taskName: active.timeBox.task.name,
      color: active.timeBox.task.color,
      plannedSec,
      focusedSec: focusedLive,
      pauseCount: active.session.pause_count,
    })
    await stop()
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center pt-8">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: active.timeBox.task.color }} />
        <h1 className="text-lg font-bold">{active.timeBox.task.name}</h1>
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        계획 {formatDuration(plannedSec)} · 일시정지 {active.session.pause_count}회
      </p>

      <div className="relative mt-8">
        <TimerPie fraction={plannedSec > 0 ? remaining / plannedSec : 0} color={active.timeBox.task.color} overtime={overtime} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-bold tabular-nums text-white drop-shadow-sm">
            {overtime ? `+${formatClock(-remaining)}` : formatClock(remaining)}
          </span>
          <span className="mt-1 text-xs font-medium text-white/80 drop-shadow-sm">
            {running ? (overtime ? '초과 몰입 중' : '몰입 중') : '일시정지됨'}
          </span>
        </div>
      </div>

      <p className="mt-6 text-sm text-neutral-500">
        실제 몰입 <span className="font-semibold">{formatDuration(focusedLive)}</span>
      </p>

      <div className="mt-8 flex w-full gap-3">
        <button
          onClick={() => (running ? pause() : resume())}
          className={`flex-1 rounded-xl py-3.5 text-sm font-bold text-white ${
            running ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500 hover:bg-emerald-400'
          }`}
        >
          {running ? '⏸ 일시정지' : '▶ 재개'}
        </button>
        <button
          onClick={handleStop}
          className="flex-1 rounded-xl bg-neutral-800 py-3.5 text-sm font-bold text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          ■ 종료
        </button>
      </div>
    </div>
  )
}
