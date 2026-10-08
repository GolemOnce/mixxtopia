import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// 공용 모달 — 배경을 흐리게(반투명 어둡게) 깔고, 바깥 클릭/Esc로 닫는다.
export default function Modal({
  onClose,
  children,
  panelClassName,
}: {
  onClose: () => void
  children: ReactNode
  panelClassName?: string
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <>
      <button type="button" className="modal-backdrop" aria-label="닫기" onClick={onClose} />
      <div
        className={`modal-panel${panelClassName ? ` ${panelClassName}` : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="modal-close" aria-label="닫기" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </>,
    document.body,
  )
}
