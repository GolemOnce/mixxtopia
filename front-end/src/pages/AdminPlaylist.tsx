import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  normalizeForSearch,
  totalDurationLabel,
  type PlaylistSong,
  type RecommendedPlaylist,
} from '../lib/playlist'

const NEW_PLAYLIST = 'new'

function campaignLabel(p: RecommendedPlaylist): string {
  const current = p.is_current ? ' (진행중)' : ''
  return `${p.title} (${p.songs.length}곡)${current}`
}

async function fetchJson(res: Response) {
  return res.json().catch(() => null)
}

export default function AdminPlaylist() {
  const [campaigns, setCampaigns] = useState<RecommendedPlaylist[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [selectedId, setSelectedId] = useState<string>(NEW_PLAYLIST)

  const [title, setTitle] = useState('')
  const [songIds, setSongIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [catalog, setCatalog] = useState<PlaylistSong[]>([])
  const [query, setQuery] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const isEditing = selectedId !== NEW_PLAYLIST

  async function loadCampaigns() {
    setLoadingList(true)
    setListError(null)
    try {
      const res = await fetch('/api/playlists/recommended/campaigns', { credentials: 'include' })
      if (!res.ok) {
        setListError(
          res.status === 401 || res.status === 403
            ? '관리자 로그인이 필요합니다.'
            : `목록 조회 실패 (${res.status})`,
        )
        return
      }
      setCampaigns(await res.json())
    } catch {
      setListError('목록 조회 중 오류가 발생했습니다.')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
    fetch('/api/playlists', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: PlaylistSong[]) => setCatalog(data))
      .catch(() => {})
  }, [])

  const songById = useMemo(() => new Map(catalog.map((s) => [s.music_id, s])), [catalog])

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query)
    if (!q) return catalog
    return catalog.filter(
      (s) => normalizeForSearch(s.song).includes(q) || normalizeForSearch(s.album).includes(q),
    )
  }, [catalog, query])

  function resetForm() {
    setTitle('')
    setSongIds([])
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    setError(null)
    setSuccessMessage(null)

    if (id === NEW_PLAYLIST) {
      resetForm()
      return
    }

    const campaign = campaigns.find((p) => p.playlist_id === id)
    if (!campaign) return

    setTitle(campaign.title)
    setSongIds(campaign.songs.map((s) => s.music_id))
  }

  function addSong(musicId: string) {
    setSongIds((prev) => [...prev, musicId])
  }

  function removeSongAt(index: number) {
    setSongIds((prev) => prev.filter((_, i) => i !== index))
  }

  function moveSongAt(index: number, direction: -1 | 1) {
    setSongIds((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev

      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function reorderSongTo(fromIndex: number, toIndex: number) {
    setSongIds((prev) => {
      if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= prev.length) return prev

      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      const clampedTo = Math.max(0, Math.min(toIndex, next.length))
      next.splice(clampedTo, 0, moved)
      return next
    })
  }

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      reorderSongTo(dragIndex, targetIndex)
    }
    setDragIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (songIds.length === 0) {
      setError('곡을 1개 이상 추가해주세요.')
      return
    }

    setSubmitting(true)
    try {
      const res = isEditing
        ? await fetch(`/api/playlists/recommended/campaigns/${selectedId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, song_ids: songIds }),
          })
        : await fetch('/api/playlists/recommended/campaigns', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, song_ids: songIds }),
          })

      if (!res.ok) {
        const body = await fetchJson(res)
        setError(
          res.status === 401 || res.status === 403
            ? '관리자 로그인이 필요합니다.'
            : (body?.detail ?? `요청 실패 (${res.status})`),
        )
        return
      }

      const saved: RecommendedPlaylist = await res.json()
      setSuccessMessage(`저장 완료: ${campaignLabel(saved)}`)
      await loadCampaigns()
      setSelectedId(saved.playlist_id)
    } catch {
      setError('요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    if (!confirm('이 플레이리스트를 삭제할까요? (완전 삭제가 아니라 목록에서만 사라집니다)')) return

    setError(null)
    setSuccessMessage(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/playlists/recommended/campaigns/${selectedId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const body = await fetchJson(res)
        setError(
          res.status === 401 || res.status === 403
            ? '관리자 로그인이 필요합니다.'
            : (body?.detail ?? `삭제 실패 (${res.status})`),
        )
        return
      }

      setSuccessMessage('삭제했습니다.')
      setSelectedId(NEW_PLAYLIST)
      resetForm()
      await loadCampaigns()
    } catch {
      setError('요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-with-sidebar">
      <div className="card">
        <div className="row">
          <Link to="/admin">관리자 메뉴로</Link>
        </div>
        <h1>권장 플레이리스트 관리</h1>

        <div className="row">
          <label>
            플레이리스트 선택{' '}
            <select value={selectedId} onChange={(e) => handleSelect(e.target.value)}>
              <option value={NEW_PLAYLIST}>+ 새로 만들기</option>
              {campaigns.map((p) => (
                <option key={p.playlist_id} value={p.playlist_id}>
                  {campaignLabel(p)}
                </option>
              ))}
            </select>
          </label>
          {loadingList && <span className="muted">목록 불러오는 중...</span>}
        </div>
        {listError && <div className="muted warn">{listError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <label>
              제목{' '}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="예) 2026년 10월 둘째 주 권장 스밍리스트"
                required
              />
            </label>
          </div>

          <h3>곡 목록 ({songIds.length}곡)</h3>
          <div className="muted">같은 곡을 여러 번 추가할 수 있습니다.</div>
          <div className="playlist-song-rows">
            {songIds.map((id, i) => {
              const song = songById.get(id)
              return (
                <div
                  className={`playlist-row${dragIndex === i ? ' dragging' : ''}`}
                  key={`${id}-${i}`}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="playlist-row-handle" aria-hidden="true">
                    ☰
                  </span>
                  <span className="playlist-row-num">{i + 1}</span>
                  <div className="playlist-row-cover">
                    {song?.album_cover && <img src={song.album_cover} alt="" />}
                  </div>
                  <div className="playlist-row-info">
                    <span className="playlist-row-title" title={song?.song ?? id}>
                      {song?.song ?? id}
                    </span>
                    {song && (
                      <span className="muted" title={song.album}>
                        {song.album}
                      </span>
                    )}
                  </div>
                  <span className="playlist-row-duration">{song?.duration ?? '-'}</span>
                  <div className="playlist-row-actions">
                    <button
                      type="button"
                      aria-label="위로"
                      title="위로"
                      disabled={i === 0}
                      onClick={() => moveSongAt(i, -1)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="아래로"
                      title="아래로"
                      disabled={i === songIds.length - 1}
                      onClick={() => moveSongAt(i, 1)}
                    >
                      ▼
                    </button>
                    <button type="button" onClick={() => removeSongAt(i)}>
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
            {songIds.length === 0 && <div className="muted">아래 목록에서 곡을 추가하세요.</div>}
          </div>
          {songIds.length > 0 && (
            <div className="playlist-total-duration">
              {totalDurationLabel(
                songIds.map((id) => songById.get(id)).filter((s): s is PlaylistSong => !!s),
              )}
            </div>
          )}

          <div className="row">
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? '저장 중...' : isEditing ? '수정/전환' : '새로 등록'}
            </button>
            {isEditing && (
              <button type="button" onClick={handleDelete} disabled={submitting}>
                삭제
              </button>
            )}
          </div>
        </form>

        {error && <div className="muted warn">{error}</div>}
        {successMessage && <div className="muted">{successMessage}</div>}
      </div>

      <div className="page-sidebar">
        <h2>곡 찾기</h2>
        <div className="row">
          <input
            type="text"
            placeholder="곡명 또는 앨범명을 입력하세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="playlist-search-results">
          {query.trim() && filtered.length === 0 ? (
            <div className="muted">해당 곡을 찾을 수 없습니다.</div>
          ) : (
            filtered.map((s) => (
              <div className="playlist-song-item" key={s.music_id}>
                <div className="playlist-song-info">
                  <div className="playlist-song-title" title={s.song}>
                    {s.song}
                  </div>
                  <div className="muted" title={`${s.album} · ${s.artist}`}>
                    {s.album} · {s.artist}
                  </div>
                </div>
                <span className="playlist-song-duration muted">{s.duration ?? '-'}</span>
                <button type="button" onClick={() => addSong(s.music_id)}>
                  추가
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
