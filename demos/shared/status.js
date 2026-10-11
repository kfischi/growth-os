/*
  LeadStatus: the "available now" line. The owner writes "עסוק" or "פנוי" to the business's WhatsApp
  number (or taps it in the panel), and every [data-avail] element on the site says so within a minute.
  Otherwise the working hours decide. Server side: functions/status.mjs, lib/leads.mjs availability().

  This file is for the demos, with no server. A real site uses LeadForm.status(endpoint) from leadform.js.
  LeadStatus.init({ hours: { days: [0,1,2,3,4], start: 8, end: 18 }, demo: true }):
      the line follows the hours, and [data-avail-try] gets two buttons that show what "עסוק" and "פנוי" do.
  Each [data-avail] gets data-state ("free" | "busy" | "open" | "closed") for the page's own colours,
  and its last text node is replaced. With no answer it is hidden, so nothing wrong is ever shown.
*/
(function () {
  const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const pad = (n) => String(n).padStart(2, "0");
  const clock = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());

  // The same wording as availability() in lib/leads.mjs. Demos only: the visitor's clock stands in for Israel time.
  function fromHours(h, now) {
    if (h.start <= 0 && h.end >= 24 && h.days.length === 7) return { state: "open", text: "זמינים 24/7." };
    const day = now.getDay(), hour = now.getHours();
    if (h.days.includes(day) && hour >= h.start && hour < h.end) return { state: "open", text: `זמינים היום עד ${h.end}:00.` };
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      if (!h.days.includes(d) || (i === 0 && hour >= h.start)) continue;
      return { state: "closed", text: `השאירו פרטים, ונחזור אליכם ${i === 0 ? "היום" : i === 1 ? "מחר" : "ביום " + DAYS[d]} מ-${h.start}:00.` };
    }
    return { state: "closed", text: "השאירו פרטים, ונחזור אליכם." };
  }
  const busy = (until) => ({ state: "busy", text: `באמצע עבודה. חוזרים אליכם עד ${clock(until)}.` });
  const free = () => ({ state: "free", text: "פנויים עכשיו. אפשר לכתוב או להתקשר." });

  function paint(s) {
    document.querySelectorAll("[data-avail]").forEach((el) => {
      el.hidden = !s || !s.state;
      if (!s || !s.state) return;
      el.dataset.state = s.state;
      const last = [...el.childNodes].reverse().find((n) => n.nodeType === 3 && n.textContent.trim());
      if (last) last.textContent = s.text; else el.append(document.createTextNode(s.text));
    });
  }

  window.LeadStatus = {
    init(cfg) {
      const auto = () => paint(fromHours(cfg.hours, new Date()));
      auto();
      if (!cfg.demo) return;
      document.querySelectorAll("[data-avail-try]").forEach((box) => {
        const mk = (label, fn) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.addEventListener("click", () => { fn(); box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }); return b; };
        box.append(
          mk("עסוק", () => paint(busy(new Date(Date.now() + 3 * 3600000)))),
          mk("פנוי", () => paint(free())),
          mk("לפי השעות", auto),
        );
      });
    },
  };
})();
