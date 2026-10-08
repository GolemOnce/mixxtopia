import { useEffect, useState } from 'react'

// index.css의 .board-toolbar 모바일 분기 breakpoint(768px)와 맞춘다.
const QUERY = '(max-width: 768px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const handleChange = () => setIsMobile(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
