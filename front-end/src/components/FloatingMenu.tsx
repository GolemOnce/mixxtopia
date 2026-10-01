import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface FloatingMenuLink {
  to: string
  label: string
}

// 메뉴별로 매칭되는 간단한 라인 아이콘(24x24 뷰박스, stroke 기반).
const ICONS: Record<string, JSX.Element> = {
  '/': <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  '/intro': (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  '/schedule': (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  '/vote': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.6 2.6L16 9.5" />
    </>
  ),
  '/photos': (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5-4 4-3-3-5 5" />
    </>
  ),
  '/board': (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  '/bustercall': (
    <>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </>
  ),
  '/admin': <path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z" />,
}

const DEFAULT_ICON = <circle cx="12" cy="12" r="8" />

const RADIUS = 168
const BUTTON_SIZE = 52
const EDGE_MARGIN = 8
const DRAG_THRESHOLD = 6 // px, 이보다 적게 움직이면 드래그가 아니라 클릭으로 처리
const POSITION_KEY = 'mixxtopia:nav-fab-position'

interface Position {
  left: number
  top: number
}

function loadPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') return parsed
    return null
  } catch {
    return null
  }
}

function savePosition(pos: Position) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos))
  } catch {
    // 저장에 실패해도(프라이빗 모드 등) 이번 세션에서의 위치 자체는 그대로 유지된다.
  }
}

function clamp(left: number, top: number): Position {
  const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - BUTTON_SIZE - EDGE_MARGIN)
  const maxTop = Math.max(EDGE_MARGIN, window.innerHeight - BUTTON_SIZE - EDGE_MARGIN)
  return {
    left: Math.min(Math.max(EDGE_MARGIN, left), maxLeft),
    top: Math.min(Math.max(EDGE_MARGIN, top), maxTop),
  }
}

// 버튼이 화면 어느 구석에 있는지에 따라 메뉴가 펼쳐질 각도 범위를 정한다.
// (항상 화면 안쪽을 향해 펼쳐지도록 사분면별로 반대쪽 부채꼴을 준다)
function arcRangeFor(position: Position | null): [number, number] {
  const cx = position ? position.left + BUTTON_SIZE / 2 : window.innerWidth - 20 - BUTTON_SIZE / 2
  const cy = position ? position.top + BUTTON_SIZE / 2 : window.innerHeight - 20 - BUTTON_SIZE / 2
  const nearRight = cx > window.innerWidth / 2
  const nearBottom = cy > window.innerHeight / 2

  if (nearRight && nearBottom) return [-180, -90] // 왼쪽 ~ 위
  if (!nearRight && nearBottom) return [-90, 0] // 위 ~ 오른쪽
  if (nearRight && !nearBottom) return [90, 180] // 아래 ~ 왼쪽
  return [0, 90] // 오른쪽 ~ 아래
}

export default function FloatingMenu({ links }: { links: FloatingMenuLink[] }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position | null>(loadPosition)
  const [dragging, setDragging] = useState(false)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    startLeft: number
    startTop: number
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)

  // Esc로도 닫을 수 있게 한다.
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // 화면 크기가 바뀌면(창 크기 조절, 기기 회전 등) 화면 밖으로 나가지 않게 다시 잡아준다.
  useEffect(() => {
    function handleResize() {
      setPosition((prev) => (prev ? clamp(prev.left, prev.top) : prev))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function handleSelect(to: string) {
    setOpen(false)
    navigate(to)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (open) return // 메뉴가 펼쳐져 있는 동안은 드래그를 막는다.

    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const state = dragRef.current
    if (!state) return

    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) state.moved = true
    if (!state.moved) return

    setPosition(clamp(state.startLeft + dx, state.startTop + dy))
  }

  function handlePointerUp() {
    const state = dragRef.current
    dragRef.current = null
    setDragging(false)
    if (!state) return

    if (state.moved) {
      // 실제로 옮겼을 때만 위치를 저장하고, 뒤이어 오는 click은 무시한다(열림/닫힘 토글 방지).
      suppressClickRef.current = true
      setPosition((prev) => {
        if (prev) savePosition(prev)
        return prev
      })
    }
  }

  function handleFabClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setOpen((v) => !v)
  }

  const count = links.length
  const [startAngle, endAngle] = arcRangeFor(position)
  const wrapStyle: React.CSSProperties = position
    ? { left: `${position.left}px`, top: `${position.top}px`, right: 'auto', bottom: 'auto' }
    : {}

  return (
    <>
      {open && (
        <button
          type="button"
          className="fab-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        ref={wrapRef}
        className={`fab-wrap${open ? ' open' : ''}${dragging ? ' dragging' : ''}`}
        style={wrapStyle}
      >
        {links.map((link, i) => {
          const t = count === 1 ? 0 : i / (count - 1)
          const angle = (startAngle + (endAngle - startAngle) * t) * (Math.PI / 180)
          const tx = Math.cos(angle) * RADIUS
          const ty = Math.sin(angle) * RADIUS
          const style = {
            '--tx': `${tx.toFixed(1)}px`,
            '--ty': `${ty.toFixed(1)}px`,
            transitionDelay: `${i * 0.03}s`,
          } as React.CSSProperties

          return (
            <button
              key={link.to}
              type="button"
              className="fab-item"
              style={style}
              title={link.label}
              aria-label={link.label}
              onClick={() => handleSelect(link.to)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ICONS[link.to] ?? DEFAULT_ICON}
              </svg>
            </button>
          )
        })}

        <button
          type="button"
          className="fab"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={open}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleFabClick}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </>
  )
}
