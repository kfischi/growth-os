/*
  LeadBot: a scripted qualifying chat that ends in a WhatsApp handoff.

  Each page calls LeadBot.init(config) and styles the widget with CSS
  variables (--bot-*). The chat asks the page's questions one at a time
  (quick-reply chips or a text field), shows a summary, and opens
  wa.me with that summary prefilled.

  config = {
    whatsapp: "9725XXXXXXXX",            // number that receives the lead
    name: "…", subtitle: "…", initial: "…",
    launcher: "…",                        // floating button label
    greet: "…",                           // first message
    steps: [
      { key, ask: string | (data) => string,
        chips?: [string | {label, value}],
        input?: "text" | "tel", placeholder?, optional? }
    ],
    summary: (data) => "text for WhatsApp",
    closing: (data) => "last bot message before the WhatsApp button",
    note?: "small print under the chat",
  }
*/
(function () {
  const PHONE_RE = /^05\d{8}$/;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const CSS = `
  .lb-launch{position:fixed;bottom:calc(18px + env(safe-area-inset-bottom,0px));inset-inline-end:16px;z-index:60;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;
    background:var(--bot-accent);color:var(--bot-accent-fg);font:600 15px/1 var(--bot-font);padding:12px 18px 12px 12px;border-radius:var(--bot-radius-pill,999px);box-shadow:0 14px 30px -12px rgba(0,0,0,.45)}
  .lb-launch .lb-dot{width:30px;height:30px;border-radius:var(--bot-radius-pill,999px);background:var(--bot-accent-fg);color:var(--bot-accent);display:grid;place-items:center;font-weight:800}
  .lb-launch:focus-visible,.lb-panel button:focus-visible,.lb-panel input:focus-visible{outline:3px solid var(--bot-focus,var(--bot-accent));outline-offset:2px}
  .lb-panel{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom,0px));inset-inline-end:16px;z-index:61;width:min(380px,calc(100% - 32px));height:min(560px,calc(100% - 120px));display:none;flex-direction:column;padding:0;margin:0;
    background:var(--bot-bg);color:var(--bot-fg);border:1px solid var(--bot-line);border-radius:var(--bot-radius,16px);box-shadow:0 30px 70px -25px rgba(0,0,0,.5);overflow:hidden;font:400 15px/1.5 var(--bot-font)}
  .lb-panel.open{display:flex;animation:lbIn .22s ease-out}
  @keyframes lbIn{from{transform:translateY(10px);opacity:.4}to{transform:none;opacity:1}}
  .lb-head{flex:none;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bot-head-bg,var(--bot-accent));color:var(--bot-head-fg,var(--bot-accent-fg))}
  .lb-head .lb-av{width:38px;height:38px;border-radius:var(--bot-radius-pill,999px);display:grid;place-items:center;font-weight:800;background:var(--bot-head-fg,var(--bot-accent-fg));color:var(--bot-head-bg,var(--bot-accent))}
  .lb-head b{display:block;font-size:16px;line-height:1.2}
  .lb-head small{opacity:.8;font-size:12.5px}
  .lb-head .lb-x{margin-inline-start:auto;width:34px;height:34px;border:0;border-radius:var(--bot-radius-pill,999px);background:transparent;color:inherit;font-size:22px;cursor:pointer}
  .lb-body{flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
  .lb-msg{max-width:86%;padding:10px 13px;border-radius:var(--bot-radius-msg,14px);white-space:pre-line;align-self:flex-start;background:var(--bot-them);color:var(--bot-them-fg,var(--bot-fg));animation:lbIn .2s ease-out}
  .lb-msg.me{align-self:flex-end;background:var(--bot-me);color:var(--bot-me-fg)}
  .lb-card{align-self:stretch;border:1px solid var(--bot-line);border-radius:var(--bot-radius-msg,14px);padding:12px 14px;background:var(--bot-card,var(--bot-bg));font-size:14px}
  .lb-card dl{margin:0;display:grid;gap:4px}.lb-card div{display:flex;justify-content:space-between;gap:12px}.lb-card dt{color:var(--bot-muted)}.lb-card dd{margin:0;font-weight:600;text-align:left}
  .lb-typing{align-self:flex-start;display:none;gap:4px;padding:12px 14px;border-radius:var(--bot-radius-msg,14px);background:var(--bot-them)}
  .lb-typing.on{display:flex}.lb-typing i{width:6px;height:6px;border-radius:50%;background:var(--bot-muted);animation:lbBlink 1s infinite}.lb-typing i:nth-child(2){animation-delay:.15s}.lb-typing i:nth-child(3){animation-delay:.3s}
  @keyframes lbBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
  .lb-foot{flex:none;border-top:1px solid var(--bot-line);padding:10px 12px 12px;display:grid;gap:8px}
  .lb-chips{display:flex;flex-wrap:wrap;gap:6px}
  .lb-chips button{border:1.5px solid var(--bot-accent);background:transparent;color:var(--bot-chip-fg,var(--bot-fg));border-radius:var(--bot-radius-pill,999px);padding:7px 13px;font:600 14px/1.2 var(--bot-font);cursor:pointer}
  .lb-chips button:hover{background:var(--bot-accent);color:var(--bot-accent-fg)}
  .lb-form{display:none;gap:8px}.lb-form.on{display:flex}
  .lb-form input{flex:1;min-width:0;border:1.5px solid var(--bot-line);background:var(--bot-input,var(--bot-bg));color:var(--bot-fg);border-radius:var(--bot-radius-input,10px);padding:10px 12px;font:16px var(--bot-font)}
  .lb-form button{border:0;border-radius:var(--bot-radius-input,10px);padding:0 16px;background:var(--bot-accent);color:var(--bot-accent-fg);font:700 15px var(--bot-font);cursor:pointer}
  .lb-wa{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border-radius:var(--bot-radius-input,10px);padding:13px;background:#1f9d55;color:#fff;font:700 16px var(--bot-font)}
  .lb-restart{border:0;background:none;color:var(--bot-muted);font:13px var(--bot-font);text-decoration:underline;cursor:pointer;justify-self:start;padding:0}
  .lb-note{font-size:11.5px;color:var(--bot-muted);padding:0 14px 10px}
  @media (prefers-reduced-motion:reduce){.lb-panel.open,.lb-msg{animation:none}.lb-typing i{animation:none}}
  @media (max-width:520px){.lb-launch .lb-label{display:none}.lb-launch{padding:10px}}
  `;

  const LeadBot = {
    init(cfg) {
      const style = el("style"); style.textContent = CSS; document.head.appendChild(style);

      const launch = el("button", "lb-launch"); launch.type = "button";
      launch.setAttribute("aria-expanded", "false");
      const dot = el("span", "lb-dot", cfg.initial || "?");
      launch.append(dot, el("span", "lb-label", cfg.launcher || "צ׳אט"));

      const panel = el("section", "lb-panel"); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", cfg.name);
      panel.id = "lb-panel"; launch.setAttribute("aria-controls", panel.id);
      const head = el("div", "lb-head");
      const meta = el("div"); meta.append(el("b", null, cfg.name), el("small", null, cfg.subtitle || ""));
      const x = el("button", "lb-x", "×"); x.type = "button"; x.setAttribute("aria-label", "סגירה");
      head.append(el("span", "lb-av", cfg.initial || "?"), meta, x);
      const body = el("div", "lb-body"); body.setAttribute("aria-live", "polite");
      const typing = el("div", "lb-typing"); typing.append(el("i"), el("i"), el("i")); body.appendChild(typing);
      const foot = el("div", "lb-foot");
      const chips = el("div", "lb-chips");
      const form = el("form", "lb-form");
      const input = el("input"); input.id = "lb-input"; input.setAttribute("aria-label", "תשובה"); input.autocomplete = "off";
      const send = el("button", null, "שליחה"); send.type = "submit";
      form.append(input, send);
      foot.append(chips, form);
      panel.append(head, body, foot);
      if (cfg.note) panel.appendChild(el("div", "lb-note", cfg.note));
      document.body.append(launch, panel);

      let step = 0, data = {}, pre = {}, busy = false, started = false, timers = [];
      const later = (ms, fn) => timers.push(setTimeout(fn, ms));

      function say(text, who) {
        const m = el("div", "lb-msg" + (who === "me" ? " me" : ""), text);
        body.insertBefore(m, typing); body.scrollTop = body.scrollHeight;
      }
      function botSay(text, then) {
        busy = true; typing.classList.add("on"); body.scrollTop = body.scrollHeight;
        later(Math.min(1300, 380 + text.length * 7), () => { typing.classList.remove("on"); say(text, "bot"); busy = false; if (then) then(); });
      }
      function clearFoot() { chips.innerHTML = ""; form.classList.remove("on"); }

      function ask() {
        const s = cfg.steps[step];
        if (!s) return finish();
        const q = typeof s.ask === "function" ? s.ask(data) : s.ask;
        if (pre[s.key] != null) { const v = pre[s.key]; delete pre[s.key]; return botSay(q, () => answer(v, v)); }
        botSay(q, () => {
          clearFoot();
          (s.chips || []).forEach((c) => {
            const label = typeof c === "string" ? c : c.label;
            const value = typeof c === "string" ? c : c.value;
            const b = el("button", null, label); b.type = "button";
            b.addEventListener("click", () => answer(value, label));
            chips.appendChild(b);
          });
          if (s.input) {
            form.classList.add("on");
            input.type = s.input === "tel" ? "tel" : "text";
            input.inputMode = s.input === "tel" ? "tel" : "text";
            input.dir = s.input === "tel" ? "ltr" : "rtl";
            input.placeholder = s.placeholder || "";
            input.value = "";
            input.focus();
          }
        });
      }

      function answer(value, label) {
        if (busy) return;
        const s = cfg.steps[step];
        say(label, "me");
        data[s.key] = value;
        clearFoot();
        step++;
        ask();
      }

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (busy) return;
        const s = cfg.steps[step]; if (!s) return;
        let v = input.value.trim();
        if (!v) return;
        if (s.input === "tel") {
          const d = v.replace(/\D/g, "").replace(/^972/, "0");
          if (!PHONE_RE.test(d)) { say(v, "me"); botSay("נראה שחסרה ספרה. אפשר מספר נייד מלא, למשל 050-1234567?"); input.value = ""; return; }
          v = d.slice(0, 3) + "-" + d.slice(3);
        } else if (v.length < 2) return;
        answer(v, v);
      });

      function finish() {
        clearFoot();
        const closing = cfg.closing ? cfg.closing(data) : "תודה! הנה סיכום הפנייה.";
        botSay(closing, () => {
          const card = el("div", "lb-card"); const dl = el("dl");
          cfg.steps.forEach((s) => {
            if (!s.label || data[s.key] == null) return;
            const row = el("div"); row.append(el("dt", null, s.label), el("dd", null, data[s.key])); dl.appendChild(row);
          });
          card.appendChild(dl); body.insertBefore(card, typing); body.scrollTop = body.scrollHeight;
          const wa = el("a", "lb-wa", "לשלוח את הפנייה בוואטסאפ");
          wa.href = "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(cfg.summary(data));
          wa.target = "_blank"; wa.rel = "noopener";
          const again = el("button", "lb-restart", "להתחיל מחדש"); again.type = "button";
          again.addEventListener("click", restart);
          foot.append(wa, again);
          if (cfg.onDone) cfg.onDone(data, cfg.summary(data));
        });
      }

      function restart() {
        timers.forEach(clearTimeout); timers = [];
        body.querySelectorAll(".lb-msg,.lb-card").forEach((n) => n.remove());
        foot.querySelectorAll(".lb-wa,.lb-restart").forEach((n) => n.remove());
        typing.classList.remove("on"); busy = false; step = 0; data = {}; pre = {};
        clearFoot(); start();
      }
      function start() { started = true; botSay(cfg.greet, ask); }

      // prefill: answers keyed by step key, used only when the chat has not started yet
      function open(prefill) {
        panel.classList.add("open"); launch.setAttribute("aria-expanded", "true");
        if (!started) { pre = Object.assign({}, prefill); start(); }
        x.focus();
      }
      function close() { panel.classList.remove("open"); launch.setAttribute("aria-expanded", "false"); launch.focus(); }

      launch.addEventListener("click", () => (panel.classList.contains("open") ? close() : open()));
      x.addEventListener("click", close);
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
      document.querySelectorAll("[data-open-bot]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); open(); }));
      document.querySelectorAll("[data-wa]").forEach((a) => {
        a.href = "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(a.dataset.wa || "");
        a.target = "_blank"; a.rel = "noopener";
      });
      return { open, close };
    },
  };

  window.LeadBot = LeadBot;
})();

// Phone mockup helper: show the lead text in a .ph-msg after the chat ends.
window.LeadPhone = function (selector) {
  return function (data, text) {
    const msg = document.querySelector(selector); if (!msg) return;
    const top = msg.closest(".ph-screen").querySelector(".ph-top b");
    if (top && data.name) top.textContent = data.name;
    const av = msg.closest(".ph-screen").querySelector(".ph-av");
    if (av && data.name) av.textContent = data.name.trim().charAt(0);
    const t = new Date(); const hh = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
    msg.textContent = text; const time = document.createElement("time"); time.textContent = hh; msg.appendChild(time);
    msg.classList.remove("new"); void msg.offsetWidth; msg.classList.add("new");
  };
};
