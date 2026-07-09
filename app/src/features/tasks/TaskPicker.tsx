import { useState } from 'react'
import Modal from '../../components/Modal'
import TaskForm from './TaskForm'
import { CATEGORY_LABEL } from '../../types'
import type { Task } from '../../types'
import type { TaskInput } from './useTasks'

interface Props {
  tasks: Task[]
  title?: string
  onPick: (task: Task) => void
  onCreate: (input: TaskInput) => Promise<Task>
  onClose: () => void
}

/** 최근 사용순 Task 목록에서 바로 선택 — 타임박스 2클릭 입력의 핵심 */
export default function TaskPicker({ tasks, title = 'Task 선택', onPick, onCreate, onClose }: Props) {
  const [creating, setCreating] = useState(false)

  return (
    <Modal title={creating ? '새 Task' : title} onClose={onClose}>
      {creating ? (
        <TaskForm
          onSubmit={async (input) => {
            const task = await onCreate(input)
            onPick(task)
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t)}
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left hover:border-indigo-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-500"
            >
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.name}</span>
              <span className="text-xs text-neutral-400">
                {CATEGORY_LABEL[t.category]} · {t.default_duration_min}분
              </span>
            </button>
          ))}
          <button
            onClick={() => setCreating(true)}
            className="w-full rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-indigo-400 hover:text-indigo-500 dark:border-neutral-700"
          >
            + 새 Task 만들기
          </button>
        </div>
      )}
    </Modal>
  )
}
