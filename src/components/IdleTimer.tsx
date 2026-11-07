import { useEffect, useState } from "react";

const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * Kiosk idle detection (spec §9). After `idleS` seconds without input it starts a
 * `countdownS` countdown (returned as seconds left), then calls `onReset`.
 * Any input cancels the countdown. Returns null while the visitor is active.
 */
export function useIdleTimer({
  enabled,
  idleS,
  countdownS,
  onReset,
}: {
  enabled: boolean;
  idleS: number;
  countdownS: number;
  onReset(): void;
}): [number | null, () => void] {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLeft(null);
      return;
    }
    let last = Date.now();
    const bump = () => {
      last = Date.now();
      setLeft(null);
    };
    EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      const idle = (Date.now() - last) / 1000;
      if (idle >= idleS + countdownS) onReset();
      else if (idle >= idleS) setLeft(Math.ceil(idleS + countdownS - idle));
    }, 250);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(t);
    };
  }, [enabled, idleS, countdownS, onReset]);

  return [left, () => setLeft(null)];
}
