/* LeadForm: sends an enquiry to the lead system (netlify/functions/lead.mjs).
   LeadForm.send(endpoint, { name, phone, service, message }) -> Promise<{ ok, id?, error? }>
   LeadForm.visit(endpoint) counts the visit once per session, for the owner's report (functions/visit.mjs).
   It adds the page, the referrer and utm_source / utm_campaign by itself, and never throws.
   Anything but { ok: true } means: open WhatsApp instead, so the enquiry still arrives.
   On a business's site: endpoint "https://service-pro-web.netlify.app/api/lead/<slug>". */
(function () {
  const params = new URLSearchParams(location.search);
  window.LeadForm = {
    async send(endpoint, data, timeoutMs) {
      const body = Object.assign({
        page: location.href.split("#")[0], referrer: document.referrer,
        source: params.get("utm_source") || "", campaign: params.get("utm_campaign") || "",
      }, data);
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
        const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true, signal: ctrl.signal });
        clearTimeout(t);
        const out = await r.json().catch(() => ({}));
        return r.ok && out.ok ? out : { ok: false, error: out.error || String(r.status) };
      } catch (e) { return { ok: false, error: "network" }; }
    },
    // Counts this visit once per browser session (functions/visit.mjs): a number only, no cookie.
    // On a business's site: LeadForm.visit("https://service-pro-web.netlify.app/api/visit/<slug>").
    visit(endpoint) {
      try {
        const k = "lf-visit:" + endpoint;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
      } catch (e) { /* private mode: count it anyway */ }
      const body = JSON.stringify({ page: location.href.split("#")[0], referrer: document.referrer, source: params.get("utm_source") || "", campaign: params.get("utm_campaign") || "" });
      try {
        const blob = new Blob([body], { type: "text/plain" });
        if (navigator.sendBeacon && navigator.sendBeacon(endpoint, blob)) return;
        fetch(endpoint, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
      } catch (e) { /* never in the visitor's way */ }
    },
  };
})();
