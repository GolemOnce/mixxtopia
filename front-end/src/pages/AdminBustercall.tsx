import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { CATEGORY_LABELS, type BustercallCategory } from '../lib/bustercall'
import { formatDateTimeKST } from '../lib/date'

type Category = BustercallCategory
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
  total_clicks: number | null
  unique_clients: number | null
  synced_at: string | null
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
  const selectedCampaign = campaigns.find((c) => c.phrases_id === selectedId)

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

  async function handleActivate() {
    if (!isEditing) return
    if (
      !confirm(
        '이 캠페인을 현재 캠페인으로 전환할까요?\n(전환 전에 이전 캠페인의 "총공 데이터 저장"을 먼저 했는지 확인하세요 — 안 하면 집계가 끊깁니다)',
      )
    )
      return

    setError(null)
    setSuccessMessage(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/bustercall/campaigns/${selectedId}/activate`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await fetchJson(res)
        setError(
          res.status === 401 || res.status === 403
            ? '관리자 로그인이 필요합니다.'
            : (body?.detail ?? `전환 실패 (${res.status})`),
        )
        return
      }

      const saved: Campaign = await res.json()
      setSuccessMessage(`전환 완료: ${campaignLabel(saved)}`)
      await loadCampaigns()
    } catch {
      setError('요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSyncStats() {
    if (!isEditing) return
    if (!confirm('현재 집계(Redis)를 캠페인에 저장하고 카운터를 초기화할까요?')) return

    setError(null)
    setSuccessMessage(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/bustercall/campaigns/${selectedId}/sync-stats`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await fetchJson(res)
        setError(
          res.status === 401 || res.status === 403
            ? '관리자 로그인이 필요합니다.'
            : (body?.detail ?? `저장 실패 (${res.status})`),
        )
        return
      }

      const saved: Campaign = await res.json()
      setSuccessMessage(
        `총공 데이터 저장 완료: 클릭 ${saved.total_clicks ?? 0}회 / 참여자 ${saved.unique_clients ?? 0}명`,
      )
      await loadCampaigns()
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
      <div className="row">
        <Link to="/admin">관리자 메뉴로</Link>
      </div>
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
      {isEditing && selectedCampaign && (
        <div className="muted">
          {selectedCampaign.is_current ? '진행중' : '비활성'} · 클릭{' '}
          {selectedCampaign.total_clicks ?? '-'}회 · 참여자 {selectedCampaign.unique_clients ?? '-'}
          명
          {selectedCampaign.synced_at &&
            ` · 마지막 저장: ${formatDateTimeKST(selectedCampaign.synced_at)}`}
        </div>
      )}

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
                category === 'comeback' ? '곡 이름' : 'YYYY(데뷔 연도 기준 연차로 변환됨)'
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
            {submitting ? '저장 중...' : isEditing ? '캠페인 수정' : '새 캠페인 등록'}
          </button>
          {isEditing && !selectedCampaign?.is_current && (
            <button type="button" onClick={handleActivate} disabled={submitting}>
              캠페인 전환
            </button>
          )}
          {isEditing && selectedCampaign?.is_current && (
            <button type="button" onClick={handleSyncStats} disabled={submitting}>
              총공 데이터 저장
            </button>
          )}
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
