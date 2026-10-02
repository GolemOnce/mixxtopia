export type OAuthProvider = 'gmail' | 'naver'

const STATE_KEY = 'mixxtopia:oauth-state'

export class OAuthConfigError extends Error {
  provider: OAuthProvider

  constructor(provider: OAuthProvider) {
    super(`${provider} OAuth 클라이언트 ID가 설정되지 않았습니다.`)
    this.provider = provider
  }
}

export interface OAuthCallbackResult {
  provider: OAuthProvider
  accessToken: string
}

function randomNonce(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

// 두 제공자 모두 이 로그인 페이지 자체를 redirect_uri로 쓰고,
// state에 담은 provider 값으로 돌아왔을 때 어느 쪽 콜백인지 구분한다.
function redirectUri(): string {
  return `${window.location.origin}/login`
}

// 프론트엔드가 provider의 access token을 직접 받아 백엔드로 전달하는 방식(암묵적 흐름).
// 백엔드가 그 토큰으로 provider의 userinfo API를 호출해 검증한다(app/core/oauth.py).
export function startOAuthLogin(provider: OAuthProvider) {
  const nonce = randomNonce()
  sessionStorage.setItem(STATE_KEY, nonce)
  const state = `${provider}:${nonce}`

  if (provider === 'gmail') {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) throw new OAuthConfigError(provider)

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri())
    url.searchParams.set('response_type', 'token')
    url.searchParams.set('scope', 'email profile')
    url.searchParams.set('state', state)
    window.location.href = url.toString()
    return
  }

  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID
  if (!clientId) throw new OAuthConfigError(provider)

  const url = new URL('https://nid.naver.com/oauth2.0/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri())
  url.searchParams.set('response_type', 'token')
  url.searchParams.set('state', state)
  window.location.href = url.toString()
}

// 로그인 페이지로 돌아왔을 때 URL 해시(#access_token=...&state=...)를 읽어 토큰을 꺼낸다.
// state의 난수가 직전에 저장해둔 값과 다르면(CSRF/위조 가능성) 무시한다.
export function consumeOAuthCallback(): OAuthCallbackResult | null {
  if (!window.location.hash) return null

  const params = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = params.get('access_token')
  const state = params.get('state')

  // 주소창에 토큰이 남아있지 않도록 읽자마자 지운다.
  window.history.replaceState(null, '', window.location.pathname)

  if (!accessToken || !state) return null

  const [provider, nonce] = state.split(':')
  const expectedNonce = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)

  if (!nonce || nonce !== expectedNonce) return null
  if (provider !== 'gmail' && provider !== 'naver') return null

  return { provider, accessToken }
}
