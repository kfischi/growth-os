/* AiBot: the smart chat on the demo hub.
   Sends the conversation to /api/chat (Netlify Function -> Claude). The reply may end with markers that become buttons:
     [[demo:SLUG]]  [[pricing]]  [[whatsapp:TEXT]]  [[build]] (start the site builder)  [[go:SECTION]] (how, demos, plans, faq)
   If the function is missing, not configured or fails, it answers from a small scripted engine instead, so the page never breaks.
   Usage: AiBot.init({ whatsapp: "9725XXXXXXXX", endpoint: "/api/chat", pricingHref: "#plans", base: "" })
   pricingHref: where [[pricing]] links. base: prefix for demo links, "../" on a page one folder down.
   On a paying business's site (netlify/functions/client-chat.mjs) also pass:
     endpoint: "https://service-pro-web.netlify.app/api/chat/<slug>", name, subtitle, greet, note, chips: [...],
     placeholder, waLabel ("לשלוח לנו בוואטסאפ"), offline ("text when the chat is down"), offlineWa (false: no WhatsApp button then).
   A demo's live chat (netlify/functions/demo-chat.mjs) uses endpoint "/api/demo-chat/<demo>".
   maxLength: the longest question the visitor can type (default 600; the demo chat takes 300).
   hint: true puts an arrow bobbing above the button and a soft pulse around it, until the chat is first opened
   (none with reduced motion or html.a11y-still). */
