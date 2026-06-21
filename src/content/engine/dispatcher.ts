import type { Rule } from "../../types/rules";
import type { CCConfig } from "../../types/global";
import { runActions } from "./actions";

export function matchRule(rules: Rule[], hostname: string, pathname: string): Rule | undefined {
  for (const rule of rules) {
    if (!new RegExp(rule.match, "i").test(hostname)) continue;
    if (rule.exclude && new RegExp(rule.exclude, "i").test(hostname)) continue;
    if (rule.pathMatch && !new RegExp(rule.pathMatch).test(pathname)) continue;
    return rule;
  }
  return undefined;
}

export function runRule(rule: Rule, _config: CCConfig): void {
  const controller = new AbortController();

  window.addEventListener("pagehide", () => controller.abort(), { once: true });

  const execute = (): void => {
    runActions(rule.actions, controller.signal).catch((err) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.warn(`[CC] Rule "${rule.id}" failed:`, err);
    });
  };

  if (rule.runAt === "start" || document.readyState !== "loading") {
    execute();
  } else {
    document.addEventListener("DOMContentLoaded", execute, { once: true });
  }
}
