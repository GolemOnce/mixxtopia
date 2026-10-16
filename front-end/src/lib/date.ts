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

// 접속기록처럼 생략 없이 항상 전체(연월일시분초)를 보여줘야 할 때 사용. 보는 사람의
// 기기 시간대와 무관하게 한국 시간(Asia/Seoul)으로 고정 변환한다(DB엔 UTC로 저장됨).
export function formatDateTimeKST(iso: string): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

export function toIso(datetimeLocal: string): string {
  return new Date(datetimeLocal).toISOString()
}
