import { useNavigate } from 'react-router-dom'
import { useFocus } from './FocusContext'
import { formatClock } from '../../lib/time'

/** 타이머 진행 중 모든 화면 상단에 떠 있는 바 (라이브 액티비티의 웹 버전) */
export default function MiniTimerBar() {
  const { active, focusedLive, pause, resume } = useFocus()
  const navigate = useNavigate()
  if (!active) return null

  const running = active.session.state === 'running'
  const planned = (active.timeBox.end_min - active.timeBox.start_min) * 60
  const remaining = planned - focusedLive

  return (
    <div
      className="sticky top-0 z-40 flex cursor-pointer items-center gap-3 border-b border-neutral-200 px-4 py-2 text-sm text-white dark:border-neutral-800"
      style={{ backgroundColor: active.timeBox.task.color }}
      onClick={() => navigate('/timer')}
    >
      <span className={`h-2 w-2 rounded-full ${running ? 'animate-pulse bg-white' : 'bg-white/50'}`} />
      <span className="truncate font-semibold">{active.timeBox.task.name}</span>
      <span className="ml-auto font-mono tabular-nums">
        {remaining >= 0 ? formatClock(remaining) : `+${formatClock(-remaining)}`}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          running ? pause() : resume()
        }}
        className="rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30"
      >
        {running ? '일시정지' : '재개'}
      </button>
    </div>
  )
}
