/* LeadForm: sends an enquiry to the lead system (netlify/functions/lead.mjs).
   LeadForm.send(endpoint, { name, phone, service, message }) -> Promise<{ ok, id?, error? }>
   LeadForm.visit(endpoint) counts the visit once per session, for the owner's report (functions/visit.mjs).
   After it, LeadForm.act(name) counts a click that matters, once per visit: "wa", "call", "chat", "save", "build",
   "demo". Links to WhatsApp, tel: and .vcf, and any element with data-act="<name>", are counted by themselves.
   It adds the page, the referrer and utm_source / utm_campaign by itself, and never throws.
   LeadForm.status(endpoint) fills every [data-avail] element with the "available now" line (functions/status.mjs).
   LeadForm.testimonials(endpoint) fills every [data-testimonials] section from functions/testimonials.mjs,
   and shows the section only when there is at least one. LeadForm.testimonialCard(t) makes one card.
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
  let visitAt = "";
  const beacon = (endpoint, body) => {
    try {
      const blob = new Blob([body], { type: "text/plain" });
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, blob)) return;
      fetch(endpoint, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
    } catch (e) { /* never in the visitor's way */ }
  };
  const actOf = (a) => {
    if (a.dataset && a.dataset.act) return a.dataset.act;
    const h = a.getAttribute("href") || "";
    return /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(h) ? "wa" : /^tel:/.test(h) ? "call" : /\.vcf(\?|$)/.test(h) ? "save" : /(^|\/)build\/?([?#].*)?$/.test(h) ? "build" : "";
  };
  window.LeadForm = {
    source,
    // One click that counts, once per visit; nothing about the person, only "someone pressed WhatsApp today".
    act(name) {
      if (!visitAt || !/^[a-z]{2,10}$/.test(name || "")) return;
      try { const k = "lf-act:" + name; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch (e) { /* count it */ }
      beacon(visitAt, JSON.stringify({ act: name }));
    },
    async send(endpoint, data, timeoutMs) {
      const body = Object.assign({
        page: location.href.split("#")[0], referrer: document.referrer,
        source: source(), campaign: params.get("utm_campaign") || "",
      }, data);
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
        // keepalive lets a lead finish if the page closes, but browsers cap its body at 64 KB: a lead with a photo goes without it.
        const json = JSON.stringify(body);
        const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: json, keepalive: json.length < 60000, signal: ctrl.signal });
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
      // Emergency mode ("חירום"): the chat button says so too (leadbot.js listens).
      const tell = (st) => { paint(st); if (st && st.state) document.dispatchEvent(new CustomEvent("lf-status", { detail: st })); };
      const load = () => fetch(endpoint).then((r) => (r.ok ? r.json() : null)).then(tell).catch(() => {});
      paint(null); load();
      setInterval(() => { if (document.visibilityState === "visible") load(); }, 120000);
    },
    // Testimonials customers wrote (0010_testimonials.sql). Text only: every value goes in with textContent.
    testimonialCard(t) {
      const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
      const card = el("figure", "tst-card");
      if (t.stars) { const st = el("span", "tst-stars", "★".repeat(t.stars) + "☆".repeat(5 - t.stars)); st.setAttribute("aria-label", t.stars + " מתוך 5"); card.append(st); }
      card.append(el("blockquote", "tst-text", t.text));
      const cap = el("figcaption", "tst-by"); cap.append(el("b", null, t.name));
      if (t.at) { const d = new Date(t.at); if (!isNaN(d)) cap.append(el("span", null, d.toLocaleDateString("he-IL", { month: "long", year: "numeric" }))); }
      card.append(cap);
      return card;
    },
    // On a business's site: LeadForm.testimonials("https://service-pro-web.netlify.app/api/testimonials/<slug>").
    testimonials(endpoint) {
      const boxes = document.querySelectorAll("[data-testimonials]");
      if (!boxes.length) return;
      fetch(endpoint).then((r) => (r.ok ? r.json() : null)).then((d) => {
        const items = (d && Array.isArray(d.items) ? d.items : []).slice(0, 12);
        boxes.forEach((box) => {
          const list = box.querySelector("[data-tst-list]") || box;
          list.replaceChildren(...items.map((t) => window.LeadForm.testimonialCard(t)));
          box.hidden = !items.length;
        });
      }).catch(() => {});
    },
    // Counts this visit once per browser session (functions/visit.mjs): a number only, no cookie.
    // On a business's site: LeadForm.visit("https://service-pro-web.netlify.app/api/visit/<slug>").
    visit(endpoint) {
      if (!visitAt) {
        visitAt = endpoint;
        document.addEventListener("click", (e) => {
          const a = e.target.closest && e.target.closest("a[href], [data-act]");
          const name = a && actOf(a);
          if (name) window.LeadForm.act(name);
        }, true);
      }
      try {
        const k = "lf-visit:" + endpoint;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
      } catch (e) { /* private mode: count it anyway */ }
      beacon(endpoint, JSON.stringify({ page: location.href.split("#")[0], referrer: document.referrer, source: source(), campaign: params.get("utm_campaign") || "" }));
    },
  };
})();
