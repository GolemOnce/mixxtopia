import AdminBustercall from './pages/AdminBustercall'
import BusterCall from './pages/BusterCall'

export default function App() {
  // TODO: react-router 등 정식 라우팅 도입 전까지의 임시 경로 분기
  if (window.location.pathname === '/admin') {
    return <AdminBustercall />
  }
  return <BusterCall />
}
