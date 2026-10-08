import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { formatBoardDate } from '../lib/date'
import { getPaginationRange } from '../lib/pagination'
import { POST_CATEGORIES, POST_CATEGORY_LABELS, type PostCategory } from '../lib/postCategories'
import BoardTable, { type BoardTableColumn } from './BoardTable'

export interface PostItem {
  post_id: string
  post_num: number
  display_num: number | null
  author: string
  category: PostCategory
  title: string
  content: string
  view_count: number
  created_at: string
  updated_at: string | null
}

interface PostListResponse {
  items: PostItem[]
  total: number
  page: number
  page_size: number
}

// 게시글 상세 페이지가 "이 글이 몇 페이지에 있는지" 백엔드에 물어볼 때도 같은 값을 써야
// 계산이 맞으므로 export.
export const PAGE_SIZE = 30

// 커뮤니티 게시판 목록(카테고리 탭 + 테이블 + 페이지네이션 + 글쓰기).
// Board 페이지 본문이면서, 게시글 상세 페이지 하단에도 그대로 재사용한다.
export default function BoardList() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()
  const filterCategories = isAdmin
    ? POST_CATEGORIES
    : POST_CATEGORIES.filter((c) => c !== 'suggestion')

  // 페이지/카테고리를 컴포넌트 상태가 아니라 URL 쿼리스트링에 둬서, 새로고침·링크
  // 공유·뒤로가기에서도 유지되게 한다(예: /board?category=free&page=2).
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFilter = (searchParams.get('category') as PostCategory | null) ?? ''
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

  const [posts, setPosts] = useState<PostItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    // 상세 페이지에서 "이 글이 있는 페이지"로 URL이 바로 이어서 바뀌는 경우, 이전(page=1)
    // 요청의 응답이 최신 요청보다 늦게 도착하면 최신 데이터를 덮어쓸 수 있다. effect가
    // 다시 돌면(= 더 최신 요청이 나가면) ignore를 세워서 먼저 나간 응답을 버린다.
    let ignore = false

    async function loadPosts() {
      setLoading(true)
      setListError(null)
      try {
        const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
        if (categoryFilter) query.set('category', categoryFilter)
        const data = await api.get<PostListResponse>(`/api/posts?${query.toString()}`)
        if (ignore) return
        setPosts(data.items)
        setTotal(data.total)
      } catch (err) {
        if (ignore) return
        setListError(authErrorMessage(err, '목록을 불러오지 못했습니다.'))
        setPosts([])
        setTotal(0)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadPosts()
    return () => {
      ignore = true
    }
  }, [categoryFilter, page])

  function handleCategoryFilterChange(value: PostCategory | '') {
    updateParams({ category: value || null, page: null })
  }

  function goToPage(p: number) {
    updateParams({ page: p === 1 ? null : String(p) })
  }

  // "전체" 탭에서는 카테고리를 가리지 않는 가상 번호(display_num)를,
  // 특정 카테고리로 필터링했을 때는 그 카테고리 안의 고유 번호(post_num)를 보여준다.
  function displayNumberOf(post: PostItem): number {
    return categoryFilter === '' ? (post.display_num ?? post.post_num) : post.post_num
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageTokens = getPaginationRange(page, totalPages)

  const boardColumns: BoardTableColumn<PostItem>[] = [
    { key: 'num', label: '번호', className: 'board-col-num', render: displayNumberOf },
    {
      key: 'category',
      label: '글종류',
      className: 'board-col-category',
      render: (p) => POST_CATEGORY_LABELS[p.category],
    },
    { key: 'title', label: '제목', className: 'board-col-title', render: (p) => p.title },
    { key: 'author', label: '작성자', className: 'board-col-author', render: (p) => p.author },
    {
      key: 'date',
      label: '작성일',
      className: 'board-col-date',
      render: (p) => formatBoardDate(p.created_at),
    },
    {
      key: 'views',
      label: '조회수',
      className: 'board-col-views',
      render: (p) => p.view_count,
    },
  ]

  return (
    <>
      <div className="board-tabs">
        <button
          type="button"
          className={`board-tab${categoryFilter === '' ? ' active' : ''}`}
          onClick={() => handleCategoryFilterChange('')}
        >
          전체
        </button>
        {filterCategories.map((c) => (
          <button
            key={c}
            type="button"
            className={`board-tab${categoryFilter === c ? ' active' : ''}`}
            onClick={() => handleCategoryFilterChange(c)}
          >
            {POST_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading && <div className="muted">불러오는 중...</div>}
      {listError && <div className="muted warn">{listError}</div>}

      {!loading && !listError && (
        <BoardTable
          items={posts}
          columns={boardColumns}
          titleColumnKey="title"
          rowKey={(p) => p.post_id}
          linkTo={(p) => `/board/${p.post_id}`}
          emptyMessage="게시글이 없습니다."
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
        <button type="button" className="board-write-btn" onClick={() => navigate('/board/new')}>
          ✎ 글쓰기
        </button>
      </div>
    </>
  )
}
