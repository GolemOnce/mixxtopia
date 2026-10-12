import { useEffect, useRef, useState } from "react";

export type CountdownTarget = Date | string | number;

export interface CountdownParts {
  /** 남은 전체 초 */
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function toMs(target: CountdownTarget): number {
  const t = target instanceof Date ? target.getTime() : new Date(target).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function remainingSeconds(targetMs: number): number {
  return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
}

/**
 * 목표 시각까지 남은 시간을 일/시/분/초로 나눠 반환한다.
 * 0이 되는 순간 onComplete 를 한 번 호출한다.
 * (마운트 시점에 이미 지난 시각이면 onComplete 는 호출하지 않는다)
 */
export function useCountdown(target: CountdownTarget, onComplete?: () => void): CountdownParts {
  const targetMs = toMs(target);
  const [total, setTotal] = useState<number>(() => remainingSeconds(targetMs));
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const initial = remainingSeconds(targetMs);
    setTotal(initial);
    if (initial === 0) return undefined;

    // 250ms 마다 확인하지만 초 값이 같으면 React 가 리렌더링을 건너뛴다
    const id = window.setInterval(() => {
      const r = remainingSeconds(targetMs);
      setTotal(r);
      if (r === 0) {
        window.clearInterval(id);
        onCompleteRef.current?.();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [targetMs]);

  return {
    total,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}