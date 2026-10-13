/* A11y: the accessibility menu (the round icon at the bottom corner). Larger text, high contrast, underlined links,
   a plain font, and stopping all motion. The choices are kept on the visitor's device (localStorage) and applied
   before the page paints, so load it in <head>, without defer:
     <script src="shared/a11y.js" data-statement="accessibility/"></script>
   data-statement is the link to the page's accessibility statement. The menu does not make a page accessible by
   itself: the pages are built to IS 5568 / WCAG AA, and this only adds the adjustments visitors expect to find.
   Other scripts can read the choices from the <html> classes (a11y-still, a11y-contrast...) and listen to the
   "a11y-still" event on document to stop their own animation. */
(function () {
  const root = document.documentElement, KEY = "a11y";
  const me = document.currentScript;
  const statement = (me && me.dataset.statement) || "";
  const SIZES = [1, 1.15, 1.3, 1.5];
  const FLAGS = ["contrast", "links", "font", "still"];
  let s = { size: 0 };
  try { s = Object.assign(s, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* private mode */ }
  if (!(s.size >= 0 && s.size < SIZES.length)) s.size = 0;

  const apply = () => {
    FLAGS.forEach((f) => root.classList.toggle("a11y-" + f, !!s[f]));
    root.style.setProperty("--a11y-zoom", SIZES[s.size]);
    root.classList.toggle("a11y-big", s.size > 0);
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } };
  apply();

  const CSS = `
  html.a11y-big body{zoom:var(--a11y-zoom)}
  html.a11y-links a{text-decoration:underline!important;text-underline-offset:3px;text-decoration-thickness:2px!important}
  html.a11y-font body,html.a11y-font body *:not(svg):not(svg *){font-family:Arial,"Segoe UI",system-ui,sans-serif!important;letter-spacing:normal!important}
  html.a11y-still *,html.a11y-still *::before,html.a11y-still *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
  html.a11y-contrast body,html.a11y-contrast body *:not(svg):not(svg *):not(img):not(video):not(.a11y-ui):not(.a11y-ui *){background-color:#fff!important;background-image:none!important;color:#000!important;border-color:#000!important;text-shadow:none!important;box-shadow:none!important}
  html.a11y-contrast body a:not(.a11y-ui *){color:#0000c8!important;text-decoration:underline!important}
  html.a11y-contrast body :focus-visible{outline:3px solid #0000c8!important;outline-offset:2px!important}
  .a11y-ui{position:fixed;z-index:70;bottom:calc(18px + env(safe-area-inset-bottom,0px));inset-inline-start:16px;font:400 15px/1.4 system-ui,"Segoe UI",Arial,sans-serif;color:#14213d;direction:rtl;zoom:1}
  .a11y-btn{width:48px;height:48px;border-radius:50%;border:2px solid #fff;background:#173d8c;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 20px -8px rgba(10,20,50,.6);padding:0}
  .a11y-btn svg{width:28px;height:28px}
  .a11y-btn:focus-visible,.a11y-panel button:focus-visible,.a11y-panel a:focus-visible{outline:3px solid #173d8c;outline-offset:3px}
  .a11y-btn:focus-visible{outline-color:#14213d}
  .a11y-panel{position:absolute;bottom:60px;inset-inline-start:0;width:min(300px,calc(100vw - 32px));background:#fff;border:1px solid #c9d2e3;border-radius:16px;padding:14px;box-shadow:0 18px 40px -16px rgba(10,20,50,.45)}
  .a11y-panel[hidden]{display:none}
  .a11y-head{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px}
  .a11y-head h2{font:700 17px/1.2 inherit;margin:0;color:#14213d}
  .a11y-x{width:36px;height:36px;border-radius:50%;border:0;background:#eef1f7;color:#14213d;font-size:20px;line-height:1;cursor:pointer}
  .a11y-size{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-bottom:8px}
  .a11y-size output{text-align:center;font-weight:600}
  .a11y-size button{height:44px;border-radius:12px;border:1.5px solid #c9d2e3;background:#fff;color:#14213d;font:700 18px/1 inherit;cursor:pointer}
  .a11y-size button:disabled{opacity:.4;cursor:default}
  .a11y-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .a11y-opt{min-height:52px;border-radius:12px;border:1.5px solid #c9d2e3;background:#fff;color:#14213d;font:600 14px/1.25 inherit;cursor:pointer;padding:8px;text-align:center}
  .a11y-opt[aria-pressed=true]{background:#173d8c;border-color:#173d8c;color:#fff}
  .a11y-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid #e1e6f0}
  .a11y-foot a{color:#173d8c;font-weight:600}
  .a11y-reset{border:0;background:none;color:#4a5876;font:600 14px/1 inherit;text-decoration:underline;cursor:pointer;padding:8px 0}`;

  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="4" r="2" fill="currentColor"/><path d="M5 8.2l7 1.3 7-1.3M12 9.5v4.8m0 0l-3.4 6.2m3.4-6.2l3.4 6.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const OPTS = [["contrast", "ניגודיות גבוהה"], ["links", "הדגשת קישורים"], ["font", "גופן פשוט"], ["still", "עצירת תנועה"]];

  function build() {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    const ui = document.createElement("div");
    ui.className = "a11y-ui";
    ui.innerHTML = `
      <div class="a11y-panel" id="a11y-panel" role="dialog" aria-label="תפריט נגישות" hidden>
        <div class="a11y-head"><h2>נגישות</h2><button type="button" class="a11y-x" aria-label="סגירה">×</button></div>
        <div class="a11y-size" role="group" aria-label="גודל הטקסט">
          <button type="button" data-size="1" aria-label="להגדיל את הטקסט">+</button>
          <output aria-live="polite"></output>
          <button type="button" data-size="-1" aria-label="להקטין את הטקסט">−</button>
        </div>
        <div class="a11y-opts">${OPTS.map(([k, t]) => `<button type="button" class="a11y-opt" data-flag="${k}" aria-pressed="false">${t}</button>`).join("")}</div>
        <div class="a11y-foot">${statement ? `<a href="${statement.replace(/"/g, "")}">הצהרת נגישות</a>` : "<span></span>"}<button type="button" class="a11y-reset">איפוס</button></div>
      </div>
      <button type="button" class="a11y-btn" aria-label="תפריט נגישות" aria-expanded="false" aria-controls="a11y-panel">${ICON}</button>`;
    document.body.appendChild(ui);

    const btn = ui.querySelector(".a11y-btn"), panel = ui.querySelector(".a11y-panel"), out = ui.querySelector("output");
    const sync = () => {
      out.textContent = Math.round(SIZES[s.size] * 100) + "%";
      ui.querySelector("[data-size='1']").disabled = s.size >= SIZES.length - 1;
      ui.querySelector("[data-size='-1']").disabled = s.size <= 0;
      ui.querySelectorAll(".a11y-opt").forEach((b) => b.setAttribute("aria-pressed", String(!!s[b.dataset.flag])));
    };
    const still = () => {
      if (!s.still) return;
      document.querySelectorAll("video").forEach((v) => { if (!v.controls) v.pause(); });
      document.dispatchEvent(new Event("a11y-still"));
    };
    const change = () => { apply(); save(); sync(); still(); };
    const open = (on) => {
      panel.hidden = !on;
      btn.setAttribute("aria-expanded", String(on));
      if (on) panel.querySelector("button").focus();
    };
    btn.addEventListener("click", () => open(panel.hidden));
    ui.querySelector(".a11y-x").addEventListener("click", () => { open(false); btn.focus(); });
    ui.querySelectorAll("[data-size]").forEach((b) => b.addEventListener("click", () => {
      s.size = Math.max(0, Math.min(SIZES.length - 1, s.size + Number(b.dataset.size)));
      change();
    }));
    ui.querySelectorAll(".a11y-opt").forEach((b) => b.addEventListener("click", () => { s[b.dataset.flag] = !s[b.dataset.flag]; change(); }));
    ui.querySelector(".a11y-reset").addEventListener("click", () => { s = { size: 0 }; change(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { open(false); btn.focus(); } });
    document.addEventListener("click", (e) => { if (!panel.hidden && !ui.contains(e.target)) open(false); });
    sync();
    still();
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);
})();
