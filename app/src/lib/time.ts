/** 로컬 기준 YYYY-MM-DD */
export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

/** 자정 기준 분 → "HH:MM" */
export function minToLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 현재 시각의 자정 기준 분 */
export function nowMin(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function snapTo(min: number, step: number): number {
  return Math.round(min / step) * step
}

/** 초 → "1시간 23분" / "45분" / "30초" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
  if (m > 0) return `${m}분`
  return `${s}초`
}

/** 초 → "MM:SS" 또는 "H:MM:SS" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(Math.abs(seconds)))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** 해당 날짜가 속한 주의 월요일 */
export function weekStart(d: Date): Date {
  const r = new Date(d)
  const day = (r.getDay() + 6) % 7 // 월=0
  r.setDate(r.getDate() - day)
  r.setHours(0, 0, 0, 0)
  return r
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
