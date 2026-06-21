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
      let cloned: Event;
      try {
        cloned = cloneWithTrust(event);
      } catch {
        return (listener as EventListener).call(this, event);
      }
      return (listener as EventListener).call(this, cloned);
    };

    return origAddEventListener.call(this, type, wrapped, options);
  };

  return () => {
    EventTarget.prototype.addEventListener = origAddEventListener;
  };
}

function cloneWithTrust(event: Event): Event {
  let cloned: Event;

  if (event instanceof MouseEvent) {
    cloned = new MouseEvent(event.type, {
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      composed: event.composed,
      clientX: event.clientX,
      clientY: event.clientY,
      button: event.button,
      buttons: event.buttons,
    });
  } else if (event instanceof KeyboardEvent) {
    cloned = new KeyboardEvent(event.type, {
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      composed: event.composed,
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    });
  } else {
    cloned = new Event(event.type, {
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      composed: event.composed,
    });
  }

  return new Proxy(cloned, {
    get(target, prop) {
      if (prop === "isTrusted") return true;
      const val = Reflect.get(target, prop, target);
      return typeof val === "function" ? val.bind(target) : val;
    },
  });
}
