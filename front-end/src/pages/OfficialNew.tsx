import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import OfficialList from '../components/OfficialList'
import { toIso } from '../lib/date'
import { OFFICIAL_ACCOUNTS, OFFICIAL_ACCOUNT_LABELS } from '../lib/officialAccounts'

export default function OfficialNew() {
  const navigate = useNavigate()
  const location = useLocation()

  const [postedAt, setPostedAt] = useState('')
  const [account, setAccount] = useState(OFFICIAL_ACCOUNTS[0])
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [photoLinks, setPhotoLinks] = useState('')
  const [videoLinks, setVideoLinks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  function handleBack() {
    // 직접 URL로 들어왔거나 새로고침한 경우(뒤로 갈 내부 히스토리가 없음) 목록으로 보낸다.
    if (location.key === 'default') {
      navigate('/official')
    } else {
      navigate(-1)
    }
  }

  function resetForm() {
    setPostedAt('')
    setAccount(OFFICIAL_ACCOUNTS[0])
    setLink('')
    setTitle('')
    setContent('')
    setPhotoLinks('')
    setVideoLinks('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setSubmitting(true)
    try {
      await api.post('/api/officials', {
        posted_at: toIso(postedAt),
        account,
        link,
        title,
        content,
        photo_links: photoLinks
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        video_links: videoLinks
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      })
      setFormSuccess('오피셜 게시글을 등록했습니다.')
      resetForm()
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
          <h1>오피셜 등록</h1>
          <form onSubmit={handleSubmit}>
            <div className="row">
              <label>
                계정{' '}
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value as typeof account)}
                >
                  {OFFICIAL_ACCOUNTS.map((a) => (
                    <option key={a} value={a}>
                      {OFFICIAL_ACCOUNT_LABELS[a]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                업로드 시각{' '}
                <input
                  type="datetime-local"
                  value={postedAt}
                  onChange={(e) => setPostedAt(e.target.value)}
                  required
                />
              </label>
            </div>
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
            </div>
            <div className="row">
              <label>
                내용{' '}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={1000}
                  required
                />
              </label>
            </div>
            <div className="row">
              <label>
                링크(원본 트윗){' '}
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
                사진 링크(선택, 쉼표로 구분, 최대 4개){' '}
                <input
                  value={photoLinks}
                  onChange={(e) => setPhotoLinks(e.target.value)}
                  placeholder="https://..., https://..."
                />
              </label>
            </div>
            <div className="row">
              <label>
                영상 링크(선택, 쉼표로 구분, 최대 4개){' '}
                <input
                  value={videoLinks}
                  onChange={(e) => setVideoLinks(e.target.value)}
                  placeholder="https://..., https://..."
                />
              </label>
            </div>
            <div className="row">
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? '등록 중...' : '오피셜 등록'}
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

        <div className="card">
          <OfficialList />
        </div>
      </div>

      {/* 임시 자리 — 나중에 다른 콘텐츠 들어갈 공간 */}
      <div className="page-sidebar" />
    </div>
  )
}
