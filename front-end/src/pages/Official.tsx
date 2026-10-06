import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import BoardTable, { type BoardTableColumn } from '../components/BoardTable'
import { formatBoardDate } from '../lib/date'
import { getPaginationRange } from '../lib/pagination'
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
  photo_links: string[]
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
  const pageTokens = getPaginationRange(page, totalPages)

  const officialColumns: BoardTableColumn<OfficialItem>[] = [
    {
      key: 'num',
      label: '번호',
      className: 'board-col-num',
      render: (_item, i) => displayNumberOf(i),
    },
    {
      key: 'category',
      label: '계정',
      className: 'board-col-category',
      render: (item) => OFFICIAL_ACCOUNT_LABELS[item.account],
    },
    { key: 'title', label: '제목', className: 'board-col-title', render: (item) => item.title },
    {
      key: 'date',
      label: '업로드일',
      className: 'board-col-date',
      render: (item) => formatBoardDate(item.posted_at),
    },
  ]

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

        {!loading && !listError && (
          <BoardTable
            items={items}
            columns={officialColumns}
            titleColumnKey="title"
            rowKey={(item) => item.official_id}
            linkTo={(item) => `/official/${item.official_id}`}
            emptyMessage="등록된 게시글이 없습니다."
          />
        )}

        <div className="board-toolbar">
          <div className="row">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage(token)}
                >
                  {token}
                </button>
              ),
            )}
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음 &gt;
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
