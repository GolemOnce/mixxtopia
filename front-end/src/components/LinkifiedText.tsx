import { Fragment } from 'react'

import { detectLinkKind, extractYoutubeId, URL_REGEX, type LinkKind } from '../lib/linkify'
import LinkPreview from './LinkPreview'

interface Embed {
  url: string
  kind: LinkKind
}

// 게시글 본문(자유 텍스트)을 그대로 보여주되, 안에 있는 URL은 클릭 가능한 링크로 바꾸고
// 유튜브/인스타/틱톡 링크는 아래에 임베드까지 붙여준다. Board/Official 상세 둘 다 재사용.
export default function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_REGEX)
  const embeds: Embed[] = []
  const seen = new Set<string>()

  const nodes = parts.map((part, i) => {
    const isUrl = i % 2 === 1
    if (!isUrl) return <Fragment key={i}>{part}</Fragment>

    const kind = detectLinkKind(part)
    if (kind !== 'plain' && !seen.has(part)) {
      seen.add(part)
      embeds.push({ url: part, kind })
    }
    return (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    )
  })

  return (
    <>
      <pre>{nodes}</pre>
      {embeds.length > 0 && (
        <div className="content-embeds">
          {embeds.map((embed) => {
            if (embed.kind === 'youtube') {
              const videoId = extractYoutubeId(embed.url)
              if (!videoId) return null
              return (
                <div className="embed-youtube" key={embed.url}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )
            }
            return <LinkPreview url={embed.url} key={embed.url} />
          })}
        </div>
      )}
    </>
  )
}
