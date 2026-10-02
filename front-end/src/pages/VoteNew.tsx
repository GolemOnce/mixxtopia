import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { toIso } from '../lib/date'

export default function VoteNew() {
  const navigate = useNavigate()
  const location = useLocation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [member, setMember] = useState('')
  const [link, setLink] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  function handleBack() {
    // 직접 URL로 들어왔거나 새로고침한 경우(뒤로 갈 내부 히스토리가 없음) 목록으로 보낸다.
    if (location.key === 'default') {
      navigate('/vote')
    } else {
      navigate(-1)
    }
  }

  function resetForm() {
    setTitle('')
    setContent('')
    setMember('')
    setLink('')
    setOrganizer('')
    setStartAt('')
    setEndAt('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setSubmitting(true)
    try {
      await api.post('/api/votes', {
        title,
        content,
        member: member
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
        link,
        organizer,
        start_at: toIso(startAt),
        end_at: toIso(endAt),
      })
      setFormSuccess('투표를 등록했습니다.')
      resetForm()
    } catch (err) {
      setFormError(authErrorMessage(err, '요청 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h1>투표 등록</h1>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <label>
            제목{' '}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label>
            매체{' '}
            <input
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              maxLength={50}
              placeholder="벅스, 멜론 등"
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
              maxLength={500}
              required
            />
          </label>
        </div>
        <div className="row">
          <label>
            멤버(쉼표로 구분){' '}
            <input
              value={member}
              onChange={(e) => setMember(e.target.value)}
              placeholder="규진, 해원"
            />
          </label>
          <label>
            링크{' '}
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              maxLength={200}
              required
            />
          </label>
        </div>
        <div className="row">
          <label>
            시작{' '}
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </label>
          <label>
            종료{' '}
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="row">
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? '등록 중...' : '투표 등록'}
          </button>
        </div>
      </form>
      {formError && <div className="muted warn">{formError}</div>}
      {formSuccess && <div className="muted">{formSuccess}</div>}

      <div className="row">
        <button type="button" onClick={handleBack}>
          뒤로가기
        </button>
      </div>
    </div>
  )
}
