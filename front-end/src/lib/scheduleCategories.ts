import { useCallback, useEffect, useState } from 'react'

import { api } from '../api/client'

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

// 관리자가 /admin/schedule-category에서 추가/수정/삭제하는 값이라 고정 목록이 아니다.
export interface ScheduleCategoryItem {
  category_id: string
  label: string
  color: string
  order: number
}

export function useScheduleCategories() {
  const [categories, setCategories] = useState<ScheduleCategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    return api
      .get<ScheduleCategoryItem[]>('/api/schedule-categories')
      .then((data) => setCategories(data))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { categories, loading, refetch }
}

// 멤버 선택 버튼용 고정 목록. 값은 그대로 member 배열에 저장되는 한글 표기다
// (bustercall.ts의 영문 키 변환과 달리, 스케줄은 애초에 한글 문자열을 그대로 써왔다).
export const NMIXX_MEMBERS = ['릴리', '해원', '설윤', '배이', '지우', '규진']

// 삭제된 종류를 참조하는 과거 일정 등 목록에 없는 category_id가 올 수 있다 — 그런 경우
// 원문 그대로 보여준다.
export function findCategoryLabel(categories: ScheduleCategoryItem[], categoryId: string): string {
  return categories.find((c) => c.category_id === categoryId)?.label ?? categoryId
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

export function findCategoryColor(categories: ScheduleCategoryItem[], categoryId: string): string {
  const known = categories.find((c) => c.category_id === categoryId)?.color
  if (known) return known

  let hash = 0
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}
