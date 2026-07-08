import { afterEach, expect, mock, test } from "bun:test";
import { installTrustProxy } from "../../src/content/features/trust";
import { markSynthetic } from "../../src/content/engine/synthetic";

// happy-dom's HTMLElements do NOT route addEventListener through the global
// EventTarget.prototype (they carry their own implementation), so element-based
// assertions can't observe this patch. A plain `new EventTarget()` does route
// through the prototype, which is what these tests use to exercise the wrapper.

let uninstall: (() => void) | null = null;
afterEach(() => {
  uninstall?.();
  uninstall = null;
});

test("real (non-synthetic) events are passed to handlers untouched", () => {
  uninstall = installTrustProxy();
  const et = new EventTarget();
  let seen: Event | null = null;
  et.addEventListener("ping", (e) => {
    seen = e;
  });

  const dispatched = new Event("ping");
  et.dispatchEvent(dispatched);

  // Same object identity — no proxy, no isTrusted override for page/user events.
  expect(seen).toBe(dispatched);
  expect(seen!.isTrusted).not.toBe(true);
});

test("synthetic events are reported isTrusted:true to handlers", () => {
  uninstall = installTrustProxy();
  const et = new EventTarget();
  let trusted: boolean | null = null;
  et.addEventListener("ping", (e) => {
    trusted = e.isTrusted;
  });

  et.dispatchEvent(markSynthetic(new Event("ping")));
  expect(trusted).toBe(true);
});

// The alldebrid regression: the old code created a fresh wrapper on every
// addEventListener call, so removeEventListener could never find what was
// registered. Handlers leaked and kept firing on dynamic list/checkbox UIs.
test("removeEventListener actually removes the handler", () => {
  uninstall = installTrustProxy();
  const et = new EventTarget();
  const handler = mock(() => {});

  et.addEventListener("ping", handler);
  et.removeEventListener("ping", handler);
  et.dispatchEvent(new Event("ping"));

  expect(handler).not.toHaveBeenCalled();
});

test("duplicate addEventListener with the same listener fires once", () => {
  uninstall = installTrustProxy();
  const et = new EventTarget();
  const handler = mock(() => {});

  et.addEventListener("ping", handler);
  et.addEventListener("ping", handler);
  et.dispatchEvent(new Event("ping"));

  expect(handler).toHaveBeenCalledTimes(1);
});

test("capture and bubble registrations are tracked independently", () => {
  uninstall = installTrustProxy();
  const et = new EventTarget();
  const handler = mock(() => {});

  et.addEventListener("ping", handler, true);
  et.addEventListener("ping", handler, false);
  // Removing only the capture registration must leave the bubble one intact.
  et.removeEventListener("ping", handler, true);
  et.dispatchEvent(new Event("ping"));

  expect(handler).toHaveBeenCalledTimes(1);
});

test("uninstall restores the original addEventListener / removeEventListener", () => {
  const beforeAdd = EventTarget.prototype.addEventListener;
  const beforeRemove = EventTarget.prototype.removeEventListener;
  const off = installTrustProxy();
  expect(EventTarget.prototype.addEventListener).not.toBe(beforeAdd);
  off();
  expect(EventTarget.prototype.addEventListener).toBe(beforeAdd);
  expect(EventTarget.prototype.removeEventListener).toBe(beforeRemove);
});

test("non-function listeners (handleEvent objects) still work and can be removed", () => {
  uninstall = installTrustProxy();
  const et = new EventTarget();
  const obj = {
    calls: 0,
    handleEvent() {
      this.calls++;
    },
  };
  et.addEventListener("ping", obj);
  et.dispatchEvent(new Event("ping"));
  expect(obj.calls).toBe(1);
  et.removeEventListener("ping", obj);
  et.dispatchEvent(new Event("ping"));
  expect(obj.calls).toBe(1);
});

test("message-type listeners are wrapped like any other (no special-casing)", () => {
  // Regression guard: the old code skipped wrapping "message" listeners, which
  // was unnecessary once only synthetic events are proxied. Verify they now
  // register and remove cleanly through the same path.
  uninstall = installTrustProxy();
  const et = new EventTarget();
  const handler = mock(() => {});
  et.addEventListener("message", handler);
  et.dispatchEvent(new Event("message"));
  expect(handler).toHaveBeenCalledTimes(1);
  et.removeEventListener("message", handler);
  et.dispatchEvent(new Event("message"));
  expect(handler).toHaveBeenCalledTimes(1);
});
