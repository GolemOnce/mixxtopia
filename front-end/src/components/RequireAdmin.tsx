import type { ReactNode } from 'react'

import { useCurrentUser } from '../auth/useCurrentUser'

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useCurrentUser()

  if (loading) return <div className="card muted">권한 확인 중...</div>

  if (!user) {
    return (
      <div className="card muted warn">
        관리자만 접근할 수 있는 페이지입니다. 관리자 계정으로 로그인해주세요.
      </div>
    )
  }

  if (!isAdmin) {
    return <div className="card muted warn">관리자만 접근할 수 있는 페이지입니다.</div>
  }

  return <>{children}</>
}
