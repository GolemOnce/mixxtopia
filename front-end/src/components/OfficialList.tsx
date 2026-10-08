import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { formatBoardDate } from '../lib/date'
import { getPaginationRange } from '../lib/pagination'
import {
  OFFICIAL_ACCOUNTS,
  OFFICIAL_ACCOUNT_LABELS,
  type OfficialAccount,
} from '../lib/officialAccounts'
import { useIsMobile } from '../lib/useIsMobile'
import BoardTable, { type BoardTableColumn } from './BoardTable'

export interface OfficialItem {
  official_id: string
  posted_at: string
  account: OfficialAccount
  link: string
  title: string
  content: string
  photo_links: string[]
  video_links: string[]
  created_at: string
  updated_at: string | null
}

interface OfficialListResponse {
  items: OfficialItem[]
  total: number
  page: number
  page_size: number
}

// 오피셜 상세 페이지가 "이 글이 몇 페이지에 있는지" 백엔드에 물어볼 때도 같은 값을 써야
// 계산이 맞으므로 export.
export const PAGE_SIZE = 30

// 오피셜 목록(계정 탭 + 테이블 + 페이지네이션 + 등록 버튼).
// Official 페이지 본문이면서, 오피셜 등록 페이지 하단에도 그대로 재사용한다.
export default function OfficialList() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()
  const isMobile = useIsMobile()

  // 페이지/계정 필터를 URL 쿼리스트링에 둬서, 새로고침·링크 공유·뒤로가기에서도
  // 유지되게 한다(예: /official?account=nmixx_official&page=2).
  const [searchParams, setSearchParams] = useSearchParams()
  const accountFilter = (searchParams.get('account') as OfficialAccount | null) ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  function updateParams(updates: Record<string, string | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }

  const [items, setItems] = useState<OfficialItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [jumpValue, setJumpValue] = useState('')

  useEffect(() => {
    // 상세 페이지에서 "이 글이 있는 페이지"로 URL이 바로 이어서 바뀌는 경우, 이전(page=1)
    // 요청의 응답이 최신 요청보다 늦게 도착하면 최신 데이터를 덮어쓸 수 있다. effect가
    // 다시 돌면(= 더 최신 요청이 나가면) ignore를 세워서 먼저 나간 응답을 버린다.
    let ignore = false

    async function load() {
      setLoading(true)
      setListError(null)
      try {
        const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
        if (accountFilter) query.set('account', accountFilter)
        const data = await api.get<OfficialListResponse>(`/api/officials?${query.toString()}`)
        if (ignore) return
        setItems(data.items)
        setTotal(data.total)
      } catch (err) {
        if (ignore) return
        setListError(authErrorMessage(err, '목록을 불러오지 못했습니다.'))
        setItems([])
        setTotal(0)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [accountFilter, page])

  function handleAccountFilterChange(value: OfficialAccount | '') {
    updateParams({ account: value || null, page: null })
  }

  function goToPage(p: number) {
    updateParams({ page: p === 1 ? null : String(p) })
  }

  function handleJumpSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.trunc(Number(jumpValue))
    if (Number.isInteger(n) && n >= 1 && n <= totalPages) {
      goToPage(n)
    }
    setJumpValue('')
  }

  // "전체" 탭에서도 화면에 보여줄 가상 번호 — 저장된 값이 아니라 total/page로 매번 계산.
  function displayNumberOf(index: number): number {
    return total - (page - 1) * PAGE_SIZE - index
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageTokens = getPaginationRange(page, totalPages, isMobile ? 1 : 2)

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
    <>
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
        <form className="pagination-jump" onSubmit={handleJumpSubmit}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            className="pagination-jump-input"
            aria-label="이동할 페이지 번호"
          />
          <button type="submit" className="pagination-btn">
            이동
          </button>
        </form>
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
    </>
  )
}
