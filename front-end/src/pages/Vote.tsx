import { useEffect, useMemo, useState } from 'react'

import { api, authErrorMessage } from '../api/client'

interface VoteItem {
  vote_id: string
  title: string
  content: string
  member: string[]
  link: string
  organizer: string
  start_at: string
  end_at: string
}

type VoteStatus = 'ongoing' | 'upcoming' | 'ended'

function getStatus(v: VoteItem, now: number): VoteStatus {
  const start = new Date(v.start_at).getTime()
  const end = new Date(v.end_at).getTime()
  if (now < start) return 'upcoming'
  if (now > end) return 'ended'
  return 'ongoing'
}

const STATUS_LABELS: Record<VoteStatus, string> = {
  ongoing: '진행중',
  upcoming: '예정',
  ended: '종료',
}

const STATUS_ORDER: Record<VoteStatus, number> = {
  ongoing: 0,
  upcoming: 1,
  ended: 2,
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

function toIso(datetimeLocal: string): string {
  return new Date(datetimeLocal).toISOString()
}

export default function Vote() {
  const [votes, setVotes] = useState<VoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [organizerFilter, setOrganizerFilter] = useState('')
  const [showEnded, setShowEnded] = useState(false)

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

  async function loadVotes() {
    setLoading(true)
    setListError(null)
    try {
      const data = await api.get<VoteItem[]>('/api/votes')
      setVotes(data)
    } catch (err) {
      setListError(authErrorMessage(err, '목록을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVotes()
  }, [])

  const organizers = useMemo(
    () => Array.from(new Set(votes.map((v) => v.organizer))).sort(),
    [votes],
  )

  const visibleVotes = useMemo(() => {
    const now = Date.now()
    return votes
      .filter((v) => !organizerFilter || v.organizer === organizerFilter)
      .filter((v) => showEnded || getStatus(v, now) !== 'ended')
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[getStatus(a, now)] - STATUS_ORDER[getStatus(b, now)]
        if (statusDiff !== 0) return statusDiff
        return new Date(a.end_at).getTime() - new Date(b.end_at).getTime()
      })
  }, [votes, organizerFilter, showEnded])

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
      await loadVotes()
    } catch (err) {
      setFormError(authErrorMessage(err, '요청 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(voteId: string) {
    if (!confirm('이 투표를 삭제할까요?')) return
    try {
      await api.delete(`/api/votes/${voteId}`)
      await loadVotes()
    } catch (err) {
      alert(authErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  return (
    <div className="card">
      <h1>투표</h1>

      <div className="row">
        <label>
          매체 필터{' '}
          <select value={organizerFilter} onChange={(e) => setOrganizerFilter(e.target.value)}>
            <option value="">전체</option>
            {organizers.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={showEnded}
            onChange={(e) => setShowEnded(e.target.checked)}
          />{' '}
          지난 투표 포함
        </label>
      </div>

      {loading && <div className="muted">불러오는 중...</div>}
      {listError && <div className="muted warn">{listError}</div>}
      {!loading && !listError && visibleVotes.length === 0 && (
        <div className="muted">표시할 투표가 없습니다.</div>
      )}

      {visibleVotes.map((v) => {
        const status = getStatus(v, Date.now())
        return (
          <div className="list-item" key={v.vote_id}>
            <div className="row">
              <strong>[{STATUS_LABELS[status]}]</strong>
              <span>{v.title}</span>
            </div>
            <div className="muted">
              {v.organizer} · {formatDate(v.start_at)} ~ {formatDate(v.end_at)}
            </div>
            {v.member.length > 0 && <div className="muted">멤버: {v.member.join(', ')}</div>}
            <div>{v.content}</div>
            {v.link && (
              <div>
                <a href={v.link} target="_blank" rel="noopener noreferrer">
                  투표하러 가기
                </a>
              </div>
            )}
            <div className="row">
              <button type="button" onClick={() => handleDelete(v.vote_id)}>
                삭제
              </button>
            </div>
          </div>
        )
      })}

      <h3>투표 등록</h3>
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
    </div>
  )
}
