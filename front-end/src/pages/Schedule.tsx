import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import LinkifiedText from '../components/LinkifiedText'
import LinkPreview from '../components/LinkPreview'
import Modal from '../components/Modal'
import {
  addMonths,
  buildMonthGrid,
  daysInMonth,
  groupByDay,
  isToday,
  WEEKDAY_LABELS,
} from '../lib/calendar'
import { formatDate } from '../lib/date'
import { categoryColor, categoryLabel, type ScheduleItem } from '../lib/scheduleCategories'

type ViewMode = 'calendar' | 'board'

const VIEW_MODES: ViewMode[] = ['calendar', 'board']

const VIEW_LABELS: Record<ViewMode, string> = {
  calendar: '달력',
  board: '게시판',
}

function CategoryDot({ category }: { category: string }) {
  return <span className="calendar-dot" style={{ background: categoryColor(category) }} />
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const CELL_CHIP_LIMIT = 2

export default function Schedule() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()

  const now = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(
    year === now.getFullYear() && month === now.getMonth() + 1 ? now.getDate() : null,
  )
  const [modalSchedule, setModalSchedule] = useState<ScheduleItem | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)

  useEffect(() => {
    if (!pickerOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickerOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pickerOpen])

  function openPicker() {
    setPickerYear(year)
    setPickerOpen((v) => !v)
  }

  function selectMonth(m: number) {
    setYear(pickerYear)
    setMonth(m)
    setPickerOpen(false)
  }

  async function loadSchedules() {
    setLoading(true)
    setListError(null)
    try {
      const query = new URLSearchParams({ year: String(year), month: String(month) })
      const data = await api.get<ScheduleItem[]>(`/api/schedules?${query.toString()}`)
      setSchedules(data)
    } catch (err) {
      setListError(authErrorMessage(err, '목록을 불러오지 못했습니다.'))
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
    setSelectedDay(
      year === now.getFullYear() && month === now.getMonth() + 1 ? now.getDate() : null,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const byDay = useMemo(() => groupByDay(schedules, year, month), [schedules, year, month])
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])
  const dayList = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
    [year, month],
  )

  function goToMonth(delta: number) {
    const next = addMonths(year, month, delta)
    setYear(next.year)
    setMonth(next.month)
  }

  function goToToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  async function handleDelete(scheduleId: string) {
    if (!confirm('이 일정을 삭제할까요?')) return
    try {
      await api.delete(`/api/schedules/${scheduleId}`)
      setModalSchedule(null)
      await loadSchedules()
    } catch (err) {
      alert(authErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  function renderChip(s: ScheduleItem) {
    return (
      <button
        key={s.schedule_id}
        type="button"
        className="schedule-chip"
        onClick={() => setModalSchedule(s)}
      >
        <CategoryDot category={s.category} />
        {s.title}
      </button>
    )
  }

  return (
    <div className="card">
      <div className="board-tabs">
        {VIEW_MODES.map((v) => (
          <button
            key={v}
            type="button"
            className={`board-tab${viewMode === v ? ' active' : ''}`}
            onClick={() => setViewMode(v)}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      <div className="board-toolbar schedule-toolbar">
        <div className="row">
          <button
            type="button"
            className="pagination-btn calendar-nav-btn"
            aria-label="이전달"
            onClick={() => goToMonth(-1)}
          >
            <ChevronLeft />
          </button>
          <div className="calendar-month-picker">
            <button type="button" className="calendar-month-label" onClick={openPicker}>
              {year}년 {month}월
            </button>
            {pickerOpen && (
              <>
                <button
                  type="button"
                  className="calendar-picker-backdrop"
                  aria-label="닫기"
                  onClick={() => setPickerOpen(false)}
                />
                <div className="calendar-picker-popover">
                  <div className="calendar-picker-year-nav">
                    <button
                      type="button"
                      className="calendar-nav-btn"
                      aria-label="이전해"
                      onClick={() => setPickerYear((y) => y - 1)}
                    >
                      <ChevronLeft />
                    </button>
                    <span>{pickerYear}년</span>
                    <button
                      type="button"
                      className="calendar-nav-btn"
                      aria-label="다음해"
                      onClick={() => setPickerYear((y) => y + 1)}
                    >
                      <ChevronRight />
                    </button>
                  </div>
                  <div className="calendar-picker-months">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`calendar-picker-month${
                          pickerYear === year && m === month ? ' active' : ''
                        }`}
                        onClick={() => selectMonth(m)}
                      >
                        {m}월
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="pagination-btn calendar-nav-btn"
            aria-label="다음달"
            onClick={() => goToMonth(1)}
          >
            <ChevronRight />
          </button>
          <button type="button" className="pagination-btn" onClick={goToToday}>
            오늘
          </button>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="board-write-btn"
            onClick={() => navigate('/schedule/new')}
          >
            ✎ 일정 등록
          </button>
        )}
      </div>

      {loading && <div className="muted">불러오는 중...</div>}
      {listError && <div className="muted warn">{listError}</div>}

      {!loading && !listError && viewMode === 'calendar' && (
        <div className="schedule-calendar-layout">
          <div className="schedule-calendar-main">
            <table className="calendar-table">
              <thead>
                <tr>
                  {WEEKDAY_LABELS.map((w) => (
                    <th key={w}>{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((day, di) => {
                      const items = day ? (byDay[day] ?? []) : []
                      return (
                        <td key={di} className="calendar-cell">
                          {day && (
                            <div
                              role="button"
                              tabIndex={0}
                              className={`calendar-day-cell${
                                selectedDay === day ? ' selected' : ''
                              }${isToday(year, month, day) ? ' today' : ''}`}
                              onClick={() => setSelectedDay(day)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') setSelectedDay(day)
                              }}
                            >
                              <span className="calendar-day-num">{day}</span>
                              <div className="calendar-day-chips">
                                {items.slice(0, CELL_CHIP_LIMIT).map((s) => (
                                  <button
                                    key={s.schedule_id}
                                    type="button"
                                    className="calendar-mini-chip"
                                    style={{ background: categoryColor(s.category) }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedDay(day)
                                      setModalSchedule(s)
                                    }}
                                  >
                                    {s.title}
                                  </button>
                                ))}
                                {items.length > CELL_CHIP_LIMIT && (
                                  <span className="calendar-more">
                                    +{items.length - CELL_CHIP_LIMIT}개 더보기
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="schedule-calendar-side">
            <div className="schedule-side-header">
              {selectedDay ? (
                <>
                  <span>
                    {year}년 {month}월 {selectedDay}일
                  </span>
                  <span className="schedule-side-count">{byDay[selectedDay]?.length ?? 0}개</span>
                </>
              ) : (
                <span>날짜를 선택해주세요</span>
              )}
            </div>

            {selectedDay && (byDay[selectedDay]?.length ?? 0) === 0 && (
              <div className="muted">이 날짜엔 일정이 없습니다.</div>
            )}

            {selectedDay &&
              byDay[selectedDay]?.map((s) => (
                <button
                  key={s.schedule_id}
                  type="button"
                  className="schedule-side-item"
                  onClick={() => setModalSchedule(s)}
                >
                  <span
                    className="schedule-side-badge"
                    style={{ background: categoryColor(s.category) }}
                  >
                    {categoryLabel(s.category)}
                  </span>
                  <div className="schedule-side-title">{s.title}</div>
                  <div className="muted">{formatTime(s.start_at)}</div>
                </button>
              ))}
          </div>
        </div>
      )}

      {!loading && !listError && viewMode === 'board' && (
        <div className="schedule-board">
          {dayList.map((day) => (
            <div key={day} className="schedule-board-row">
              <div className="schedule-board-date">
                {month}/{day} ({WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()]})
              </div>
              <div className="row schedule-board-items">
                {(byDay[day]?.length ?? 0) === 0 ? (
                  <span className="muted">-</span>
                ) : (
                  byDay[day].map((s) => renderChip(s))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalSchedule && (
        <Modal onClose={() => setModalSchedule(null)}>
          <div className="muted">{categoryLabel(modalSchedule.category)}</div>
          <h2>{modalSchedule.title}</h2>
          <div className="muted">{formatDate(modalSchedule.start_at)}</div>
          <div className="muted">
            장소 : {modalSchedule.location} · 주관 : {modalSchedule.organizer}
          </div>
          {modalSchedule.member.length > 0 && (
            <div className="muted">멤버: {modalSchedule.member.join(', ')}</div>
          )}
          {modalSchedule.content && <LinkifiedText text={modalSchedule.content} />}
          {modalSchedule.link && !modalSchedule.content.includes(modalSchedule.link) && (
            <LinkPreview url={modalSchedule.link} />
          )}
          {isAdmin && (
            <div className="row">
              <button type="button" onClick={() => handleDelete(modalSchedule.schedule_id)}>
                삭제
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
