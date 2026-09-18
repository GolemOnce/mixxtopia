import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'

type Category = 'notice' | 'free' | 'question' | 'suggestion'

interface PostItem {
  post_id: string
  post_num: number
  author: string
  category: Category
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

const CATEGORY_LABELS: Record<Category, string> = {
  notice: '공지',
  free: '자유',
  question: '질문',
  suggestion: '건의',
}

const CATEGORIES: Category[] = ['notice', 'free', 'question', 'suggestion']
const PAGE_SIZE = 20

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Board() {
  const { isAdmin } = useCurrentUser()
  const filterCategories = isAdmin ? CATEGORIES : CATEGORIES.filter((c) => c !== 'suggestion')
  const writableCategories = isAdmin ? CATEGORIES : CATEGORIES.filter((c) => c !== 'notice')

  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('')
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Category>('free')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  async function loadPosts(cat: Category | '', p: number) {
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

  function handleCategoryFilterChange(value: Category | '') {
    setCategoryFilter(value)
    setPage(1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setSubmitting(true)
    try {
      await api.post('/api/posts', { category, title, content })
      setFormSuccess('게시글을 등록했습니다.')
      setTitle('')
      setContent('')
      await loadPosts(categoryFilter, page)
    } catch (err) {
      setFormError(authErrorMessage(err, '요청 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="card">
      <h1>게시판</h1>

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
            {CATEGORY_LABELS[c]}
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
              [{CATEGORY_LABELS[p.category]} #{p.post_num}]
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

      <h3>글쓰기</h3>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <label>
            종류{' '}
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {writableCategories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            제목{' '}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
          </label>
        </div>
        <div className="row">
          <label>
            내용{' '}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              required
            />
          </label>
        </div>
        <div className="row">
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
      {formError && <div className="muted warn">{formError}</div>}
      {formSuccess && <div className="muted">{formSuccess}</div>}
    </div>
  )
}
