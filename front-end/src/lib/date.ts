export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function toIso(datetimeLocal: string): string {
  return new Date(datetimeLocal).toISOString()
}
