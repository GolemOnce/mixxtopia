import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { formatBoardDate } from '../lib/date'
import { POST_CATEGORIES, POST_CATEGORY_LABELS, type PostCategory } from '../lib/postCategories'

interface PostItem {
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
const PAGE_WINDOW = 9

export default function Board() {
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

  // 현재 페이지가 가능한 한 가운데 오도록 최대 PAGE_WINDOW개의 페이지 번호 창을 계산한다.
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
        {!loading && !listError && posts.length === 0 && (
          <div className="muted">게시글이 없습니다.</div>
        )}

        {!loading && !listError && posts.length > 0 && (
          <>
            {/* PC: 테이블. 모바일은 CSS로 이걸 숨기고 아래 카드 리스트를 대신 보여준다. */}
            <table className="board-table">
              <thead>
                <tr>
                  <th className="board-col-num">번호</th>
                  <th className="board-col-category">글종류</th>
                  <th className="board-col-title">제목</th>
                  <th className="board-col-author">작성자</th>
                  <th className="board-col-date">작성일</th>
                  <th className="board-col-views">조회수</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.post_id}>
                    <td className="board-col-num muted">{displayNumberOf(p)}</td>
                    <td className="board-col-category muted">{POST_CATEGORY_LABELS[p.category]}</td>
                    <td className="board-col-title">
                      <Link to={`/board/${p.post_id}`}>{p.title}</Link>
                    </td>
                    <td className="board-col-author muted">{p.author}</td>
                    <td className="board-col-date muted">{formatBoardDate(p.created_at)}</td>
                    <td className="board-col-views muted">{p.view_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 모바일 전용 카드 리스트. 가로로 욱여넣지 않고 제목 위주로 세로로 쌓는다. */}
            <div className="board-list">
              {posts.map((p) => (
                <Link to={`/board/${p.post_id}`} className="board-list-item" key={p.post_id}>
                  <div className="board-list-title">{p.title}</div>
                  <div className="muted board-list-meta">
                    #{displayNumberOf(p)} · {POST_CATEGORY_LABELS[p.category]} · {p.author} ·{' '}
                    {formatBoardDate(p.created_at)} · 조회 {p.view_count}
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
          <button type="button" className="board-write-btn" onClick={() => navigate('/board/new')}>
            ✎ 글쓰기
          </button>
        </div>
      </div>

      {/* 임시 자리 — 나중에 다른 콘텐츠 들어갈 공간 */}
      <div className="page-sidebar" />
    </div>
  )
}
