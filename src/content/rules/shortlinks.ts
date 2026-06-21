import type { Rule } from '../../types/rules';

export const shortlinkRules: Rule[] = [
  // ─── URL param extraction (run at document_start, no DOM needed) ───────────

  {
    id: 'telegram-url',
    match: '^t\\.me$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'url', decode: 'uri' }],
  },
  {
    id: 'tiktok-target',
    match: '(^|\\.)tiktok\\.com$',
    pathMatch: '^/(linkshim|link/v2)',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'target', decode: 'uri' }],
  },
  {
    id: 'facebook-instagram-u',
    match: '(^|\\.)((facebook|instagram)\\.com)$',
    pathMatch: '^/(flx/warn|linkshim|link/v2)',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'u', decode: 'uri' }],
  },
  {
    id: 'vk-away',
    match: '(^|\\.)vk\\.com$',
    pathMatch: '^/away\\.php$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'to', decode: 'uri' }],
  },
  {
    id: 'dutchycorp-code',
    match: '(^|\\.)dutchycorp\\.(space|ovh)$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'code', decode: 'uri' }],
  },
  {
    id: 'render-state-link',
    match: '^render-state\\.to$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'link', decode: 'uri' }],
  },
  {
    id: 'ouo-s-param',
    match: '^ouo\\.(io|press)$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 's', decode: 'none' }],
  },

  // Base64-encoded URL params
  {
    id: 'sfl-gl-b64',
    match: '^sfl\\.gl$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'u', decode: 'base64' }],
  },
  {
    id: 'triggeredplay-hash-b64',
    match: '^triggeredplay\\.com$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'url', decode: 'base64', hashParams: true }],
  },
  {
    id: 'adtival-shortid-b64',
    match: '^adtival\\.network$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'shortid', decode: 'base64' }],
  },
  {
    id: 'comohoy-url-b64',
    match: '^comohoy\\.com$',
    pathMatch: '^/view/out\\.html$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'url', decode: 'base64' }],
  },
  {
    id: 'sharetext-url-b64',
    match: '^sharetext\\.me$',
    pathMatch: '^/redirect',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'url', decode: 'base64' }],
  },
  {
    id: 'kongutoday-safe-b64',
    match: '(kongutoday|proappapk|hipsonyc)\\.com$',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'safe', decode: 'base64' }],
  },
  {
    id: 'adtival-safe-b64',
    match: '^sfl\\.gl$',
    pathMatch: '^/r/',
    runAt: 'start',
    actions: [{ type: 'redirect-from-param', param: 'safe', decode: 'base64' }],
  },

  // Path-based extraction
  {
    id: 'apkw-path-b64',
    match: '^apkw\\.ru$',
    pathMatch: '^/away',
    runAt: 'start',
    actions: [{ type: 'redirect-from-path', pattern: '/([^/]+)$', decode: 'base64' }],
  },
  {
    id: '4fnet-path-b64',
    match: '^4fnet\\.org$',
    pathMatch: '^/goto',
    runAt: 'start',
    actions: [{ type: 'redirect-from-path', pattern: '/([^/]+)$', decode: 'base64' }],
  },
  {
    id: 'yitarx-path-b64x3',
    match: '^yitarx\\.com$',
    pathMatch: '^/enlace/',
    runAt: 'start',
    actions: [{ type: 'redirect-from-path', pattern: '#!(.+)$', decode: 'base64x3' }],
  },
  {
    id: 'programasvirtualespc-b64',
    match: '^programasvirtualespc\\.net$',
    pathMatch: '^/out/',
    runAt: 'start',
    actions: [{ type: 'redirect-from-path', pattern: '\\?(.+)$', decode: 'base64' }],
  },

  // ─── Click automation (run after DOM loads) ────────────────────────────────

  {
    id: 'the2-link',
    match: '^the2\\.link$',
    runAt: 'loaded',
    actions: [{ type: 'click', selector: '#get-link-btn', delay: 3000 }],
  },
  {
    id: 'keeplinks',
    match: '^keeplinks\\.org$',
    runAt: 'loaded',
    actions: [{ type: 'click', selector: '#btnchange', delay: 2000 }],
  },
  {
    id: 'ouo-click',
    match: '^ouo\\.(io|press)$',
    runAt: 'loaded',
    actions: [{ type: 'click', selector: 'button#btn-main', delay: 4000 }],
  },
  {
    id: 'paycut-path-strip',
    match: '^paycut\\.pro$',
    pathMatch: '^/ad/',
    runAt: 'start',
    actions: [{
      type: 'custom', handler: 'paycut-strip',
    }],
  },
  {
    id: 'multiup-io',
    match: '^multiup\\.io$',
    pathMatch: '^/download/',
    runAt: 'start',
    actions: [{ type: 'custom', handler: 'multiup-redirect' }],
  },
  {
    id: 'adfoc-skip',
    match: '^adfoc\\.us$',
    runAt: 'loaded',
    actions: [{ type: 'redirect-from-href', selector: '.skip' }],
  },
  {
    id: 'linkspy-skip',
    match: '^linkspy\\.cc$',
    runAt: 'loaded',
    actions: [{ type: 'redirect-from-href', selector: '.skipButton' }],
  },
  {
    id: 'lanza-me',
    match: '^lanza\\.me$',
    runAt: 'loaded',
    actions: [{
      type: 'wait-element', selector: 'a#botonGo',
      steps: [{ type: 'redirect-from-href', selector: 'a#botonGo' }],
    }],
  },
  {
    id: 'linksly',
    match: '^linksly\\.co$',
    runAt: 'loaded',
    actions: [{
      type: 'wait-element', selector: 'div.col-md-12 a',
      steps: [{ type: 'redirect-from-href', selector: 'div.col-md-12 a' }],
    }],
  },
  {
    id: 'surl-li',
    match: '^surl\\.(li|gd)$',
    runAt: 'loaded',
    actions: [{
      type: 'wait-element', selector: '#redirect-button',
      steps: [{ type: 'redirect-from-href', selector: '#redirect-button' }],
    }],
  },
  {
    id: 'cpmlink',
    match: '^cpmlink\\.net$',
    runAt: 'loaded',
    actions: [{
      type: 'wait-element', selector: 'a#btn-main.btn.btn-warning.btn-lg',
      steps: [{ type: 'redirect-from-href', selector: 'a#btn-main.btn.btn-warning.btn-lg' }],
    }],
  },
  {
    id: 'mohtawaa',
    match: '^mohtawaa\\.com$',
    runAt: 'loaded',
    actions: [{
      type: 'wait-element', selector: 'a.btn.btn-success.btn-lg.get-link.enabled',
      steps: [{ type: 'redirect-from-href', selector: 'a.btn.btn-success.btn-lg.get-link.enabled' }],
    }],
  },
  {
    id: '8tm-net',
    match: '^8tm\\.net$',
    runAt: 'loaded',
    actions: [{
      type: 'wait-element', selector: 'a.btn.btn-secondary.btn-block.redirect',
      steps: [{ type: 'redirect-from-href', selector: 'a.btn.btn-secondary.btn-block.redirect' }],
    }],
  },

  // ─── Form submit patterns (cover many sites each) ─────────────────────────

  {
    id: 'form-tp-pattern',
    match: [
      'sayphotobooth', 'djssmusic', 'visastepguide', 'zygina', 'jansamparks',
      'superheromaniac', 'keedabankingnews', 'aceforce2apk', 'ez4mods',
      'sharedp', 'fastcars1', 'game5s',
    ].map(d => `${d}\\.com`).join('|') + '|topshare\\.in|btcon\\.online',
    runAt: 'loaded',
    actions: [
      { type: 'submit', selector: "form[name='tp']", delay: 3000 },
      { type: 'click', selector: '#btn6', delay: 4000 },
    ],
  },
  {
    id: 'form-rtg-pattern',
    match: '(jobmatric|carjankaari|vahansamachar)\\.com|techsl\\.online|blockjump\\.in',
    runAt: 'loaded',
    actions: [
      { type: 'submit', selector: "form[name='rtg']", delay: 3000 },
      { type: 'click', selector: '#btn6', delay: 4000 },
    ],
  },
  {
    id: 'form-dsb-captcha',
    match: '(askpaccosi|cryptomonitor)\\.com',
    runAt: 'loaded',
    actions: [
      { type: 'wait-captcha', steps: [{ type: 'submit', selector: "form[name='dsb']" }] },
    ],
  },

  // ─── Captcha-gated click rules ─────────────────────────────────────────────

  {
    id: 'playpaste-captcha',
    match: '^playpaste\\.com$',
    runAt: 'loaded',
    actions: [{ type: 'wait-captcha', steps: [{ type: 'click', selector: 'button.btn' }] }],
  },
  {
    id: 'tii-la-family',
    match: '^(tii|oei|iir|tvi|oii|tpi|lnbz)\\.(la|li)$',
    runAt: 'loaded',
    actions: [{ type: 'wait-captcha', steps: [{ type: 'click', selector: '#continue' }] }],
  },
  {
    id: 'fc-lc-family',
    match: '^(fc-lc|thotpacks)\\.xyz|^fc\\.lc$',
    runAt: 'loaded',
    actions: [
      { type: 'wait-captcha', steps: [{ type: 'submit', selector: '#link-view' }] },
      { type: 'click', selector: '#invisibleCaptchaShortlink', delay: 3000 },
      { type: 'wait-captcha', steps: [{ type: 'click', selector: '#submitBtn' }] },
    ],
  },
  {
    id: 'playnano',
    match: '^playnano\\.online$',
    runAt: 'loaded',
    actions: [
      { type: 'click', selector: '#watch-link', delay: 2000 },
      { type: 'click', selector: '.watch-next-btn.btn-primary.button', delay: 2000 },
    ],
  },
  {
    id: 'shortlink-form-continue',
    match: [
      '4hi\\.in', '10short\\.com', 'animerigel\\.com', 'encurt4\\.com',
      'encurtacash\\.com', 'shortlinkdk\\.com', 'kshlink\\.com',
      'passivecryptos\\.xyz', 'urlcashdk\\.xyz', 'fbol\\.top',
      'kut\\.li', 'shortie\\.sbs', 'zippynest\\.online',
      'faucetsatoshi\\.site', 'tfly\\.link', 'oii\\.si', 'payskip\\.org', 'rslinks\\.fun',
    ].join('|'),
    runAt: 'loaded',
    actions: [
      { type: 'submit', selector: '#form-continue', delay: 2000 },
      { type: 'wait-captcha', steps: [{ type: 'submit', selector: '#link-view' }] },
    ],
  },
];
