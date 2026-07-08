# Clanker Clicker T9000 — Agent Reference

Clean-room MV3 browser extension (Chrome + Firefox) that bypasses shortlink redirect pages.
Personal tool; no external server dependencies, zero telemetry, MIT licensed.

---

## Stack

| Tool                      | Version           | Purpose                                                                                |
| ------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| TypeScript                | 7.0 RC (`rc` tag) | Language — strict, no legacy cruft                                                     |
| Bun                       | 1.x               | Package manager + script runner (not npm/yarn)                                         |
| vite-plus (`vp`)          | latest            | Unified VoidZero toolchain — bundler, linter (oxlint), formatter (oxfmt), type checker |
| vite-plugin-web-extension | 4.x               | Multi-entry extension build + manifest generation                                      |
| webextension-polyfill     | 0.12              | Unified `browser.*` API surface across Chrome/Firefox                                  |

All commands go through `bun run <script>` or the `vp` CLI directly.  
**Never use npm or npx.**

---

## Build commands

```sh
bun run build           # production build → build/chrome/
bun run build:firefox   # production build → build/firefox/
bun run dev             # watch mode (Chrome)
bun run check           # vp check — fmt + oxlint + tsc (run before committing)
bun run lint            # vp lint src/ — oxlint only
bun run fmt             # vp fmt src/ — oxfmt format
bun run test            # bun test — unit suite (run with check before merging)
bun run test:coverage   # bun test --coverage
```

Load the extension: Chrome → `chrome://extensions` → Developer mode → Load unpacked → `build/chrome/`

---

## Testing

Unit tests live in `test/` (mirrors `src/`), run by **`bun test`**. A `bunfig.toml`
preloads `test/setup.ts`, which registers **happy-dom** so DOM-dependent engine code
(actions, wait, ctx, features) runs headless. Pre-merge gate: `bun run check && bun run test`.

What's covered (≈80% lines; declarative core is ~100%):

- **Pure logic** — `decode`, builders (`exact`/`hosts`/…), `matchRule` + priority sort,
  `activeFeatures` gating, `DEFAULT_SETTINGS`.
- **Rule-set invariants** (`test/rules/ruleset.test.ts`) — unique ids, regexes compile,
  every action well-formed, `requiresFeature` valid, priority-sorted, **plus a host→rule-id
  matching table**. This is the guard that makes rule edits safe; add a case when you add a host.
- **DOM-backed** — every `RuleAction` executor (via happy-dom, spying `location.assign`),
  `waitForElement`, `makeCtx`, `runRule` (incl. the Cloudflare-interstitial guard), and the
  cleanly-reversible features (popup-blocker, timers, adblock, visibility).
