/* AiBot: the smart chat on the demo hub.
   Sends the conversation to /api/chat (Netlify Function -> Claude). The reply may end with markers that become buttons:
     [[demo:SLUG]]  [[pricing]]  [[whatsapp:TEXT]]
   If the function is missing, not configured or fails, it answers from a small scripted engine instead, so the page never breaks.
   Usage: AiBot.init({ whatsapp: "9725XXXXXXXX", endpoint: "/api/chat" }) */
(function () {
  const DEMOS = {
    plumber: "אינסטלטור", movers: "הובלות", trainer: "מאמנת כושר", ac: "טכנאי מזגנים", electrician: "חשמלאי",
    cleaning: "ניקיון", renovation: "שיפוצים", locksmith: "מנעולן", pest: "הדברה", appliance: "טכנאי מכשירי חשמל",
    handyman: "הנדימן", garden: "גינון", tutor: "מורה פרטית", psychologist: "פסיכולוגית", "social-worker": "עובדת סוציאלית",
    "leads-demo": "דמו מערכת לידים", "ai-agent": "דמו נציג AI",
  };
  const CSS = `
  .ab-launch{position:fixed;z-index:60;bottom:calc(16px + env(safe-area-inset-bottom,0px));inset-inline-end:16px;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;
    background:var(--ab-accent,#0f6e7a);color:#fff;font:600 15px/1 var(--ab-font,system-ui,sans-serif);padding:12px 18px 12px 12px;border-radius:999px;box-shadow:0 14px 30px -12px rgba(0,0,0,.45)}
  .ab-launch .ab-spark{width:30px;height:30px;border-radius:50%;background:#fff;color:var(--ab-accent,#0f6e7a);display:grid;place-items:center;font-weight:800;font-size:13px}
  .ab-panel{position:fixed;z-index:61;bottom:calc(84px + env(safe-area-inset-bottom,0px));inset-inline-end:16px;width:min(400px,calc(100% - 32px));height:min(600px,calc(100% - 120px));
    display:none;flex-direction:column;padding:0;margin:0;background:#fff;color:#0d1b2a;border:1px solid #dde4ea;border-radius:20px;box-shadow:0 30px 70px -25px rgba(0,0,0,.45);overflow:hidden;font:400 15px/1.55 var(--ab-font,system-ui,sans-serif)}
  .ab-panel.open{display:flex}
  .ab-head{flex:none;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--ab-accent,#0f6e7a);color:#fff}
  .ab-head b{display:block;font-size:16px;line-height:1.2}
  .ab-head small{opacity:.85;font-size:12.5px}
  .ab-head .ab-mode{margin-inline-start:auto;font-size:11px;border:1px solid rgba(255,255,255,.5);border-radius:999px;padding:2px 8px;white-space:nowrap}
  .ab-head .ab-x{width:34px;height:34px;border:0;border-radius:50%;background:transparent;color:inherit;font-size:22px;cursor:pointer}
  .ab-body{flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f5f7f9}
  .ab-msg{max-width:88%;padding:10px 13px;border-radius:14px;white-space:pre-line;align-self:flex-start;background:#fff;border:1px solid #e3e9ee}
  .ab-msg.me{align-self:flex-end;background:var(--ab-accent,#0f6e7a);color:#fff;border-color:transparent}
  .ab-acts{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start}
  .ab-acts a{display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-weight:600;font-size:14px;padding:8px 12px;border-radius:999px;border:1.5px solid var(--ab-accent,#0f6e7a);color:var(--ab-accent,#0f6e7a);background:#fff}
  .ab-acts a.wa{background:#1f9d55;border-color:#1f9d55;color:#fff}
  .ab-typing{align-self:flex-start;display:none;gap:4px;padding:12px 14px;border-radius:14px;background:#fff;border:1px solid #e3e9ee}
  .ab-typing.on{display:flex}.ab-typing i{width:6px;height:6px;border-radius:50%;background:#90a0ad;animation:abBlink 1s infinite}.ab-typing i:nth-child(2){animation-delay:.15s}.ab-typing i:nth-child(3){animation-delay:.3s}
  @keyframes abBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
  .ab-chips{flex:none;display:flex;gap:6px;overflow-x:auto;padding:10px 12px 0;scrollbar-width:none}
  .ab-chips button{flex:none;border:1.5px solid #cfd9e0;background:#fff;color:#0d1b2a;border-radius:999px;padding:6px 12px;font:500 13.5px/1.2 var(--ab-font,system-ui,sans-serif);cursor:pointer;white-space:nowrap}
  .ab-chips button:hover{border-color:var(--ab-accent,#0f6e7a)}
  .ab-form{flex:none;display:flex;gap:8px;padding:10px 12px 12px}
  .ab-form input{flex:1;min-width:0;border:1.5px solid #cfd9e0;border-radius:12px;padding:11px 12px;font:16px var(--ab-font,system-ui,sans-serif)}
  .ab-form button{border:0;border-radius:12px;padding:0 16px;background:var(--ab-accent,#0f6e7a);color:#fff;font:700 15px var(--ab-font,system-ui,sans-serif);cursor:pointer}
  .ab-form button:disabled{opacity:.5;cursor:default}
  .ab-note{flex:none;font-size:11.5px;color:#5b6b78;padding:0 14px 10px}
  .ab-launch:focus-visible,.ab-panel button:focus-visible,.ab-panel input:focus-visible,.ab-panel a:focus-visible{outline:3px solid #f08a5d;outline-offset:2px}
  @media (max-width:520px){.ab-launch .ab-label{display:none}.ab-launch{padding:10px}}
  @media (prefers-reduced-motion:reduce){.ab-typing i{animation:none}}`;

  const el = (t, c, txt) => { const n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; };

  // ---------- scripted fallback: same output format as the model ----------
  const NICHES = [
    [/אינסטל|נזיל|סתימ|ביוב|דוד/, "plumber"], [/הובל|מעבר דירה|משאית/, "movers"], [/מאמ|כושר|אימון|סטודיו/, "trainer"],
    [/מנעול|מנעולן|צילינדר|ננעלתי/, "locksmith"], [/הדבר|ג.?וקים|מזיק|נמלים|מכרסמ/, "pest"],
    [/מכונת כביסה|מקרר|מדיח|תנור|מייבש|מכשירי חשמל/, "appliance"], [/הנדימן|תחזוקה|תליית|הרכבת רהיט/, "handyman"],
    [/גינ|גנן|גיזום|השקיה|דשא/, "garden"], [/מורה|שיעור|בגרות|תלמיד/, "tutor"], [/פסיכולוג|טיפול רגשי|חרדה/, "psychologist"],
    [/עובדת סוציאלית|עו.?ס|הדרכת הורים/, "social-worker"],
    [/מזגן|מיזוג/, "ac"], [/חשמל/, "electrician"], [/ניקיון|מנק/, "cleaning"], [/שיפוצ|קבלן|מטבח חדש/, "renovation"],
  ];
  function scripted(text, history) {
    const t = text.replace(/[״"'׳]/g, "");
    for (const [re, slug] of NICHES) if (re.test(t))
      return `יש לנו דף לדוגמה בדיוק לתחום הזה, עם צ׳אט שמעביר כל פנייה לוואטסאפ ומסגרות לתמונות שלכם. שווה להציץ. [[demo:${slug}]]`;
    if (/כמה זמן|תהליך|איך זה עובד|מתי/.test(t))
      return "שיחה של 5 דקות, ותוך שבוע בערך הדף באוויר ומחובר לוואטסאפ שלכם. אחר כך מעקב קצר כל חודש. לא צריך להבין בטכנולוגיה.";
    if (/מחיר|עולה|עלות|תשלום|כמה/.test(t))
      return "שלוש חבילות: נוכחות ב-1,500 ₪ הקמה ו-150 ₪ לחודש, לידים ב-2,800 ₪ ו-700 ₪ לחודש, ונציג AI ב-4,500 ₪ ו-1,200 ₪ לחודש. לשלושת העסקים הראשונים יש מחיר פיילוט על חבילת לידים. [[pricing]]";
    if (/נציג|בוט|צאט|AI|בינה/i.test(t))
      return "נציג AI עונה על שאלות של לקוחות באתר, מסנן פניות ושולח לכם סיכום של כל שיחה לוואטסאפ. כמו הצ׳אט הזה, רק עם המידע של העסק שלכם. [[demo:ai-agent]]";
    if (/איך|זמן|שבוע/.test(t))
      return "שיחה של 5 דקות, ותוך שבוע בערך הדף באוויר ומחובר לוואטסאפ שלכם. אחר כך מעקב קצר כל חודש. לא צריך להבין בטכנולוגיה.";
    if (/התחייב|לבטל|דומיין|על שם/.test(t))
      return "אין התחייבות. התשלום מתחדש כל חודש ואפשר להפסיק בהודעה של 30 יום. הדומיין והאחסון רשומים על שמכם ונשארים שלכם.";
    if (/דבר|שיחה|כפיר|וואטסאפ|טלפון|רוצה|מעוניין|מעוניינת|להתחיל/.test(t))
      return "בשמחה. לחצו כאן, וההודעה תגיע לכפיר בוואטסאפ עם מה שכבר סיפרתם. [[whatsapp:" + summary(history) + "]]";
    return "אני יכול לספר על החבילות והמחירים, להראות דף לדוגמה לתחום שלכם, או להעביר אתכם לכפיר בוואטסאפ. מה מעניין אתכם?";
  }
  function summary(history) {
    const said = history.filter((m) => m.role === "user").map((m) => m.content).slice(-3).join(" · ");
    return ("היי כפיר, הגעתי מהאתר. " + said).slice(0, 400);
  }

  const AiBot = {
    init(cfg) {
      const endpoint = cfg.endpoint || "/api/chat";
      const style = el("style"); style.textContent = CSS; document.head.appendChild(style);

      const launch = el("button", "ab-launch"); launch.type = "button"; launch.setAttribute("aria-expanded", "false");
      launch.append(el("span", "ab-spark", "AI"), el("span", "ab-label", cfg.launcher || "שאלו את הנציג החכם"));
      const panel = el("section", "ab-panel"); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "נציג חכם");
      const head = el("div", "ab-head");
      const meta = el("div"); meta.append(el("b", null, cfg.name || "הנציג של כפיר"), el("small", null, "עונה בעברית, על כל שאלה"));
      const mode = el("span", "ab-mode", "AI");
      const x = el("button", "ab-x", "×"); x.type = "button"; x.setAttribute("aria-label", "סגירה");
      head.append(meta, mode, x);
      const body = el("div", "ab-body"); body.setAttribute("aria-live", "polite");
      const typing = el("div", "ab-typing"); typing.append(el("i"), el("i"), el("i")); body.appendChild(typing);
      const chips = el("div", "ab-chips");
      const form = el("form", "ab-form");
      const input = el("input"); input.placeholder = "כתבו שאלה, למשל: יש לי עסק להובלות"; input.setAttribute("aria-label", "השאלה שלכם"); input.maxLength = 600; input.autocomplete = "off";
      const send = el("button", null, "שליחה"); send.type = "submit";
      form.append(input, send);
      const note = el("div", "ab-note", "זה נציג AI. הוא יכול לטעות, וכפיר עונה על כל השאר בוואטסאפ.");
      panel.append(head, body, chips, form, note);
      document.body.append(launch, panel);

      const history = []; let busy = false, started = false, offline = false;
      ["כמה זה עולה?", "יש לי עסק לשיפוצים", "מה נציג AI עושה?", "איך זה עובד?", "אני רוצה לדבר עם כפיר"].forEach((q) => {
        const b = el("button", null, q); b.type = "button"; b.addEventListener("click", () => ask(q)); chips.appendChild(b);
      });

      function bubble(text, who) { const m = el("div", "ab-msg" + (who === "me" ? " me" : ""), text); body.insertBefore(m, typing); body.scrollTop = body.scrollHeight; }
      function render(reply) {
        const acts = []; const re = /\[\[(demo|pricing|whatsapp)(?::([^\]]*))?\]\]/g;
        const text = reply.replace(re, (_, kind, arg) => { acts.push([kind, (arg || "").trim()]); return ""; }).trim();
        if (text) bubble(text, "bot");
        const row = el("div", "ab-acts");
        acts.slice(0, 2).forEach(([kind, arg]) => {
          let a;
          if (kind === "demo" && DEMOS[arg]) { a = el("a", null, "לדמו: " + DEMOS[arg]); a.href = arg + "/"; }
          else if (kind === "pricing") { a = el("a", null, "למחירון"); a.href = "#pricing"; a.addEventListener("click", close); }
          else if (kind === "whatsapp") { a = el("a", "wa", "לשלוח לכפיר בוואטסאפ"); a.href = "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(arg || summary(history)); a.target = "_blank"; a.rel = "noopener"; }
          if (a) row.appendChild(a);
        });
        if (row.children.length) { body.insertBefore(row, typing); body.scrollTop = body.scrollHeight; }
      }
      function goOffline() { offline = true; mode.textContent = "מצב הדגמה"; }

      async function ask(text) {
        text = String(text || "").trim().slice(0, 600);
        if (!text || busy) return;
        busy = true; send.disabled = true; input.value = "";
        bubble(text, "me"); history.push({ role: "user", content: text });
        typing.classList.add("on"); body.scrollTop = body.scrollHeight;
        let reply = null;
        if (!offline) {
          try {
            const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 30000);
            const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history.slice(-19) }), signal: ctrl.signal });
            clearTimeout(timer);
            if (r.ok) reply = (await r.json()).reply;
            else if (r.status === 404 || r.status === 503 || r.status === 405) goOffline();
          } catch (e) { goOffline(); }
        }
        if (!reply) { await new Promise((res) => setTimeout(res, 500)); reply = scripted(text, history); }
        typing.classList.remove("on");
        history.push({ role: "assistant", content: reply });
        render(reply);
        busy = false; send.disabled = false; input.focus();
      }

      function open() {
        panel.classList.add("open"); launch.setAttribute("aria-expanded", "true");
        if (!started) { started = true; render(cfg.greet || "היי, אני הנציג החכם של כפיר. אפשר לשאול אותי כל דבר על דפי נחיתה, וואטסאפ אוטומטי ונציג AI לעסק שלכם. ככה בדיוק ייראה נציג באתר שלכם."); }
        input.focus();
      }
      function close() { panel.classList.remove("open"); launch.setAttribute("aria-expanded", "false"); }
      launch.addEventListener("click", () => (panel.classList.contains("open") ? close() : open()));
      x.addEventListener("click", () => { close(); launch.focus(); });
      form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) { close(); launch.focus(); } });
      document.querySelectorAll("[data-open-ai]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); open(); }));
      return { open, close, ask };
    },
  };
  window.AiBot = AiBot;
})();
