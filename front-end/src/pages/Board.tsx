import BoardList from '../components/BoardList'

export default function Board() {
  return (
    <div className="page-with-sidebar">
      <div className="card">
        <BoardList />
      </div>

      {/* 임시 자리 — 나중에 다른 콘텐츠 들어갈 공간 */}
      <div className="page-sidebar" />
    </div>
  )
}
