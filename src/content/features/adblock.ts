export const DEFAULT_ADBLOCK_PATTERN =
  /adblock|AdbModel|AdblockReg|AntiAdblock|checkAdBlock|detectAnyAdb|detectAdBlock|justDetectAdb|FuckAdBlock|TestAdBlock|DisableDevtool|devtools-detect/i;

export function installAntiAdblockRemover(pattern: RegExp): () => void {
  function shouldBlock(node: Node): boolean {
    if (!(node instanceof HTMLScriptElement) && !(node instanceof HTMLIFrameElement)) {
      return false;
    }
    const src = (node as HTMLScriptElement | HTMLIFrameElement).src ?? "";
    const text = node instanceof HTMLScriptElement ? (node.textContent ?? "") : "";
    return pattern.test(src) || pattern.test(text);
  }

  function scanExisting(): void {
    document.querySelectorAll("script, iframe").forEach((el) => {
      if (shouldBlock(el)) el.remove();
    });
  }

  const observer = new MutationObserver((mutations) => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (shouldBlock(node)) (node as Element).remove();
      }
    }
  });

  observer.observe(document, { childList: true, subtree: true });
  scanExisting();

  return () => observer.disconnect();
}
