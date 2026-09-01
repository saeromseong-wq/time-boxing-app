import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { endMinLabel, formatDuration, minToLabel, parseTimeInput, snapTo } from '../../lib/time'
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

const START_OPTIONS = Array.from({ length: 288 }, (_, i) => i * 5) // 00:00–23:55
const END_OPTIONS = Array.from({ length: 576 }, (_, i) => (i + 1) * 5) // 00:05–다음날 24:00

interface TimeFieldProps {
  id: string
  value: number
  label: (min: number) => string
  options: number[]
  onCommit: (min: number) => void
}

/** 드롭다운으로 5분 단위 선택 + 필드를 클릭해 숫자로 직접 타이핑 모두 지원하는 시간 입력 */
function TimeField({ id, value, label, options, onCommit }: TimeFieldProps) {
  const [text, setText] = useState(label(value))

  useEffect(() => {
    setText(label(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function commit() {
    const parsed = parseTimeInput(text)
    if (parsed === null) {
      setText(label(value))
      return
    }
    onCommit(snapTo(parsed, 5))
  }

  return (
    <>
      <input
        list={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="w-24 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <datalist id={id}>
        {options.map((m) => (
          <option key={m} value={label(m)} />
        ))}
      </datalist>
    </>
  )
}

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
        <TimeField
          id="timebox-start"
          value={start}
          label={minToLabel}
          options={START_OPTIONS}
          onCommit={(s) => {
            setStart(s)
            if (end <= s) setEnd(Math.min(s + 5, 2880))
          }}
        />
        <span className="text-neutral-400">→</span>
        <TimeField
          id="timebox-end"
          value={end}
          label={endMinLabel}
          options={END_OPTIONS.filter((m) => m > start)}
          onCommit={(e) => {
            const rolled = e <= start ? e + 1440 : e
            setEnd(Math.max(rolled, start + 5))
          }}
        />
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
