import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

const PAGE_SIZE = 30

// 커뮤니티 게시판 목록(카테고리 탭 + 테이블 + 페이지네이션 + 글쓰기).
// Board 페이지 본문이면서, 게시글 상세 페이지 하단에도 그대로 재사용한다.
export default function BoardList() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()
  const filterCategories = isAdmin
    ? POST_CATEGORIES
    : POST_CATEGORIES.filter((c) => c !== 'suggestion')

  const [categoryFilter, setCategoryFilter] = useState<PostCategory | ''>('')
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  async function loadPosts(cat: PostCategory | '', p: number) {
    setLoading(true)
    setListError(null)
    try {
      const query = new URLSearchParams({ page: String(p), page_size: String(PAGE_SIZE) })
      if (cat) query.set('category', cat)
      const data = await api.get<PostListResponse>(`/api/posts?${query.toString()}`)
      setPosts(data.items)
      setTotal(data.total)
    } catch (err) {
      setListError(authErrorMessage(err, '목록을 불러오지 못했습니다.'))
      setPosts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts(categoryFilter, page)
  }, [categoryFilter, page])

  function handleCategoryFilterChange(value: PostCategory | '') {
    setCategoryFilter(value)
    setPage(1)
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
        <button type="button" className="board-write-btn" onClick={() => navigate('/board/new')}>
          ✎ 글쓰기
        </button>
      </div>
    </>
  )
}
