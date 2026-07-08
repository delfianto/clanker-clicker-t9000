import { isSynthetic } from "../engine/synthetic";

const origAddEventListener = EventTarget.prototype.addEventListener;
const origRemoveEventListener = EventTarget.prototype.removeEventListener;

// One stable wrapper per (listener, type, capture) registration. Reusing the
// same wrapper reference keeps the browser's registration semantics intact
// through the patch: duplicate addEventListener calls still dedupe, and
// removeEventListener still finds what was registered. A fresh wrapper per
// call leaks stale handlers the page can never remove — that broke dynamic
// checkbox/list UIs on sites the extension never even targets.
const wrappers = new WeakMap<EventListener, Map<string, EventListener>>();

function registrationKey(type: string, options?: boolean | EventListenerOptions | null): string {
  const capture =
    options === true ||
    (typeof options === "object" && options !== null && options.capture === true);
  return capture ? `c:${type}` : `b:${type}`;
}

function wrapperFor(listener: EventListener, key: string): EventListener {
  let byKey = wrappers.get(listener);
  if (!byKey) {
    byKey = new Map();
    wrappers.set(listener, byKey);
  }
  let wrapped = byKey.get(key);
  if (!wrapped) {
    wrapped = function (this: EventTarget, event: Event): void {
      // Real page/user events pass through untouched — same object identity,
      // real isTrusted. Only events the extension dispatched get the proxy.
      if (!isSynthetic(event)) {
        listener.call(this, event);
        return;
      }
      // Proxy the original event rather than cloning it — cloning drops
      // event.target, event.currentTarget, and other dispatch-time properties
      // that third-party scripts (e.g. reCAPTCHA) rely on for bot detection.
      // Proxying preserves everything and only overrides isTrusted so our
      // synthetic simulateClick events are accepted.
      const proxied = new Proxy(event, {
        get(target, prop) {
          if (prop === "isTrusted") return true;
          const val = Reflect.get(target, prop, target);
          return typeof val === "function" ? val.bind(target) : val;
        },
      });
      listener.call(this, proxied as Event);
    };
    byKey.set(key, wrapped);
  }
  return wrapped;
}

export function installTrustProxy(): () => void {
  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (typeof listener !== "function") {
      return origAddEventListener.call(this, type, listener, options);
    }
    return origAddEventListener.call(
      this,
      type,
      wrapperFor(listener, registrationKey(type, options)),
      options,
    );
  };

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    const wrapped =
      typeof listener === "function"
        ? wrappers.get(listener)?.get(registrationKey(type, options))
        : undefined;
    return origRemoveEventListener.call(this, type, wrapped ?? listener, options);
  };

  return () => {
    EventTarget.prototype.addEventListener = origAddEventListener;
    EventTarget.prototype.removeEventListener = origRemoveEventListener;
  };
}
