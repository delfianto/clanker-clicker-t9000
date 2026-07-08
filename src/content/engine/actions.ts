import type { RuleAction } from "../../types/rules";
import { waitForElement, waitForVisible, sleep } from "./wait";
import { waitForCaptcha } from "./captcha";
import { qs } from "./dom";
import { makeCtx } from "./ctx";
import { markSynthetic, simulateClick } from "./synthetic";
import {
  navigateTo,
  metaRedirect,
  extractFromParam,
  extractFromPath,
  extractFromOnclick,
} from "./redirect";

export async function runActions(actions: RuleAction[], signal: AbortSignal): Promise<void> {
  for (const action of actions) {
    if (signal.aborted) return;
    await executeAction(action, signal);
  }
}

async function executeAction(action: RuleAction, signal: AbortSignal): Promise<void> {
  switch (action.type) {
    case "click": {
      if (action.delay) await sleep(action.delay);
      if (signal.aborted) return;
      const el = await waitForElement(action.selector, signal);
      simulateClick(el);
      break;
    }

    case "submit": {
      if (action.delay) await sleep(action.delay);
      if (signal.aborted) return;
      const form = await waitForElement(action.selector, signal);
      if (form instanceof HTMLFormElement) {
        form.submit();
      }
      break;
    }

    case "wait-element": {
      const el = await waitForElement(action.selector, signal);
      if (signal.aborted) return;
      void el;
      await runActions(action.steps, signal);
      break;
    }

    case "wait-captcha": {
      await waitForCaptcha(signal);
      if (signal.aborted) return;
      await runActions(action.steps, signal);
      break;
    }

    case "wait-visibility": {
      await waitForVisible(action.selector, signal);
      if (signal.aborted) return;
      await runActions(action.steps, signal);
      break;
    }

    case "redirect-from-href": {
      const el = await waitForElement(action.selector, signal);
      const url = (el as HTMLAnchorElement).href;
      if (url) navigateTo(url);
      break;
    }

    case "redirect-from-attr": {
      const el =
        action.wait === false ? qs(action.selector) : await waitForElement(action.selector, signal);
      if (!el) break;
      // Prefer the resolved DOM property (e.g. anchor.href → absolute URL),
      // falling back to the raw attribute for non-anchor elements.
      const prop = (el as unknown as Record<string, unknown>)[action.attr];
      const url = typeof prop === "string" && prop ? prop : el.getAttribute(action.attr);
      if (url) navigateTo(url);
      break;
    }

    case "redirect-from-onclick": {
      const el = await waitForElement(action.selector, signal);
      const url = extractFromOnclick(el, action.extractPattern);
      if (url) navigateTo(url);
      break;
    }

    case "redirect-from-param": {
      const url = extractFromParam(
        action.param,
        action.decode ?? "none",
        action.hashParams ?? false,
      );
      if (url) {
        const final = (action.prefix ?? "") + url;
        navigateTo(final);
      }
      break;
    }

    case "redirect-from-path": {
      const url = extractFromPath(action.pattern, action.decode ?? "none");
      if (url) {
        const final = (action.prefix ?? "") + url;
        navigateTo(final);
      }
      break;
    }

    case "redirect-template": {
      const m = location.pathname.match(new RegExp(action.from));
      if (!m) break;
      const target = action.to.replace(/\$(\d+)/g, (_full, d: string) => m[Number(d)] ?? "");
      // Resolve relative templates (e.g. "/api/file/$1") against the current
      // origin so navigateTo's http(s) guard passes.
      navigateTo(new URL(target, location.href).href);
      break;
    }

    case "rewrite-url": {
      const next = location.href.replace(action.find, action.replace);
      if (next !== location.href) navigateTo(next);
      break;
    }

    case "remove-attr": {
      const els = Array.from(document.querySelectorAll(action.selector));
      for (const el of els) {
        for (const attr of action.attrs) {
          el.removeAttribute(attr);
        }
      }
      break;
    }

    case "run": {
      await action.run(makeCtx(signal));
      break;
    }
  }
}

export function metaNavigate(url: string): void {
  metaRedirect(url);
}

export function selectText(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  el.value = value;
  el.dispatchEvent(markSynthetic(new Event("input", { bubbles: true })));
  el.dispatchEvent(markSynthetic(new Event("change", { bubbles: true })));
}
