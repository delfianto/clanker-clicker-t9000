type TimerFn = (fn: TimerHandler, delay?: number, ...args: unknown[]) => number;

const origSetTimeout = window.setTimeout.bind(window);
const origSetInterval = window.setInterval.bind(window);

export function installTimerBoost(thresholdMs: number): () => void {
  const wrap =
    (orig: TimerFn, name: string): TimerFn =>
    (fn, delay, ...args) => {
      const d = typeof delay === "number" && delay >= thresholdMs ? 50 : delay;
      if (d !== delay) {
        console.debug(`[CC] ${name}: ${delay}ms → 50ms`);
      }
      return orig(fn, d, ...args);
    };

  try {
    Object.defineProperties(window, {
      setTimeout: { value: wrap(origSetTimeout, "setTimeout"), writable: true, configurable: true },
      setInterval: {
        value: wrap(origSetInterval, "setInterval"),
        writable: true,
        configurable: true,
      },
    });
  } catch {
    window.setTimeout = wrap(origSetTimeout, "setTimeout") as typeof setTimeout;
    window.setInterval = wrap(origSetInterval, "setInterval") as typeof setInterval;
  }

  return () => {
    try {
      Object.defineProperties(window, {
        setTimeout: { value: origSetTimeout, writable: true, configurable: true },
        setInterval: { value: origSetInterval, writable: true, configurable: true },
      });
    } catch {
      /* ignore */
    }
  };
}
