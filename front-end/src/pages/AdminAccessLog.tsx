import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { formatDateTimeKST } from '../lib/date'
import { getPaginationRange } from '../lib/pagination'

type AccessLogAction = 'signup' | 'login' | 'logout' | 'post_create' | 'comment_create'

const ACTION_LABELS: Record<AccessLogAction, string> = {
  signup: '회원가입',
  login: '로그인',
  logout: '로그아웃',
  post_create: '게시글 작성',
  comment_create: '댓글 작성',
}

const ACTIONS = Object.keys(ACTION_LABELS) as AccessLogAction[]

interface AccessLogItem {
  user_id: string
  ip: string
  action: AccessLogAction
  created_at: string
}

interface AccessLogListResponse {
  items: AccessLogItem[]
  total: number
  page: number
  page_size: number
}

const PAGE_SIZE = 20

export default function AdminAccessLog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const actionFilter = (searchParams.get('action') as AccessLogAction | null) ?? ''
  const userIdFilter = searchParams.get('user_id') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const [userIdInput, setUserIdInput] = useState(userIdFilter)
  const [items, setItems] = useState<AccessLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  function updateParams(updates: Record<string, string | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }

  useEffect(() => {
    let ignore = false

    async function loadLogs() {
      setLoading(true)
      setListError(null)
      try {
        const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
        if (actionFilter) query.set('action', actionFilter)
        if (userIdFilter) query.set('user_id', userIdFilter)
        const data = await api.get<AccessLogListResponse>(`/api/access-logs?${query.toString()}`)
        if (ignore) return
        setItems(data.items)
        setTotal(data.total)
      } catch (err) {
        if (ignore) return
        setListError(authErrorMessage(err, '접속기록을 불러오지 못했습니다.'))
        setItems([])
        setTotal(0)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadLogs()
    return () => {
      ignore = true
    }
  }, [actionFilter, userIdFilter, page])

  function goToPage(p: number) {
    updateParams({ page: p === 1 ? null : String(p) })
  }

  function handleUserIdSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ user_id: userIdInput || null, page: null })
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageTokens = getPaginationRange(page, totalPages)

  return (
    <div className="card">
      <h1>접속기록</h1>
      <div className="muted">
        회원가입/로그인/로그아웃/글·댓글 작성 시점의 IP만 기록됩니다(90일 후 자동 삭제). 조회성 API
        호출은 기록 대상이 아닙니다.
      </div>
      <div className="detail-divider" />

      <div className="board-tabs">
        <button
          type="button"
          className={`board-tab${actionFilter === '' ? ' active' : ''}`}
          onClick={() => updateParams({ action: null, page: null })}
        >
          전체
        </button>
        {ACTIONS.map((a) => (
          <button
            key={a}
            type="button"
            className={`board-tab${actionFilter === a ? ' active' : ''}`}
            onClick={() => updateParams({ action: a, page: null })}
          >
            {ACTION_LABELS[a]}
          </button>
        ))}
      </div>

      <form className="row" onSubmit={handleUserIdSubmit} style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="user_id로 필터링"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
        />
        <button type="submit">검색</button>
        {userIdFilter && (
          <button
            type="button"
            onClick={() => {
              setUserIdInput('')
              updateParams({ user_id: null, page: null })
            }}
          >
            초기화
          </button>
        )}
      </form>

      {loading && <div className="muted">불러오는 중...</div>}
      {listError && <div className="muted warn">{listError}</div>}

      {!loading && !listError && (
        <table className="board-table">
          <thead>
            <tr>
              <th>행위</th>
              <th>user_id</th>
              <th>IP</th>
              <th>시각</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="board-table-empty muted">
                  기록이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((log, i) => (
                <tr key={`${log.user_id}-${log.created_at}-${i}`}>
                  <td>{ACTION_LABELS[log.action]}</td>
                  <td className="muted">{log.user_id}</td>
                  <td className="muted">{log.ip}</td>
                  <td className="muted">{formatDateTimeKST(log.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <div className="board-toolbar">
        <div className="row">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            &lt; 이전
          </button>
          {pageTokens.map((token, i) =>
            token === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className="pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={token}
                type="button"
                className={`pagination-page${token === page ? ' current' : ''}`}
                onClick={() => goToPage(token)}
              >
                {token}
              </button>
            ),
          )}
          <button
            type="button"
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            다음 &gt;
          </button>
        </div>
      </div>
    </div>
  )
}
