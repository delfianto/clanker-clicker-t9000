import type { Rule } from "../../types/rules";

// The wpsafelink WordPress plugin is used by many Indonesian/South-Asian blogs.
// Two DOM patterns appear across ~20+ domains.

const ONCLICK_SITES =
  [
    "admediaflex",
    "aduzz",
    "baristakesehatan",
    "bloggingos",
    "cdrab",
    "cryptoinsiderhub",
    "financekita",
    "financenube",
    "jobydt",
    "merekrut",
    "mixrootmods",
    "omnexa",
    "pastescript",
    "trimorspacks",
    "tutorialsaya",
  ]
    .map((d) => `${d}\\.com`)
    .join("|") + "|deltabtc\\.xyz|gadifeed\\.in";

const HREF_SITES =
  [
    "7misr4day",
    "almontsf",
    "amanguides",
    "dlgamingvn",
    "fitmusclematrix",
    "g34new",
    "michaelemad",
    "phimsubmoi",
    "v34down",
  ]
    .map((d) => `${d}\\.com`)
    .join("|") + "|(nashib|timbertales)\\.xyz";

// Pattern A: onclick attribute contains window.open('URL', ...)
// Handles both single and double quote variants in extractPattern
const ONCLICK_PATTERN = "window\\.open\\(['\"]([^'\"]+)['\"]";

export const wpsafeRules: Rule[] = [
  {
    id: "wpsafe-onclick",
    match: ONCLICK_SITES,
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
    match: HREF_SITES,
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
    match:
      [
        "admediaflex",
        "cdrab",
        "financekita",
        "foodxor",
        "gkvstudy",
        "indobo",
        "jobydt",
        "mealcold",
        "mkcgticket",
        "mobilebajar",
        "pdfvale",
        "techtunesbabu",
        "thepragatishilclasses",
      ]
        .map((d) => `${d}\\.com`)
        .join("|") + "|gadifeed\\.in|skyfreecoins\\.top|vertohub\\.space",
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
