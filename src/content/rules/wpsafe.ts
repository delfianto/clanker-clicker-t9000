import type { Rule } from "../../types/rules";
import { hosts } from "./builders";

// The wpsafelink WordPress plugin is used by many Indonesian/South-Asian blogs.
// Two DOM patterns appear across ~20+ domains.

// onclick attribute contains window.open('URL', ...) — handles both quote styles.
const ONCLICK_PATTERN = "window\\.open\\(['\"]([^'\"]+)['\"]";

export const wpsafeRules: Rule[] = [
  {
    id: "wpsafe-onclick",
    match: hosts(
      "admediaflex.com",
      "aduzz.com",
      "baristakesehatan.com",
      "bloggingos.com",
      "cdrab.com",
      "cryptoinsiderhub.com",
      "financekita.com",
      "merekrut.com",
      "mixrootmods.com",
      "omnexa.com",
      "pastescript.com",
      "tutorialsaya.com",
      "deltabtc.xyz",
    ),
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "div[id^='wpsafe'] > a[rel='nofollow'], div[id^='wpsafe'] > a[onclick]",
        steps: [
          {
            type: "redirect-from-onclick",
            selector: "div[id^='wpsafe'] > a[rel='nofollow'], div[id^='wpsafe'] > a[onclick]",
            extractPattern: ONCLICK_PATTERN,
          },
        ],
      },
    ],
  },
  {
    id: "wpsafe-href",
    match: hosts(
      "7misr4day.com",
      "almontsf.com",
      "amanguides.com",
      "dlgamingvn.com",
      "fitmusclematrix.com",
      "g34new.com",
      "michaelemad.com",
      "phimsubmoi.com",
    ),
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "#wpsafegenerate > #wpsafe-link > a[href], a#btn7[href]",
        steps: [
          {
            type: "redirect-from-href",
            selector: "#wpsafegenerate > #wpsafe-link > a[href], a#btn7[href]",
          },
        ],
      },
    ],
  },
  {
    id: "wpsafe-window-open-onclick",
    match: hosts(
      "admediaflex.com",
      "cdrab.com",
      "financekita.com",
      "gkvstudy.com",
      "indobo.com",
      "mealcold.com",
      "mkcgticket.com",
      "mobilebajar.com",
      "pdfvale.com",
      "techtunesbabu.com",
      "skyfreecoins.top",
      "vertohub.space",
    ),
    runAt: "loaded",
    actions: [
      {
        type: "wait-element",
        selector: "#wpsafe-link a[onclick*='window.open']",
        steps: [
          {
            type: "redirect-from-onclick",
            selector: "#wpsafe-link a[onclick*='window.open']",
            extractPattern: ONCLICK_PATTERN,
          },
        ],
      },
    ],
  },
];
