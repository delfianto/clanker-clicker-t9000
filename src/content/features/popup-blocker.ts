const origOpen = window.open.bind(window);

export function installPopupBlocker(): () => void {
  window.open = (url?: string | URL, _target?: string, _features?: string): WindowProxy | null => {
    const href = url instanceof URL ? url.href : (url ?? "");
    if (!/^https?:\/\//i.test(href)) {
      return origOpen(url, _target, _features);
    }
    showNotification(href);
    return null;
  };

  return () => {
    window.open = origOpen;
  };
}

function showNotification(url: string): void {
  const existing = document.getElementById("cc-popup-notice");
  existing?.remove();

  const div = document.createElement("div");
  div.id = "cc-popup-notice";
  Object.assign(div.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    zIndex: "2147483647",
    background: "#1a1a1a",
    color: "#fff",
    borderRadius: "6px",
    padding: "10px 14px",
    fontFamily: "system-ui, sans-serif",
    fontSize: "13px",
    maxWidth: "340px",
    boxShadow: "0 4px 12px rgba(0,0,0,.4)",
    lineHeight: "1.5",
  });

  const label = document.createElement("div");
  label.textContent = "🔒 Popup blocked";
  label.style.fontWeight = "600";

  const urlEl = document.createElement("div");
  urlEl.textContent = url.length > 60 ? url.slice(0, 57) + "…" : url;
  urlEl.style.cssText = "font-size:11px;opacity:.7;margin:2px 0 8px;word-break:break-all";

  const openBtn = document.createElement("a");
  openBtn.textContent = "Open anyway";
  openBtn.href = url;
  openBtn.target = "_blank";
  openBtn.rel = "noopener noreferrer";
  Object.assign(openBtn.style, {
    color: "#4af",
    textDecoration: "none",
    fontSize: "12px",
    marginRight: "10px",
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: "12px",
  });
  closeBtn.onclick = () => div.remove();

  div.append(label, urlEl, openBtn, closeBtn);
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 8_000);
}
