export interface PlaylistSong {
  music_id: string
  song: string
  album: string
  album_cover: string | null
  artist: string
  duration: string | null
  melon: string | null
  genie: string | null
  bugs: string | null
  flo: string | null
  vibe: string | null
}

export interface RecommendedPlaylist {
  playlist_id: string
  title: string
  songs: PlaylistSong[]
  is_current: boolean
}

// "3:05" -> 185초. 파싱 불가하면(데이터 누락 등) 0으로 취급한다.
function parseDurationToSeconds(duration: string | null): number {
  if (!duration) return 0
  const parts = duration.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return 0
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

// 곡 찾기 검색에서 띄어쓰기 차이를 무시하게 한다(예: "긴소원"으로도 "긴 소원 (Birthday
// Wish)"를 찾을 수 있게).
export function normalizeForSearch(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase()
}

export function totalDurationLabel(songs: PlaylistSong[]): string {
  const totalSeconds = songs.reduce((acc, s) => acc + parseDurationToSeconds(s.duration), 0)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export type PlaylistSite = 'melon' | 'bugs' | 'genie' | 'flo' | 'vibe'

export const SITE_LABELS: Record<PlaylistSite, string> = {
  melon: '멜론',
  bugs: '벅스',
  genie: '지니',
  flo: '플로',
  vibe: '바이브',
}

export interface LinkVariant {
  key: string
  label: string
  // 하나의 링크 안에 같은 곡이 중복돼도 되는지 여부. false면 링크를 여러 개로 나눈다.
  allowDuplicateInLink: boolean
  buildUrl: (ids: string[]) => string
}

const MELON_VARIANTS: LinkVariant[] = [
  {
    key: 'android',
    label: '안드로이드 앱',
    allowDuplicateInLink: false,
    buildUrl: (ids) => `melonapp://play?menuid=0&ctype=1&cid=${ids.join(',')}`,
  },
  {
    key: 'iphone',
    label: '아이폰 앱',
    allowDuplicateInLink: true,
    buildUrl: (ids) => `meloniphone://play/?ctype=1&menuid=0&cid=${ids.join(',')}`,
  },
  {
    key: 'ipad',
    label: '아이패드 앱',
    allowDuplicateInLink: false,
    buildUrl: (ids) => `melonipad://play/?ctype=1&menuid=0&cid=${ids.join(',')}`,
  },
  {
    key: 'web',
    label: '웹',
    allowDuplicateInLink: false,
    buildUrl: (ids) => `melonapp://play/?cType=1&menuId=1000002721&cList=${ids.join(',')}`,
  },
  {
    key: 'pc',
    label: 'PC/맥',
    allowDuplicateInLink: true,
    buildUrl: (ids) => `melonplayer://play?menuid=0&cflag=1&cid=${ids.join(',')}`,
  },
]

const BUGS_VARIANTS: LinkVariant[] = [
  {
    key: 'app',
    label: '앱',
    allowDuplicateInLink: true,
    buildUrl: (ids) =>
      `bugs3://app/tracks/lists?title=전체듣기&miniplay=Y&track_ids=${ids.join('|')}`,
  },
]

const GENIE_VARIANTS: LinkVariant[] = [
  {
    key: 'android',
    label: '안드로이드 앱',
    allowDuplicateInLink: true,
    buildUrl: (ids) => `cromegenie://scan/?landing_type=31&landing_target=${ids.join(';')}`,
  },
  {
    key: 'iphone',
    label: '아이폰 앱',
    allowDuplicateInLink: true,
    buildUrl: (ids) => `ktolleh00167://landing/?landing_type=31&landing_target=${ids.join(';')}`,
  },
  {
    key: 'web',
    label: '웹',
    allowDuplicateInLink: true,
    buildUrl: (ids) => `https://www.genie.co.kr/player/shareProcessV2?xgnm=${ids.join(';')}`,
  },
]

const FLO_VARIANTS: LinkVariant[] = [
  {
    key: 'app',
    label: '앱',
    allowDuplicateInLink: true,
    buildUrl: (ids) => `flomusic://play/track?ids=${ids.join(',')}`,
  },
]

const VIBE_VARIANTS: LinkVariant[] = [
  {
    key: 'app',
    label: '앱',
    allowDuplicateInLink: false,
    buildUrl: (ids) => `vibe://listen?version=3&trackIds=${ids.join(',')}`,
  },
]

export const SITE_VARIANTS: Record<PlaylistSite, LinkVariant[]> = {
  melon: MELON_VARIANTS,
  bugs: BUGS_VARIANTS,
  genie: GENIE_VARIANTS,
  flo: FLO_VARIANTS,
  vibe: VIBE_VARIANTS,
}

// 링크 하나에 같은 곡이 중복되면 안 되는 서비스용 — 플레이리스트 순서를 유지한 채
// 같은 id가 다시 나오면 새 그룹으로 넘겨서, 그룹(=링크) 안에서는 id가 겹치지 않게 한다.
function splitNoDuplicates(ids: string[]): string[][] {
  const chunks: string[][] = []
  let current: string[] = []
  let seen = new Set<string>()

  for (const id of ids) {
    if (seen.has(id)) {
      chunks.push(current)
      current = [id]
      seen = new Set([id])
    } else {
      current.push(id)
      seen.add(id)
    }
  }
  if (current.length > 0) chunks.push(current)

  return chunks
}

export function buildOneClickLinks(variant: LinkVariant, ids: string[]): string[] {
  if (ids.length === 0) return []
  if (variant.allowDuplicateInLink) return [variant.buildUrl(ids)]
  return splitNoDuplicates(ids).map((chunk) => variant.buildUrl(chunk))
}

export function downloadLinksAsTxt(links: string[], filename: string): void {
  const blob = new Blob([links.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
