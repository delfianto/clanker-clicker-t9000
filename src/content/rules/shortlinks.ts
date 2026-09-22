import type { Rule } from "../../types/rules";
import {
  clickAfter,
  exact,
  formSubmitThenClick,
  hosts,
  paramRedirect,
  redirectHref,
  waitRedirect,
} from "./builders";

// ImageBam picks its interstitial cookie name per image *content rating*: an
// adult-rated /view/ writes `nsfw_inter=1`, a safe-rated one writes `sfw_inter=1`.
// Both pages are otherwise byte-identical (same `#continue` markup, same
// `data-shown="inter"`), and the server only skips the gate for the name matching
// that image's own rating — so any hardcoded name clears one class and loops
// forever on the other. Scrape the name out of the page's own click handler rather
// than guessing; fall back to setting both if their markup ever shifts.
const IMAGEBAM_COOKIE_RE = /document\.cookie\s*=\s*["'](\w*inter)=1/g;

export function imagebamCookieNames(doc: Document = document): string[] {
  const found = new Set<string>();
  for (const script of doc.querySelectorAll<HTMLScriptElement>("script:not([src])")) {
    for (const [, name] of script.textContent?.matchAll(IMAGEBAM_COOKIE_RE) ?? []) {
      if (name) found.add(name);
    }
  }
  return found.size > 0 ? [...found] : ["sfw_inter", "nsfw_inter"];
}

// Real downloads are always served by vikuy.click itself (serve_video.php,
// token-gated); the decoy is a cross-host affiliate shortlink. Allowlisting the
// site's own domain (plus subdomains) survives the site renaming either the ad
// partner or the file endpoint.
function isVikuyRealDownload(href: string, siteHost: string): boolean {
  if (!href) return false;
  try {
    const u = new URL(href, `https://${siteHost}/`);
    return (
      /^https?:$/.test(u.protocol) &&
      (u.hostname === siteHost || u.hostname.endsWith(`.${siteHost}`))
    );
  } catch {
    return false;
  }
}

// Remove every decoy "Server Download" button (off-domain href) from the grid.
// Exported for tests, like imagebamCookieNames below.
export function sweepVikuyDecoys(doc: Document, siteHost: string): number {
  let removed = 0;
  for (const a of doc.querySelectorAll<HTMLAnchorElement>("a.server[data-kind='download']")) {
    if (!isVikuyRealDownload(a.getAttribute("href") ?? "", siteHost)) {
      a.remove();
      removed++;
    }
  }
  return removed;
}

// Claim clicks on real download buttons before the page's own handler sees
// them: a capture-phase listener at the document root runs before the
// target-phase listener the inline script bound at parse time, so
// stopPropagation keeps the page's download flow from running at all.
// Exported for tests. Returns an unbind function.
export function installVikuyDownloadInterceptor(
  doc: Document,
  siteHost: string,
  go: (url: string) => void,
): () => void {
  const intercept = (event: Event): void => {
    if (!(event instanceof MouseEvent)) return;
    // Modified clicks (ctrl/cmd = new tab, etc.) aren't ours to hijack.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a.server[data-kind='download']");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!isVikuyRealDownload(anchor.getAttribute("href") ?? "", siteHost)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const waitBox = doc.getElementById("waitBox");
    if (waitBox) waitBox.textContent = "Starting download…";
    // The DOM .href property resolves to absolute; navigateTo only assigns
    // http(s), and an attachment response downloads without unloading the page.
    go(anchor.href);
  };
  doc.addEventListener("click", intercept, true);
  return () => doc.removeEventListener("click", intercept, true);
}

export const shortlinkRules: Rule[] = [
  // ─── URL param extraction (run at document_start, no DOM needed) ───────────

  {
    id: "dutchycorp-code",
    match: "(^|\\.)dutchycorp\\.(space|ovh)$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "code", decode: "uri" }],
  },
  {
    id: "facebook-instagram-u",
    match: "(^|\\.)((facebook|instagram)\\.com)$",
    pathMatch: "^/(flx/warn|linkshim|link/v2)",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "u", decode: "uri" }],
  },
  paramRedirect("render-state.to", "link", "uri"),
  paramRedirect("t.me", "url", "uri"),
  paramRedirect("maloma3arbi.blogspot.com", "link"), // ?link=<plain url>, no decode
  {
    id: "tiktok-target",
    match: "(^|\\.)tiktok\\.com$",
    pathMatch: "^/(linkshim|link/v2)",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "target", decode: "uri" }],
  },
  {
    id: "vk-away",
    match: "(^|\\.)vk\\.com$",
    pathMatch: "^/away\\.php$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "to", decode: "uri" }],
  },

  // Base64-encoded URL params
  paramRedirect("adtival.network", "shortid", "base64"),
  {
    id: "comohoy-url-b64",
    match: exact("comohoy.com"),
    pathMatch: "^/view/out\\.html$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "url", decode: "base64" }],
  },
  {
    id: "kongutoday-safe-b64",
    match: hosts("hipsonyc.com", "kongutoday.com"),
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "safe", decode: "base64" }],
  },
  // sfl.gl removed 2026-06-22: rebranded — its apex now 302s to linku.to (a
  // Cloudflare-fronted JS shortener with a different, unverified mechanism), so
  // our content script never runs on sfl.gl. Needs a real linku.to link to re-add.
  {
    id: "sharetext-url-b64",
    match: exact("sharetext.me"),
    pathMatch: "^/redirect",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "url", decode: "base64" }],
  },
  {
    id: "triggeredplay-hash-b64",
    match: exact("triggeredplay.com"),
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "url", decode: "base64", hashParams: true }],
  },

  // Path-based extraction
  {
    id: "4fnet-path-b64",
    match: exact("4fnet.org"),
    pathMatch: "^/goto",
    runAt: "start",
    actions: [{ type: "redirect-from-path", pattern: "/([^/]+)$", decode: "base64" }],
  },
  {
    id: "apkw-path-b64",
    match: exact("apkw.ru"),
    pathMatch: "^/away",
    runAt: "start",
    actions: [{ type: "redirect-from-path", pattern: "/([^/]+)$", decode: "base64" }],
  },
  {
    id: "programasvirtualespc-b64",
    match: exact("programasvirtualespc.net"),
    pathMatch: "^/out/",
    runAt: "start",
    actions: [{ type: "redirect-from-path", pattern: "\\?(.+)$", decode: "base64" }],
  },
  {
    id: "yitarx-path-b64x3",
    match: exact("yitarx.com"),
    pathMatch: "^/enlace/",
    runAt: "start",
    actions: [{ type: "redirect-from-path", pattern: "#!(.+)$", decode: "base64x3" }],
  },

  // ─── Click / redirect automation (run after DOM loads) ────────────────────

  // en.mrproblogger.com is a white-label ShrinkMe banner-page: a 12-second counter
  // runs, then ShrinkMe auto-submits #go-link and the server's AJAX reply drops the
  // real destination straight into <a class="get-link" href="…">. skipTimerBoost keeps
  // the counter honest (the server 400s if it elapses too fast); skipAntiAdblock keeps
  // the counter alive (ShrinkMe bundles the timer into its adblock-detector script).
  // No click needed — the href is right there, and clicking get-link only spawns an
  // ad-popup — so we poll until it resolves to an off-site URL and navigate to it.
  {
    id: "mrproblogger",
    match: exact("en.mrproblogger.com"),
    runAt: "loaded",
    skipTimerBoost: true,
    skipAntiAdblock: true,
    actions: [
      {
        type: "run",
        run: async (ctx) => {
          const deadline = Date.now() + 60_000;
          while (Date.now() < deadline && !ctx.signal.aborted) {
            const link = ctx.qs<HTMLAnchorElement>("a.get-link");
            const href = link?.href ?? "";
            if (/^https?:\/\//i.test(href) && new URL(href).hostname !== location.hostname) {
              ctx.navigateTo(href);
              return;
            }
            await new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }
        },
      },
    ],
  },
  waitRedirect("8tm.net", "a.btn.btn-secondary.btn-block.redirect"),
  redirectHref("adfoc.us", ".skip"),
  waitRedirect("cpmlink.net", "a#btn-main.btn.btn-warning.btn-lg"),
  clickAfter("keeplinks.org", "#btnchange", 2000),
  waitRedirect("lanza.me", "a#botonGo"),
  waitRedirect("linksly.co", "div.col-md-12 a"),
  redirectHref("linkspy.cc", ".skipButton"),
  waitRedirect("mohtawaa.com", "a.btn.btn-success.btn-lg.get-link.enabled"),
  // ImageBam shows a "Continue to your image" interstitial whose link points back
  // at the same /view/ URL — the gate is purely cookie-driven. Their own click
  // handler (`$('[data-shown="inter"]').click(...)`) sets the rating-specific
  // interstitial cookie for 6h; the server then skips the gate on reload. We set
  // the exact same cookie(s) ourselves and navigate. See `imagebamCookieNames` for
  // why the name must be read from the page instead of hardcoded.
  {
    id: "imagebam",
    match: exact("imagebam.com"),
    runAt: "loaded",
    actions: [
      {
        type: "run",
        run: async (ctx) => {
          const link = ctx.qs<HTMLAnchorElement>("#continue a[href]");
          if (!link) return;
          const exp = new Date(Date.now() + 6 * 60 * 60 * 1000).toUTCString();
          for (const name of imagebamCookieNames()) {
            document.cookie = `${name}=1; expires=${exp}; path=/`;
          }
          ctx.navigateTo(link.href);
        },
      },
    ],
  },
  // filespay.uk 301s straight to minsite.lat (a Laravel+Alpine "FileShare" gate
  // template) before any content script runs, so only minsite.lat needs a rule.
  // Its one form is gated by an Alpine `ready` flag that flips true 900ms after
  // load — purely cosmetic front-end friction: the server accepts the POST
  // immediately, checking only the `_token`/`t` hidden fields already present
  // at load, so submitting straight away works.
  //
  // But the POST 302s off-host into a rotating ad/"traffic exchange" network
  // (observed: topshare.in, tempmaile.me) whose chain — google.com/url cloaking
  // wrapper → sponsored post → #btn-download verify POSTs — hands you back to
  // the origin gate, which re-renders `data-dl-step="1"` with a fresh `t` token
  // every single time. The step counter never advances (verified 2026-09-20
  // across several human-speed cycles: no release state is ever served), so
  // every return render is byte-for-byte a fresh arrival. The old declarative
  // `submit` re-fired on each one: POST → ad chain → return → POST … ~2-3
  // minsite POSTs per ~10s cycle, until the server answered 429.
  //
  // So submit at most once per link per tab: skip renders referred by the
  // chain hosts outright, and record the attempt in sessionStorage (keyed by
  // the link's path) so the `?t=<token>` re-render dance and plain reloads
  // can't re-fire it either. A deliberate retry still works — open the link
  // in a new tab (fresh tab, fresh flag) — while the chain walks exactly once
  // and rests on the gate instead of hammering toward the rate limit.
  {
    id: "minsite-lat",
    match: exact("minsite.lat"),
    runAt: "loaded",
    actions: [
      {
        type: "run",
        run: (ctx) => {
          const flag = `__cc_submitted${location.pathname}`;
          let attempted = false;
          try {
            attempted = sessionStorage.getItem(flag) !== null;
          } catch {
            // storage unavailable — the referrer guard below still breaks the loop
          }
          if (attempted) return;
          let refHost = "";
          try {
            refHost = new URL(document.referrer).hostname.replace(/^www\./, "");
          } catch {
            /* empty or invalid referrer — a fresh arrival */
          }
          if (/^(topshare\.in|tempmaile\.me)$/.test(refHost)) return;
          try {
            sessionStorage.setItem(flag, "1");
          } catch {
            /* ignore — worst case the referrer guard alone limits us */
          }
          const form = ctx.qs<HTMLFormElement>(".dl-card form");
          if (form instanceof HTMLFormElement) form.submit();
        },
      },
    ],
  },
  {
    id: "multiup-io",
    match: exact("multiup.io"),
    pathMatch: "^/download/",
    runAt: "start",
    actions: [{ type: "rewrite-url", find: "download/", replace: "en/mirror/" }],
  },
  // ouo: post-captcha page carries ?s=<destination>; otherwise wait for the
  // continue button and click it to trigger the form POST.
  {
    id: "ouo",
    match: "^ouo\\.(io|press)$",
    runAt: "loaded",
    actions: [
      {
        type: "run",
        run: async ({ params, navigateTo, click }) => {
          const s = params.get("s");
          if (s) {
            navigateTo(s.startsWith("http") ? s : "https://" + s);
            return;
          }
          // ctx.click dispatches a synthetic-but-marked click so trust.ts spoofs
          // isTrusted:true. A native btn.click() would not be marked, so ouo's
          // handler would see isTrusted:false and reject it.
          await click("button#btn-main");
        },
      },
    ],
  },
  {
    id: "paycut-path-strip",
    match: exact("paycut.pro"),
    pathMatch: "^/ad/",
    runAt: "start",
    actions: [{ type: "rewrite-url", find: "/ad/", replace: "/" }],
  },
  {
    id: "surl",
    match: hosts("surl.li", "surl.gd"),
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "#redirect-button",
        steps: [{ type: "redirect-from-href", selector: "#redirect-button" }],
      },
    ],
  },
  // trans.firm.in gates every img-*.html page behind a "Click To View Image"
  // submit button (name='imgContinue', one input per locale). The server only
  // checks that the param is present — a bare form.submit() omits it (no
  // button was "activated"), so we click the input instead; simulateClick's
  // click event runs the native activation behavior and submits it properly.
  //
  // `wait: false`: the POST lands back on the *same* URL rendering the image, so
  // this rule matches the result page too (pathMatch can't tell them apart — only
  // the method differs). The button is in the server HTML, so if it's absent at
  // DOMContentLoaded the gate is already cleared and there's nothing to click.
  clickAfter("trans.firm.in", "#continuetoimage input[name='imgContinue']", 0, false),

  // vikuy.click's Download Center does two things that need one rule:
  //
  // 1. It's a pure client-side gate: each "Server Download" button's click
  //    handler preventDefault()s, then counts a closure-private `remaining`
  //    from 5 down via setInterval(..., 1000) before starting the download
  //    (primary server: hidden iframe to serve_video.php; alternative:
  //    top-window navigation). The counter is never read back from the DOM
  //    (the #counter node is write-only), so — unlike frdl — it cannot be
  //    fast-forwarded; the only lever is patching the timers themselves. That's
  //    exactly what the timer-boost feature does (1000ms interval sits at the
  //    default threshold → 50ms, so 5s collapses to ~0.25s), but main.ts only
  //    installs features on hosts a rule matches — this rule is that unclamp.
  //    Safe to boost: the serve_video token (base64 of uid|expiry|ip|action|
  //    hash) is expiry-bound, with no server-side elapsed-time check to race.
  //
  // 2. It shuffles the two buttons per request: one is the real file, the
  //    other an affiliate ad shortlink (gotoserba.com/click/* — an Indonesian
  //    "offer picker" whose landing page auto-submits a form straight into
  //    Shopee). Both render identically (class "server real", tag "Download
  //    File", a page notice claiming both deliver the file) and only the DOM
  //    order rotates — the slot you clicked last time is a coin flip this time.
  //    So sweep the grid: every button not pointing at the site's own domain
  //    is removed, leaving only real ones for the user (and the boosted
  //    countdown) to ride. The countdown handler captures its link list at
  //    parse time, so a removed decoy is inert — its listener dies with the
  //    node. The page can also inject buttons after load (its own script
  //    references a conditionally-added sponsored slot), hence the observer.
  //
  // 3. The page's own download path dies under timer boost: startDownload()
  //    starts the file via a hidden iframe, then schedules its cleanup with
  //    setTimeout(2500) — which the boost crushes to 50ms, ripping the iframe
  //    out before the request completes and canceling the download every
  //    time ("clicking does nothing"). No threshold can separate the two:
  //    any threshold low enough to boost the 1000ms countdown interval
  //    necessarily boosts the 2500ms cleanup too. So the interceptor claims
  //    clicks on real buttons and navigates the top window straight to the
  //    token URL — attachment disposition means the browser downloads the
  //    file and the page never unloads. No iframe, nothing to cancel.
  {
    id: "vikuy-download",
    match: exact("vikuy.click"),
    pathMatch: "^/download\\.php$",
    runAt: "loaded",
    actions: [
      {
        type: "run",
        run: (ctx) => {
          sweepVikuyDecoys(document, location.hostname);
          const observer = new MutationObserver(() => {
            sweepVikuyDecoys(document, location.hostname);
          });
          observer.observe(document.body, { childList: true, subtree: true });
          const unbind = installVikuyDownloadInterceptor(document, location.hostname, (url) =>
            ctx.navigateTo(url),
          );
          ctx.signal.addEventListener(
            "abort",
            () => {
              observer.disconnect();
              unbind();
            },
            { once: true },
          );
        },
      },
    ],
  },

  // ─── Form submit patterns (cover many sites each) ─────────────────────────

  formSubmitThenClick(
    "form-tp-pattern",
    hosts(
      "djssmusic.com",
      "fastcars1.com",
      "game5s.com",
      "jansamparks.com",
      "sayphotobooth.com",
      "sharedp.com",
      "superheromaniac.com",
      "visastepguide.com",
    ),
    "tp",
  ),
  // topshare.in and tempmaile.me are a rotating pool of "traffic exchange"
  // hosts reached via minsite.lat's ad-gate chain — they serve two different
  // gate shapes depending on referral path, so topshare.in is handled here
  // instead of folded into form-tp-pattern above:
  //   - form[name='tp'] + #btn6 (the shared safelink-style gate)
  //   - form#parasdev + #btn-download[name='verify'] ("Create Link", reached
  //     after clearing the ad-content-locker chain)
  // The verify button is clicked rather than submitted via form.submit() —
  // same reasoning as trans.firm.in: form.submit() omits the activating
  // button's name/value pair, and the server may check for `verify`.
  //
  // skipTimerBoost: unlike minsite.lat's cosmetic 900ms Alpine delay, this
  // leg's countdown almost certainly gates a real ad-view / elapsed-time check
  // server-side — crushing it with timerBoost raced past that check every
  // time, which is why the chain kept bouncing back to minsite.lat step 1
  // (and, hammered that fast, tripped its rate limit: 429). Poll for
  // #btn-download to actually clear its `disabled` state — the mirror of
  // minsite.lat's Alpine `:disabled="! ready"` gate — instead of clicking the
  // instant it exists in the DOM, so this only ever runs as fast as the real
  // countdown allows.
  {
    id: "topshare-verify-gate",
    match: hosts("topshare.in", "tempmaile.me"),
    runAt: "loaded",
    skipTimerBoost: true,
    actions: [
      {
        type: "run",
        run: async (ctx) => {
          const tpForm = ctx.qs<HTMLFormElement>("form[name='tp']");
          if (tpForm) {
            tpForm.submit();
            return;
          }
          const deadline = Date.now() + 30_000;
          while (Date.now() < deadline && !ctx.signal.aborted) {
            const btn = ctx.qs<HTMLButtonElement>("#btn-download");
            if (btn && !btn.disabled) {
              await ctx.click("#btn-download");
              return;
            }
            await new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
          }
        },
      },
      { type: "wait-element", selector: "#btn6", steps: [{ type: "click", selector: "#btn6" }] },
    ],
  },
  {
    // Sites using WP SafeLink's tp form + #tp-snp2 button.
    // Two-phase pattern on some hosts (e.g. themezon.net):
    //   Phase 1: form[name='tp'] exists → submit it directly (bypasses countdown UI)
    //   Phase 2: #nextPage variant has no form; a hidden #tp-snp2 appears after a
    //            JS countdown (timer boost crushes it to ~50ms) → click when visible
    id: "form-tp-snp2-pattern",
    match: hosts(
      "ajtaknews.com",
      "atozmaster.com",
      "bloggingwow.store",
      "bonloan.xyz",
      "carrnissan.com",
      "hellopuja.com",
      "otowp.com",
      "rokni.xyz",
      "tackledsoul.com",
      "themezon.net",
      "vi-music.app",
    ),
    runAt: "loaded",
    actions: [
      {
        type: "run",
        run: async (ctx) => {
          const form = ctx.qs<HTMLFormElement>("form[name='tp']");
          if (form) {
            form.submit();
            return;
          }
          // Some themezon-family pages land directly on the countdown step (no
          // pre-filled tp form) and expose a "Generate Link" (#btn1) to start the
          // timer. Fire the click but DON'T await it: the post-submit countdown
          // step has no #btn1, and awaiting waitForElement("#btn1") would block
          // ~30s then abort the whole rule, so the #tp-snp2 step below never ran.
          void ctx.click("#btn1").catch(() => {});
        },
      },
      {
        type: "wait-visibility",
        selector: "#tp-snp2",
        steps: [
          {
            type: "run",
            // Prefer reading #tp-snp2's href directly (no click → no ad-popup
            // window.open). Fall back to a real click for the button / onclick
            // variants that navigate via JS instead of exposing a usable href —
            // the reference addon clicks #tp-snp2 for this exact host family.
            run: async (ctx) => {
              const el = ctx.qs<HTMLAnchorElement>("#tp-snp2");
              if (!el) return;
              const href = el.href;
              if (href && /^https?:\/\//i.test(href) && href !== location.href) {
                ctx.navigateTo(href);
              } else {
                await ctx.click("#tp-snp2");
              }
            },
          },
        ],
      },
    ],
  },
  {
    id: "form-dsb-captcha",
    match: hosts("askpaccosi.com", "cryptomonitor.com"),
    runAt: "loaded",
    actions: [{ type: "wait-captcha", steps: [{ type: "submit", selector: "form[name='dsb']" }] }],
  },
  formSubmitThenClick("form-rtg-pattern", hosts("carjankaari.com", "vahansamachar.com"), "rtg"),

  // ─── Captcha-gated click rules ─────────────────────────────────────────────

  {
    id: "fc-lc-family",
    match: hosts("fc-lc.xyz", "thotpacks.xyz", "fc.lc"),
    runAt: "loaded",
    actions: [
      { type: "wait-captcha", steps: [{ type: "submit", selector: "#link-view" }] },
      { type: "click", selector: "#invisibleCaptchaShortlink", delay: 3000 },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#submitBtn" }] },
    ],
  },
  {
    id: "playnano",
    match: exact("playnano.online"),
    runAt: "loaded",
    actions: [
      { type: "click", selector: "#watch-link", delay: 2000 },
      { type: "click", selector: ".watch-next-btn.btn-primary.button", delay: 2000 },
    ],
  },
  {
    id: "playpaste-captcha",
    match: exact("playpaste.com"),
    runAt: "loaded",
    actions: [{ type: "wait-captcha", steps: [{ type: "click", selector: "button.btn" }] }],
  },
  {
    id: "shortlink-form-continue",
    match: hosts(
      "10short.com",
      "4hi.in",
      "animerigel.com",
      "encurt4.com",
      "encurtacash.com",
      "fbol.top",
      "kshlink.com",
      "kut.li",
      "oii.si",
      "passivecryptos.xyz",
      "payskip.org",
      "shortlinkdk.com",
      "tfly.link",
      "urlcashdk.xyz",
    ),
    runAt: "loaded",
    actions: [
      { type: "submit", selector: "#form-continue", delay: 2000 },
      { type: "wait-captcha", steps: [{ type: "submit", selector: "#link-view" }] },
    ],
  },
  {
    id: "tii-la-family",
    match: "^(iir|lnbz|oei|oii|tii|tpi|tvi)\\.(la|li)$",
    runAt: "loaded",
    actions: [{ type: "wait-captcha", steps: [{ type: "click", selector: "#continue" }] }],
  },
  {
    id: "shrinkme-captcha",
    match: "(^|\\.)shrink(me|e)\\.(click|me|io|in)$",
    runAt: "loaded",
    actions: [
      { type: "wait-captcha", steps: [{ type: "click", selector: "#invisibleCaptchaShortlink" }] },
    ],
  },
  {
    id: "link-view-captcha-family",
    match: hosts(
      "atglinks.com",
      "crlinks.in",
      "encurtadorcashlinks.com",
      "galaxy-link.space",
      "johnnygo.xyz",
      "linclik.com",
      "link.freebtc.my.id",
      "link4rev.site",
      "linkbulks.com",
      "oke.io",
      "oii.io",
      "paid4link.com",
      "pahe.plus",
      "pwrpa.cc",
      "shrink.icu",
      "smoner.com",
      "tinygo.co",
      "tlin.me",
      "tm-earn.com",
      "up4cash.com",
      "wordcount.im",
    ),
    runAt: "loaded",
    actions: [{ type: "wait-captcha", steps: [{ type: "submit", selector: "#link-view" }] }],
  },
];
