import { useEffect, useMemo, useState } from 'react'

import { api, authErrorMessage } from '../api/client'

interface ScheduleItem {
  schedule_id: string
  title: string
  content: string
  member: string[]
  category: string
  link: string
  organizer: string
  location: string
  start_at: string
  end_at: string
}

// 백엔드 검증에 쓰이는 고정 목록이 아니라, 자동완성용 힌트일 뿐이다.
// 모르는 값이 와도 CATEGORY_LABELS에 없으면 그냥 원문 그대로 보여준다.
const SUGGESTED_CATEGORIES = [
  'musicbroad',
  'radio',
  'broadcast',
  'award',
  'festival',
  'concert',
  'fanmeeting',
  'fansign',
  'etc',
]

const CATEGORY_LABELS: Record<string, string> = {
  musicbroad: '음방',
  radio: '라디오',
  broadcast: '방송',
  award: '시상식',
  festival: '축제',
  concert: '콘서트',
  fanmeeting: '팬미팅',
  fansign: '팬싸인회',
  etc: '기타',
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

function toIso(datetimeLocal: string): string {
  return new Date(datetimeLocal).toISOString()
}

export default function Schedule() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

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

  async function loadSchedules() {
    setLoading(true)
    setListError(null)
    try {
      const data = await api.get<ScheduleItem[]>('/api/schedules')
      setSchedules(data)
    } catch (err) {
      setListError(authErrorMessage(err, '목록을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  const filteredSchedules = useMemo(
    () => (categoryFilter ? schedules.filter((s) => s.category === categoryFilter) : schedules),
    [schedules, categoryFilter],
  )

  const filterCategories = useMemo(
    () => Array.from(new Set(schedules.map((s) => s.category))).sort(),
    [schedules],
  )

  const categoryOptions = useMemo(
    () => Array.from(new Set([...SUGGESTED_CATEGORIES, ...schedules.map((s) => s.category)])),
    [schedules],
  )

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
      await loadSchedules()
    } catch (err) {
      setFormError(authErrorMessage(err, '요청 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(scheduleId: string) {
    if (!confirm('이 일정을 삭제할까요?')) return
    try {
      await api.delete(`/api/schedules/${scheduleId}`)
      await loadSchedules()
    } catch (err) {
      alert(authErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  return (
    <div className="card">
      <h1>일정</h1>

      <div className="row">
        <label>
          종류 필터{' '}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">전체</option>
            {filterCategories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <div className="muted">불러오는 중...</div>}
      {listError && <div className="muted warn">{listError}</div>}
      {!loading && !listError && filteredSchedules.length === 0 && (
        <div className="muted">
          {categoryFilter ? '해당 종류의 일정이 없습니다.' : '등록된 일정이 없습니다.'}
        </div>
      )}

      {filteredSchedules.map((s) => (
        <div className="list-item" key={s.schedule_id}>
          <div className="row">
            <strong>[{categoryLabel(s.category)}]</strong>
            <span>{s.title}</span>
          </div>
          <div className="muted">
            {formatDate(s.start_at)} ~ {formatDate(s.end_at)} · {s.location} · {s.organizer}
          </div>
          {s.member.length > 0 && <div className="muted">멤버: {s.member.join(', ')}</div>}
          <div>{s.content}</div>
          {s.link && (
            <div>
              <a href={s.link} target="_blank" rel="noopener noreferrer">
                관련 링크
              </a>
            </div>
          )}
          <div className="row">
            <button type="button" onClick={() => handleDelete(s.schedule_id)}>
              삭제
            </button>
          </div>
        </div>
      ))}

      <h3>일정 등록</h3>
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
    </div>
  )
}
