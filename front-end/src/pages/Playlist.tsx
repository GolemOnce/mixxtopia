import { useEffect, useMemo, useRef, useState } from 'react'

import {
  addSongToPlaylist,
  clearPlaylist,
  createCustomPlaylist,
  deleteCustomPlaylist,
  loadCustomPlaylists,
  moveSong,
  removeSongAt,
  renameCustomPlaylist,
  reorderSong,
  saveCustomPlaylists,
  setActivePlaylist,
  type CustomPlaylistsState,
} from '../lib/customPlaylists'
import {
  buildOneClickLinks,
  downloadLinksAsTxt,
  normalizeForSearch,
  SITE_LABELS,
  SITE_VARIANTS,
  totalDurationLabel,
  type PlaylistSite,
  type PlaylistSong,
  type RecommendedPlaylist,
} from '../lib/playlist'

type ViewMode = 'recommended' | 'custom'

export default function Playlist() {
  const [songs, setSongs] = useState<PlaylistSong[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [recommended, setRecommended] = useState<RecommendedPlaylist | null>(null)
  const [recommendedLoading, setRecommendedLoading] = useState(true)

  const [customState, setCustomState] = useState<CustomPlaylistsState>(loadCustomPlaylists)
  const [viewMode, setViewMode] = useState<ViewMode>('custom')
  const [isEditMode, setIsEditMode] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const [site, setSite] = useState<PlaylistSite>('melon')
  const [variantKey, setVariantKey] = useState(SITE_VARIANTS.melon[0].key)
  const [links, setLinks] = useState<string[]>([])
  const [skippedCount, setSkippedCount] = useState(0)

  useEffect(() => {
    fetch('/api/playlists', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data: PlaylistSong[]) => setSongs(data))
      .catch(() => setCatalogError('곡 목록을 불러오지 못했습니다.'))
      .finally(() => setCatalogLoading(false))

    fetch('/api/playlists/recommended', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RecommendedPlaylist | null) => setRecommended(data))
      .catch(() => setRecommended(null))
      .finally(() => setRecommendedLoading(false))
  }, [])

  useEffect(() => {
    saveCustomPlaylists(customState)
  }, [customState])

  useEffect(() => {
    setLinks([])
    setSkippedCount(0)
  }, [viewMode, customState, recommended])

  const songById = useMemo(() => new Map(songs.map((s) => [s.music_id, s])), [songs])

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query)
    if (!q) return songs
    return songs.filter(
      (s) => normalizeForSearch(s.song).includes(q) || normalizeForSearch(s.album).includes(q),
    )
  }, [songs, query])

  const activePlaylist =
    customState.playlists.find((p) => p.id === customState.activeId) ?? customState.playlists[0]

  // sourceIndex는 activePlaylist.songIds(원본, 중복 허용)에서의 위치 — 카탈로그에서 곡이
  // 지워져 일부가 걸러져도(filter) 삭제/순서변경이 엉뚱한 자리를 건드리지 않게 보존한다.
  const displayedEntries = useMemo(() => {
    if (viewMode === 'recommended') {
      return (recommended?.songs ?? []).map((song, sourceIndex) => ({ song, sourceIndex }))
    }
    return activePlaylist.songIds
      .map((id, sourceIndex) => ({ song: songById.get(id), sourceIndex }))
      .filter((e): e is { song: PlaylistSong; sourceIndex: number } => !!e.song)
  }, [viewMode, recommended, activePlaylist, songById])

  const displayedSongs = useMemo(() => displayedEntries.map((e) => e.song), [displayedEntries])
  // 좌우 2열(편집 패널이 닫혔을 때)에서 왼쪽 열에 몇 곡을 둘지 — 홀수면 왼쪽이 1곡 더
  // 많게(23곡 -> 12/11, 21곡 -> 11/10) 무조건 2열로 자른다. 브라우저의 column-count
  // 자동 balance는 정확히 이 개수대로 안 나눠서 직접 slice한다.
  const splitAt = Math.ceil(displayedEntries.length / 2)

  const isEditable = viewMode === 'custom'
  // 편집하기를 눌렀을 때만 곡 찾기 패널을 오른쪽에 띄운다 — 그 외엔 플레이리스트
  // 카드가 전체 폭을 쓰면서 곡 목록을 좌우 2열로 넓게 보여준다.
  const showSearchPanel = isEditable && isEditMode

  // showSearchPanel이 꺼져도 퇴장 애니메이션이 끝날 때까지는 DOM에 남겨둔다
  // (panelMounted), 그 동안 .closing 클래스로 "오른쪽으로 사라지는" 애니메이션을 튼다.
  const [panelMounted, setPanelMounted] = useState(showSearchPanel)
  const [panelClosing, setPanelClosing] = useState(false)
  const panelMountedRef = useRef(panelMounted)
  panelMountedRef.current = panelMounted

  useEffect(() => {
    if (showSearchPanel) {
      setPanelClosing(false)
      setPanelMounted(true)
      return
    }
    if (!panelMountedRef.current) return

    setPanelClosing(true)
    const timer = setTimeout(() => {
      setPanelMounted(false)
      setPanelClosing(false)
    }, 220)
    return () => clearTimeout(timer)
  }, [showSearchPanel])

  const variants = SITE_VARIANTS[site]
  const variant = variants.find((v) => v.key === variantKey) ?? variants[0]

  function selectCustom(id: string) {
    setCustomState((prev) => setActivePlaylist(prev, id))
    setViewMode('custom')
  }

  function handleCreateCustom() {
    const title = prompt('새 플레이리스트 이름을 입력하세요.', '나만의 플레이리스트')
    if (!title || !title.trim()) return
    setCustomState((prev) => createCustomPlaylist(prev, title.trim()))
    setViewMode('custom')
  }

  function handleRenameCustom(id: string, current: string) {
    const title = prompt('플레이리스트 이름을 입력하세요.', current)
    if (!title || !title.trim()) return
    setCustomState((prev) => renameCustomPlaylist(prev, id, title.trim()))
  }

  function handleDeleteCustom(id: string) {
    if (!confirm('이 플레이리스트를 삭제할까요?')) return
    setCustomState((prev) => deleteCustomPlaylist(prev, id))
  }

  function addSong(musicId: string) {
    if (!isEditable) return
    setCustomState((prev) => addSongToPlaylist(prev, prev.activeId, musicId))
  }

  function removeSong(index: number) {
    setCustomState((prev) => removeSongAt(prev, prev.activeId, index))
  }

  function moveSongAt(index: number, direction: -1 | 1) {
    setCustomState((prev) => moveSong(prev, prev.activeId, index, direction))
  }

  function handleDragStart(sourceIndex: number) {
    setDragIndex(sourceIndex)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      setCustomState((prev) => reorderSong(prev, prev.activeId, dragIndex, targetIndex))
    }
    setDragIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
  }

  // i는 열(column)과 무관한 전체 표시 순번(번호 매기기/▲▼ 비활성화 판정용), sourceIndex는
  // songIds 안에서의 실제 위치(이동/삭제 대상 특정용) — 서로 다른 값일 수 있다.
  function renderRow(song: PlaylistSong, sourceIndex: number, i: number) {
    return (
      <div
        className={`playlist-row${dragIndex === sourceIndex ? ' dragging' : ''}`}
        key={`${song.music_id}-${i}`}
        draggable={isEditable && isEditMode}
        onDragStart={() => handleDragStart(sourceIndex)}
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(sourceIndex)}
        onDragEnd={handleDragEnd}
      >
        {isEditable && isEditMode && (
          <span className="playlist-row-handle" aria-hidden="true">
            ☰
          </span>
        )}
        <span className="playlist-row-num">{i + 1}</span>
        <div className="playlist-row-cover">
          {song.album_cover && <img src={song.album_cover} alt="" />}
        </div>
        <div className="playlist-row-info">
          <span className="playlist-row-title" title={song.song}>
            {song.song}
          </span>
          <span className="muted" title={song.album}>
            {song.album}
          </span>
        </div>
        <span className="playlist-row-duration">{song.duration ?? '-'}</span>
        {isEditable && isEditMode && (
          <div className="playlist-row-actions">
            <button
              type="button"
              aria-label="위로"
              title="위로"
              disabled={i === 0}
              onClick={() => moveSongAt(sourceIndex, -1)}
            >
              ▲
            </button>
            <button
              type="button"
              aria-label="아래로"
              title="아래로"
              disabled={i === displayedEntries.length - 1}
              onClick={() => moveSongAt(sourceIndex, 1)}
            >
              ▼
            </button>
            <button type="button" onClick={() => removeSong(sourceIndex)}>
              삭제
            </button>
          </div>
        )}
      </div>
    )
  }

  function clearActive() {
    setCustomState((prev) => clearPlaylist(prev, prev.activeId))
  }

  function handleSiteChange(next: PlaylistSite) {
    setSite(next)
    setVariantKey(SITE_VARIANTS[next][0].key)
  }

  function handleGenerateLinks() {
    const ids: string[] = []
    let skipped = 0
    for (const song of displayedSongs) {
      const id = song[site]
      if (id) ids.push(id)
      else skipped++
    }
    setSkippedCount(skipped)
    setLinks(buildOneClickLinks(variant, ids))
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      alert('복사됨!')
    } catch {
      alert('복사 실패: 브라우저 권한을 확인해 주세요.')
    }
  }

  return (
    <div>
      <div className="playlist-notice muted">
        *엔믹스와 관련된 음원만 검색 및 추가할 수 있습니다.
        <br />
        *나만의 플레이리스트는 캐시 삭제 시 삭제되며, 원클릭 url은 .txt파일로 디스크에 저장할 수
        있습니다.
      </div>

      <div className="playlist-page">
        <nav className="playlist-nav">
          <button
            type="button"
            className={`playlist-nav-item${viewMode === 'recommended' ? ' active' : ''}`}
            onClick={() => setViewMode('recommended')}
          >
            권장 플레이리스트
          </button>

          <div className="playlist-nav-group">
            <div className="playlist-nav-group-label">나만의 플레이리스트</div>
            {customState.playlists.map((p) => (
              <div
                className={`playlist-nav-custom-item${
                  viewMode === 'custom' && customState.activeId === p.id ? ' active' : ''
                }`}
                key={p.id}
              >
                <button
                  type="button"
                  className="playlist-nav-item"
                  onClick={() => selectCustom(p.id)}
                >
                  {p.title}
                </button>
                <button
                  type="button"
                  className="playlist-nav-icon-btn"
                  aria-label="이름 변경"
                  title="이름 변경"
                  onClick={() => handleRenameCustom(p.id, p.title)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="playlist-nav-icon-btn"
                  aria-label="삭제"
                  title="삭제"
                  onClick={() => handleDeleteCustom(p.id)}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="playlist-nav-add" onClick={handleCreateCustom}>
              + 새 플레이리스트
            </button>
          </div>
        </nav>

        <div className="playlist-layout">
          <div className="card playlist-main">
            <h1>플레이리스트</h1>
            <div className="playlist-title-row">
              <h2>
                {viewMode === 'recommended'
                  ? (recommended?.title ?? '권장 플레이리스트')
                  : activePlaylist.title}
              </h2>
              {isEditable && (
                <button type="button" onClick={() => setIsEditMode((prev) => !prev)}>
                  {isEditMode ? '편집 완료' : '편집하기'}
                </button>
              )}
            </div>

            {viewMode === 'recommended' && recommendedLoading && (
              <div className="muted">불러오는 중...</div>
            )}
            {viewMode === 'recommended' && !recommendedLoading && !recommended && (
              <div className="muted">등록된 권장 플레이리스트가 없습니다.</div>
            )}
            {viewMode === 'custom' && displayedSongs.length === 0 && (
              <div className="muted">
                오른쪽에서 곡을 추가해 보세요. 같은 곡을 여러 번 추가할 수도 있습니다.
              </div>
            )}

            {displayedEntries.length > 0 &&
              (showSearchPanel ? (
                <div className="playlist-song-rows">
                  {displayedEntries.map(({ song, sourceIndex }, i) =>
                    renderRow(song, sourceIndex, i),
                  )}
                </div>
              ) : (
                <div className="playlist-song-rows playlist-song-rows-wide">
                  <div className="playlist-song-col">
                    {displayedEntries
                      .slice(0, splitAt)
                      .map(({ song, sourceIndex }, i) => renderRow(song, sourceIndex, i))}
                  </div>
                  <div className="playlist-song-col">
                    {displayedEntries
                      .slice(splitAt)
                      .map(({ song, sourceIndex }, i) => renderRow(song, sourceIndex, i + splitAt))}
                  </div>
                </div>
              ))}

            {displayedSongs.length > 0 && (
              <div className="playlist-total-duration">{totalDurationLabel(displayedSongs)}</div>
            )}

            {isEditable && isEditMode && displayedSongs.length > 0 && (
              <div className="row">
                <button type="button" onClick={clearActive}>
                  전체 삭제
                </button>
              </div>
            )}

            <h3>원클릭 추가하기</h3>
            <div className="row playlist-platform-chips">
              {Object.entries(SITE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`playlist-platform-chip${site === value ? ' active' : ''}`}
                  onClick={() => handleSiteChange(value as PlaylistSite)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="row">
              {variants.length > 1 && (
                <label>
                  기기{' '}
                  <select value={variantKey} onChange={(e) => setVariantKey(e.target.value)}>
                    {variants.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="primary"
                type="button"
                disabled={displayedSongs.length === 0}
                onClick={handleGenerateLinks}
              >
                url추출
              </button>
            </div>
            {skippedCount > 0 && (
              <div className="muted warn">
                {skippedCount}곡은 {SITE_LABELS[site]}에 등록된 곡 번호가 없어 링크에서
                제외됐습니다.
              </div>
            )}
            {links.length > 0 && (
              <div className="playlist-link-list">
                <div className="row">
                  <button
                    type="button"
                    onClick={() => downloadLinksAsTxt(links, `${SITE_LABELS[site]}-playlist.txt`)}
                  >
                    .txt로 저장
                  </button>
                </div>
                {links.map((link, i) => (
                  <div className="playlist-link-item" key={i}>
                    <div className="muted">
                      링크 {i + 1}
                      {links.length > 1 ? ` / ${links.length}` : ''}
                    </div>
                    <pre>{link}</pre>
                    <div className="row">
                      <button
                        type="button"
                        className="primary"
                        onClick={() => (window.location.href = link)}
                      >
                        열기
                      </button>
                      <button type="button" onClick={() => copyLink(link)}>
                        복사
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {panelMounted && (
            <div className={`card playlist-side${panelClosing ? ' closing' : ''}`}>
              <h1>곡 찾기</h1>
              <div className="row">
                <input
                  type="text"
                  placeholder="곡명 또는 앨범명을 입력하세요"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {catalogLoading && <div className="muted">불러오는 중...</div>}
              {catalogError && <div className="muted warn">{catalogError}</div>}
              {!catalogLoading && !catalogError && (
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
