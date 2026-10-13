import { useCountdown } from '../lib/useCountdown'
import type { CountdownTarget } from '../lib/useCountdown'
import './MinimalCountdown.css'

/** 일 / 시 / 분 / 초 순서의 라벨 4개 */
export type CountdownLabels = readonly [string, string, string, string]

export interface MinimalCountdownProps {
  /** 목표 시각 (예: "2026-11-03T18:00:00+09:00") */
  target: CountdownTarget
  /** 단위 라벨. 기본값 DAYS / HOURS / MINUTES / SECONDS */
  labels?: CountdownLabels
  /** 0 이 되는 순간 한 번 호출 */
  onComplete?: () => void
  /** 바깥 컨테이너에 추가할 클래스 */
  className?: string
}

const DEFAULT_LABELS: CountdownLabels = ['DAYS', 'HOURS', 'MINUTES', 'SECONDS']

const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * 자리마다 key 를 "위치-숫자"로 줘서, 바뀐 자리만 다시 마운트되고
 * 그 자리에만 짧은 등장 애니메이션이 걸리게 한다.
 */
function Digits({ value }: { value: string }) {
  const chars = value.split('')
  return (
    <span className="mc-value">
      {chars.map((ch, i) => (
        <span className="mc-digit" key={`${chars.length - i}-${ch}`}>
          {ch}
        </span>
      ))}
    </span>
  )
}

export default function MinimalCountdown({
  target,
  labels = DEFAULT_LABELS,
  onComplete,
  className = '',
}: MinimalCountdownProps) {
  const { days, hours, minutes, seconds } = useCountdown(target, onComplete)
  const units = [days, hours, minutes, seconds].map(pad)

  return (
    <div
      className={`minimal-countdown ${className}`.trim()}
      role="timer"
      aria-label={`${days}일 ${hours}시간 ${minutes}분 ${seconds}초 남음`}
    >
      {units.map((v, i) => (
        <div className="mc-group" key={i} aria-hidden="true">
          {i > 0 && <span className="mc-sep">:</span>}
          <div className="mc-unit">
            <Digits value={v} />
            <span className="mc-label">{labels[i]}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