(function () {
  const DEMOS = {
    plumber: "אינסטלטור", movers: "הובלות", trainer: "מאמנת כושר", ac: "טכנאי מזגנים", electrician: "חשמלאי",
    cleaning: "ניקיון", renovation: "שיפוצים וגבס", locksmith: "מנעולן", pest: "הדברה", appliance: "טכנאי מכשירי חשמל",
    handyman: "הנדימן", garden: "גינון", tutor: "מורה פרטית", psychologist: "פסיכולוגית", "social-worker": "עובדת סוציאלית", music: "מורה לנגינה",
    towing: "גרר ושירותי דרך", cosmetics: "קוסמטיקה ויופי", photographer: "צלם אירועים", barber: "ספרות", massage: "עיסוי ומסאז׳", nails: "בניית ציפורניים", driving: "מורה לנהיגה", upholstery: "ניקוי ספות ושטיחים", shutters: "תריסים",
    security: "מערכות אבטחה ותקשורת", yoga: "יוגה ופילאטיס", "dog-trainer": "אילוף כלבים", pergolas: "פרגולות וסוככים", roofing: "איטום וגגות",
    "leads-demo": "דמו מערכת לידים", "ai-agent": "דמו נציג AI",
  };
  const GO = { how: "איך זה עובד", what: "מה יש באתר", demos: "לדוגמאות", plans: "למחירון", faq: "לשאלות" };
  const CSS = `
  .ab-launch{position:fixed;z-index:60;bottom:calc(16px + env(safe-area-inset-bottom,0px));inset-inline-end:16px;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;
    background:var(--ab-accent,#0f6e7a);color:#fff;font:600 15px/1 var(--ab-font,system-ui,sans-serif);padding:12px 18px 12px 12px;border-radius:999px;box-shadow:0 14px 30px -12px rgba(0,0,0,.45)}
  .ab-launch.ab-call{animation:abPulse 2s ease-out infinite}
  @keyframes abPulse{0%{box-shadow:0 14px 30px -12px rgba(0,0,0,.45),0 0 0 0 color-mix(in srgb,var(--ab-accent,#0f6e7a) 55%,transparent)}70%,100%{box-shadow:0 14px 30px -12px rgba(0,0,0,.45),0 0 0 16px transparent}}
  .ab-hint{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);width:26px;height:26px;pointer-events:none;animation:abBob 1.6s ease-in-out infinite}
  .ab-hint svg{width:100%;height:100%;overflow:visible}.ab-hint .h{stroke:#fff;stroke-width:7}.ab-hint .a{stroke:var(--ab-accent,#0f6e7a);stroke-width:3.5}
  @keyframes abBob{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-7px)}}
  @media (prefers-reduced-motion:reduce){.ab-launch.ab-call,.ab-hint{animation:none}}
  html.a11y-still .ab-launch.ab-call,html.a11y-still .ab-hint{animation:none}
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
  .ab-acts a.go{background:var(--ab-accent,#0f6e7a);color:#fff}
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
    [/גרר|גרירה|מצבר|פנצ.?ר|שירותי דרך|נתקעתי בדרך|הרכב לא מניע/, "towing"],
    [/איטום|גגות|רעפים|רטיבות|דולף|נזילה מהתקרה|נזילה מהגג|יריעות|פוליאוריאה/, "roofing"],
    [/מצלמ|אזעקה|אינטרקום|קודן|בקרת כניסה|אבטחה|מערכות תקשורת|ארון תקשורת|נקודות רשת|ראוטר|נתב|וויי.?פיי|wi.?fi/i, "security"],
    [/יוגה|פילאטיס|רפורמר/, "yoga"],
    [/כלב|אילוף|מאלף/, "dog-trainer"],
    [/פרגול|סוכך|סוככים|הצללה/, "pergolas"],
    [/ציפורנ|ציפורן|לק ג[׳']?ל|מניקור|פדיקור|נייל|\bnails?\b/i, "nails"],
    [/נהיגה|נהג חדש|רישיון נהיגה|רשיון נהיגה|טסט|מבחן מעשי|תיאוריה|תאוריה|רענון נהיגה|מורה נהיגה/, "driving"],
    [/תריס|רצועה נקרעה|רצועת ה?תריס|גלגלת|ממ.?ד נתקע/, "shutters"],
    [/ספה|ספות|ריפוד|כורס[אה]|שטיח|מזרן|מזרנים/, "upholstery"],
    [/עיסוי|מסאז|מעסה|מעסים|רקמות עמוק|שוודי|רפלקסולוג|שיאצו|אבנים חמות/, "massage"],
    [/מספרה|ספר(?= |$)|ברבר|תספורת|פייד|זקן|גילוח/, "barber"],
    [/קוסמטי|קליניקת יופי|מכון יופי|טיפול(י)? פנים|גבות|ריסים|שעווה|הסרת שיער|איפור/, "cosmetics"],
    [/צלם|צילום|צלמת|תיק עבודות|אלבום/, "photographer"],
    [/אינסטל|נזיל|סתימ|ביוב|דוד/, "plumber"], [/הובל|מעבר דירה|משאית/, "movers"], [/מאמ|כושר|אימון|סטודיו/, "trainer"],
    [/מנעול|מנעולן|צילינדר|ננעלתי/, "locksmith"], [/הדבר|ג.?וקים|מזיק|נמלים|מכרסמ/, "pest"],
    [/מכונת כביסה|מקרר|מדיח|תנור|מייבש|מכשירי חשמל/, "appliance"], [/הנדימן|תחזוקה|תליית|הרכבת רהיט/, "handyman"],
    [/גינ|גנן|גיזום|השקיה|דשא/, "garden"], [/מורה|שיעור|בגרות|תלמיד/, "tutor"], [/פסיכולוג|טיפול רגשי|חרדה/, "psychologist"],
    [/עובדת סוציאלית|עו.?ס|הדרכת הורים/, "social-worker"],
    [/נגינה|פסנתר|גיטרה|מוזיקה|מוסיקה|תופים|כינור/, "music"],
    [/מזגן|מיזוג/, "ac"], [/חשמל/, "electrician"], [/ניקיון|מנק/, "cleaning"], [/שיפוצ|קבלן|מטבח חדש|גבס|תקרה מונמכת|צבעי/, "renovation"],
  ];
  function scripted(text, history) {
    const t = text.replace(/[״"'׳]/g, "");
    for (const [re, slug] of NICHES) if (re.test(t))
      return `יש לנו דף לדוגמה בדיוק לתחום הזה. שווה להציץ, ומשם אפשר להתחיל לבנות את שלכם. [[demo:${slug}]] [[build]]`;
    if (/כמה זמן|תהליך|איך זה עובד|איך בונים|מתי/.test(t))
      return "בונים בעצמכם, בצ׳אט של בונה האתרים: עונים על שאלות, מעלים תמונות, ורואים את האתר נבנה. משלמים רק אחרי שאישרתם. [[build]] [[go:how]]";
    if (/מחיר|עולה|עלות|תשלום|כמה/.test(t))
      return "חבילה אחת, נציג AI: 1,590 ₪ הקמה ו-290 ₪ לחודש, מחיר השקה שנשאר קבוע לתמיד. הכול כלול: האתר, הצ׳אט החכם ומערכת הפניות. המחירים סופיים, ומקבלים קבלה. [[pricing]]";
    if (/נציג|בוט|צאט|AI|בינה/i.test(t))
      return "נציג AI עונה על שאלות של לקוחות באתר, מסנן פניות ושולח לכם סיכום של כל שיחה לוואטסאפ. כמו הצ׳אט הזה, רק עם המידע של העסק שלכם. [[demo:ai-agent]]";
    if (/איך|זמן|שבוע/.test(t))
      return "בונים בעצמכם, בצ׳אט של בונה האתרים, מתי שנוח לכם. אחרי האישור והתשלום האתר עולה לאוויר לבד, תוך דקות. אחר כך מחברים את הוואטסאפ העסקי, עד שבועיים: חיבור רשמי דרך Meta, שמגן על המספר שלכם מחסימה. [[build]]";
    if (/התחייב|לבטל|דומיין|על שם/.test(t))
      return "אין התחייבות. התשלום מתחדש כל חודש ואפשר להפסיק מתי שרוצים. הדומיין על שמכם, והקבצים של האתר שלכם גם אם תעזבו, והמענה האוטומטי והנציג פועלים כל עוד יש תשלום חודשי.";
    if (/להתחיל|לבנות|רוצה|מעוניין|מעוניינת|יאללה/.test(t))
      return "מעולה. בונה האתרים שואל אתכם שאלה אחרי שאלה, ואתם רואים את האתר נבנה ליד. [[build]]";
    if (/בן אדם|לדבר|שיחה|כפיר|וואטסאפ|טלפון/.test(t))
      return "בשמחה. לחצו כאן, וההודעה תגיע אלינו בוואטסאפ עם מה שכבר סיפרתם. [[whatsapp:" + summary(history) + "]]";
    return "אני יכול להסביר איך זה עובד, לספר על המחירים, להראות דוגמה מהתחום שלכם, או לפתוח לכם את בונה האתרים. מה מעניין אתכם? [[go:how]] [[build]]";
  }
  // Visitor text inside a [[whatsapp:...]] marker: a "[" or "]" would break the marker.
  const clean = (t) => String(t || "").replace(/[[\]]/g, "");
  function summary(history) {
    const said = history.filter((m) => m.role === "user").map((m) => clean(m.content)).slice(-3).join(" · ");
    return ("היי, הגעתי מהאתר. " + said).slice(0, 400);
  }

  const AiBot = {
    init(cfg) {
      const endpoint = cfg.endpoint || "/api/chat";
      const style = el("style"); style.textContent = CSS; document.head.appendChild(style);

      const launch = el("button", "ab-launch"); launch.type = "button"; launch.setAttribute("aria-expanded", "false");
      launch.append(el("span", "ab-spark", "AI"), el("span", "ab-label", cfg.launcher || "שאלו את הנציג החכם"));
      let hint = null;
      if (cfg.hint) {
        launch.classList.add("ab-call");
        hint = el("span", "ab-hint"); hint.setAttribute("aria-hidden", "true");
        hint.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="h" d="M12 3v16M5 12l7 7 7-7"/><path class="a" d="M12 3v16M5 12l7 7 7-7"/></svg>';
        launch.append(hint);
      }
      const panel = el("section", "ab-panel"); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "נציג חכם");
      const head = el("div", "ab-head");
      const meta = el("div"); meta.append(el("b", null, cfg.name || "הנציג של Multi Landing"), el("small", null, cfg.subtitle || "עונה בעברית, על כל שאלה"));
      const mode = el("span", "ab-mode", "AI");
      const x = el("button", "ab-x", "×"); x.type = "button"; x.setAttribute("aria-label", "סגירה");
      head.append(meta, mode, x);
      const body = el("div", "ab-body"); body.setAttribute("aria-live", "polite");
      const typing = el("div", "ab-typing"); typing.append(el("i"), el("i"), el("i")); body.appendChild(typing);
      const chips = el("div", "ab-chips");
      const form = el("form", "ab-form");
      const input = el("input"); input.placeholder = cfg.placeholder || "כתבו שאלה, למשל: יש לי עסק להובלות"; input.setAttribute("aria-label", "השאלה שלכם"); const maxLen = Number(cfg.maxLength) || 600; input.maxLength = maxLen; input.autocomplete = "off";
      const send = el("button", null, "שליחה"); send.type = "submit";
      form.append(input, send);
      const note = el("div", "ab-note", cfg.note || "זה נציג AI. הוא יכול לטעות, ועל כל השאר עונים בוואטסאפ.");
      panel.append(head, body, chips, form, note);
      document.body.append(launch, panel);

      const history = []; let busy = false, started = false, offline = false;
      (cfg.chips || ["איך בונים את האתר?", "כמה זה עולה?", "יש לי עסק לשיפוצים", "מה נציג AI עושה?", "להתחיל לבנות"]).forEach((q) => {
        const b = el("button", null, q); b.type = "button"; b.addEventListener("click", () => ask(q)); chips.appendChild(b);
      });

      function bubble(text, who) { const m = el("div", "ab-msg" + (who === "me" ? " me" : ""), text); body.insertBefore(m, typing); body.scrollTop = body.scrollHeight; }
      function render(reply) {
        const acts = []; const re = /\[\[(demo|pricing|whatsapp|build|go)(?::([^\]]*))?\]\]/g;
        const text = reply.replace(re, (_, kind, arg) => { acts.push([kind, (arg || "").trim()]); return ""; }).trim();
        if (text) bubble(text, "bot");
        const row = el("div", "ab-acts");
        acts.slice(0, 2).forEach(([kind, arg]) => {
          let a;
          if (kind === "demo" && DEMOS[arg]) { a = el("a", null, "לדמו: " + DEMOS[arg]); a.href = (cfg.base || "") + arg + "/"; }
          else if (kind === "pricing") { a = el("a", null, "למחירון"); a.href = cfg.pricingHref || "#pricing"; a.addEventListener("click", close); }
          else if (kind === "build") { a = el("a", "go", "לבנות את האתר שלי"); a.href = (cfg.base || "") + "build/"; }
          else if (kind === "go" && GO[arg] && document.getElementById(arg)) { a = el("a", null, GO[arg]); a.href = "#" + arg; a.addEventListener("click", close); }
          else if (kind === "whatsapp") { a = el("a", "wa", cfg.waLabel || "לשלוח בוואטסאפ"); a.href = "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(arg || summary(history)); a.target = "_blank"; a.rel = "noopener"; }
          if (a) row.appendChild(a);
        });
        if (row.children.length) { body.insertBefore(row, typing); body.scrollTop = body.scrollHeight; }
      }
      function goOffline() { offline = true; mode.textContent = "מצב הדגמה"; }

      async function ask(text) {
        text = String(text || "").trim().slice(0, maxLen);
        if (!text || busy) return;
        busy = true; send.disabled = true; input.value = "";
        bubble(text, "me"); history.push({ role: "user", content: text });
        typing.classList.add("on"); body.scrollTop = body.scrollHeight;
        let reply = null;
        if (!offline) {
          try {
            const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 30000);
            const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history.slice(-19), page: location.href, referrer: document.referrer, source: (window.LeadForm && LeadForm.source ? LeadForm.source() : new URLSearchParams(location.search).get("utm_source")) || "", campaign: new URLSearchParams(location.search).get("utm_campaign") || "" }), signal: ctrl.signal });
            clearTimeout(timer);
            if (r.ok) reply = (await r.json()).reply;
            else if (r.status === 404 || r.status === 503 || r.status === 405) goOffline();
          } catch (e) { goOffline(); }
        }
        if (!reply) { await new Promise((res) => setTimeout(res, 500)); reply = cfg.offline ? cfg.offline + (cfg.offlineWa === false ? "" : " [[whatsapp:" + clean(text) + "]]")
          // A business's own chat (endpoint set) must never fall back to the sales script above.
          : cfg.endpoint ? "כרגע אני לא זמין. אפשר לשלוח את השאלה בוואטסאפ, ונחזור אליכם. [[whatsapp:" + clean(text) + "]]"
          : scripted(text, history); }
        typing.classList.remove("on");
        history.push({ role: "assistant", content: reply });
        render(reply);
        busy = false; send.disabled = false; input.focus();
      }

      // Focus goes back to whatever opened the chat (a page may hide the corner button and open it from its own).
      let opener = null;
      function refocus() { const t = opener && opener.isConnected && opener.getClientRects().length ? opener : launch; t.focus(); }
      function open() {
        const a = document.activeElement;
        if (a && a !== document.body && !panel.contains(a)) opener = a;
        panel.classList.add("open"); launch.setAttribute("aria-expanded", "true");
        if (hint) { hint.remove(); hint = null; launch.classList.remove("ab-call"); }
        if (window.LeadForm && window.LeadForm.act) window.LeadForm.act("chat");
        if (!started) { started = true; render(cfg.greet || "היי, אני הנציג החכם של Multi Landing. אפשר לשאול אותי כל דבר על דפי נחיתה, וואטסאפ אוטומטי ונציג AI לעסק שלכם. ככה בדיוק ייראה נציג באתר שלכם."); }
        input.focus();
      }
      function close() { panel.classList.remove("open"); launch.setAttribute("aria-expanded", "false"); }
      launch.addEventListener("click", () => (panel.classList.contains("open") ? close() : open()));
      x.addEventListener("click", () => { close(); refocus(); });
      form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) { close(); refocus(); } });
      document.querySelectorAll("[data-open-ai]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); open(); }));
      return { open, close, ask };
    },
  };
  window.AiBot = AiBot;
})();
