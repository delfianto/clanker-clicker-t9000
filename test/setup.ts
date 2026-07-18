import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Provides window / document / location / MutationObserver / events etc. to the
// whole test run. Pure-logic tests ignore it; DOM tests rely on it.
GlobalRegistrator.register({ url: "https://example.com/" });

// The window above is shared by every test file in the run (this preload runs
// once). Anything that triggers a real happy-dom navigation — e.g. appending
// an <iframe src="https://..."> — kicks off a real async fetch against that
// shared frame. If a test doesn't await/abort it, it keeps running in the
// background and can settle mid-assertion in a *later* file, corrupting
// shared `location`/`document` state (only reproduces where DNS/network is
// slow enough for the leak to still be in flight — e.g. CI, not sandboxes
// without real egress). Abort all pending async tasks after every test so
// nothing survives to the next one.
afterEach(async () => {
  await window.happyDOM.abort();
});
