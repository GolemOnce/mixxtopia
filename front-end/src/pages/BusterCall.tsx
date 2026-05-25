import { useState, useEffect } from 'react'

interface PhrasesConfig {
  pairs: [string, string, string][]
  fixed2: string
  fixed4: string
}

interface Stats {
  totalClicks: number
  uniqueClients: number
  pairsCount: number
}

function getClientId(): string {
  const key = 'mixx_client_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

function buildText(cfg: PhrasesConfig): string {
  if (!cfg.pairs || cfg.pairs.length === 0) return '문구 로드 실패'
  const pick = cfg.pairs[Math.floor(Math.random() * cfg.pairs.length)]
  const l1 = pick?.[0] ?? ''
  const l3 = pick?.[1] ?? ''
  const l5 = pick?.[2] ?? ''
  const myUrl = '\nhttps://mixxtopia.site'
  return [l1, cfg.fixed2, l3, cfg.fixed4, l5, myUrl].join('\n')
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' })
    return await res.json()
  } catch {
    return null
  }
}

function logClick() {
  const payload = JSON.stringify({ clientId: getClientId() })
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/click', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}

export default function BusterCall() {
  const [cfg, setCfg] = useState<PhrasesConfig | null>(null)
  const [text, setText] = useState('로딩 중...')
  const [ready, setReady] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/phrases', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: PhrasesConfig) => {
        setCfg(data)
        setText(buildText(data))
        setReady(true)
      })
      .catch(() => {
        setText('문구 로드 실패')
        setReady(true)
      })
    fetchStats().then((s) => { if (s) setStats(s) })
  }, [])

  function reroll() {
    if (!cfg) return
    setText(buildText(cfg))
  }

  function handleTweet() {
    logClick()
    window.open(
      'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text),
      '_blank',
      'noopener,noreferrer',
    )
    if (cfg) setText(buildText(cfg))
    fetchStats().then((s) => { if (s) setStats(s) })
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      alert('복사됨!')
    } catch {
      alert('복사 실패: 브라우저 권한을 확인해 주세요.')
    }
  }

  const len = text.length
  const overLimit = len > 280

  return (
    <div className="card">
      <h1>규진 생일 해시태그 총공 원클릭</h1>
      <div className="row">
        <button className="primary" onClick={handleTweet} disabled={!ready}>
          총공!
        </button>
        <button onClick={reroll} disabled={!ready}>
          문구 변경
        </button>
        <button onClick={handleCopy} disabled={!ready}>
          복사
        </button>
      </div>
      {stats && (
        <div className="muted">
          총공 횟수: {stats.totalClicks.toLocaleString()}회 &nbsp;|&nbsp; 참여자 수: {stats.uniqueClients.toLocaleString()}명 &nbsp;|&nbsp; 템플릿 수: {stats.pairsCount}개
        </div>
      )}
      <pre>{text}</pre>
      <div className={`muted${overLimit ? ' warn' : ''}`}>
        현재 문자수(대략): {len}
        {overLimit ? '  ⚠️ 280자 초과 가능' : ''}
      </div>
      <div className="muted">
        <h3>※ "자동 게시"는 불가이고, X 글쓰기 화면으로 채워서 이동한 뒤 사용자가 게시 버튼을 눌러야 합니다.</h3>
        <h3>※ 총공 버튼 클릭 시 자동으로 문구 변환됩니다.</h3>
        <h3>
          ※ X 정책 상, 비구독 계정은 하루 트윗 50개, 리트윗 200개로 제한되어 있습니다. 또, 짧은 시간에 많은 트윗을 할 경우(리트윗 포함) 계정 일시정지 혹은 이용정지가 될 수 있으니, 10~20초 정도 여유를 두고 트윗(혹은 리트윗)해주시기 바랍니다.
        </h3>
      </div>
    </div>
  )
}
