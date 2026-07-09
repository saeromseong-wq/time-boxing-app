import { useState } from 'react'
import { useTasks } from './useTasks'
import TaskForm from './TaskForm'
import Modal from '../../components/Modal'
import { CATEGORY_LABEL } from '../../types'
import type { Task } from '../../types'

export default function TasksPage() {
  const { tasks, loading, create, update, archive } = useTasks()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  if (loading) return <p className="mt-16 text-center text-sm text-neutral-400">불러오는 중…</p>

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Task 라이브러리</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          + 새 Task
        </button>
      </div>

      {tasks.length === 0 && (
        <p className="mt-16 text-center text-sm text-neutral-400">
          자주 하는 일을 Task로 등록해두면
          <br />
          타임박스를 1~2클릭으로 만들 수 있어요.
        </p>
      )}

      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-neutral-400">
                {CATEGORY_LABEL[t.category]} · 기본 {t.default_duration_min}분
              </p>
            </div>
            <button
              onClick={() => setEditing(t)}
              className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              수정
            </button>
            <button
              onClick={() => archive(t.id)}
              className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              보관
            </button>
          </li>
        ))}
      </ul>

      {creating && (
        <Modal title="새 Task" onClose={() => setCreating(false)}>
          <TaskForm
            onSubmit={async (input) => {
              await create(input)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
      {editing && (
        <Modal title="Task 수정" onClose={() => setEditing(null)}>
          <TaskForm
            initial={editing}
            onSubmit={async (input) => {
              await update(editing.id, input)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
