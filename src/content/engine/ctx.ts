import type { RuleCtx } from "../../types/rules";
import { navigateTo, decode } from "./redirect";
import { waitForElement } from "./wait";
import { qs } from "./dom";

const CLICK_EVENTS = ["mouseover", "mousedown", "mouseup", "click"] as const;

// Builds the toolkit object passed to `run` actions. `signal` ties any waits
// to the rule's AbortController so they cancel on page navigation.
export function makeCtx(signal: AbortSignal): RuleCtx {
  return {
    url: new URL(location.href),
    params: new URLSearchParams(location.search),
    signal,
    navigateTo,
    decode,
    qs,
    waitForElement: (selector) => waitForElement(selector, signal),
    click: async (selector) => {
      const el = await waitForElement(selector, signal);
      el.removeAttribute("disabled");
      el.removeAttribute("target");
      for (const type of CLICK_EVENTS) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
      }
    },
  };
}
