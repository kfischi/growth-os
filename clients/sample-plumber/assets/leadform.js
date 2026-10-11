/* LeadForm: sends an enquiry to the lead system (netlify/functions/lead.mjs).
   LeadForm.send(endpoint, { name, phone, service, message }) -> Promise<{ ok, id?, error? }>
   LeadForm.visit(endpoint) counts the visit once per session, for the owner's report (functions/visit.mjs).
   It adds the page, the referrer and utm_source / utm_campaign by itself, and never throws.
   LeadForm.status(endpoint) fills every [data-avail] element with the "available now" line (functions/status.mjs).
   A tagged link from the owner's panel (?s=k3p9) becomes the source "t-k3p9" for the whole visit.
   Anything but { ok: true } means: open WhatsApp instead, so the enquiry still arrives.
   On a business's site: endpoint "https://service-pro-web.netlify.app/api/lead/<slug>". */
(function () {
  const params = new URLSearchParams(location.search);
  // Kept for the session, so a visitor who opened another page and came back still counts for the link.
  const tag = (() => {
    const s = (params.get("s") || "").toLowerCase();
    let t = /^[a-z0-9]{4}$/.test(s) ? "t-" + s : "";
    try { if (t) sessionStorage.setItem("lf-tag", t); else t = sessionStorage.getItem("lf-tag") || ""; } catch (e) { /* private mode */ }
    return t;
  })();
  const source = () => params.get("utm_source") || tag;
  window.LeadForm = {
    source,
    async send(endpoint, data, timeoutMs) {
      const body = Object.assign({
        page: location.href.split("#")[0], referrer: document.referrer,
        source: source(), campaign: params.get("utm_campaign") || "",
      }, data);
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
        const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true, signal: ctrl.signal });
        clearTimeout(t);
        const out = await r.json().catch(() => ({}));
        return r.ok && out.ok ? out : { ok: false, error: out.error || String(r.status) };
      } catch (e) { return { ok: false, error: "network" }; }
    },
    // The "available now" line: what the owner wrote in WhatsApp ("עסוק", "פנוי"), or the working hours.
    // Each [data-avail] gets data-state and the text; with no answer it stays hidden. Refreshed every 2 minutes.
    // On a business's site: LeadForm.status("https://service-pro-web.netlify.app/api/status/<slug>").
    status(endpoint) {
      const paint = (s) => document.querySelectorAll("[data-avail]").forEach((el) => {
        el.hidden = !s || !s.state;
        if (el.hidden) return;
        el.dataset.state = s.state;
        const last = [...el.childNodes].reverse().find((n) => n.nodeType === 3 && n.textContent.trim());
        if (last) last.textContent = s.text; else el.append(document.createTextNode(s.text));
      });
      const load = () => fetch(endpoint).then((r) => (r.ok ? r.json() : null)).then(paint).catch(() => {});
      paint(null); load();
      setInterval(() => { if (document.visibilityState === "visible") load(); }, 120000);
    },
    // Counts this visit once per browser session (functions/visit.mjs): a number only, no cookie.
    // On a business's site: LeadForm.visit("https://service-pro-web.netlify.app/api/visit/<slug>").
    visit(endpoint) {
      try {
        const k = "lf-visit:" + endpoint;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
      } catch (e) { /* private mode: count it anyway */ }
      const body = JSON.stringify({ page: location.href.split("#")[0], referrer: document.referrer, source: source(), campaign: params.get("utm_campaign") || "" });
      try {
        const blob = new Blob([body], { type: "text/plain" });
        if (navigator.sendBeacon && navigator.sendBeacon(endpoint, blob)) return;
        fetch(endpoint, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
      } catch (e) { /* never in the visitor's way */ }
    },
  };
})();
