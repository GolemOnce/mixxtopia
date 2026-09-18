import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: '홈' },
  { to: '/schedule', label: '일정' },
  { to: '/vote', label: '투표' },
  { to: '/board', label: '게시판' },
  { to: '/bustercall', label: '총공' },
]

export default function NavBar() {
  return (
    <nav className="navbar">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
