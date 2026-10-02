export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

// 게시판 목록용: 오늘 작성된 글은 시간만, 아니면 날짜만 짧게 보여준다.
export function formatBoardDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  return `${String(date.getFullYear()).slice(2)}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

export function toIso(datetimeLocal: string): string {
  return new Date(datetimeLocal).toISOString()
}
