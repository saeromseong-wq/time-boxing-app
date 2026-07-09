import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, nowMin, toDateStr, todayStr, weekStart } from '../../lib/time'
import { useTasks } from '../tasks/useTasks'
import { useTimeBoxes } from './useTimeBoxes'
import { useFocus } from '../timer/FocusContext'
import Timeline from './Timeline'
import WeekTimeline from './WeekTimeline'
import TaskPicker from '../tasks/TaskPicker'
import TimeBoxModal from './TimeBoxModal'
import type { Task, TimeBoxWithTask } from '../../types'

type ViewMode = 'day' | 'week'

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${day})`
}

function weekLabel(startStr: string, endStr: string): string {
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr + 'T00:00:00')
  return `${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getMonth() + 1}월 ${e.getDate()}일`
}

export default function TodayPage() {
  const [date, setDate] = useState(todayStr())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const navigate = useNavigate()
  const focus = useFocus()
  const { tasks, create: createTask } = useTasks()

  const weekStartStr = toDateStr(weekStart(new Date(date + 'T00:00:00')))
  const weekEndStr = toDateStr(addDays(new Date(weekStartStr + 'T00:00:00'), 6))
  const rangeStart = viewMode === 'week' ? weekStartStr : date
  const rangeEnd = viewMode === 'week' ? weekEndStr : date
  const { boxes, focusedByBox, create, updateTimes, remove } = useTimeBoxes(rangeStart, rangeEnd, focus.version)

  /** 타임라인에서 지정한 범위 — TaskPicker가 열려 있는 동안 유지 */
  const [pendingRange, setPendingRange] = useState<{ date: string; start: number; end: number | null } | null>(null)
  const [selected, setSelected] = useState<TimeBoxWithTask | null>(null)

  const isCurrentPeriod =
    viewMode === 'day' ? date === todayStr() : weekStartStr <= todayStr() && todayStr() <= weekEndStr
  const showQuick = isCurrentPeriod
  const quickTasks = tasks.slice(0, 6)

  async function startFocus(box: TimeBoxWithTask) {
    await focus.start(box)
    navigate('/timer')
  }

  /** 퀵버튼: 지금 시각에 타임박스 만들고 바로 몰입 시작 (1클릭) */
  async function quickStart(task: Task) {
    const start = Math.floor(nowMin() / 5) * 5
    const end = Math.min(start + task.default_duration_min, 1440)
    const box = await create(task, todayStr(), start, end)
    await startFocus(box)
  }

  async function handlePick(task: Task) {
    if (!pendingRange) return
    const start = pendingRange.start
    const end = pendingRange.end ?? Math.min(start + task.default_duration_min, 1440)
    await create(task, pendingRange.date, start, end)
    setPendingRange(null)
  }

  function goPrev() {
    setDate(toDateStr(addDays(new Date(date + 'T00:00:00'), viewMode === 'week' ? -7 : -1)))
  }
  function goNext() {
    setDate(toDateStr(addDays(new Date(date + 'T00:00:00'), viewMode === 'week' ? 7 : 1)))
  }

  return (
    <div>
      {/* 날짜 내비게이션 */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={goPrev}
          className="rounded-lg px-2.5 py-1 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold">{viewMode === 'day' ? dateLabel(date) : weekLabel(weekStartStr, weekEndStr)}</h1>
        <button
          onClick={goNext}
          className="rounded-lg px-2.5 py-1 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          ›
        </button>
        {!isCurrentPeriod && (
          <button
            onClick={() => setDate(todayStr())}
            className="rounded-lg bg-neutral-200 px-2.5 py-1 text-xs font-medium dark:bg-neutral-800"
          >
            오늘로
          </button>
        )}

        <div className="ml-auto flex rounded-lg border border-neutral-200 p-0.5 text-xs font-medium dark:border-neutral-800">
          {(['day', 'week'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`rounded-md px-2.5 py-1 ${
                viewMode === m
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              {m === 'day' ? '일간' : '주간'}
            </button>
          ))}
        </div>
      </div>

      {/* 바로 시작 퀵버튼 */}
      {showQuick && quickTasks.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-neutral-400">바로 시작</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => quickStart(t)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-1.5 pl-2.5 pr-3 text-xs font-semibold shadow-sm hover:border-indigo-400 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                ▶ {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mb-2 text-xs text-neutral-400">빈 시간을 클릭하거나 드래그해서 타임박스를 만드세요</p>

      {viewMode === 'day' ? (
        <Timeline
          date={date}
          boxes={boxes}
          focusedByBox={focusedByBox}
          activeBoxId={focus.active?.timeBox.id}
          onClickSlot={(start) => setPendingRange({ date, start, end: null })}
          onCreateRange={(start, end) => setPendingRange({ date, start, end })}
          onMove={updateTimes}
          onSelect={setSelected}
        />
      ) : (
        <WeekTimeline
          weekStartStr={weekStartStr}
          boxes={boxes}
          focusedByBox={focusedByBox}
          activeBoxId={focus.active?.timeBox.id}
          onClickSlot={(d, start) => setPendingRange({ date: d, start, end: null })}
          onCreateRange={(d, start, end) => setPendingRange({ date: d, start, end })}
          onMove={updateTimes}
          onSelect={setSelected}
        />
      )}

      {pendingRange && (
        <TaskPicker
          tasks={tasks}
          onPick={handlePick}
          onCreate={createTask}
          onClose={() => setPendingRange(null)}
        />
      )}

      {selected && (
        <TimeBoxModal
          box={selected}
          focusedSeconds={focusedByBox[selected.id] ?? 0}
          isActive={focus.active?.timeBox.id === selected.id}
          onStart={async () => {
            setSelected(null)
            await startFocus(selected)
          }}
          onSave={(s, e) => {
            updateTimes(selected.id, s, e)
            setSelected(null)
          }}
          onDelete={async () => {
            await remove(selected.id)
            setSelected(null)
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
