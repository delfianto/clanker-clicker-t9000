export function installVisibilitySpoofing(): () => void {
  const descriptors: [string, PropertyDescriptor][] = [];

  function spoof(prop: string, value: unknown): void {
    const existing = Object.getOwnPropertyDescriptor(document, prop);
    descriptors.push([prop, existing ?? {}]);
    try {
      Object.defineProperty(document, prop, {
        get: () => value,
        configurable: true,
      });
    } catch {
      /* page already locked it */
    }
  }

  spoof("hidden", false);
  spoof("visibilityState", "visible");
  spoof("webkitVisibilityState", "visible");

  const origHasFocus = document.hasFocus.bind(document);
  document.hasFocus = () => true;

  // Stop focus/blur events from reaching page handlers
  const stopFocus = (e: Event): void => e.stopImmediatePropagation();
  window.addEventListener("focus", stopFocus, { capture: true, passive: true });
  window.addEventListener("blur", stopFocus, { capture: true, passive: true });
  // visibilitychange is NOT blocked: some countdown scripts (e.g. ShrinkMe) listen
  // for it to start the timer. The property getters above already return "visible"
  // so any handler that reads document.visibilityState still sees the spoofed value.

  return () => {
    for (const [prop, desc] of descriptors) {
      try {
        if (Object.keys(desc).length) {
          Object.defineProperty(document, prop, desc);
        }
      } catch {
        /* ignore */
      }
    }
    document.hasFocus = origHasFocus;
    window.removeEventListener("focus", stopFocus, { capture: true });
    window.removeEventListener("blur", stopFocus, { capture: true });
  };
}
