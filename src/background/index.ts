import browser from "webextension-polyfill";
import { crossOriginFetch } from "./fetcher";

type CCFetchMessage = {
  type: "CC_FETCH";
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type CCCFBridgeMessage = {
  type: "CC_CF_BRIDGE";
  host: string;
  excluded: string[];
};

type CCMessage = CCFetchMessage | CCCFBridgeMessage;

browser.runtime.onMessage.addListener((msg: unknown, sender: browser.Runtime.MessageSender) => {
  const message = msg as CCMessage;

  if (message.type === "CC_FETCH") {
    return crossOriginFetch(message.url, message.method, message.headers, message.body)
      .then((data) => ({ data }))
      .catch((err: Error) => ({ error: err.message }));
  }

  if (message.type === "CC_CF_BRIDGE") {
    const tabId = sender.tab?.id;
    if (tabId == null) return;
    browser.tabs
      .sendMessage(
        tabId,
        { type: "CC_CF_PARENT", host: message.host, excluded: message.excluded },
        { frameId: 0 },
      )
      .catch(() => {});
    return Promise.resolve({ status: "forwarded" });
  }
});
