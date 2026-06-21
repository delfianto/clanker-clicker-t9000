import type { RuleAction } from '../../types/rules';
import { waitForElement, waitForVisible, sleep } from './wait';
import { waitForCaptcha } from './captcha';
import { navigateTo, metaRedirect, extractFromParam, extractFromPath, extractFromOnclick } from './redirect';

const CLICK_EVENTS = ['mouseover', 'mousedown', 'mouseup', 'click'] as const;

export type CustomHandlerRegistry = Map<string, () => void | Promise<void>>;

export async function runActions(
  actions: RuleAction[],
  signal: AbortSignal,
  registry: CustomHandlerRegistry
): Promise<void> {
  for (const action of actions) {
    if (signal.aborted) return;
    await executeAction(action, signal, registry);
  }
}

async function executeAction(
  action: RuleAction,
  signal: AbortSignal,
  registry: CustomHandlerRegistry
): Promise<void> {
  switch (action.type) {
    case 'click': {
      if (action.delay) await sleep(action.delay);
      if (signal.aborted) return;
      const el = await waitForElement(action.selector, signal);
      simulateClick(el);
      break;
    }

    case 'submit': {
      if (action.delay) await sleep(action.delay);
      if (signal.aborted) return;
      const form = await waitForElement(action.selector, signal);
      if (form instanceof HTMLFormElement) {
        form.submit();
      }
      break;
    }

    case 'wait-element': {
      const el = await waitForElement(action.selector, signal);
      if (signal.aborted) return;
      void el;
      await runActions(action.steps, signal, registry);
      break;
    }

    case 'wait-captcha': {
      await waitForCaptcha(signal);
      if (signal.aborted) return;
      await runActions(action.steps, signal, registry);
      break;
    }

    case 'wait-visibility': {
      await waitForVisible(action.selector, signal);
      if (signal.aborted) return;
      await runActions(action.steps, signal, registry);
      break;
    }

    case 'redirect-from-href': {
      const el = await waitForElement(action.selector, signal);
      const url = (el as HTMLAnchorElement).href;
      if (url) navigateTo(url);
      break;
    }

    case 'redirect-from-onclick': {
      const el = await waitForElement(action.selector, signal);
      const url = extractFromOnclick(el, action.extractPattern);
      if (url) navigateTo(url);
      break;
    }

    case 'redirect-from-param': {
      const url = extractFromParam(
        action.param,
        action.decode ?? 'none',
        action.hashParams ?? false
      );
      if (url) {
        const final = (action.prefix ?? '') + url;
        navigateTo(final);
      }
      break;
    }

    case 'redirect-from-path': {
      const url = extractFromPath(action.pattern, action.decode ?? 'none');
      if (url) {
        const final = (action.prefix ?? '') + url;
        navigateTo(final);
      }
      break;
    }

    case 'remove-attr': {
      const els = Array.from(document.querySelectorAll(action.selector));
      for (const el of els) {
        for (const attr of action.attrs) {
          el.removeAttribute(attr);
        }
      }
      break;
    }

    case 'custom': {
      const handler = registry.get(action.handler);
      if (handler) {
        await handler();
      } else {
        console.warn(`[CC] No handler registered: ${action.handler}`);
      }
      break;
    }
  }
}

function simulateClick(el: Element): void {
  el.removeAttribute('disabled');
  el.removeAttribute('target');
  for (const type of CLICK_EVENTS) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
  }
}

export function metaNavigate(url: string): void {
  metaRedirect(url);
}

export function selectText(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
