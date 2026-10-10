import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const THEME_KEY = 'mixxtopia:theme'

function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

// 기본은 다크. index.html의 인라인 스크립트가 React가 뜨기 전에 이미 data-theme을
// 적용해두므로(깜빡임 방지), 여기서는 그 값을 그대로 읽어와 상태와 맞추기만 한다.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // 저장 실패해도(프라이빗 모드 등) 이번 세션에서의 토글 자체는 그대로 반영한다.
    }
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
