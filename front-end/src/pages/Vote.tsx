import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import { formatDate } from '../lib/date'

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

export default function Vote() {
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()

  const [votes, setVotes] = useState<VoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [organizerFilter, setOrganizerFilter] = useState('')
  const [showEnded, setShowEnded] = useState(false)

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

      {isAdmin && (
        <div className="row">
          <button type="button" className="primary" onClick={() => navigate('/vote/new')}>
            투표 등록
          </button>
        </div>
      )}

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
            {isAdmin && (
              <div className="row">
                <button type="button" onClick={() => handleDelete(v.vote_id)}>
                  삭제
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
