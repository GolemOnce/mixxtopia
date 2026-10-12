// crypto.randomUUID()는 Secure Context(https 또는 localhost)에서만 존재한다 — 개발 서버를
// 모바일에서 LAN IP(http://192.168.x.x:5173 등)로 열면 insecure context라 crypto.randomUUID
// 자체가 없어서 호출하자마자 예외가 터진다(렌더링 중 호출이면 그 페이지 전체가 깨짐).
// 있으면 쓰고 없으면 간단한 대체 난수로 폴백한다.
export function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}
