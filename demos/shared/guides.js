/*
  Guides: "טיפים ומדריכים" for a trade's page. What to do right now, tips, and common questions,
  each one opening in place. The content is general know-how from the trade (shared/guides/<trade>.json):
  no prices, hours or promises of the business. Anything dangerous says: don't touch, call a professional.

  Guides.load("../shared/guides/<trade>.json", el, { onAsk?: (item) => void })   fetches, then init
  Guides.init(el, data, { onAsk?: (item) => void })
    data = { items: [{ id, kind: "now" | "tip" | "faq", q, a?: "text", steps?: ["…"], warn?: "text", ask?: "button label" }] }
  Every item has an anchor #g-<id>. Opening that address (from the chat's tip link, or a shared link)
  opens the item and scrolls to it. Themed by the page's --bot-* variables, like the chat.
*/
(function () {
  const CSS = `
  .gd{font-family:var(--bot-font,inherit);color:var(--bot-fg,inherit)}
  .gd-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}
  .gd-tabs button{min-height:40px;padding:8px 14px;border:1.5px solid var(--bot-line,#d0d0d0);border-radius:var(--bot-radius-pill,999px);background:var(--bot-bg,#fff);color:inherit;font:600 15px var(--bot-font,inherit);cursor:pointer}
  .gd-tabs button[aria-pressed="true"]{background:var(--bot-accent,#333);border-color:var(--bot-accent,#333);color:var(--bot-accent-fg,#fff)}
  .gd-list{display:grid;gap:10px}
  .gd details{background:var(--bot-bg,#fff);border:1.5px solid var(--bot-line,#d0d0d0);border-radius:var(--bot-radius,12px);scroll-margin-top:90px}
  .gd details[open]{border-color:var(--bot-accent,#333)}
  .gd summary{list-style:none;display:flex;gap:10px;align-items:baseline;padding:14px 16px;cursor:pointer;font-weight:700;font-size:17px;line-height:1.35}
  .gd summary::-webkit-details-marker{display:none}
  .gd summary::after{content:"+";margin-inline-start:auto;font-weight:400;font-size:22px;line-height:1;color:var(--bot-muted,#666)}
  .gd details[open] summary::after{content:"−"}
  .gd-kind{flex:none;font-size:12px;font-weight:700;padding:2px 8px;border-radius:var(--bot-radius-pill,999px);background:var(--bot-them,#eee);color:var(--bot-fg,inherit)}
  .gd-kind.now{background:var(--guide-alert,#a8322a);color:#fff}
  .gd-body{padding:0 16px 16px;font-size:16px;line-height:1.65}
  .gd-body p{margin:0 0 10px}
  .gd-body ol{margin:0 0 12px;padding:0;list-style:none;counter-reset:s;display:grid;gap:8px}
  .gd-body li{counter-increment:s;display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start}
  .gd-body li::before{content:counter(s);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;background:var(--bot-accent,#333);color:var(--bot-accent-fg,#fff)}
  .gd-warn{border-inline-start:4px solid var(--guide-alert,#a8322a);padding:8px 12px;background:var(--bot-them,#f3f3f3);border-radius:0 var(--bot-radius-input,8px) var(--bot-radius-input,8px) 0}
  .gd-ask{min-height:44px;padding:10px 16px;border:0;border-radius:var(--bot-radius-input,10px);background:var(--bot-accent,#333);color:var(--bot-accent-fg,#fff);font:700 15px var(--bot-font,inherit);cursor:pointer}
  .gd summary:focus-visible,.gd-tabs button:focus-visible,.gd-ask:focus-visible{outline:3px solid var(--bot-focus,var(--bot-accent,#333));outline-offset:2px}`;

  const KIND = { now: "דחוף", tip: "טיפ", faq: "שאלה נפוצה" };
  const TABS = [["all", "הכול"], ["now", "מה עושים עכשיו"], ["tip", "טיפים"], ["faq", "שאלות נפוצות"]];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  window.Guides = {
    load(url, root, opts) {
      return fetch(url).then((r) => (r.ok ? r.json() : null)).then((d) => this.init(root, d, opts)).catch(() => { if (root) root.closest("section").hidden = true; });
    },
    init(root, data, opts = {}) {
      if (!root || !data || !data.items) return;
      if (!document.getElementById("gd-css")) { const s = el("style"); s.id = "gd-css"; s.textContent = CSS; document.head.append(s); }
      const wrap = el("div", "gd"), tabs = el("div", "gd-tabs"), list = el("div", "gd-list");
      tabs.setAttribute("role", "group"); tabs.setAttribute("aria-label", "סינון המדריכים");
      const kinds = new Set(data.items.map((x) => x.kind));
      TABS.filter(([k]) => k === "all" || kinds.has(k)).forEach(([k, label], i) => {
        const b = el("button", null, label); b.type = "button"; b.setAttribute("aria-pressed", String(i === 0));
        b.addEventListener("click", () => {
          tabs.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          list.querySelectorAll("details").forEach((d) => { d.hidden = k !== "all" && d.dataset.kind !== k; });
        });
        tabs.append(b);
      });
      for (const it of data.items) {
        const d = el("details"); d.id = "g-" + it.id; d.dataset.kind = it.kind;
        const s = el("summary"); s.append(el("span", "gd-kind" + (it.kind === "now" ? " now" : ""), KIND[it.kind] || ""), el("span", null, it.q));
        const body = el("div", "gd-body");
        if (it.a) String(it.a).split("\n").forEach((line) => body.append(el("p", null, line)));
        if (it.steps) { const ol = el("ol"); it.steps.forEach((x) => ol.append(el("li", null, x))); body.append(ol); }
        if (it.warn) body.append(el("p", "gd-warn", it.warn));
        if (it.ask && opts.onAsk) { const b = el("button", "gd-ask", it.ask); b.type = "button"; b.addEventListener("click", () => opts.onAsk(it)); body.append(b); }
        d.append(s, body); list.append(d);
      }
      wrap.append(tabs, list); root.replaceChildren(wrap);
      // #g-<id>: open that item and bring it into view, also when it is hidden by a tab.
      const openHash = () => {
        const m = /^#g-([\w-]+)$/.exec(location.hash); if (!m) return;
        const d = document.getElementById("g-" + m[1]); if (!d || !list.contains(d)) return;
        tabs.querySelector("button").click(); d.open = true;
        d.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        d.querySelector("summary").focus({ preventScroll: true });
      };
      addEventListener("hashchange", openHash); openHash();
    },
  };
})();
