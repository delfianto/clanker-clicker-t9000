import type { Rule } from "../../../types/rules";
import type { CustomHandlerRegistry } from "../../engine/actions";
import { navigateTo } from "../../engine/redirect";

// Sites that abuse google.com/url?q= for redirect cloaking but lead to ad-spam domains.
// Consolidated from the duplicate lists in the original source (lines 388 + 531).
export const GOOGLE_REDIRECT_BLOCKED_DOMAINS: readonly string[] = [
  "ecofriendlyz.com",
  "homesteadfeast.com",
  "virtualrealitieshub.com",
  "playallgames.net",
  "brewmasterly.com",
  "countriesguide.net",
  "carstopia.net",
  "illustrationmaster.com",
  "speakzyo.com",
  "languagefluency.net",
  "selfcareinsights.com",
  "furtnitureplanet.net",
  "gizmoera.com",
  "techiephone.com",
  "renovatehub.net",
  "retrocove.net",
  "geotides.net",
  "chownest.com",
  "lifeprovy.com",
  "vaultfind.net",
  "tastywhiz.com",
  "gamestopia.net",
  "gputrends.net",
  "mythnest.com",
  "plantsguide.net",
  "wiki-topia.com",
  "makeupguide.net",
  "wanderjourney.net",
  "fitbodygenius.com",
  "origamiarthub.com",
  "dailytech-news.eu",
  "petsguide.net",
  "hobbymania.net",
  "constructorspro.com",
  "insurancegold.in",
  "cinemascene.net",
  "tvseriescentral.net",
  "cookinguide.net",
  "carsmania.net",
  "melodyspot.net",
  "webfreetools.net",
  "coinsrise.net",
  "coinstrend.net",
  "funplayarcade.com",
  "gadgetbuzz.net",
  "insurancexguide.com",
  "coinscap.info",
  "coinsvalue.net",
  "giftmagic.net",
  "freeoseocheck.com",
  "cryptowidgets.net",
];

export const googleRedirectRule: Rule = {
  id: "google-url-redirect",
  match: "^(www\\.)?google\\.com$",
  pathMatch: "^/url$",
  runAt: "start",
  actions: [{ type: "custom", handler: "google-url-q" }],
};

export function registerGoogleRedirectHandler(registry: CustomHandlerRegistry): void {
  registry.set("google-url-q", () => {
    const params = new URLSearchParams(location.search);
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
  });
}
