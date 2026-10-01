const SECTIONS = ['그룹', '음반', '음원', '콘서트', '팬미팅', '방송활동 이력']

export default function Intro() {
  return (
    <div className="card">
      <div className="muted">콘텐츠 준비 중입니다. 순서대로 채워나갈 예정입니다.</div>
      {SECTIONS.map((s) => (
        <div className="list-item" key={s}>
          {s}
        </div>
      ))}
    </div>
  )
}
