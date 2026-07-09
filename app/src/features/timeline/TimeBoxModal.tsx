import { useState } from 'react'
import Modal from '../../components/Modal'
import { endMinLabel, formatDuration, minToLabel } from '../../lib/time'
import { CATEGORY_LABEL } from '../../types'
import type { TimeBoxWithTask } from '../../types'

interface Props {
  box: TimeBoxWithTask
  focusedSeconds: number
  isActive: boolean
  onStart: () => void
  onSave: (startMin: number, endMin: number) => void
  onDelete: () => void
  onClose: () => void
}

const START_OPTIONS = Array.from({ length: 96 }, (_, i) => i * 15) // 00:00–23:45
const END_OPTIONS = Array.from({ length: 192 }, (_, i) => (i + 1) * 15) // 00:15–다음날 24:00

export default function TimeBoxModal({
  box,
  focusedSeconds,
  isActive,
  onStart,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [start, setStart] = useState(box.start_min)
  const [end, setEnd] = useState(box.end_min)
  const changed = start !== box.start_min || end !== box.end_min

  return (
    <Modal title="타임박스" onClose={onClose}>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: box.task.color }} />
        <div>
          <p className="text-sm font-bold">{box.task.name}</p>
          <p className="text-xs text-neutral-400">
            {CATEGORY_LABEL[box.task.category]}
            {focusedSeconds > 0 && ` · 지금까지 몰입 ${formatDuration(focusedSeconds)}`}
          </p>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2 text-sm">
        <select
          value={start}
          onChange={(e) => {
            const s = Number(e.target.value)
            setStart(s)
            if (end <= s) setEnd(Math.min(s + 15, 2880))
          }}
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {START_OPTIONS.map((m) => (
            <option key={m} value={m}>{minToLabel(m)}</option>
          ))}
        </select>
        <span className="text-neutral-400">→</span>
        <select
          value={end}
          onChange={(e) => setEnd(Number(e.target.value))}
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {END_OPTIONS.filter((m) => m > start).map((m) => (
            <option key={m} value={m}>{endMinLabel(m)}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-400">({end - start}분)</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDelete}
          className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
        >
          삭제
        </button>
        <div className="flex-1" />
        {changed && (
          <button
            onClick={() => onSave(start, end)}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            시간 저장
          </button>
        )}
        <button
          onClick={onStart}
          disabled={isActive}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isActive ? '몰입 진행 중' : '▶ 몰입 시작'}
        </button>
      </div>
    </Modal>
  )
}