- **Trust proxy + synthetic marking** — `engine/synthetic.ts` (`markSynthetic`/`isSynthetic`,
  `simulateClick`) and `features/trust.ts`. happy-dom's HTMLElements bypass global
  `EventTarget.prototype` patching, so the trust tests exercise the wrapper via a plain
  `new EventTarget()`; they lock in the invariants that matter — only _marked_ synthetic
  events get `isTrusted:true`, real page events pass through untouched, and
  `removeEventListener`/dedupe still work (the regression that broke alldebrid's checkbox list).

Deliberately **not** unit-tested (side-effectful global patching / polling — verify by live
smoke-test): `features/cloudflare.ts`, `engine/captcha.ts`.

Notes: tests import from `bun:test` explicitly (no globals). `test/` is not in the tsc
`include` (keeps bun's test types out of the extension typecheck); it's still fmt+lint-checked
by `vp check`.

---

## Project structure

```
src/
  background/
    index.ts          # Service worker: message relay, cross-origin fetch bridge
    fetcher.ts        # Cross-origin fetch (credentials:omit, http/https only, 30s timeout)
  content/
    isolated.ts       # ISOLATED world entry — reads storage, dispatches config event
    main.ts           # MAIN world entry — receives config, installs features + rules
    engine/
      dispatcher.ts   # Rule matching (first-match-wins on hostname regex)
      actions.ts      # Action executor: click/submit/redirect-*/wait-*/rewrite-url/run
      ctx.ts          # makeCtx — builds the RuleCtx toolkit handed to `run` actions
      dom.ts          # qs/qsa wrappers
      wait.ts         # waitForElement, waitForVisible, sleep — all with maxWait timeout
      redirect.ts     # navigateTo, decode, extractFromParam/Path/Onclick
      captcha.ts      # waitForCaptcha — hCaptcha/Turnstile/reCAPTCHA detection
    features/
      timers.ts       # installTimerBoost — setTimeout/setInterval acceleration
      visibility.ts   # installVisibilitySpoofing — document.hidden spoofing
      synthetic.ts    # markSynthetic/isSynthetic registry + simulateClick (marks its events)
      trust.ts        # installTrustProxy — isTrusted:true on *marked synthetic* events only
      popup-blocker.ts
      adblock.ts
      cloudflare.ts   # Turnstile auto-solve hook
    rules/
      index.ts        # getAllRules() — combines all rule arrays
      builders.ts     # exact/hosts/paramRedirect/waitRedirect/... rule-builder helpers
      shortlinks.ts   # site rules (URL params, clicks, form submits, captcha-gated)
      wpsafe.ts       # WordPress wpsafelink pattern rules
      downloads.ts    # File host auto-download rules (requiresFeature: autoDL)
      custom/
        google-redirect.ts  # google.com/url?q= blocklist filter (uses a `run` action)
  popup/
    index.html / index.ts / styles.css
  settings/
    schema.ts         # DEFAULT_SETTINGS — single source of defaults (no DOM/feature imports)
    install.ts        # installFeatures(settings) — MAIN-world feature install order
  types/
    global.d.ts       # Settings, CCConfig, window.__CC_CONFIG
    rules.d.ts        # Rule, RuleAction, RuleCtx, DecodeStrategy
public/
  icons/              # Extension icons (Fluent Emoji 3D robot, MIT)
```

---

## World split architecture — CRITICAL

MV3 extensions have two content script worlds with a hard security boundary:

**ISOLATED world** (`isolated.ts`) — has `browser.*` API, cannot touch page JS globals  
**MAIN world** (`main.ts`) — runs in page's JS context, no `browser.*` API

### Config bridge (CSP-safe)

Sites with strict `script-src` CSP (e.g. ouo.io) block inline `<script>` injection.
The bridge uses DOM `CustomEvent`, which is invisible to CSP:

```
isolated.ts                              main.ts
────────────                             ───────
await storage.local.get()               document.addEventListener('__cc_config__', handler, { once: true })
                                         ↑ registered synchronously at module load
↓ (async gap — listener is ready by now)
document.dispatchEvent(
  new CustomEvent('__cc_config__', { detail: JSON.stringify(config) })
)
                                         → handler fires → run(config)
```

**Do NOT revert to `<script>` tag injection** — it breaks on CSP-strict sites.  
**Do NOT use `browser.scripting.executeScript`** from content scripts — it's background-only API.

### MAIN→ISOLATED relay (for browser API calls from MAIN world)

`main.ts` code that needs `browser.*` sends `window.postMessage({ type: 'CC_REQUEST', ... })`.  
`isolated.ts` listens, executes the browser API call, responds via `window.postMessage`.

---

## Rule engine

`dispatcher.ts` — strips `www.` from hostname, tests `rule.match` regex, optionally tests
`rule.pathMatch` against pathname. **First match wins** — put specific rules before broad patterns.

`actions.ts` — runs actions sequentially. `wait-*` actions take `steps: RuleAction[]`
(NOT `then:` — `then` triggers `unicorn/no-thenable` lint error since it looks like a Promise).

### Adding a new site rule

Most sites are one of a few common shapes — reach for a builder from `rules/builders.ts`
before hand-writing a rule object.

1. **Common shapes** — add a one-liner to the array in `shortlinks.ts` (or `wpsafe.ts` /
   `downloads.ts`):
   - `paramRedirect("host.com", "url", "base64")` — destination sits in a query param
   - `waitRedirect("host.com", "a.selector")` — wait for an element, redirect to its href
   - `redirectHref("host.com", ".skip")` / `clickAfter("host.com", "#btn", 2000)`
   - `formSubmitThenClick(id, hosts("a.com", "b.com"), "tp")` — submit form, click follow-up
   - Matching helpers: `exact("a.com")` (single host) and `hosts("a.com", "b.com")` (multi) —
     both produce **anchored** `^…$` regexes and handle escaping.
2. **Declarative actions** (no JS) — `redirect-from-param/path/attr`, `redirect-template`
   (path→URL template, e.g. `{ from: "^/u/(.+)$", to: "/api/file/$1?download" }`), `rewrite-url`
   (string replace on the URL), `wait-captcha`, `remove-attr`, … See `RuleAction` in
   `types/rules.d.ts`.
3. **Bespoke logic** — use a `run` action with an inline, typed closure:
   `actions: [{ type: "run", run: async (ctx) => { … } }]`. `ctx` (`RuleCtx`) provides
   `params`, `url`, `navigateTo`, `waitForElement`, `click`, `qs`, `decode`, `signal`.
   No handler registry, no string keys.
4. Run `bun run check` — fix any lint/type errors before committing.

---

## TypeScript conventions

- TS 7 RC: `baseUrl` is **removed** — don't add it to `tsconfig.json`
- `exactOptionalPropertyTypes: true` — no implicit `undefined` spreading
- `noUncheckedIndexedAccess: true` — array index access returns `T | undefined`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `skipLibCheck: true` — upstream Rollup/Vite type mismatch; do not remove
- Ambient `.d.ts` files cannot have initializers — types only, no `= value`

---

## oxlint / oxfmt rules

Config lives inside `vite.config.ts` under `lint:` and `fmt:` blocks.  
Standalone `oxlint.json` is **not picked up** by `vp` — don't create one.

Relevant active rules:

- `no-console: off` — console usage allowed (debugging)
- `unicorn/no-thenable: error` — any property named `then` on an object looks like a Promise; use `steps` instead in rule action types

---

## Icons

`public/icons/icon-48.png` and `icon-96.png` — Microsoft Fluent Emoji 3D robot (MIT license).  
Resized from 256px source with `magick input.png -resize NxN -filter Lanczos output.png`.

---

## Git hygiene

- `reference/` — gitignored; original addon sources kept locally for reference only
- `build/` — gitignored; always regenerated
- `*.xpi` — gitignored
- `.claude/settings.local.json` — gitignored; local permission overrides stay local

### Post-commit build hook

A `PostToolUse` hook on `Bash(git commit*)` runs `bun run build` automatically after every
commit. **Always run `git add` and `git commit` as separate Bash calls** — combining them with
`&&` in one command makes the hook matcher miss the commit (the compound command starts with
`git add`, not `git commit`).
