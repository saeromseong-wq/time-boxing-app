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

/** 타임박스 종료 분(0~2880) → 라벨. 1440(당일 24:00) 이후는 "다음날 HH:MM" */
export function endMinLabel(min: number): string {
  if (min <= 1440) return min === 1440 ? '24:00' : minToLabel(min)
  const rel = min - 1440
  return `다음날 ${rel === 1440 ? '24:00' : minToLabel(rel)}`
}

/** 현재 시각의 자정 기준 분 */
export function nowMin(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function snapTo(min: number, step: number): number {
  return Math.round(min / step) * step
}

/** "12:30", "1230", "930", "9" 같은 자유 입력 문자열 → 자정 기준 분. "다음날" 접두사는 +1440. 파싱 실패 시 null */
export function parseTimeInput(text: string): number | null {
  let rest = text.trim()
  let overnight = false
  if (rest.startsWith('다음날')) {
    overnight = true
    rest = rest.slice(3).trim()
  }
  let h: number
  let m: number
  const colonMatch = rest.match(/^(\d{1,2}):(\d{1,2})$/)
  if (colonMatch) {
    h = Number(colonMatch[1])
    m = Number(colonMatch[2])
  } else if (/^\d{1,4}$/.test(rest)) {
    if (rest.length <= 2) {
      h = Number(rest)
      m = 0
    } else {
      m = Number(rest.slice(-2))
      h = Number(rest.slice(0, -2))
    }
  } else {
    return null
  }
  if (h === 24 && m === 0) return overnight ? 2880 : 1440
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m + (overnight ? 1440 : 0)
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
