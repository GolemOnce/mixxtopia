import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { formatDate } from '../lib/date'
import { categoryLabel, type ScheduleItem } from '../lib/scheduleCategories'

export default function Schedule() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()

  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

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

      {isAdmin && (
        <div className="row">
          <button type="button" className="primary" onClick={() => navigate('/schedule/new')}>
            일정 등록
          </button>
        </div>
      )}

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
          {isAdmin && (
            <div className="row">
              <button type="button" onClick={() => handleDelete(s.schedule_id)}>
                삭제
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
