import type { Rule } from "../../../types/rules";
import { hosts } from "../builders";

export const extToRule: Rule = {
  id: "ext-to-magnet-extractor",
  match: hosts("ext.to"),
  pathMatch: "^/.*-\\d+/?$",
  runAt: "loaded",
  actions: [
    {
      type: "run",
      run: async (ctx) => {
        // pathMatch only narrows this to detail-shaped URLs; plenty of those
        // carry no magnet button. Swallow the miss instead of letting the
        // waiter's TimeoutError bubble up as a rule failure.
        const magnetBtn = await ctx
          .waitForElement(".magnet-btn, a[href*='magnet']")
          .catch(() => null);
        if (magnetBtn) {
          const hiddenHash = magnetBtn.getAttribute("data-href") || magnetBtn.getAttribute("href");

          if (hiddenHash && hiddenHash.startsWith("magnet:")) {
            const cleanLink = document.createElement("a");
            cleanLink.href = hiddenHash;
            cleanLink.textContent = "Magnet Link (Unlocked)";
            cleanLink.className = magnetBtn.className;

            magnetBtn.replaceWith(cleanLink);
          }
        }
      },
    },
  ],
};
