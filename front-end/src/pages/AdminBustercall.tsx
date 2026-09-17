import { useEffect, useState } from 'react'

type Category = 'comeback' | 'birthday' | 'anniversary'
type Pair = [string, string, string]

interface Campaign {
  phrases_id: string
  category: Category
  detail: string
  member: string
  pairs: string[][]
  fixed2: string
  fixed4: string
  is_current: boolean
}

const CATEGORY_LABELS: Record<Category, string> = {
  comeback: '컴백',
  birthday: '생일',
  anniversary: 'n주년',
}

const NEW_CAMPAIGN = 'new'

function parsePairText(text: string): string[] {
  const byLine = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  if (byLine.length > 1) return byLine

  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function campaignLabel(c: Campaign): string {
  const current = c.is_current ? ' (진행중)' : ''
  return `${CATEGORY_LABELS[c.category]} / ${c.detail} / ${c.member}${current}`
}

async function fetchJson(res: Response) {
  return res.json().catch(() => null)
}

export default function AdminBustercall() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [selectedId, setSelectedId] = useState<string>(NEW_CAMPAIGN)

  const [category, setCategory] = useState<Category>('birthday')
  const [detail, setDetail] = useState('')
  const [member, setMember] = useState('')
  const [pairTexts, setPairTexts] = useState<string[]>([''])
  const [fixed2, setFixed2] = useState('')
  const [fixed4, setFixed4] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isEditing = selectedId !== NEW_CAMPAIGN

  async function loadCampaigns() {
    setLoadingList(true)
    setListError(null)
    try {
      const res = await fetch('/api/bustercall/campaigns', { credentials: 'include' })
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
  }, [])

  function resetForm() {
    setCategory('birthday')
    setDetail('')
    setMember('')
    setPairTexts([''])
    setFixed2('')
    setFixed4('')
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    setError(null)
    setSuccessMessage(null)

    if (id === NEW_CAMPAIGN) {
      resetForm()
      return
    }

    const campaign = campaigns.find((c) => c.phrases_id === id)
    if (!campaign) return

    setCategory(campaign.category)
    setDetail(campaign.detail)
    setMember(campaign.member)
    setPairTexts(campaign.pairs.map((pair) => pair.join('\n')))
    setFixed2(campaign.fixed2)
    setFixed4(campaign.fixed4)
  }

  function updatePairText(pairIndex: number, value: string) {
    setPairTexts((prev) => prev.map((text, i) => (i === pairIndex ? value : text)))
  }

  function addPair() {
    setPairTexts((prev) => [...prev, ''])
  }

  function removePair(pairIndex: number) {
    setPairTexts((prev) => prev.filter((_, i) => i !== pairIndex))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const pairs: Pair[] = []
    for (let i = 0; i < pairTexts.length; i++) {
      const parts = parsePairText(pairTexts[i])
      if (parts.length !== 3) {
        setError(
          `${i + 1}번째 문구는 줄바꿈 또는 쉼표로 정확히 3줄이 구분돼야 합니다. (현재 ${parts.length}줄 인식됨)`,
        )
        return
      }
      pairs.push(parts as Pair)
    }

    setSubmitting(true)
    try {
      const res = isEditing
        ? await fetch(`/api/bustercall/campaigns/${selectedId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairs, fixed2, fixed4 }),
          })
        : await fetch('/api/bustercall/campaigns', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, detail, member, pairs, fixed2, fixed4 }),
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

      const saved: Campaign = await res.json()
      setSuccessMessage(`저장 완료: ${campaignLabel(saved)}`)
      await loadCampaigns()
      setSelectedId(saved.phrases_id)
    } catch {
      setError('요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    if (!confirm('이 캠페인을 삭제할까요? (완전 삭제가 아니라 목록에서만 사라집니다)')) return

    setError(null)
    setSuccessMessage(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/bustercall/campaigns/${selectedId}`, {
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
      setSelectedId(NEW_CAMPAIGN)
      resetForm()
      await loadCampaigns()
    } catch {
      setError('요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h1>총공 캠페인 설정</h1>

      <div className="row">
        <label>
          캠페인 선택{' '}
          <select value={selectedId} onChange={(e) => handleSelect(e.target.value)}>
            <option value={NEW_CAMPAIGN}>+ 새로 만들기</option>
            {campaigns.map((c) => (
              <option key={c.phrases_id} value={c.phrases_id}>
                {campaignLabel(c)}
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
            종류{' '}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              disabled={isEditing}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            상세{' '}
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={16}
              placeholder={
                category === 'comeback' ? '곡 이름' : category === 'birthday' ? 'YYYY' : 'n'
              }
              disabled={isEditing}
              required
            />
          </label>
          <label>
            멤버{' '}
            <input
              value={member}
              onChange={(e) => setMember(e.target.value)}
              maxLength={16}
              placeholder="kyujin, nmixx 등"
              disabled={isEditing}
              required
            />
          </label>
        </div>
        {isEditing && (
          <div className="muted">
            기존 캠페인은 종류/상세/멤버를 바꿀 수 없어요. 바꾸려면 "새로 만들기"로 등록하세요.
          </div>
        )}

        <h3>유동 문구 (1,3,5번째 줄)</h3>
        <div className="muted">한 칸에 3줄(줄바꿈) 또는 쉼표로 구분된 3개 문구를 입력하세요.</div>
        {pairTexts.map((text, pairIndex) => (
          <div className="row" key={pairIndex}>
            <textarea
              className="pair-input"
              value={text}
              onChange={(e) => updatePairText(pairIndex, e.target.value)}
              placeholder={'1번째 줄\n3번째 줄\n5번째 줄'}
              rows={3}
              required
            />
            <button
              type="button"
              onClick={() => removePair(pairIndex)}
              disabled={pairTexts.length <= 1}
            >
              삭제
            </button>
          </div>
        ))}
        <div className="row">
          <button type="button" onClick={addPair}>
            문구 추가
          </button>
        </div>

        <div className="row">
          <label>
            고정문구1(2번째줄){' '}
            <input
              value={fixed2}
              onChange={(e) => setFixed2(e.target.value)}
              maxLength={50}
              required
            />
          </label>
          <label>
            고정문구2(4번째줄){' '}
            <input
              value={fixed4}
              onChange={(e) => setFixed4(e.target.value)}
              maxLength={50}
              required
            />
          </label>
        </div>

        <div className="row">
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? '저장 중...' : isEditing ? '캠페인 수정/전환' : '새 캠페인 등록'}
          </button>
          {isEditing && (
            <button type="button" onClick={handleDelete} disabled={submitting}>
              캠페인 삭제
            </button>
          )}
        </div>
      </form>

      {error && <div className="muted warn">{error}</div>}
      {successMessage && <div className="muted">{successMessage}</div>}
    </div>
  )
}
