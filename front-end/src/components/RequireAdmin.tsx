import type { ReactNode } from 'react'

import { useCurrentUser } from '../auth/useCurrentUser'

// adminOnly: true면 manager는 막고 admin role만 통과시킨다(접속기록처럼 admin,manager
// 조합보다 더 좁게 제한해야 하는 페이지용). 기본값은 기존과 동일(admin,manager 모두 통과).
export default function RequireAdmin({
  children,
  adminOnly = false,
}: {
  children: ReactNode
  adminOnly?: boolean
}) {
  const { user, loading, isAdmin } = useCurrentUser()

  if (loading) return <div className="card muted">권한 확인 중...</div>

  if (!user) {
    return (
      <div className="card muted warn">
        관리자만 접근할 수 있는 페이지입니다. 관리자 계정으로 로그인해주세요.
      </div>
    )
  }

  const allowed = adminOnly ? user.role === 'admin' : isAdmin
  if (!allowed) {
    return <div className="card muted warn">관리자만 접근할 수 있는 페이지입니다.</div>
  }

  return <>{children}</>
}
