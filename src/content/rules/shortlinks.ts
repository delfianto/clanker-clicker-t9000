import type { Rule } from "../../types/rules";

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
  {
    id: "render-state-link",
    match: "^render-state\\.to$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "link", decode: "uri" }],
  },
  {
    id: "telegram-url",
    match: "^t\\.me$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "url", decode: "uri" }],
  },
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
  {
    id: "adtival-shortid-b64",
    match: "^adtival\\.network$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "shortid", decode: "base64" }],
  },
  {
    id: "comohoy-url-b64",
    match: "^comohoy\\.com$",
    pathMatch: "^/view/out\\.html$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "url", decode: "base64" }],
  },
  {
    id: "kongutoday-safe-b64",
    match: "(hipsonyc|kongutoday|proappapk)\\.com$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "safe", decode: "base64" }],
  },
  {
    id: "sfl-gl-b64",
    match: "^sfl\\.gl$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "u", decode: "base64" }],
  },
  {
    id: "adtival-safe-b64",
    match: "^sfl\\.gl$",
    pathMatch: "^/r/",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "safe", decode: "base64" }],
  },
  {
    id: "sharetext-url-b64",
    match: "^sharetext\\.me$",
    pathMatch: "^/redirect",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "url", decode: "base64" }],
  },
  {
    id: "triggeredplay-hash-b64",
    match: "^triggeredplay\\.com$",
    runAt: "start",
    actions: [{ type: "redirect-from-param", param: "url", decode: "base64", hashParams: true }],
  },

  // Path-based extraction
  {
    id: "4fnet-path-b64",
    match: "^4fnet\\.org$",
    pathMatch: "^/goto",
    runAt: "start",
    actions: [{ type: "redirect-from-path", pattern: "/([^/]+)$", decode: "base64" }],
  },
  {
    id: "apkw-path-b64",
    match: "^apkw\\.ru$",
    pathMatch: "^/away",
    runAt: "start",
    actions: [{ type: "redirect-from-path", pattern: "/([^/]+)$", decode: "base64" }],
  },
  {
    id: "programasvirtualespc-b64",
    match: "^programasvirtualespc\\.net$",
    pathMatch: "^/out/",
    runAt: "start",
    actions: [{ type: "redirect-from-path", pattern: "\\?(.+)$", decode: "base64" }],
  },
  {
    id: "yitarx-path-b64x3",
    match: "^yitarx\\.com$",
    pathMatch: "^/enlace/",
    runAt: "start",
    actions: [{ type: "redirect-from-path", pattern: "#!(.+)$", decode: "base64x3" }],
  },

  // ─── Click / redirect automation (run after DOM loads) ────────────────────

  {
    id: "8tm-net",
    match: "^8tm\\.net$",
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "a.btn.btn-secondary.btn-block.redirect",
        steps: [{ type: "redirect-from-href", selector: "a.btn.btn-secondary.btn-block.redirect" }],
      },
    ],
  },
  {
    id: "adfoc-skip",
    match: "^adfoc\\.us$",
    runAt: "loaded",
    actions: [{ type: "redirect-from-href", selector: ".skip" }],
  },
  {
    id: "cpmlink",
    match: "^cpmlink\\.net$",
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "a#btn-main.btn.btn-warning.btn-lg",
        steps: [{ type: "redirect-from-href", selector: "a#btn-main.btn.btn-warning.btn-lg" }],
      },
    ],
  },
  {
    id: "keeplinks",
    match: "^keeplinks\\.org$",
    runAt: "loaded",
    actions: [{ type: "click", selector: "#btnchange", delay: 2000 }],
  },
  {
    id: "lanza-me",
    match: "^lanza\\.me$",
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "a#botonGo",
        steps: [{ type: "redirect-from-href", selector: "a#botonGo" }],
      },
    ],
  },
  {
    id: "linksly",
    match: "^linksly\\.co$",
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "div.col-md-12 a",
        steps: [{ type: "redirect-from-href", selector: "div.col-md-12 a" }],
      },
    ],
  },
  {
    id: "linkspy-skip",
    match: "^linkspy\\.cc$",
    runAt: "loaded",
    actions: [{ type: "redirect-from-href", selector: ".skipButton" }],
  },
  {
    id: "mohtawaa",
    match: "^mohtawaa\\.com$",
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "a.btn.btn-success.btn-lg.get-link.enabled",
        steps: [
          { type: "redirect-from-href", selector: "a.btn.btn-success.btn-lg.get-link.enabled" },
        ],
      },
    ],
  },
  {
    id: "multiup-io",
    match: "^multiup\\.io$",
    pathMatch: "^/download/",
    runAt: "start",
    actions: [{ type: "custom", handler: "multiup-redirect" }],
  },
  // ouo handled entirely by custom handler (checks ?s= param first, then waits for button)
  {
    id: "ouo",
    match: "^ouo\\.(io|press)$",
    runAt: "loaded",
    actions: [{ type: "custom", handler: "ouo" }],
  },
  {
    id: "paycut-path-strip",
    match: "^paycut\\.pro$",
    pathMatch: "^/ad/",
    runAt: "start",
    actions: [{ type: "custom", handler: "paycut-strip" }],
  },
  {
    id: "surl-li",
    match: "^surl\\.(li|gd)$",
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "#redirect-button",
        steps: [{ type: "redirect-from-href", selector: "#redirect-button" }],
      },
    ],
  },
  {
    id: "the2-link",
    match: "^the2\\.link$",
    runAt: "loaded",
    actions: [{ type: "click", selector: "#get-link-btn", delay: 3000 }],
  },

  // ─── Form submit patterns (cover many sites each) ─────────────────────────

  {
    id: "form-tp-pattern",
    match:
      [
        "aceforce2apk",
        "djssmusic",
        "ez4mods",
        "fastcars1",
        "game5s",
        "jansamparks",
        "keedabankingnews",
        "sayphotobooth",
        "sharedp",
        "superheromaniac",
        "visastepguide",
        "zygina",
      ]
        .map((d) => `${d}\\.com`)
        .join("|") + "|btcon\\.online|topshare\\.in",
    runAt: "loaded",
    actions: [
      { type: "submit", selector: "form[name='tp']", delay: 3000 },
      { type: "click", selector: "#btn6", delay: 4000 },
    ],
  },
  {
    id: "form-dsb-captcha",
    match: "(askpaccosi|cryptomonitor)\\.com",
    runAt: "loaded",
    actions: [{ type: "wait-captcha", steps: [{ type: "submit", selector: "form[name='dsb']" }] }],
  },
  {
    id: "form-rtg-pattern",
    match: [
      "blockjump\\.in",
      "carjankaari\\.com",
      "jobmatric\\.com",
      "techsl\\.online",
      "vahansamachar\\.com",
    ].join("|"),
    runAt: "loaded",
    actions: [
      { type: "submit", selector: "form[name='rtg']", delay: 3000 },
      { type: "click", selector: "#btn6", delay: 4000 },
    ],
  },

  // ─── Captcha-gated click rules ─────────────────────────────────────────────

  {
    id: "fc-lc-family",
    match: "^(fc-lc|thotpacks)\\.xyz|^fc\\.lc$",
    runAt: "loaded",
    actions: [
      { type: "wait-captcha", steps: [{ type: "submit", selector: "#link-view" }] },
      { type: "click", selector: "#invisibleCaptchaShortlink", delay: 3000 },
      { type: "wait-captcha", steps: [{ type: "click", selector: "#submitBtn" }] },
    ],
  },
  {
    id: "playnano",
    match: "^playnano\\.online$",
    runAt: "loaded",
    actions: [
      { type: "click", selector: "#watch-link", delay: 2000 },
      { type: "click", selector: ".watch-next-btn.btn-primary.button", delay: 2000 },
    ],
  },
  {
    id: "playpaste-captcha",
    match: "^playpaste\\.com$",
    runAt: "loaded",
    actions: [{ type: "wait-captcha", steps: [{ type: "click", selector: "button.btn" }] }],
  },
  {
    id: "shortlink-form-continue",
    match: [
      "10short\\.com",
      "4hi\\.in",
      "animerigel\\.com",
      "encurt4\\.com",
      "encurtacash\\.com",
      "faucetsatoshi\\.site",
      "fbol\\.top",
      "kshlink\\.com",
      "kut\\.li",
      "oii\\.si",
      "passivecryptos\\.xyz",
      "payskip\\.org",
      "rslinks\\.fun",
      "shortie\\.sbs",
      "shortlinkdk\\.com",
      "tfly\\.link",
      "urlcashdk\\.xyz",
      "zippynest\\.online",
    ].join("|"),
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
