export interface ScheduleItem {
  schedule_id: string
  title: string
  content: string
  member: string[]
  category: string
  link: string
  organizer: string
  location: string
  start_at: string
  end_at: string
}

// 백엔드 검증에 쓰이는 고정 목록이 아니라, 자동완성용 힌트일 뿐이다.
// 모르는 값이 와도 CATEGORY_LABELS에 없으면 그냥 원문 그대로 보여준다.
export const SUGGESTED_CATEGORIES = [
  'musicbroad',
  'radio',
  'broadcast',
  'award',
  'festival',
  'concert',
  'fanmeeting',
  'fansign',
  'etc',
]

export const CATEGORY_LABELS: Record<string, string> = {
  musicbroad: '음방',
  radio: '라디오',
  broadcast: '방송',
  award: '시상식',
  festival: '축제',
  concert: '콘서트',
  fanmeeting: '팬미팅',
  fansign: '팬싸인회',
  etc: '기타',
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

const CATEGORY_COLORS: Record<string, string> = {
  musicbroad: '#f87171',
  radio: '#fb923c',
  broadcast: '#fbbf24',
  award: '#facc15',
  festival: '#34d399',
  concert: '#38bdf8',
  fanmeeting: '#818cf8',
  fansign: '#c084fc',
  etc: '#94a3b8',
}

// 자유 문자열이라 모르는 카테고리가 올 수 있다 — 그런 경우 문자열을 해시해서
// 팔레트 중 하나를 일관되게 골라준다(같은 카테고리는 항상 같은 색).
const FALLBACK_PALETTE = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#34d399',
  '#38bdf8',
  '#818cf8',
  '#c084fc',
  '#f472b6',
  '#94a3b8',
]

export function categoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category]

  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}
