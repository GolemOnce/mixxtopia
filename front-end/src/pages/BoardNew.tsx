import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import BoardList from '../components/BoardList'
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
    <div className="page-with-sidebar">
      <div className="page-main">
        <div className="card">
          <h1>글쓰기</h1>
          <form onSubmit={handleSubmit}>
            <div className="board-tabs">
              {writableCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`board-tab${category === c ? ' active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {POST_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <div className="row">
              <input
                className="board-new-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="제목을 입력해 주세요."
                required
              />
            </div>
            <div className="row">
              <textarea
                className="board-new-content-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={1000}
                placeholder="내용을 입력해 주세요."
                required
              />
            </div>
            <div className="row">
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? '등록 중...' : '등록'}
              </button>
              <button type="button" onClick={() => navigate(-1)}>
                취소
              </button>
            </div>
          </form>
          {formError && <div className="muted warn">{formError}</div>}
        </div>

        <div className="card">
          <BoardList />
        </div>
      </div>

      {/* 임시 자리 — 나중에 다른 콘텐츠 들어갈 공간 */}
      <div className="page-sidebar" />
    </div>
  )
}
