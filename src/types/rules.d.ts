import type { Settings } from "./global";

export type DecodeStrategy = "base64" | "base64x2" | "base64x3" | "uri" | "rot13" | "none";

// Toolkit handed to `run` actions (custom per-site logic). Replaces the old
// string-keyed handler registry: handlers are now inline, typed closures.
export type RuleCtx = {
  url: URL;
  params: URLSearchParams;
  signal: AbortSignal;
  navigateTo(url: string): void;
  waitForElement(selector: string): Promise<Element>;
  click(selector: string): Promise<void>;
  decode(value: string, strategy: DecodeStrategy): string | null;
  qs<T extends Element = Element>(selector: string): T | null;
};

export type RuleAction =
  | { type: "click"; selector: string; delay?: number }
  | { type: "submit"; selector: string; delay?: number }
  | { type: "wait-element"; selector: string; steps: RuleAction[] }
  | { type: "wait-captcha"; steps: RuleAction[] }
  | { type: "wait-visibility"; selector: string; steps: RuleAction[] }
  | { type: "redirect-from-href"; selector: string }
  | { type: "redirect-from-attr"; selector: string; attr: string; wait?: boolean }
  | { type: "redirect-from-onclick"; selector: string; extractPattern: string }
  | {
      type: "redirect-from-param";
      param: string;
      decode?: DecodeStrategy;
      prefix?: string;
      hashParams?: boolean;
    }
  | { type: "redirect-from-path"; pattern: string; decode?: DecodeStrategy; prefix?: string }
  | { type: "redirect-template"; from: string; to: string }
  | { type: "rewrite-url"; find: string; replace: string }
  | { type: "remove-attr"; selector: string; attrs: string[] }
  | { type: "run"; run: (ctx: RuleCtx) => void | Promise<void> };

export type Rule = {
  id: string;
  match: string;
  exclude?: string;
  pathMatch?: string;
  runAt: "start" | "loaded";
  actions: RuleAction[];
  requiresFeature?: keyof Settings;
};
