// 본문(자유 텍스트) 안의 URL을 찾아서 종류를 구분한다.
// - youtube: 영상 ID를 뽑아서 진짜 iframe으로 임베드(공식 스크립트 불필요)
// - card: 인스타/틱톡 등 — 이미 만들어둔 LinkPreview 카드(서버 OG 스크래핑)로 보여줌.
//   인스타/틱톡은 공식 임베드가 외부 스크립트(embed.js) 로딩을 요구해서, 사용자 콘텐츠가
//   올라오는 페이지에 제3자 스크립트를 넣는 걸 피하려고 카드로 대체함.
// - plain: 그 외 일반 링크 — 클릭 가능한 하이퍼링크로만 표시.
export const URL_REGEX = /(https?:\/\/[^\s<>"'\u3000]+)/g

export type LinkKind = 'youtube' | 'card' | 'plain'

const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/
const CARD_HOST_RE = /^https?:\/\/(?:www\.|vm\.|vt\.)?(?:instagram\.com|tiktok\.com)\//

export function extractYoutubeId(url: string): string | null {
  const m = url.match(YOUTUBE_ID_RE)
  return m ? m[1] : null
}

export function detectLinkKind(url: string): LinkKind {
  if (YOUTUBE_ID_RE.test(url)) return 'youtube'
  if (CARD_HOST_RE.test(url)) return 'card'
  return 'plain'
}
