export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function daysInMonth(year: number, month: number): number {
  // month는 1~12. day 0 = 그 전달의 마지막 날.
  return new Date(year, month, 0).getDate()
}

// 월달력 그리드. null은 그 달에 속하지 않는 빈 칸(앞/뒤 채움용).
export function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const startWeekday = new Date(year, month - 1, 1).getDay()
  const total = daysInMonth(year, month)

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

export function isToday(year: number, month: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day
}

// 일정 하나가 여러 날에 걸칠 수 있어, 이 달의 각 날짜별로 겹치는 일정들을 묶어준다.
export function groupByDay<T extends { start_at: string; end_at: string }>(
  items: T[],
  year: number,
  month: number,
): Record<number, T[]> {
  const result: Record<number, T[]> = {}
  const total = daysInMonth(year, month)

  for (const item of items) {
    const start = new Date(item.start_at).getTime()
    const end = new Date(item.end_at).getTime()
    for (let d = 1; d <= total; d++) {
      const dayStart = new Date(year, month - 1, d, 0, 0, 0, 0).getTime()
      // half-open 구간 [dayStart, 다음날 0시)로 비교한다 — end가 정확히 자정과 같으면
      // (예: 23:00~24:00짜리 일정) 그 순간은 다음 날에 "걸치지 않은" 것으로 처리해야
      // 경계에서 다음 날에도 중복으로 잡히지 않는다.
      const nextDayStart = new Date(year, month - 1, d + 1, 0, 0, 0, 0).getTime()
      if (start < nextDayStart && end > dayStart) {
        ;(result[d] ??= []).push(item)
      }
    }
  }

  return result
}
