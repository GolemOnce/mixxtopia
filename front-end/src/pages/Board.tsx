import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { formatDate } from '../lib/date'
import { POST_CATEGORIES, POST_CATEGORY_LABELS, type PostCategory } from '../lib/postCategories'

interface PostItem {
  post_id: string
  post_num: number
  author: string
  category: PostCategory
  title: string
  content: string
  created_at: string
  updated_at: string | null
}

interface PostListResponse {
  items: PostItem[]
  total: number
  page: number
  page_size: number
}

const PAGE_SIZE = 20

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="card">
      <h1>게시판</h1>

      <div className="row">
        <button type="button" className="primary" onClick={() => navigate('/board/new')}>
          글쓰기
        </button>
      </div>

      <div className="row">
        <button
          type="button"
          className={categoryFilter === '' ? 'primary' : ''}
          onClick={() => handleCategoryFilterChange('')}
        >
          전체
        </button>
        {filterCategories.map((c) => (
          <button
            key={c}
            type="button"
            className={categoryFilter === c ? 'primary' : ''}
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

      {posts.map((p) => (
        <div className="list-item" key={p.post_id}>
          <div className="row">
            <strong>
              [{POST_CATEGORY_LABELS[p.category]} #{p.post_num}]
            </strong>
            <Link to={`/board/${p.post_id}`}>{p.title}</Link>
          </div>
          <div className="muted">
            {p.author} · {formatDate(p.created_at)}
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="row">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            이전
          </button>
          <span className="muted">
            {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            다음
          </button>
        </div>
      )}
    </div>
  )
}
