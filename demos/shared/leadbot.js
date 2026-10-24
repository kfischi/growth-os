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
    hint?: "נציג AI",                     // a label with an arrow bobbing above the button, until the chat is first opened
    greet: "…",                           // first message
    steps: [
      { key, ask: string | (data) => string,
        chips?: [string | {label, value}],
        input?: "text" | "tel", placeholder?, optional?,
        photo?: true, skip?: "בלי תמונה",    // photo: the visitor may attach one photo (shrunk here), or skip
      estimate?: { endpoint, trade, prices?: { service: range }, slug?, issueKey? }  // a first look at that photo
        show?: (data) => boolean,             // show: ask this step only when it returns true
        tip?: { when: (value) => boolean, text: "…", id: "leak" } }  // tip: after that answer, what to do now,
                                                                     // with a link to the page's guide #g-<id> (shared/guides.js)
    ],
    summary: (data) => "text for WhatsApp",
    closing: (data) => "last bot message before the WhatsApp button",
    note?: "small print under the chat",
    // On a real client site (needs shared/leadform.js): the lead goes to the lead system first.
    capture?: { endpoint: "https://…/api/lead/<slug>", lead: (data) => ({ name, phone, service, message }),
                saved: (data) => "last bot message when the lead was stored" },
  }
  A photo goes with the lead to the lead system (capture). Without capture it shows in the summary card,
  goes to onDone(data, text, photoUrl) for the phone mockup, and the WhatsApp text says it will follow there.
  With capture, a stored lead ends the chat with saved(data) and no WhatsApp button. If the system
  doesn't confirm, the chat falls back to the WhatsApp button, so the enquiry still arrives.
