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
