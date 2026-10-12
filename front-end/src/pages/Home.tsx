import MinimalCountdown from "../components/MinimalCountdown";

export default function Home() {
  return (
    <div className="card">
      <p className="muted">
        <MinimalCountdown target="2026-10-19T18:00:00+09:00" labels={["일", "시간", "분", "초"]} />
      </p>
    </div>
  )
}
