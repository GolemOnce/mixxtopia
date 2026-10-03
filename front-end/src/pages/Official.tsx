import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { formatBoardDate } from '../lib/date'
import {
  OFFICIAL_ACCOUNTS,
  OFFICIAL_ACCOUNT_LABELS,
  type OfficialAccount,
} from '../lib/officialAccounts'

interface OfficialItem {
  official_id: string
  posted_at: string
  account: OfficialAccount
  link: string
  title: string
  content: string
  photo_link: string | null
  created_at: string
  updated_at: string | null
}

interface OfficialListResponse {
  items: OfficialItem[]
  total: number
  page: number
  page_size: number
}

const PAGE_SIZE = 30
const PAGE_WINDOW = 9

export default function Official() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()

  const [accountFilter, setAccountFilter] = useState<OfficialAccount | ''>('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<OfficialItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  async function load(account: OfficialAccount | '', p: number) {
    setLoading(true)
    setListError(null)
    try {
      const query = new URLSearchParams({ page: String(p), page_size: String(PAGE_SIZE) })
      if (account) query.set('account', account)
      const data = await api.get<OfficialListResponse>(`/api/officials?${query.toString()}`)
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      setListError(authErrorMessage(err, '목록을 불러오지 못했습니다.'))
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(accountFilter, page)
  }, [accountFilter, page])

  function handleAccountFilterChange(value: OfficialAccount | '') {
    setAccountFilter(value)
    setPage(1)
  }

  // "전체" 탭에서도 화면에 보여줄 가상 번호 — 저장된 값이 아니라 total/page로 매번 계산.
  function displayNumberOf(index: number): number {
    return total - (page - 1) * PAGE_SIZE - index
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  let pageWindowStart = Math.max(1, page - Math.floor(PAGE_WINDOW / 2))
  if (pageWindowStart + PAGE_WINDOW - 1 > totalPages) {
    pageWindowStart = Math.max(1, totalPages - PAGE_WINDOW + 1)
  }
  const pageNumbers = Array.from(
    { length: Math.min(PAGE_WINDOW, totalPages) },
    (_, i) => pageWindowStart + i,
  )

  return (
    <div className="page-with-sidebar">
      <div className="card">
        <div className="board-tabs">
          <button
            type="button"
            className={`board-tab${accountFilter === '' ? ' active' : ''}`}
            onClick={() => handleAccountFilterChange('')}
          >
            전체
          </button>
          {OFFICIAL_ACCOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              className={`board-tab${accountFilter === a ? ' active' : ''}`}
              onClick={() => handleAccountFilterChange(a)}
            >
              {OFFICIAL_ACCOUNT_LABELS[a]}
            </button>
          ))}
        </div>

        {loading && <div className="muted">불러오는 중...</div>}
        {listError && <div className="muted warn">{listError}</div>}
        {!loading && !listError && items.length === 0 && (
          <div className="muted">등록된 게시글이 없습니다.</div>
        )}

        {!loading && !listError && items.length > 0 && (
          <>
            <table className="board-table">
              <thead>
                <tr>
                  <th className="board-col-num">번호</th>
                  <th className="board-col-category">계정</th>
                  <th className="board-col-title">제목</th>
                  <th className="board-col-date">업로드일</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.official_id}>
                    <td className="board-col-num muted">{displayNumberOf(i)}</td>
                    <td className="board-col-category muted">
                      {OFFICIAL_ACCOUNT_LABELS[item.account]}
                    </td>
                    <td className="board-col-title">
                      <Link to={`/official/${item.official_id}`}>{item.title}</Link>
                    </td>
                    <td className="board-col-date muted">{formatBoardDate(item.posted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="board-list">
              {items.map((item) => (
                <Link
                  to={`/official/${item.official_id}`}
                  className="board-list-item"
                  key={item.official_id}
                >
                  <div className="board-list-title">{item.title}</div>
                  <div className="muted board-list-meta">
                    {OFFICIAL_ACCOUNT_LABELS[item.account]} · {formatBoardDate(item.posted_at)}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="board-toolbar">
          <div className="row">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              처음
            </button>
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                className={`pagination-page${n === page ? ' current' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              끝
            </button>
          </div>
          {isAdmin && (
            <button
              type="button"
              className="board-write-btn"
              onClick={() => navigate('/official/new')}
            >
              ✎ 등록
            </button>
          )}
        </div>
      </div>

      {/* 임시 자리 — 나중에 다른 콘텐츠 들어갈 공간 */}
      <div className="page-sidebar" />
    </div>
  )
}
