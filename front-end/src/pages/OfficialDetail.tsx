import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useCurrentUser } from '../auth/useCurrentUser'
import LinkPreview from '../components/LinkPreview'
import { formatDate } from '../lib/date'
import { OFFICIAL_ACCOUNT_LABELS, type OfficialAccount } from '../lib/officialAccounts'

interface OfficialItem {
  official_id: string
  posted_at: string
  account: OfficialAccount
  link: string
  title: string
  content: string
  photo_links: string[]
  video_links: string[]
  created_at: string
  updated_at: string | null
}

export default function OfficialDetail() {
  const { officialId } = useParams<{ officialId: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useCurrentUser()

  const [item, setItem] = useState<OfficialItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function load() {
    if (!officialId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<OfficialItem>(`/api/officials/${officialId}`)
      setItem(data)
      setEditTitle(data.title)
      setEditContent(data.content)
    } catch (err) {
      setError(authErrorMessage(err, '게시글을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officialId])

  async function handleDelete() {
    if (!officialId) return
    if (!confirm('이 게시글을 삭제할까요?')) return
    try {
      await api.delete(`/api/officials/${officialId}`)
      navigate('/official')
    } catch (err) {
      alert(authErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!officialId) return
    setEditError(null)
    setEditSubmitting(true)
    try {
      await api.patch(`/api/officials/${officialId}`, { title: editTitle, content: editContent })
      setEditing(false)
      await load()
    } catch (err) {
      setEditError(authErrorMessage(err, '수정 중 오류가 발생했습니다.'))
    } finally {
      setEditSubmitting(false)
    }
  }

  if (loading) return <div className="card muted">불러오는 중...</div>
  if (error) return <div className="card muted warn">{error}</div>
  if (!item) return null

  return (
    <div className="card">
      <div className="muted">{OFFICIAL_ACCOUNT_LABELS[item.account]}</div>
      <h1>{item.title}</h1>
      <div className="muted">
        {formatDate(item.posted_at)}
        {item.updated_at && ' (수정됨)'}
      </div>

      {!editing && (
        <>
          <pre>{item.content}</pre>
          {item.photo_links.length > 0 && (
            <div className="official-photo-gallery">
              {item.photo_links.map((url) => (
                <img key={url} src={url} alt={item.title} />
              ))}
            </div>
          )}
          {item.video_links.length > 0 && (
            <div className="official-photo-gallery">
              {item.video_links.map((url) => (
                <video key={url} src={url} controls />
              ))}
            </div>
          )}
          <LinkPreview url={item.link} />
          {isAdmin && (
            <div className="row">
              <button type="button" onClick={() => setEditing(true)}>
                수정
              </button>
              <button type="button" onClick={handleDelete}>
                삭제
              </button>
            </div>
          )}
        </>
      )}

      {editing && (
        <form onSubmit={handleEditSubmit}>
          <div className="row">
            <label>
              제목{' '}
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
                required
              />
            </label>
          </div>
          <div className="row">
            <label>
              내용{' '}
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={1000}
                required
              />
            </label>
          </div>
          <div className="row">
            <button className="primary" type="submit" disabled={editSubmitting}>
              {editSubmitting ? '저장 중...' : '저장'}
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
          {editError && <div className="muted warn">{editError}</div>}
        </form>
      )}
    </div>
  )
}
