import { Link } from 'react-router-dom'

export default function AdminHome() {
  return (
    <div className="card">
      <h1>관리자 메뉴</h1>
      <div className="row">
        <Link to="/admin/bustercall">총공 캠페인 관리</Link>
      </div>
      <div className="row">
        <Link to="/schedule/new">일정 등록</Link>
      </div>
      <div className="row">
        <Link to="/vote/new">투표 등록</Link>
      </div>
    </div>
  )
}
