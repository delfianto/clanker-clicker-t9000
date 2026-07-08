import type { RuleCtx } from "../../types/rules";
import { navigateTo, decode } from "./redirect";
import { waitForElement } from "./wait";
import { qs } from "./dom";
import { simulateClick } from "./synthetic";

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
      simulateClick(el);
    },
  };
}
