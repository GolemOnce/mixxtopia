import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { toIso } from '../lib/date'
import { categoryLabel, SUGGESTED_CATEGORIES, type ScheduleItem } from '../lib/scheduleCategories'

export default function ScheduleNew() {
  const [existingCategories, setExistingCategories] = useState<string[]>([])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [member, setMember] = useState('')
  const [category, setCategory] = useState('broadcast')
  const [link, setLink] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [location, setLocation] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<ScheduleItem[]>('/api/schedules')
      .then((data) => setExistingCategories(Array.from(new Set(data.map((s) => s.category)))))
      .catch(() => {})
  }, [])

  const categoryOptions = Array.from(new Set([...SUGGESTED_CATEGORIES, ...existingCategories]))

  function resetForm() {
    setTitle('')
    setContent('')
    setMember('')
    setCategory('broadcast')
    setLink('')
    setOrganizer('')
    setLocation('')
    setStartAt('')
    setEndAt('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setSubmitting(true)
    try {
      await api.post('/api/schedules', {
        title,
        content,
        member: member
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
        category,
        link,
        organizer,
        location,
        start_at: toIso(startAt),
        end_at: toIso(endAt),
      })
      setFormSuccess('일정을 등록했습니다.')
      resetForm()
    } catch (err) {
      setFormError(authErrorMessage(err, '요청 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h1>일정 등록</h1>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <label>
            종류{' '}
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="schedule-category-options"
              maxLength={20}
              required
            />
            <datalist id="schedule-category-options">
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </datalist>
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
            주최{' '}
            <input
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              maxLength={50}
              required
            />
          </label>
          <label>
            장소{' '}
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={50}
              required
            />
          </label>
        </div>
        <div className="row">
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
            {submitting ? '등록 중...' : '일정 등록'}
          </button>
        </div>
      </form>
      {formError && <div className="muted warn">{formError}</div>}
      {formSuccess && <div className="muted">{formSuccess}</div>}

      <div className="row">
        <Link to="/schedule">목록으로</Link>
      </div>
    </div>
  )
}
