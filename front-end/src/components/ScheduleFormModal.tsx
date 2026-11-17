import { useState } from 'react'

import { api, authErrorMessage } from '../api/client'
import { toDatetimeLocal, toIso } from '../lib/date'
import { NMIXX_MEMBERS, useScheduleCategories, type ScheduleItem } from '../lib/scheduleCategories'
import Modal from './Modal'

export default function ScheduleFormModal({
  onClose,
  onSaved,
  schedule,
}: {
  onClose: () => void
  onSaved: () => void
  schedule?: ScheduleItem
}) {
  const isEditing = !!schedule
  const { categories } = useScheduleCategories()

  const [title, setTitle] = useState(schedule?.title ?? '')
  const [content, setContent] = useState(schedule?.content ?? '')
  const [members, setMembers] = useState<string[]>(schedule?.member ?? [])
  const [category, setCategory] = useState<string | null>(schedule?.category ?? null)
  const [link, setLink] = useState(schedule?.link ?? '')
  const [organizer, setOrganizer] = useState(schedule?.organizer ?? '')
  const [location, setLocation] = useState(schedule?.location ?? '')
  const [startAt, setStartAt] = useState(schedule ? toDatetimeLocal(schedule.start_at) : '')
  const [endAt, setEndAt] = useState(schedule ? toDatetimeLocal(schedule.end_at) : '')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const allMembersSelected = NMIXX_MEMBERS.every((m) => members.includes(m))

  function toggleMember(m: string) {
    setMembers((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  function toggleAllMembers() {
    setMembers(allMembersSelected ? [] : [...NMIXX_MEMBERS])
  }

  function resetForm() {
    setTitle('')
    setContent('')
    setMembers([])
    setCategory(null)
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

    if (!category) {
      setFormError('종류를 선택해 주세요.')
      return
    }

    const body = {
      title,
      content,
      member: members,
      category,
      link,
      organizer,
      location,
      start_at: toIso(startAt),
      end_at: toIso(endAt),
    }

    setSubmitting(true)
    try {
      if (isEditing) {
        await api.patch(`/api/schedules/${schedule.schedule_id}`, body)
        onSaved()
        onClose()
      } else {
        await api.post('/api/schedules', body)
        setFormSuccess('일정을 등록했습니다.')
        resetForm()
        onSaved()
      }
    } catch (err) {
      setFormError(authErrorMessage(err, '요청 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>{isEditing ? '일정 수정' : '일정 등록'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="board-tabs">
            {categories.map((c) => (
              <button
                key={c.category_id}
                type="button"
                className={`board-tab${category === c.category_id ? ' active' : ''}`}
                onClick={() => setCategory(c.category_id)}
              >
                {c.label}
              </button>
            ))}
          </div>
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
            maxLength={500}
            placeholder="내용을 입력해 주세요."
            required
          />
        </div>
        <div className="row">
          <div className="board-tabs">
            <button
              type="button"
              className={`board-tab${allMembersSelected ? ' active' : ''}`}
              onClick={toggleAllMembers}
            >
              전체
            </button>
            {NMIXX_MEMBERS.map((m) => (
              <button
                key={m}
                type="button"
                className={`board-tab${members.includes(m) ? ' active' : ''}`}
                onClick={() => toggleMember(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="row schedule-row-half">
          <input
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            maxLength={50}
            placeholder="주최"
            required
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={50}
            placeholder="장소"
            required
          />
        </div>
        <div className="row">
          <input
            className="board-new-title-input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            maxLength={200}
            placeholder="링크"
            required
          />
        </div>
        <div className="row schedule-row-half">
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
            {submitting ? '처리 중...' : isEditing ? '수정 완료' : '일정 등록'}
          </button>
          <button type="button" onClick={onClose}>
            취소
          </button>
        </div>
      </form>
      {formError && <div className="muted warn">{formError}</div>}
      {formSuccess && <div className="muted">{formSuccess}</div>}
    </Modal>
  )
}
