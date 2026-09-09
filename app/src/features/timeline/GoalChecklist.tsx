import { useState } from 'react'
import { MAX_GOALS } from '../../types'
import type { GoalItem } from '../../types'

interface Props {
  goals: GoalItem[]
  onChange: (goals: GoalItem[]) => void
}

/** 목표를 체크박스 목록으로 입력 — 체크하면 지우지 않고 취소선으로 지워나간다. 항목별 변경은 즉시 저장된다. */
export default function GoalChecklist({ goals, onChange }: Props) {
  const [text, setText] = useState('')

  function addItem() {
    const trimmed = text.trim()
    if (!trimmed || goals.length >= MAX_GOALS) return
    onChange([...goals, { text: trimmed, done: false }])
    setText('')
  }

  function toggle(i: number) {
    onChange(goals.map((g, idx) => (idx === i ? { ...g, done: !g.done } : g)))
  }

  function remove(i: number) {
    onChange(goals.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-400">목표 (선택, 최대 {MAX_GOALS}개)</label>
      {goals.length > 0 && (
        <ul className="mb-2 space-y-1">
          {goals.map((g, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={g.done}
                onChange={() => toggle(i)}
                className="h-4 w-4 shrink-0 accent-indigo-600"
              />
              <span className={`flex-1 text-sm ${g.done ? 'text-neutral-400 line-through' : ''}`}>{g.text}</span>
              <button
                onClick={() => remove(i)}
                aria-label="목표 삭제"
                className="shrink-0 px-1 text-neutral-300 hover:text-red-500 dark:text-neutral-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {goals.length < MAX_GOALS && (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // 한글 등 조합 입력 중 Enter로 조합을 끝내는 경우(isComposing)는 무시 —
              // 그렇지 않으면 조합이 끝나기 전에 addItem이 먼저 실행돼 마지막 글자가 씹히거나
              // 입력칸을 비운 뒤에 조합이 뒤늦게 커밋되어 마지막 글자가 남는다.
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                addItem()
              }
            }}
            placeholder="목표 추가"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            onClick={addItem}
            className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            추가
          </button>
        </div>
      )}
    </div>
  )
}
