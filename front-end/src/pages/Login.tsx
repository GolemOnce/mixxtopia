import { useEffect, useState } from 'react'

import { ApiError, api, authErrorMessage } from '../api/client'
import {
  OAuthConfigError,
  type OAuthProvider,
  consumeOAuthCallback,
  startOAuthLogin,
} from '../lib/oauth'

interface AuthResultResponse {
  user_id: string
  oauth: OAuthProvider
  nickname: string
  role: string
}

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  gmail: 'Gmail',
  naver: 'Naver',
}

type Step = { kind: 'idle' } | { kind: 'need-signup'; oauth: OAuthProvider; accessToken: string }

export default function Login() {
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nickname, setNickname] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)

  useEffect(() => {
    const result = consumeOAuthCallback()
    if (result) loginWithProvider(result.provider, result.accessToken)
  }, [])

  async function loginWithProvider(oauth: OAuthProvider, accessToken: string) {
    setError(null)
    setSubmitting(true)
    try {
      await api.post<AuthResultResponse>('/api/auth/login', { oauth, access_token: accessToken })
      window.location.href = '/'
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // 가입 이력이 없는 계정 -> 닉네임/약관 동의를 받아 회원가입으로 이어간다.
        setStep({ kind: 'need-signup', oauth, accessToken })
      } else {
        setError(authErrorMessage(err, '로그인 중 오류가 발생했습니다.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleProviderClick(provider: OAuthProvider) {
    setError(null)
    try {
      startOAuthLogin(provider)
    } catch (err) {
      if (err instanceof OAuthConfigError) {
        setError(
          `${PROVIDER_LABEL[provider]} OAuth 클라이언트 ID가 설정되지 않았습니다. front-end/.env의 관련 값을 채워주세요.`,
        )
      }
    }
  }

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step.kind !== 'need-signup') return

    setError(null)
    setSubmitting(true)
    try {
      await api.post<AuthResultResponse>('/api/auth/signup', {
        oauth: step.oauth,
        access_token: step.accessToken,
        nickname,
        agree_terms: agreeTerms,
        agree_privacy: agreePrivacy,
      })
      window.location.href = '/'
    } catch (err) {
      setError(authErrorMessage(err, '회원가입 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (step.kind === 'need-signup') {
    return (
      <div className="card">
        <h1>회원가입</h1>
        <div className="muted">
          {PROVIDER_LABEL[step.oauth]} 계정으로 처음 로그인하셨네요. 닉네임을 정하고 약관에
          동의해주세요.
        </div>
        <form onSubmit={handleSignupSubmit}>
          <div className="row">
            <label>
              닉네임{' '}
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={8}
                required
              />
            </label>
          </div>
          <div className="row">
            <label>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />{' '}
              (필수) 서비스 이용약관에 동의합니다.
            </label>
          </div>
          <div className="row">
            <label>
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
              />{' '}
              (필수) 개인정보 수집·이용(IP 및 접속기록 수집 포함)에 동의합니다.
            </label>
          </div>
          <div className="row">
            <button
              className="primary"
              type="submit"
              disabled={submitting || !agreeTerms || !agreePrivacy}
            >
              {submitting ? '가입 중...' : '가입하고 시작하기'}
            </button>
          </div>
        </form>
        {error && <div className="muted warn">{error}</div>}
      </div>
    )
  }

  return (
    <div className="card">
      <div className="row">
        <button
          type="button"
          className="primary"
          disabled={submitting}
          onClick={() => handleProviderClick('gmail')}
        >
          Gmail로 로그인
        </button>
        <button type="button" disabled={submitting} onClick={() => handleProviderClick('naver')}>
          Naver로 로그인
        </button>
      </div>
      {submitting && <div className="muted">로그인 처리 중...</div>}
      {error && <div className="muted warn">{error}</div>}
    </div>
  )
}
