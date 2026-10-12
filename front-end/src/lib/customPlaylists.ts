// "나만의 플레이리스트" — 서버에 저장하지 않고 브라우저 localStorage에만 보관한다
// (여러 개 생성/전환 가능하지만 캐시 삭제 시 함께 사라짐. docs/api-spec.md 참고).
// 곡 자체는 music_id만 순서/중복 허용해서 저장하고, 실제 곡 정보는 항상 최신 카탈로그에서
// 조회 시점에 매핑한다(스냅샷을 들고 있지 않아 메타데이터가 바뀌어도 어긋나지 않음).

import { randomId } from './randomId'

export interface CustomPlaylist {
  id: string
  title: string
  songIds: string[]
}

export interface CustomPlaylistsState {
  playlists: CustomPlaylist[]
  activeId: string
}

const STORAGE_KEY = 'mixxtopia:custom-playlists'
const DEFAULT_TITLE = '나만의 플레이리스트'

function makeDefaultState(): CustomPlaylistsState {
  const id = randomId()
  return { playlists: [{ id, title: DEFAULT_TITLE, songIds: [] }], activeId: id }
}

export function loadCustomPlaylists(): CustomPlaylistsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeDefaultState()

    const parsed = JSON.parse(raw) as CustomPlaylistsState
    if (!Array.isArray(parsed.playlists) || parsed.playlists.length === 0) {
      return makeDefaultState()
    }
    if (!parsed.playlists.some((p) => p.id === parsed.activeId)) {
      parsed.activeId = parsed.playlists[0].id
    }
    return parsed
  } catch {
    return makeDefaultState()
  }
}

export function saveCustomPlaylists(state: CustomPlaylistsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 저장 실패(프라이빗 모드 등)해도 이번 세션 동작 자체는 계속되게 둔다.
  }
}

export function createCustomPlaylist(
  state: CustomPlaylistsState,
  title: string,
): CustomPlaylistsState {
  const id = randomId()
  return {
    playlists: [...state.playlists, { id, title, songIds: [] }],
    activeId: id,
  }
}

export function renameCustomPlaylist(
  state: CustomPlaylistsState,
  id: string,
  title: string,
): CustomPlaylistsState {
  return {
    ...state,
    playlists: state.playlists.map((p) => (p.id === id ? { ...p, title } : p)),
  }
}

export function deleteCustomPlaylist(
  state: CustomPlaylistsState,
  id: string,
): CustomPlaylistsState {
  const remaining = state.playlists.filter((p) => p.id !== id)
  if (remaining.length === 0) return makeDefaultState()

  return {
    playlists: remaining,
    activeId: state.activeId === id ? remaining[0].id : state.activeId,
  }
}

export function addSongToPlaylist(
  state: CustomPlaylistsState,
  id: string,
  musicId: string,
): CustomPlaylistsState {
  return {
    ...state,
    playlists: state.playlists.map((p) =>
      p.id === id ? { ...p, songIds: [...p.songIds, musicId] } : p,
    ),
  }
}

export function removeSongAt(
  state: CustomPlaylistsState,
  id: string,
  index: number,
): CustomPlaylistsState {
  return {
    ...state,
    playlists: state.playlists.map((p) =>
      p.id === id ? { ...p, songIds: p.songIds.filter((_, i) => i !== index) } : p,
    ),
  }
}

export function moveSong(
  state: CustomPlaylistsState,
  id: string,
  index: number,
  direction: -1 | 1,
): CustomPlaylistsState {
  return {
    ...state,
    playlists: state.playlists.map((p) => {
      if (p.id !== id) return p

      const target = index + direction
      if (target < 0 || target >= p.songIds.length) return p

      const songIds = [...p.songIds]
      ;[songIds[index], songIds[target]] = [songIds[target], songIds[index]]
      return { ...p, songIds }
    }),
  }
}

// moveSong은 인접한 자리와만 맞바꾸고(▲▼ 버튼용), reorderSong은 드래그앤드롭처럼
// 임의 위치로 옮긴다 — 사이에 있던 곡들은 한 칸씩 밀림.
export function reorderSong(
  state: CustomPlaylistsState,
  id: string,
  fromIndex: number,
  toIndex: number,
): CustomPlaylistsState {
  return {
    ...state,
    playlists: state.playlists.map((p) => {
      if (p.id !== id) return p
      if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= p.songIds.length) return p

      const songIds = [...p.songIds]
      const [moved] = songIds.splice(fromIndex, 1)
      const clampedTo = Math.max(0, Math.min(toIndex, songIds.length))
      songIds.splice(clampedTo, 0, moved)
      return { ...p, songIds }
    }),
  }
}

export function clearPlaylist(state: CustomPlaylistsState, id: string): CustomPlaylistsState {
  return {
    ...state,
    playlists: state.playlists.map((p) => (p.id === id ? { ...p, songIds: [] } : p)),
  }
}

export function setActivePlaylist(state: CustomPlaylistsState, id: string): CustomPlaylistsState {
  return { ...state, activeId: id }
}
