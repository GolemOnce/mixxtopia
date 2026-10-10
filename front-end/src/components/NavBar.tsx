import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { api } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { useTheme } from '../lib/useTheme'
import FloatingMenu from './FloatingMenu'

const BASE_LINKS = [
  { to: '/', label: '홈' },
  { to: '/intro', label: '소개' },
  { to: '/official', label: '공식' },
  { to: '/schedule', label: '일정' },
  { to: '/vote', label: '투표' },
  { to: '/photos', label: '사진검색' },
  { to: '/board', label: '커뮤니티' },
  { to: '/bustercall', label: '총공' },
]

const FAB_ENABLED_KEY = 'mixxtopia:nav-fab-enabled'

function loadFabEnabled(): boolean {
  try {
    // 기본값 on. 껐던 적이 있으면(로컬 저장) 그 상태를 유지한다.
    return localStorage.getItem(FAB_ENABLED_KEY) !== '0'
  } catch {
    return true
  }
}

export default function NavBar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fabEnabled, setFabEnabled] = useState(loadFabEnabled)
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const { user, loading, isAdmin } = useCurrentUser()

  const links = isAdmin ? [...BASE_LINKS, { to: '/admin', label: '관리자' }] : BASE_LINKS

  // NavLink의 기본 활성 판정(= '/'는 완전 일치, 나머지는 하위 경로 포함)과 동일한 기준으로
  // 현재 메뉴를 찾는다. 모바일 상단바의 "현재 메뉴명"에 쓴다.
  const currentLink = links.find((link) =>
    link.to === '/'
      ? location.pathname === '/'
      : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`),
  )

  // 라우트가 바뀌면(드로어의 링크 클릭 포함) 드로어를 닫는다.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // 드로어가 열려있는 동안 Esc로도 닫을 수 있게 한다.
  useEffect(() => {
    if (!drawerOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  function toggleFabEnabled() {
    setFabEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(FAB_ENABLED_KEY, next ? '1' : '0')
      } catch {
        // 저장에 실패해도(프라이빗 모드 등) 이번 세션에서의 토글 자체는 그대로 반영한다.
      }
      return next
    })
  }

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      // 쿠키/서버 상태 정리 후 전체 새로고침으로 로그인 상태를 깨끗하게 리셋한다.
      window.location.href = '/'
    }
  }

  function renderLinks(onNavigate?: () => void) {
    return links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.to === '/'}
        className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        onClick={onNavigate}
      >
        {link.label}
      </NavLink>
    ))
  }

  // 다크/라이트 전환 + fab 버튼 on/off 토글. 데스크톱은 navbar-right에, 모바일은
  // 상단바가 비좁아서 햄버거 드로어 맨 아래 한 줄로 옮겨서 보여준다(같은 버튼을
  // 두 군데서 재사용 — 실제로 보이는 쪽만 CSS 미디어쿼리로 결정).
  function renderToggles() {
    return (
      <>
        <button
          type="button"
          className="navbar-theme-switch"
          aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          aria-pressed={theme === 'light'}
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
          onClick={toggleTheme}
        >
          <span className="navbar-theme-switch-thumb">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path
                  d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </span>
        </button>
        <button
          type="button"
          className="navbar-fab-switch"
          aria-label={fabEnabled ? '플로팅 메뉴 버튼 끄기' : '플로팅 메뉴 버튼 켜기'}
          aria-pressed={fabEnabled}
          title={fabEnabled ? '토글 OFF' : '토글 ON'}
          onClick={toggleFabEnabled}
        >
          <span className="navbar-fab-switch-thumb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      </>
    )
  }

  function renderAuth() {
    if (loading) return null

    if (!user) {
      return (
        <Link to="/login" className="navbar-link">
          로그인
        </Link>
      )
    }

    return (
      <div className="navbar-auth">
        <span className="muted">{user.nickname}님</span>
        <button type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <header className="navbar">
      <div className="navbar-bar">
        <button
          type="button"
          className="navbar-hamburger"
          aria-label="메뉴 열기"
          onClick={() => setDrawerOpen(true)}
        >
          ☰
        </button>
        <Link to="/" className="navbar-brand">
          <img src="/mixxtopia_png_rs.png" alt="MIXXTOPIA" />
        </Link>
        {currentLink && (
          <button type="button" className="navbar-current" onClick={() => window.location.reload()}>
            {currentLink.label}
          </button>
        )}
        <nav className="navbar-links">{renderLinks()}</nav>
        <div className="navbar-right">
          <div className="navbar-toggles">{renderToggles()}</div>
          <div className="navbar-auth-slot">{renderAuth()}</div>
        </div>
      </div>

      {drawerOpen && (
        <>
          <button
            type="button"
            className="navbar-drawer-backdrop"
            aria-label="메뉴 닫기"
            onClick={() => setDrawerOpen(false)}
          />
          <nav className="navbar-drawer">
            {renderLinks(() => setDrawerOpen(false))}
            <div className="navbar-drawer-toggles">{renderToggles()}</div>
          </nav>
        </>
      )}

      {fabEnabled && <FloatingMenu links={links} />}
    </header>
  )
}
