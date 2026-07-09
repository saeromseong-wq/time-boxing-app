export type Category = 'deep' | 'shallow' | 'rest'

export const CATEGORY_LABEL: Record<Category, string> = {
  deep: '딥워크',
  shallow: '얕은 일',
  rest: '휴식',
}

export const TASK_COLORS = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#64748b', // slate
]

export interface Task {
  id: string
  name: string
  color: string
  category: Category
  default_duration_min: number
  archived: boolean
  last_used_at: string | null
  created_at: string
}

export interface TimeBox {
  id: string
  task_id: string
  date: string // YYYY-MM-DD
  start_min: number // 자정 기준 분
  end_min: number
  created_at: string
}

export interface TimeBoxWithTask extends TimeBox {
  task: Task
}

export type SessionState = 'running' | 'paused' | 'done'

export interface FocusSession {
  id: string
  time_box_id: string
  state: SessionState
  started_at: string
  ended_at: string | null
  focused_seconds: number // 일시정지 제외 누적 (running 중에는 last_resumed_at 이후분 미포함)
  last_resumed_at: string | null
  pause_count: number
}
