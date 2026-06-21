import type { Rule } from "../../../types/rules";

// Sites that abuse google.com/url?q= for redirect cloaking but lead to ad-spam domains.
// Consolidated from the duplicate lists in the original source (lines 388 + 531).
export const GOOGLE_REDIRECT_BLOCKED_DOMAINS: readonly string[] = [
  "brewmasterly.com",
  "carsmania.net",
  "carstopia.net",
  "chownest.com",
  "cinemascene.net",
  "coinscap.info",
  "coinsrise.net",
  "coinstrend.net",
  "coinsvalue.net",
  "constructorspro.com",
  "cookinguide.net",
  "countriesguide.net",
  "cryptowidgets.net",
  "dailytech-news.eu",
  "ecofriendlyz.com",
  "fitbodygenius.com",
  "freeoseocheck.com",
  "funplayarcade.com",
  "furtnitureplanet.net",
  "gadgetbuzz.net",
  "gamestopia.net",
  "geotides.net",
  "giftmagic.net",
  "gizmoera.com",
  "gputrends.net",
  "hobbymania.net",
  "homesteadfeast.com",
  "illustrationmaster.com",
  "insurancegold.in",
  "insurancexguide.com",
  "languagefluency.net",
  "lifeprovy.com",
  "makeupguide.net",
  "melodyspot.net",
  "mythnest.com",
  "origamiarthub.com",
  "petsguide.net",
  "plantsguide.net",
  "playallgames.net",
  "renovatehub.net",
  "retrocove.net",
  "selfcareinsights.com",
  "speakzyo.com",
  "tastywhiz.com",
  "techiephone.com",
  "tvseriescentral.net",
  "vaultfind.net",
  "virtualrealitieshub.com",
  "wanderjourney.net",
  "webfreetools.net",
  "wiki-topia.com",
];

export const googleRedirectRule: Rule = {
  id: "google-url-redirect",
  match: "^(www\\.)?google\\.com$",
  pathMatch: "^/url$",
  priority: 10,
  runAt: "start",
  actions: [
    {
      type: "run",
      run: ({ params, navigateTo }) => {
        const target = params.get("q");
        if (!target) return;
        try {
          const host = new URL(target).hostname.replace(/^www\./, "");
          const blocked = GOOGLE_REDIRECT_BLOCKED_DOMAINS.some(
            (d) => host === d || host.endsWith("." + d),
          );
          if (blocked) return;
          navigateTo(target);
        } catch {
          /* invalid URL */
        }
      },
    },
  ],
};
