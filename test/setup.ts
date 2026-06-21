import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Provides window / document / location / MutationObserver / events etc. to the
// whole test run. Pure-logic tests ignore it; DOM tests rely on it.
GlobalRegistrator.register({ url: "https://example.com/" });
