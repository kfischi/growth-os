/* EndCTA: the closing call to action of a demo (the ui-ux-pro-max funnel pattern: one clear last step before the
   page's "what the owner gets" part). Built only from the page's own chat config: its name, subtitle, launcher
   label and WhatsApp number, in the page's own --bot-* colours and font. No new facts, no animation.
   Load right after leadbot.js: it wraps LeadBot.init to see the config, then adds the band once the page is ready. */
(function () {
  if (!window.LeadBot || window.LeadBot.__endcta) return;
  const init = window.LeadBot.init.bind(window.LeadBot);
  let cfg = null, bot = null;
  window.LeadBot.init = (c) => { bot = init(c); cfg = cfg || c; return bot; };
  window.LeadBot.__endcta = true;

  const CSS = `
  .endcta{margin:56px auto;padding:0 16px;max-width:1080px}
  .endcta-in{border-radius:28px;padding:34px 28px;text-align:center;background:color-mix(in srgb,var(--bot-accent,#222) 7%,#fff);
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--bot-accent,#222) 16%,transparent);font-family:var(--bot-font,inherit);color:#1c1d22}
  .endcta small{display:block;font-size:14px;font-weight:600;color:color-mix(in srgb,var(--bot-accent,#222) 80%,#000);margin-bottom:8px}
  .endcta h2{font-size:clamp(26px,5vw,38px);line-height:1.15;font-weight:800;letter-spacing:-.02em;margin:0 0 10px}
  .endcta p{margin:0 auto 22px;max-width:34em;font-size:16px;line-height:1.55;color:#3b3d45}
  .endcta-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
  .endcta-row button,.endcta-row a{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 24px;border-radius:var(--bot-radius-pill,999px);
    font:700 16px/1 var(--bot-font,inherit);text-decoration:none;cursor:pointer}
  .endcta-row button{border:0;background:var(--bot-accent,#222);color:var(--bot-accent-fg,#fff);box-shadow:0 12px 28px -14px var(--bot-accent,#222)}
  .endcta-row a{background:#fff;color:#1c1d22;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--bot-accent,#222) 40%,#fff)}
  .endcta-row button:focus-visible,.endcta-row a:focus-visible{outline:3px solid var(--bot-focus,var(--bot-accent,#222));outline-offset:3px}
  .endcta-row svg{width:20px;height:20px;flex:none}
  @media (max-width:560px){.endcta{margin:40px auto}.endcta-in{padding:28px 18px}.endcta-row button,.endcta-row a{flex:1 1 100%}}`;
  const WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2c.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';

  function add() {
    if (!cfg || !bot || document.querySelector(".endcta")) return;
    const before = document.querySelector("section.owner") || document.querySelector("body > footer, footer");
    if (!before) return;
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    const sec = document.createElement("section"); sec.className = "endcta"; sec.setAttribute("aria-labelledby", "endcta-t");
    const box = document.createElement("div"); box.className = "endcta-in";
    const t = (tag, text, attrs) => { const e = document.createElement(tag); e.textContent = text; Object.assign(e, attrs || {}); return e; };
    const who = String(cfg.name || "").split("·")[0].trim();
    if (cfg.name) box.append(t("small", cfg.name));
    box.append(t("h2", "מוכנים? פונים עכשיו, בלי לחכות על הקו.", { id: "endcta-t" }));
    box.append(t("p", "כמה שאלות קצרות בצ׳אט, והפרטים עוברים ישר לוואטסאפ" + (who ? " של " + who : "") + ". בלי טופס ארוך."));
    const row = document.createElement("div"); row.className = "endcta-row";
    const go = t("button", cfg.launcher || "לפתוח פנייה בצ׳אט", { type: "button" });
    go.addEventListener("click", () => bot.open && bot.open());
    row.append(go);
    if (cfg.whatsapp) {
      const a = document.createElement("a"); a.href = "https://wa.me/" + String(cfg.whatsapp).replace(/\D/g, ""); a.target = "_blank"; a.rel = "noopener";
      a.innerHTML = WA; a.append(document.createTextNode("לכתוב בוואטסאפ")); row.append(a);
    }
    box.append(row); sec.append(box); before.parentNode.insertBefore(sec, before);
  }
  if (document.readyState === "complete") setTimeout(add, 0); else window.addEventListener("load", add);
})();
