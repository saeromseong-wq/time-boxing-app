import { useState } from 'react'
import { effectiveDone } from './useTodos'
import type { DailyTodo, TimeBoxTodo } from '../../types'

interface Props {
  todos: TimeBoxTodo[]
  dailyTodos: DailyTodo[]
  onAdd: (text: string) => void
  onToggle: (todo: TimeBoxTodo) => void
  onRemove: (id: string) => void
  onImport: (dailyTodo: DailyTodo) => void
}

/** 이 타임박스만의 할 일 — 직접 새로 추가하거나, 오늘의 할 일 중 하나를 골라 가져올 수 있다.
 * 가져온 항목(daily_todo_id 있음)은 완료 여부가 오늘의 할 일과 연동된다: 어느 쪽에서 체크해도 같이 체크된다. */
export default function TimeBoxTodoList({ todos, dailyTodos, onAdd, onToggle, onRemove, onImport }: Props) {
  const [text, setText] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setText('')
  }

  const importedIds = new Set(todos.map((t) => t.daily_todo_id).filter((id): id is string => id != null))
  const candidates = dailyTodos.filter((d) => !importedIds.has(d.id))

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-400">이 타임박스의 할 일</label>
      {todos.length > 0 && (
        <ul className="mb-2 space-y-1">
          {todos.map((t) => {
            const done = effectiveDone(t, dailyTodos)
            return (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => onToggle(t)}
                  className="h-4 w-4 shrink-0 accent-indigo-600"
                />
                <span className={`flex-1 text-sm ${done ? 'text-neutral-400 line-through' : ''}`}>{t.text}</span>
                {t.daily_todo_id && (
                  <span className="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    데일리 연동
                  </span>
                )}
                <button
                  onClick={() => onRemove(t.id)}
                  aria-label="할 일 삭제"
                  className="shrink-0 px-1 text-neutral-300 hover:text-red-500 dark:text-neutral-600"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mb-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="새 할 일 추가"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={submit}
          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          추가
        </button>
      </div>

      <button
        onClick={() => setImportOpen((v) => !v)}
        className="w-full rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {importOpen ? '접기 ▲' : '데일리 할 일에서 가져오기 ▼'}
      </button>
      {importOpen && (
        <ul className="mt-2 space-y-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
          {candidates.length === 0 && (
            <li className="px-1 py-1 text-xs text-neutral-400">가져올 데일리 할 일이 없어요</li>
          )}
          {candidates.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onImport(d)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="text-neutral-400">+</span>
                {d.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
