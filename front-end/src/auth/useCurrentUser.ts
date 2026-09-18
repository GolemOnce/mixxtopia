import { useEffect, useState } from 'react'

import { api } from '../api/client'

export type Role = 'admin' | 'manager' | 'user'

export interface CurrentUser {
  user_id: string
  nickname: string
  role: Role
}

interface AuthMeResponse {
  logged_in: boolean
  user_id: string | null
  nickname: string | null
  role: Role | null
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    api
      .get<AuthMeResponse>('/api/auth/me')
      .then((data) => {
        if (cancelled) return
        setUser(
          data.logged_in && data.user_id && data.nickname && data.role
            ? { user_id: data.user_id, nickname: data.nickname, role: data.role }
            : null,
        )
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  return { user, loading, isAdmin }
}
