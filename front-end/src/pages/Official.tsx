import OfficialList from '../components/OfficialList'

export default function Official() {
  return (
    <div className="page-with-sidebar">
      <div className="card">
        <OfficialList />
      </div>

      {/* 임시 자리 — 나중에 다른 콘텐츠 들어갈 공간 */}
      <div className="page-sidebar" />
    </div>
  )
}
