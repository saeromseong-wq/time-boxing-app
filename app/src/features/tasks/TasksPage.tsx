import { useEffect, useRef, useState } from 'react'
import { useTasks } from './useTasks'
import TaskForm from './TaskForm'
import Modal from '../../components/Modal'
import { CATEGORY_LABEL } from '../../types'
import type { Task } from '../../types'

interface DragMeta {
  id: string
  /** 잡은 지점이 row 상단에서 얼마나 떨어져 있는지 */
  grabY: number
  height: number
  left: number
  width: number
}

export default function TasksPage() {
  const { tasks, loading, create, update, archive, reorder, toggleQuickStart } = useTasks()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  /** 화면에 보여줄 현재 순서 — 드래그 중엔 실시간으로 갱신, 아니면 tasks와 동기화 */
  const [order, setOrder] = useState<Task[]>(tasks)
  const [dragId, setDragId] = useState<string | null>(null)
  const [pointerY, setPointerY] = useState(0)
  const dragMetaRef = useRef<DragMeta | null>(null)
  const orderRef = useRef<Task[]>(tasks)
  const rowRefs = useRef(new Map<string, HTMLLIElement>())

  useEffect(() => {
    if (!dragMetaRef.current) setOrder(tasks)
  }, [tasks])

  useEffect(() => {
    orderRef.current = order
  }, [order])

  useEffect(() => {
    if (!dragId) return
    document.body.classList.add('dragging')

    function onMove(e: PointerEvent) {
      setPointerY(e.clientY)
      const meta = dragMetaRef.current
      if (!meta) return
      const centerY = e.clientY - meta.grabY + meta.height / 2
      setOrder((prev) => {
        const dragged = prev.find((t) => t.id === meta.id)
        if (!dragged) return prev
        const others = prev.filter((t) => t.id !== meta.id)
        let index = others.length
        for (let i = 0; i < others.length; i++) {
          const el = rowRefs.current.get(others[i].id)
          if (!el) continue
          const rect = el.getBoundingClientRect()
          if (centerY < rect.top + rect.height / 2) {
            index = i
            break
          }
        }
        const next = [...others.slice(0, index), dragged, ...others.slice(index)]
        return next.every((t, i) => t.id === prev[i]?.id) ? prev : next
      })
    }

    function onUp() {
      dragMetaRef.current = null
      setDragId(null)
      const changed = orderRef.current.some((t, i) => t.id !== tasks[i]?.id)
      if (changed) reorder(orderRef.current.map((t) => t.id))
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      document.body.classList.remove('dragging')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId])

  if (loading) return <p className="mt-16 text-center text-sm text-neutral-400">불러오는 중…</p>

  function onHandlePointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return
    e.preventDefault()
    const el = rowRefs.current.get(id)
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragMetaRef.current = { id, grabY: e.clientY - rect.top, height: rect.height, left: rect.left, width: rect.width }
    setPointerY(e.clientY)
    setDragId(id)
  }

  const dragMeta = dragId ? dragMetaRef.current : null

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

      {tasks.length > 0 && (
        <p className="mb-2 text-xs text-neutral-400">
          ☰를 드래그해서 순서를 바꾸고, ★를 눌러 홈 화면 '바로 시작'에 노출할 Task를 골라주세요.
        </p>
      )}

      <ul className="space-y-2">
        {order.map((t) => {
          const isDragging = dragId === t.id
          return (
            <li
              key={t.id}
              ref={(el) => {
                if (el) rowRefs.current.set(t.id, el)
                else rowRefs.current.delete(t.id)
              }}
              className={`flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 ${
                isDragging ? 'invisible' : ''
              }`}
            >
              <span
                onPointerDown={(e) => onHandlePointerDown(e, t.id)}
                aria-label="드래그해서 순서 변경"
                className="shrink-0 touch-none cursor-grab select-none px-1 text-base text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400"
              >
                ☰
              </span>
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-neutral-400">
                  {CATEGORY_LABEL[t.category]} · 기본 {t.default_duration_min}분
                </p>
              </div>
              <button
                onClick={() => toggleQuickStart(t.id)}
                aria-label="바로 시작에 노출"
                title="홈 화면 '바로 시작'에 노출"
                className={`rounded-md px-2 py-1 text-base ${
                  t.quick_start_order != null
                    ? 'text-amber-500'
                    : 'text-neutral-300 hover:text-neutral-400 dark:text-neutral-700 dark:hover:text-neutral-500'
                }`}
              >
                {t.quick_start_order != null ? '★' : '☆'}
              </button>
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
          )
        })}
      </ul>

      {/* 드래그 중인 row를 포인터 위치에 붙여서 보여주는 플로팅 클론 */}
      {dragId &&
        dragMeta &&
        (() => {
          const t = order.find((x) => x.id === dragId)
          if (!t) return null
          return (
            <div
              className="pointer-events-none fixed z-50 flex items-center gap-3 rounded-xl border border-indigo-300 bg-white px-4 py-3 opacity-95 shadow-xl dark:border-indigo-600 dark:bg-neutral-900"
              style={{
                top: pointerY - dragMeta.grabY,
                left: dragMeta.left,
                width: dragMeta.width,
                height: dragMeta.height,
              }}
            >
              <span className="shrink-0 text-base text-neutral-400">☰</span>
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-neutral-400">
                  {CATEGORY_LABEL[t.category]} · 기본 {t.default_duration_min}분
                </p>
              </div>
            </div>
          )
        })()}

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
