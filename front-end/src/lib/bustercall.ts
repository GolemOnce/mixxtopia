export type BustercallCategory = 'comeback' | 'birthday' | 'anniversary'

export const CATEGORY_LABELS: Record<BustercallCategory, string> = {
  comeback: '컴백',
  birthday: '생일',
  anniversary: 'n주년',
}

// member/detail은 영문 키로 저장되지만 화면엔 한글로 보여준다.
const MEMBER_LABELS: Record<string, string> = {
  lily: '릴리',
  haewon: '해원',
  sullyoon: '설윤',
  bae: '배이',
  jiwoo: '지우',
  kyujin: '규진',
}

// 테이블에 없는 값(예: 컴백/n주년의 detail에 들어가는 곡 이름, 연차 숫자)은
// 번역하지 않고 원문 그대로 보여준다.
export function memberLabel(key: string): string {
  return MEMBER_LABELS[key] ?? key
}
