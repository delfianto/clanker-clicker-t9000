# Clanker Clicker T9000 — Agent Reference

Clean-room MV3 browser extension (Chrome + Firefox) that bypasses shortlink redirect pages.
Personal tool; no external server dependencies, zero telemetry, MIT licensed.

---

## Stack

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 7.0 RC (`rc` tag) | Language — strict, no legacy cruft |
| Bun | 1.x | Package manager + script runner (not npm/yarn) |
| vite-plus (`vp`) | latest | Unified VoidZero toolchain — bundler, linter (oxlint), formatter (oxfmt), type checker |
| vite-plugin-web-extension | 4.x | Multi-entry extension build + manifest generation |
| webextension-polyfill | 0.12 | Unified `browser.*` API surface across Chrome/Firefox |

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
```

Load the extension: Chrome → `chrome://extensions` → Developer mode → Load unpacked → `build/chrome/`

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
      actions.ts      # Action executor: click/submit/redirect/wait-*/custom
      dom.ts          # qs/qsa wrappers
      wait.ts         # waitForElement, waitForVisible, sleep — all with maxWait timeout
      redirect.ts     # navigateTo, decodeParam, extractFromParam
      captcha.ts      # waitForCaptcha — hCaptcha/Turnstile/reCAPTCHA detection
    features/
      timers.ts       # installTimerBoost — setTimeout/setInterval acceleration
      visibility.ts   # installVisibilitySpoofing — document.hidden spoofing
      trust.ts        # installTrustProxy — isTrusted:true on cloned events
      popup-blocker.ts
      adblock.ts
      cloudflare.ts   # Turnstile auto-solve hook
    rules/
      index.ts        # Combines all rule arrays, registers all custom handlers
      shortlinks.ts   # ~50 site rules (URL params, clicks, form submits, captcha-gated)
      wpsafe.ts       # WordPress wpsafelink pattern rules
      downloads.ts    # File host auto-download rules (requiresFeature: autoDL)
      custom/
        ouo.ts        # ouo.io/ouo.press multi-step handler + misc handlers
  popup/
    index.html / index.ts / styles.css
  types/
    global.d.ts       # Settings, CCConfig, window.__CC_CONFIG
    rules.d.ts        # Rule, RuleAction, DecodeStrategy
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

1. Add to the appropriate array in `shortlinks.ts` (or `wpsafe.ts` / `downloads.ts`)
2. If the site needs custom JS logic: add a handler to `rules/custom/ouo.ts` via `registry.set()`
3. Register the handler key in the rule's `actions: [{ type: 'custom', handler: 'your-key' }]`
4. Run `bun run check` — fix any lint/type errors before committing

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
