import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// 공용 모달 — CLAUDE.md 요구사항대로 배경 흐림 효과는 넣지 않는다(투명 배경 클릭/Esc로 닫기).
export default function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
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
      <div className="modal-panel" role="dialog" aria-modal="true">
        <button type="button" className="modal-close" aria-label="닫기" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </>,
    document.body,
  )
}
