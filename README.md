# Clanker Clicker T9000

> _"Please wait 5 seconds..."_ — the four most disrespectful words on the internet.

A browser extension that reads shortlink pages so you don't have to develop a stress-related illness doing it yourself.

---

## The situation

You clicked a link. A reasonable thing to do. Links are for clicking.

What you got instead was a **waiting room**. A little page with a countdown, an ad the size of a refrigerator, a "PLEASE DISABLE YOUR ADBLOCKER" guilt-trip, a fake "Verifying you are human" spinner that verifies nothing, and a button labeled **CONTINUE** that, when clicked, opens three casino tabs and takes you to a _second_ waiting room. The countdown resets. Somewhere, someone you'll never meet earns $0.0003.

This is the shortlink-industrial complex, and it has decided that your destination is a privilege you must earn — one 5-second penance at a time, forever.

**Clanker Clicker T9000** is the robot you send to do the penance.

It sits at `document_start`, waits for the toll booth to load, and then — with the weary professionalism of a night-shift toll collector who has seen everything — clicks the buttons, submits the forms, waits out the timers (except faster, because it lies about how much time has passed), refuses the popups, ignores the "disable adblock" tantrum, solves the Turnstile, and delivers you to the actual URL. The one you asked for. Fourteen seconds ago. In a just world, immediately.

You don't watch it happen. That's the whole point. You clicked a link and you ended up where the link went, like it's 2009 and the web still had some dignity.

---

## What it actually is

A **clean-room, Manifest V3 extension** for Chrome and Firefox. No account. No external server. No telemetry. No "premium tier." No Discord. It does not phone home because it has no home and no phone. It is MIT-licensed and it fits in your pocket.

It ships with rules covering **well over a hundred shortlink hosts**, drawn from a triaged hit-list of **185 domains** — the `ouo.io`s, the `atglinks`es, the `cpmlink`s, the entire genus of `encurta*` Brazilian link-shorteners, and every WordPress blog that discovered the `wpsafelink` plugin and never recovered. When a page matches, it acts. When it doesn't match, it does **absolutely nothing** — it doesn't even register a listener. Your online banking is safe. It has no opinions about your online banking.

---

## What it does, and the grievance it settles

| It does this                                                | Because otherwise                                                                                                                                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Waits out the countdown at 100× speed**                   | A "5 second" timer is 5 seconds of your finite mortal life the website decided it was owed. It was not owed this.                                                                                           |
| **Clicks "Continue" / "Get Link" / "I'm not a robot"**      | The button was always going to be clicked. You both knew it. This just skips the part where you're forced to participate in the theater.                                                                    |
| **Marks its own clicks as `isTrusted: true`**               | Websites check whether a click came from a Real Human Finger™. We teach the browser to nod solemnly and confirm that yes, this synthetic click was performed by a finger, of the human variety, absolutely. |
| **Blocks the popup/popunder tabs** _(opt-in)_               | You did not ask for a tab about a mattress sale. You have never once, in the history of the web, wanted the popunder.                                                                                       |
| **Neutralizes the "disable your adblocker" nag** _(opt-in)_ | The nag is emotional blackmail written by a man who owns three domains. We decline his terms.                                                                                                               |
| **Auto-solves Cloudflare Turnstile**                        | Because "Verifying you are human" should not be a load-bearing part of downloading a Linux ISO.                                                                                                             |
| **Auto-downloads on file-host pages** _(opt-in)_            | The final boss of link pages is the one where the download button is a decoy and the _real_ button is 400px lower, unlabeled, next to a picture of a woman. We know which one is real.                      |

Everything past "waits out the countdown" is **off by default** and lives behind a toggle in the popup, because a tool that quietly rewrites how the web behaves should ask first, and because your idea of "reasonable" and a Brazilian link-shortener's idea of "reasonable" should at minimum be _your_ idea.

---

## Install

Not on any store. Stores have "review processes" and "policies about circumventing monetization," and this extension's entire personality is circumventing monetization, so we have a philosophical difference.

```sh
bun install
bun run build          # → build/chrome/
bun run build:firefox  # → build/firefox/
```

**Chrome:** `chrome://extensions` → enable Developer mode → **Load unpacked** → pick `build/chrome/`.
**Firefox:** `about:debugging` → This Firefox → **Load Temporary Add-on** → pick anything in `build/firefox/`.

That's it. There is no step where you enter a credit card. There is no step at all, really. You're done.

---

## For people who want to add a site (or read the machine's diary)

The engine is boringly declarative on purpose. Most shortlinks are one of five shapes, and each shape is a one-liner:

```ts
paramRedirect("host.com", "url", "base64"); // destination lives in a ?url= param
waitRedirect("host.com", "a.get-link"); // wait for the element, go to its href
clickAfter("host.com", "#continue", 2000); // click a button after it settles
redirectHref("host.com", ".skip-button"); // follow a link's href now
formSubmitThenClick(id, hosts("a", "b"), "tp"); // submit form, then click the follow-up
```

Anything genuinely cursed gets a typed `run` closure with a proper toolkit (`params`, `navigateTo`, `waitForElement`, `click`, `decode`, `signal`) and no string-keyed handler-registry nonsense. Add your one-liner, add a row to the host→rule matching table in the tests, run `bun run check && bun test`, done. The full tour — the MAIN/ISOLATED world split, the CSP-safe config bridge, why the trust proxy exists and what it broke when it didn't — is in [`AGENTS.md`](./AGENTS.md), which is written for a robot but reads fine if you are a person pretending to be one.

Built with TypeScript 7, Bun, and the vite-plus toolchain, because if you're going to reimplement a 100 KB userscript from scratch you may as well suffer in a modern idiom.

---

## FAQ

**Is this legal?**
It runs on your own machine, in your own browser, on pages you already loaded, and clicks buttons you were already going to click. If that's illegal then so is a fast-forward button. It's your computer. Do a crime on it. (Don't do a crime on it.)

**Does it break sites?**
Only the ones that were already broken as a lifestyle choice. On the ~99.9% of the web that isn't a shortlink toll booth, it is inert — no rule matches, no listeners attach, nothing happens. It is the world's most specialized napper.

**Why "T9000"?**
Because "T-800" was taken and this one is better at exactly one thing and useless at everything else.

**What does this thing know about where I'm going?**
Nothing, and it could not possibly care less. Everything it does happens inside your own browser and evaporates the second the tab closes — no server, no backend, no log, no analytics, no guy squinting at a dashboard wondering about you. Whatever waits on the far side of the link, the extension delivers you to it with the exact same magnificent indifference: a cat GIF, a Linux ISO, a bootleg OnlyFans rip you will be judged for by absolutely no one — it clicks the button and moves on. It does not read the room. Whatever happens in the browser stays in the browser, largely because the extension has already forgotten it and wouldn't have anyone to tell.

**Will you add my site?**
Open the file. Write the one-liner. It's genuinely a one-liner. I believe in you.

---

## Disclaimer

This is a personal tool built for personal use, offered to the public with no warranty, no support SLA, and no promise that any given link-shortener won't wake up tomorrow having invented a new and stupid way to waste your time that this extension does not yet counter. It's an arms race. We are, at time of writing, winning it, smugly.

MIT licensed. Take it, fork it, ship it, name your fork something even more disrespectful. The robot doesn't care. The robot just wants to click the button.

🤖
