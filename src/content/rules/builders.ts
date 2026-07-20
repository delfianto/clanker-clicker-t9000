import type { DecodeStrategy, Rule } from "../../types/rules";

// Builder helpers for the common rule shapes. Most hosts are one of a handful
// of patterns; these collapse the boilerplate (and own regex escaping centrally)
// so adding a site is a one-liner. For anything bespoke, write the Rule object
// directly or use a `run` action.

// Escapes a literal hostname for a match regex (only `.` is special in a host).
const esc = (host: string): string => host.replace(/\./g, "\\.");

// `^host$` — exact hostname match. The dispatcher already strips a leading `www.`.
export const exact = (host: string): string => `^${esc(host)}$`;

// `^(a|b|c)$` — exact match against any one of several hostnames.
export const hosts = (...sites: string[]): string => `^(${sites.map(esc).join("|")})$`;

// document_start: pull the destination straight out of a URL query param.
export const paramRedirect = (
  host: string,
  param: string,
  decode: DecodeStrategy = "none",
): Rule => ({
  id: `${host}-${param}`,
  match: exact(host),
  runAt: "start",
  actions: [{ type: "redirect-from-param", param, decode }],
});

// Redirect to an anchor's href as soon as it exists in the DOM.
export const redirectHref = (host: string, selector: string): Rule => ({
  id: host,
  match: exact(host),
  runAt: "loaded",
  actions: [{ type: "redirect-from-href", selector }],
});

// Wait for an element to appear, then redirect to its href.
export const waitRedirect = (host: string, selector: string): Rule => ({
  id: host,
  match: exact(host),
  runAt: "loaded",
  actions: [{ type: "wait-element", selector, steps: [{ type: "redirect-from-href", selector }] }],
});

// Click a single element after a delay. Pass `wait: false` when the target is
// server-rendered and the same host also serves pages without it — the click
// then no-ops on those instead of holding a 30s MutationObserver and timing out.
export const clickAfter = (host: string, selector: string, delay: number, wait = true): Rule => ({
  id: host,
  match: exact(host),
  runAt: "loaded",
  actions: [{ type: "click", selector, delay, wait }],
});

// Submit a named form, then click a follow-up button — the dominant safelink
// pattern (`form[name='tp']` → `#btn6`, etc.).
export const formSubmitThenClick = (
  id: string,
  match: string,
  formName: string,
  clickSelector = "#btn6",
): Rule => ({
  id,
  match,
  runAt: "loaded",
  actions: [
    { type: "submit", selector: `form[name='${formName}']`, delay: 3000 },
    { type: "click", selector: clickSelector, delay: 4000 },
  ],
});
