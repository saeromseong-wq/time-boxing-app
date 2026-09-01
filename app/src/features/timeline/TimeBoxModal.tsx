import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

const START_OPTIONS = Array.from({ length: 96 }, (_, i) => i * 15) // 00:00–23:45
const END_OPTIONS = Array.from({ length: 192 }, (_, i) => (i + 1) * 15) // 00:15–다음날 24:00

interface TimeFieldProps {
  value: number
  label: (min: number) => string
  options: number[]
  onCommit: (min: number) => void
}

/** 15분 단위 드롭다운 선택 + 필드를 클릭해 숫자로 직접 타이핑 모두 지원하는 시간 입력.
 * 네이티브 datalist는 현재 입력값과 일치하지 않는 옵션을 필터링해버려(예: 14:35 입력 중엔 15분 단위 옵션이 하나도 안 뜸)
 * 항상 전체 목록을 보여주는 커스텀 드롭다운을 직접 그린다. */
function TimeField({ value, label, options, onCommit }: TimeFieldProps) {
  const [text, setText] = useState(label(value))
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setText(label(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!menuRect) return
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
  }, [menuRect !== null])

  function commit() {
    const parsed = parseTimeInput(text)
    if (parsed === null) {
      setText(label(value))
      return
    }
    onCommit(snapTo(parsed, 5))
  }

  function openMenu() {
    const r = inputRef.current?.getBoundingClientRect()
    if (!r) return
    setMenuRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 112) })
  }

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => {
            e.target.select()
            openMenu()
          }}
          onBlur={() => {
            commit()
            setMenuRect(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setText(label(value))
              e.currentTarget.blur()
            }
          }}
          className="w-24 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 pr-6 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">▼</span>
      </div>
      {menuRect &&
        createPortal(
          <ul
            ref={listRef}
            className="fixed z-[60] max-h-48 overflow-y-auto rounded-lg border border-neutral-300 bg-white py-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
            style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
          >
            {options.map((m) => {
              const selected = m === value
              return (
                <li key={m}>
                  <button
                    type="button"
                    data-selected={selected}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setText(label(m))
                      onCommit(m)
                      setMenuRect(null)
                    }}
                    className={`flex w-full items-center gap-1 px-3 py-1 text-left ${selected ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  >
                    {selected && <span>✓</span>}
                    {label(m)}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
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