*/
(function () {
  // The same numbers the lead system takes: a mobile, a landline or 07x (a landline gets no WhatsApp reply, only the owner's call).
  const PHONE_RE = /^0(5\d{8}|[234689]\d{7}|7\d{8})$/;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const CSS = `
  .lb-launch{position:fixed;bottom:calc(18px + env(safe-area-inset-bottom,0px));inset-inline-end:16px;z-index:60;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;
    background:var(--bot-accent);color:var(--bot-accent-fg);font:600 15px/1 var(--bot-font);padding:12px 18px 12px 12px;border-radius:var(--bot-radius-pill,999px);box-shadow:0 14px 30px -12px rgba(0,0,0,.45)}
  .lb-launch.lb-urgent{box-shadow:0 0 0 3px #fff,0 0 0 6px #c62f22,0 10px 28px rgba(0,0,0,.25)}
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
  .lb-tip{color:inherit;font-weight:700;text-underline-offset:3px}
  .lb-msg{max-width:86%;padding:10px 13px;border-radius:var(--bot-radius-msg,14px);white-space:pre-line;align-self:flex-start;background:var(--bot-them);color:var(--bot-them-fg,var(--bot-fg));animation:lbIn .2s ease-out}
  .lb-msg.me{align-self:flex-end;background:var(--bot-me);color:var(--bot-me-fg)}
  .lb-card{align-self:stretch;border:1px solid var(--bot-line);border-radius:var(--bot-radius-msg,14px);padding:12px 14px;background:var(--bot-card,var(--bot-bg));font-size:14px}
  .lb-card dl{margin:0;display:grid;gap:4px}.lb-card div{display:flex;justify-content:space-between;gap:12px}.lb-card dt{color:var(--bot-muted)}.lb-card dd{margin:0;font-weight:600;text-align:left}
  .lb-typing{align-self:flex-start;display:none;gap:4px;padding:12px 14px;border-radius:var(--bot-radius-msg,14px);background:var(--bot-them)}
  .lb-typing.on{display:flex}.lb-typing i{width:6px;height:6px;border-radius:50%;background:var(--bot-muted);animation:lbBlink 1s infinite}.lb-typing i:nth-child(2){animation-delay:.15s}.lb-typing i:nth-child(3){animation-delay:.3s}
  @keyframes lbBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
  .lb-foot{flex:none;border-top:1px solid var(--bot-line);padding:10px 12px 12px;display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
  .lb-chips{display:flex;flex-wrap:wrap;gap:6px}
  .lb-chips button{border:1.5px solid var(--bot-accent);background:transparent;color:var(--bot-chip-fg,var(--bot-fg));border-radius:var(--bot-radius-pill,999px);padding:7px 13px;font:600 14px/1.2 var(--bot-font);cursor:pointer}
  .lb-chips button:hover{background:var(--bot-accent);color:var(--bot-accent-fg)}
  .lb-form{display:none;gap:8px}.lb-form.on{display:flex}
  .lb-form input{flex:1;min-width:0;border:1.5px solid var(--bot-line);background:var(--bot-input,var(--bot-bg));color:var(--bot-fg);border-radius:var(--bot-radius-input,10px);padding:10px 12px;font:16px var(--bot-font)}
  .lb-form button{border:0;border-radius:var(--bot-radius-input,10px);padding:0 16px;background:var(--bot-accent);color:var(--bot-accent-fg);font:700 15px var(--bot-font);cursor:pointer}
  .lb-est{display:grid;gap:6px;border-inline-start:3px solid var(--bot-accent)}.lb-est p{margin:0}.lb-est-h{font-size:13px;color:var(--bot-accent)}
  .lb-est small{color:var(--bot-muted,#5d5a72);font-size:12px}.lb-est-urgent{font-weight:700}
  .lb-photo{display:none;position:relative;align-items:center;justify-content:center;gap:8px;border-radius:var(--bot-radius-input,10px);padding:11px;background:var(--bot-accent);color:var(--bot-accent-fg);font:700 15px var(--bot-font);cursor:pointer}
  .lb-photo.on{display:flex}.lb-photo input{position:absolute;inset:0;opacity:0;cursor:pointer}
  .lb-photo:focus-within{outline:3px solid var(--bot-focus,var(--bot-accent));outline-offset:2px}
  .lb-msg.pic{padding:4px}.lb-msg.pic img{display:block;max-width:180px;max-height:180px;border-radius:calc(var(--bot-radius-msg,14px) - 4px)}
  .lb-card img{display:block;max-width:120px;max-height:120px;border-radius:8px;margin-top:8px}
  .lb-wa{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border-radius:var(--bot-radius-input,10px);padding:13px;background:#1f9d55;color:#fff;font:700 16px var(--bot-font)}
  .lb-restart{border:0;background:none;color:var(--bot-muted);font:13px var(--bot-font);text-decoration:underline;cursor:pointer;justify-self:start;padding:0}
  .lb-note{font-size:11.5px;color:var(--bot-muted);padding:0 14px 10px}
  .lb-hint{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;animation:lbBob 1.6s ease-in-out infinite}
  .lb-hint b{white-space:nowrap;background:var(--bot-accent);color:var(--bot-accent-fg);font:700 13px/1 var(--bot-font);padding:6px 11px;border:2px solid var(--bot-accent-fg);border-radius:var(--bot-radius-pill,999px);box-shadow:0 0 0 1.5px var(--bot-accent),0 8px 18px -8px rgba(0,0,0,.45)}
  .lb-hint svg{width:22px;height:22px;overflow:visible}.lb-hint svg .h{stroke:var(--bot-accent-fg);stroke-width:6}.lb-hint svg .a{stroke:var(--bot-accent);stroke-width:3}
  @keyframes lbBob{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-7px)}}
  @media (prefers-reduced-motion:reduce){.lb-panel.open,.lb-msg{animation:none}.lb-typing i{animation:none}.lb-hint{animation:none;transform:translateX(-50%)}}
  @media (max-width:520px){.lb-launch .lb-label{display:none}.lb-launch{padding:10px}}
  `;

  const LeadBot = {
    init(cfg) {
      const style = el("style"); style.textContent = CSS; document.head.appendChild(style);

      const launch = el("button", "lb-launch"); launch.type = "button";
      launch.setAttribute("aria-expanded", "false");
      const dot = el("span", "lb-dot", cfg.initial || "?");
      const label = el("span", "lb-label", cfg.launcher || "צ׳אט");
      launch.append(dot, label);
      // Emergency mode on the site (lf-status from leadform.js or status.js): the button asks for an urgent call.
      document.addEventListener("lf-status", (e) => {
        const on = !!(e.detail && e.detail.state === "urgent");
        launch.classList.toggle("lb-urgent", on);
        label.textContent = on ? "קריאה דחופה" : cfg.launcher || "צ׳אט";
      });
      let hint = null;
      if (cfg.hint) {
        hint = el("span", "lb-hint"); hint.setAttribute("aria-hidden", "true");
        hint.append(el("b", null, cfg.hint));
        hint.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="h" d="M12 4v15M5 12l7 7 7-7"/><path class="a" d="M12 4v15M5 12l7 7 7-7"/></svg>');
        launch.append(hint);
      }

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
      const photoBtn = el("label", "lb-photo", "📷 לצרף תמונה");
      const file = el("input"); file.type = "file"; file.accept = "image/*"; file.setAttribute("aria-label", "לצרף תמונה");
      photoBtn.append(file);
      foot.append(photoBtn, chips, form);
      panel.append(head, body, foot);
      if (cfg.note) panel.appendChild(el("div", "lb-note", cfg.note));
      document.body.append(launch, panel);

      let step = 0, data = {}, pre = {}, busy = false, started = false, finished = false, timers = [], photo = null, estimateNote = "";
      const later = (ms, fn) => timers.push(setTimeout(fn, ms));

      function say(text, who) {
        const m = el("div", "lb-msg" + (who === "me" ? " me" : ""), text);
        body.insertBefore(m, typing); body.scrollTop = body.scrollHeight;
      }
      function botSay(text, then) {
        busy = true; typing.classList.add("on"); body.scrollTop = body.scrollHeight;
        later(Math.min(1300, 380 + text.length * 7), () => { typing.classList.remove("on"); say(text, "bot"); busy = false; if (then) then(); });
      }
      function clearFoot() { chips.innerHTML = ""; form.classList.remove("on"); photoBtn.classList.remove("on"); }

      function ask() {
        const s = cfg.steps[step];
        if (!s) return finish();
        if (s.show && !s.show(data)) { step++; return ask(); }
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
          if (s.photo) {
            photoBtn.classList.add("on");
            const skip = el("button", null, s.skip || "בלי תמונה"); skip.type = "button";
            skip.addEventListener("click", () => answer(null, s.skip || "בלי תמונה"));
            chips.appendChild(skip);
          }
          if (s.input) {
            form.classList.add("on");
            input.type = s.input === "tel" ? "tel" : "text";
            input.inputMode = s.input === "tel" ? "tel" : "text";
            input.dir = s.input === "tel" ? "ltr" : "rtl";
            input.placeholder = s.placeholder || "";
            input.value = "";
            input.focus();
          } else if (chips.firstChild && (document.activeElement === document.body || panel.contains(document.activeElement))) {
            // The chip that had focus is gone: keep the keyboard in the chat, on the first new answer.
            chips.firstChild.focus({ preventScroll: true });
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
        if (s.tip && s.tip.when(value)) return botSay(s.tip.text, () => { tipLink(s.tip); ask(); });
        ask();
      }
      // A link to the full guide on the page; the chat closes so the guide is in view, and keeps its place.
      function tipLink(t) {
        if (!t.id || !document.getElementById("g-" + t.id)) return;
        const m = el("div", "lb-msg"); const a = el("a", "lb-tip", t.link || "המדריך המלא, צעד אחרי צעד");
        a.href = "#g-" + t.id; a.addEventListener("click", () => close());
        m.append(a); body.insertBefore(m, typing); body.scrollTop = body.scrollHeight;
      }

      // The photo: shrunk here to 1280px, JPEG, under 900KB, which also drops the location data.
      async function shrink(f) {
        let src;
        try { src = await createImageBitmap(f, { imageOrientation: "from-image" }); }
        catch (e) { // some phone photos (HEIC) open only as an <img>
          const u = URL.createObjectURL(f); src = new Image(); src.src = u;
          try { await src.decode(); } finally { setTimeout(() => URL.revokeObjectURL(u), 2000); }
        }
        const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, k = Math.min(1, 1280 / Math.max(w, h));
        const c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
        let blob = null;
        for (let qy = 0.8; qy > 0.35 && (!blob || blob.size > 900000); qy -= 0.15) blob = await new Promise((r) => c.toBlob(r, "image/jpeg", qy));
        if (!blob) throw new Error("encode");
        return blob;
      }
      file.addEventListener("change", async () => {
        const f = file.files[0]; file.value = "";
        const s = cfg.steps[step];
        if (!f || busy || !s || !s.photo) return;
        busy = true;
        try { const blob = await shrink(f); photo = { blob, url: URL.createObjectURL(blob) }; }
        catch (e) { busy = false; botSay("לא הצלחנו לפתוח את התמונה. נסו תמונה אחרת, או המשיכו בלי."); return; }
        busy = false;
        const m = el("div", "lb-msg me pic"); const img = el("img"); img.src = photo.url; img.alt = "התמונה שצירפתם"; m.append(img);
        body.insertBefore(m, typing); body.scrollTop = body.scrollHeight;
        data[s.key] = "צורפה תמונה"; clearFoot(); step++;
        if (!cfg.estimate) return ask();
        // A first look at the photo (/api/estimate): what it shows, the matching service and its range from the
        // business's own list. Never a promised price; on any failure the chat simply goes on.
        busy = true; typing.classList.add("on"); body.scrollTop = body.scrollHeight;
        const est = await look(photo.blob);
        typing.classList.remove("on"); busy = false;
        if (est) {
          estimateCard(est);
          // For the owner: what the photo shows and the matching service, so they come prepared (added to the lead below).
          const rng = est.range ? " (" + est.range + (/₪/.test(est.range) ? "" : " ₪") + ")" : "";
          estimateNote = [est.urgent ? "⚠️ נראה דחוף." : "", est.seen, est.service ? "נראה כמו: " + est.service + rng + "." : ""].filter(Boolean).join(" ");
          data.estimate = est.service ? est.service + rng : "";
        }
        ask();
      });
      async function look(blob) {
        const e = cfg.estimate;
        try {
          const image = await toDataUrl(blob);
          const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
          const r = await fetch(e.endpoint, { method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
            body: JSON.stringify({ slug: e.slug, trade: e.trade, prices: e.prices, issue: data[e.issueKey || cfg.steps[0].key] || "", image }) });
          clearTimeout(t);
          const d = await r.json();
          return r.ok && d.seen ? d : null;
        } catch (x) { return null; }
      }
      function estimateCard(d) {
        const m = el("div", "lb-msg lb-est");
        m.append(el("b", "lb-est-h", "בדיקה ראשונה מהתמונה"), el("p", null, d.seen));
        if (d.service) m.append(el("p", null, "נראה כמו: " + d.service + (d.range ? ". בדרך כלל " + d.range + (/₪/.test(d.range) ? "" : " ₪") + "." : ".")));
        if (d.advice) m.append(el("p", d.urgent ? "lb-est-urgent" : null, d.advice));
        m.append(el("small", null, "הערכה ראשונית בלבד. המחיר הסופי אחרי בדיקה במקום."));
        body.insertBefore(m, typing); body.scrollTop = body.scrollHeight;
      }
      const toDataUrl = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(blob); });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (busy) return;
        const s = cfg.steps[step]; if (!s) return;
        let v = input.value.trim();
        if (!v) return;
        if (s.input === "tel") {
          const d = v.replace(/\D/g, "").replace(/^00972/, "972").replace(/^972/, "0");
          if (!PHONE_RE.test(d)) { say(v, "me"); botSay("המספר לא נראה שלם. אפשר לכתוב אותו שוב, למשל 050-1234567?"); input.value = ""; return; }
          v = d.slice(0, 3) + "-" + d.slice(3);
        } else if (v.length < 2) return;
        answer(v, v);
      });

      async function finish() {
        finished = true;
        clearFoot();
        if (cfg.capture && window.LeadForm) {
          typing.classList.add("on"); body.scrollTop = body.scrollHeight;
          const lead = cfg.capture.lead(data);
          if (estimateNote) lead.message = [lead.message, "מהתמונה: " + estimateNote].filter(Boolean).join("\n");
          if (photo) lead.photo = await toDataUrl(photo.blob);
          const r = await LeadForm.send(cfg.capture.endpoint, lead, photo ? 20000 : 8000);
          typing.classList.remove("on");
          if (r.ok) {
            botSay(cfg.capture.saved(data), () => {
              const again = el("button", "lb-restart", "פנייה נוספת"); again.type = "button";
              again.addEventListener("click", restart);
              foot.append(again);
              if (cfg.onDone) cfg.onDone(data, cfg.summary(data), photo && photo.url);
            });
            return;
          }
        }
        const closing = cfg.closing ? cfg.closing(data) : "תודה! הנה סיכום הפנייה.";
        botSay(closing, () => {
          const card = el("div", "lb-card"); const dl = el("dl");
          // One row per key, from a step that was actually asked.
          const shown = new Set();
          cfg.steps.forEach((s) => {
            if (!s.label || data[s.key] == null || shown.has(s.key)) return;
            if (s.show && !s.show(data)) return;
            shown.add(s.key);
            const row = el("div"); row.append(el("dt", null, s.label), el("dd", null, data[s.key])); dl.appendChild(row);
          });
          card.appendChild(dl);
          if (photo) { const img = el("img"); img.src = photo.url; img.alt = "התמונה שצירפתם"; card.appendChild(img); }
          body.insertBefore(card, typing); body.scrollTop = body.scrollHeight;
          // A WhatsApp link can't carry a photo: the text says it follows in the same chat.
          const text = cfg.summary(data) + (estimateNote ? "\nמהתמונה: " + estimateNote : "") + (photo ? "\nיש לי תמונה של זה, אשלח אותה כאן." : "");
          const wa = el("a", "lb-wa", "לשלוח את הפנייה בוואטסאפ");
          wa.href = "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(text);
          wa.target = "_blank"; wa.rel = "noopener";
          const again = el("button", "lb-restart", "להתחיל מחדש"); again.type = "button";
          again.addEventListener("click", restart);
          foot.append(wa, again);
          if (cfg.onDone) cfg.onDone(data, text, photo && photo.url);
        });
      }

      function restart() {
        timers.forEach(clearTimeout); timers = [];
        body.querySelectorAll(".lb-msg,.lb-card").forEach((n) => n.remove());
        if (photo) { URL.revokeObjectURL(photo.url); photo = null; }
        foot.querySelectorAll(".lb-wa,.lb-restart").forEach((n) => n.remove());
        typing.classList.remove("on"); busy = false; finished = false; step = 0; data = {}; pre = {}; estimateNote = "";
        clearFoot(); start();
      }
      function start() { started = true; botSay(cfg.greet, ask); }

      // prefill: answers keyed by step key (the calculator's). A chat that has started over again with them, unless it already sent its enquiry.
      function open(prefill) {
        panel.classList.add("open"); launch.setAttribute("aria-expanded", "true");
        if (hint) { hint.remove(); hint = null; }
        if (!started) { pre = Object.assign({}, prefill); start(); }
        else if (prefill && !finished) { restart(); pre = Object.assign({}, prefill); }
        if (window.LeadForm && window.LeadForm.act) window.LeadForm.act("chat"); // counted once per visit, for the owner's statistics
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
  return function (data, text, photoUrl) {
    const msg = document.querySelector(selector); if (!msg) return;
    const old = msg.parentNode.querySelector(".ph-pic"); if (old) old.remove();
    if (photoUrl) { // the visitor's own photo, as it would arrive in WhatsApp
      const pic = document.createElement("div"); pic.className = msg.className.replace(/\bnew\b/g, "").trim() + " ph-pic";
      pic.style.padding = "4px"; const img = document.createElement("img"); img.src = photoUrl; img.alt = "";
      img.style.cssText = "display:block;max-width:100%;max-height:150px;border-radius:8px"; pic.appendChild(img);
      msg.parentNode.insertBefore(pic, msg);
    }
    const top = msg.closest(".ph-screen").querySelector(".ph-top b");
    if (top && data.name) top.textContent = data.name;
    const av = msg.closest(".ph-screen").querySelector(".ph-av");
    if (av && data.name) av.textContent = data.name.trim().charAt(0);
    const t = new Date(); const hh = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
    msg.textContent = text; const time = document.createElement("time"); time.textContent = hh; msg.appendChild(time);
    msg.classList.remove("new"); void msg.offsetWidth; msg.classList.add("new");
  };
};
