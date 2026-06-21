const origAddEventListener = EventTarget.prototype.addEventListener;

export function installTrustProxy(): () => void {
  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type === "message" || typeof listener !== "function") {
      return origAddEventListener.call(this, type, listener, options);
    }

    const wrapped = function (this: EventTarget, event: Event): void {
      // Proxy the original event rather than cloning it — cloning drops event.target,
      // event.currentTarget, and other dispatch-time properties that third-party scripts
      // (e.g. reCAPTCHA) rely on for bot detection. Proxying preserves everything and
      // only overrides isTrusted so our synthetic simulateClick events are accepted.
      const proxied = new Proxy(event, {
        get(target, prop) {
          if (prop === "isTrusted") return true;
          const val = Reflect.get(target, prop, target);
          return typeof val === "function" ? val.bind(target) : val;
        },
      });
      return (listener as EventListener).call(this, proxied as Event);
    };

    return origAddEventListener.call(this, type, wrapped, options);
  };

  return () => {
    EventTarget.prototype.addEventListener = origAddEventListener;
  };
}
