import { useEffect, useState } from 'react'

import { api } from '../api/client'

interface LinkPreviewData {
  url: string
  title: string | null
  description: string | null
  image: string | null
  site_name: string | null
}

// 일정/투표/오피셜 등 link 필드가 있는 도메인이면 어디서든 재사용하는 링크 미리보기 카드.
export default function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<LinkPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    setData(null)

    api
      .get<LinkPreviewData>(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [url])

  if (loading) {
    return <div className="link-preview muted">미리보기 불러오는 중...</div>
  }

  if (failed || !data) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview-fallback">
        {url}
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview">
      {data.image && <img src={data.image} alt="" className="link-preview-image" />}
      <div className="link-preview-body">
        {data.site_name && <div className="link-preview-site">{data.site_name}</div>}
        <div className="link-preview-title">{data.title ?? url}</div>
        {data.description && <div className="link-preview-desc">{data.description}</div>}
      </div>
    </a>
  )
}
