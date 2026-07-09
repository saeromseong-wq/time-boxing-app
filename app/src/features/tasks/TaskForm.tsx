import { useState } from 'react'
import type { FormEvent } from 'react'
import { CATEGORY_LABEL, TASK_COLORS } from '../../types'
import type { Category, Task } from '../../types'
import type { TaskInput } from './useTasks'

interface Props {
  initial?: Task
  onSubmit: (input: TaskInput) => Promise<void> | void
  onCancel: () => void
}

export default function TaskForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? TASK_COLORS[0])
  const [category, setCategory] = useState<Category>(initial?.category ?? 'deep')
  const [duration, setDuration] = useState(initial?.default_duration_min ?? 60)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onSubmit({ name: name.trim(), color, category, default_duration_min: duration })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        autoFocus
        placeholder="Task 이름 (예: 딥워크 — 글쓰기)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="flex gap-2">
        {TASK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-7 w-7 rounded-full transition ${color === c ? 'ring-2 ring-neutral-900 ring-offset-2 dark:ring-white dark:ring-offset-neutral-950' : ''}`}
            style={{ backgroundColor: c }}
            aria-label={`색상 ${c}`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              category === c
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
            }`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 text-sm">
        기본 시간
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {[15, 25, 30, 45, 60, 90, 120, 180].map((m) => (
            <option key={m} value={m}>
              {m >= 60 ? `${m / 60}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {initial ? '저장' : '만들기'}
        </button>
      </div>
    </form>
  )
}
