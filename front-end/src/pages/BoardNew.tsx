import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { POST_CATEGORIES, POST_CATEGORY_LABELS, type PostCategory } from '../lib/postCategories'

interface PostResponse {
  post_id: string
}

export default function BoardNew() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()
  const writableCategories = isAdmin
    ? POST_CATEGORIES
    : POST_CATEGORIES.filter((c) => c !== 'notice')

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<PostCategory>('free')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const post = await api.post<PostResponse>('/api/posts', { category, title, content })
      navigate(`/board/${post.post_id}`)
    } catch (err) {
      setFormError(authErrorMessage(err, '요청 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h1>글쓰기</h1>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <label>
            종류{' '}
            <select value={category} onChange={(e) => setCategory(e.target.value as PostCategory)}>
              {writableCategories.map((c) => (
                <option key={c} value={c}>
                  {POST_CATEGORY_LABELS[c]}
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

      <div className="row">
        <Link to="/board">목록으로</Link>
      </div>
    </div>
  )
}
