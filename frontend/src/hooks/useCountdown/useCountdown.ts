import { useEffect, useRef, useState } from 'react';


export function useCountdown(deadlineMs: number | null, onExpire: () => void): number | null {
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (deadlineMs === null) {
      setRemainingSec(null);
      return undefined;
    }

    let fired = false;
    const tick = (): void => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0 && !fired) {
        fired = true;
        onExpireRef.current();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  return remainingSec;
}