import { useRef, useState } from 'react'
import type { DailyTodo } from '../../types'

interface Props {
  todos: DailyTodo[]
  onAdd: (text: string) => void
  onToggle: (todo: DailyTodo) => void
  onRemove: (id: string) => void
}

/** 오늘의 할 일 — 타임박스와 무관하게 하루 단위로 관리하는 독립 체크리스트.
 * 타임라인 공간을 아끼기 위해 입력창은 기본적으로 접혀 있고, [+]를 눌러야 나타난다. */
export default function DailyTodoList({ todos, onAdd, onToggle, onRemove }: Props) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setText('')
    inputRef.current?.focus()
  }

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-bold">오늘의 할 일</p>
        <button
          onClick={() => setAdding((v) => !v)}
          aria-label={adding ? '할 일 입력 닫기' : '할 일 추가'}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          {adding ? '✕' : '+'}
        </button>
      </div>

      {todos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => onToggle(t)}
                className="h-4 w-4 shrink-0 accent-indigo-600"
              />
              <span className={`flex-1 text-sm ${t.done ? 'text-neutral-400 line-through' : ''}`}>{t.text}</span>
              <button
                onClick={() => onRemove(t.id)}
                aria-label="할 일 삭제"
                className="shrink-0 px-1 text-neutral-300 hover:text-red-500 dark:text-neutral-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="할 일 추가"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            onClick={submit}
            className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            추가
          </button>
        </div>
      )}
    </div>
  )
}
