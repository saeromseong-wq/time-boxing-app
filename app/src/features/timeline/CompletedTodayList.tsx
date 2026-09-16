import type { DailyTodo, TimeBoxWithTask, TimeBoxTodo } from '../../types'

interface Props {
  dailyTodos: DailyTodo[]
  timeBoxTodos: TimeBoxTodo[]
  boxes: TimeBoxWithTask[]
}

interface Entry {
  key: string
  text: string
  badges: string[]
}

/** 데일리 할 일과 타임박스별 할 일 중 완료된 것을 모두 모아 보여준다.
 * 데일리 항목이 어느 타임박스에 가져오기 되어 있으면(연동) 중복 없이 한 줄로 합쳐서 보여준다. */
export default function CompletedTodayList({ dailyTodos, timeBoxTodos, boxes }: Props) {
  const boxNameById = new Map(boxes.map((b) => [b.id, b.task.name]))

  const entries: Entry[] = []
  for (const d of dailyTodos) {
    if (!d.done) continue
    const linkedBoxNames = timeBoxTodos
      .filter((t) => t.daily_todo_id === d.id)
      .map((t) => boxNameById.get(t.time_box_id) ?? '타임박스')
    entries.push({ key: `daily-${d.id}`, text: d.text, badges: ['데일리', ...linkedBoxNames] })
  }
  for (const t of timeBoxTodos) {
    if (t.daily_todo_id || !t.done) continue
    entries.push({ key: `box-${t.id}`, text: t.text, badges: [boxNameById.get(t.time_box_id) ?? '타임박스'] })
  }

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="mb-2 text-sm font-bold">오늘 끝낸 일</p>
      {entries.length === 0 ? (
        <p className="text-xs text-neutral-400">아직 끝낸 일이 없어요</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.key} className="flex items-center gap-2">
              <span className="shrink-0 text-emerald-500">✓</span>
              <span className="flex-1 text-sm text-neutral-400 line-through">{e.text}</span>
              <span className="flex shrink-0 gap-1">
                {e.badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-md border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
                  >
                    {b}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
