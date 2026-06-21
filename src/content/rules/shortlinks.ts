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

  waitRedirect("8tm.net", "a.btn.btn-secondary.btn-block.redirect"),
  redirectHref("adfoc.us", ".skip"),
  waitRedirect("cpmlink.net", "a#btn-main.btn.btn-warning.btn-lg"),
  clickAfter("keeplinks.org", "#btnchange", 2000),
  waitRedirect("lanza.me", "a#botonGo"),
  waitRedirect("linksly.co", "div.col-md-12 a"),
  redirectHref("linkspy.cc", ".skipButton"),
  waitRedirect("mohtawaa.com", "a.btn.btn-success.btn-lg.get-link.enabled"),
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
        run: async ({ params, navigateTo, waitForElement }) => {
          const s = params.get("s");
          if (s) {
            navigateTo(s.startsWith("http") ? s : "https://" + s);
            return;
          }
          const btn = await waitForElement("button#btn-main");
          (btn as HTMLElement).click();
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
      "topshare.in",
    ),
    "tp",
  ),
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
];
