// Synthetic-event registry. Events the extension dispatches itself are
// recorded in a WeakSet so the trust proxy (features/trust.ts) can spoof
// isTrusted on exactly those events and leave real page/user events untouched.
const syntheticEvents = new WeakSet<Event>();

export function markSynthetic<T extends Event>(event: T): T {
  syntheticEvents.add(event);
  return event;
}

export function isSynthetic(event: Event): boolean {
  return syntheticEvents.has(event);
}

const CLICK_EVENTS = ["mouseover", "mousedown", "mouseup", "click"] as const;

// Full pointer sequence, marked synthetic so trust-wrapped page handlers see
// isTrusted:true. Dispatching "click" also runs the element's activation
// behavior (checkbox toggle, link follow), matching native el.click().
export function simulateClick(el: Element): void {
  el.removeAttribute("disabled");
  el.removeAttribute("target");
  for (const type of CLICK_EVENTS) {
    el.dispatchEvent(markSynthetic(new MouseEvent(type, { bubbles: true, cancelable: true })));
  }
}
