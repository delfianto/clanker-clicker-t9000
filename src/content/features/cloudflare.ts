// Cloudflare Turnstile auto-bypass.
// Intercepts Array.prototype.push to spoof the trusted click event payload
// that Turnstile validates, then auto-clicks the checkbox after a short delay.
// Ported from the original cloudflare_bypass.js with TypeScript types.

const origPush = Array.prototype.push;
const origAEL = Element.prototype.addEventListener;

type TurnstileEventItem = [Record<string, unknown>, string];

export function installCloudflareTurnstileBypass(): () => void {
  Element.prototype.addEventListener = function (
    ...args: Parameters<typeof Element.prototype.addEventListener>
  ): void {
    // When Turnstile registers a click listener on its checkbox input,
    // fire the listener immediately with a synthetic trusted-looking event.
    if (this instanceof HTMLInputElement && args[0] === "click") {
      const fakeEvent = new PointerEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
        // isTrusted cannot be set directly; TrustProxy in trust.ts handles it
      });
      if (typeof args[1] === "function") {
        (args[1] as EventListener).call(this, fakeEvent);
      }
    }
    return origAEL.apply(this, args);
  };

  // Mangle the event payload pushed into Turnstile's internal queue
  // so it looks like it came from a real user interaction.
  Array.prototype.push = function (...args: unknown[]): number {
    const item = args[0] as TurnstileEventItem | undefined;
    if (Array.isArray(item) && item[0] && typeof item[0] === "object" && "isTrusted" in item[0]) {
      item[0] = {
        activeElement: "[object HTMLBodyElement]",
        clientX: "30",
        clientY: "35",
        height: "1",
        isPrimary: "false",
        isTrusted: "true",
        layerX: "13",
        layerY: "14",
        movementX: "0",
        movementY: "0",
        offsetX: "13",
        offsetY: "15",
        pageX: "30",
        pageY: "35",
        pointerId: "1",
        pointerType: "mouse",
        pressure: "0",
        relatedTarget: "null",
        screenX: "203",
        screenY: "685",
        srcElement: "[object HTMLInputElement]",
        tangentialPressure: "0",
        target: "[object HTMLInputElement]",
        timeStamp: String(Date.now() + Math.random()),
        type: "click",
        width: "1",
        x: "30",
        y: "35",
      };
      if (typeof item[1] === "string") {
        const lines = item[1].split("\n");
        item[1] = lines.slice(0, item[1].startsWith("Error") ? 5 : 4).join("\n");
      }
    }
    return origPush.apply(this, args);
  };

  // Auto-click the checkbox after a short delay
  const timer = setTimeout(() => {
    const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (checkbox && !checkbox.checked) checkbox.click();
  }, 300);

  return () => {
    clearTimeout(timer);
    Element.prototype.addEventListener = origAEL;
    Array.prototype.push = origPush;
  };
}
