/* PhotoSlots: Canva-style replaceable photos and editable text for the demo pages.
   Markup:
     <figure class="ps" data-slot="hero" data-icon="wrench" data-label="אתם בעבודה"></figure>
       An empty slot gets a generated placeholder (gradient from --ps-a/--ps-b, a line icon, a label chip).
       A slot may hold its own placeholder: any child with class "ps-ph".
     <span data-edit="headline">...</span>   plain text that becomes editable in edit mode.
     Before/after: <div class="ps-ba"> <figure class="ps" data-slot="after"> <div class="ps-ba-before"><figure class="ps" data-slot="before"></div>
                   <input class="ps-ba-range" type="range"> <span class="ps-ba-line"></span> </div>
   Usage: PhotoSlots.init({ page: "plumber" }). Everything is stored in this browser only (IndexedDB). */
(function () {
  const ICONS = {
    camera: "M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
    wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
    drop: "M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z",
    box: "M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10",
    truck: "M1 6h13v10H1z M14 9h4l3 3v4h-7z M5.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    dumbbell: "M6 7v10 M18 7v10 M3 10v4 M21 10v4 M6 12h12",
    snow: "M12 2v20 M3.3 7l17.4 10 M20.7 7L3.3 17 M9 4l3 2 3-2 M9 20l3-2 3 2",
    bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
    sparkle: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z M19 3v4 M17 5h4",
    home: "M3 11l9-8 9 8 M5 9v12h14V9 M10 21v-6h4v6",
    trowel: "M3 21l6-6 M8 16l9-9 4 4-9 9z M14 4l2-2",
  };
  const CSS = `
  .ps{position:relative;overflow:hidden;margin:0;background:var(--ps-b,#9aa)}
  .ps>.ps-ph,.ps>.ps-img{position:absolute;inset:0;width:100%;height:100%;display:block}
  .ps>.ps-img{object-fit:cover;display:none;transform-origin:50% 50%;user-select:none;-webkit-user-drag:none;touch-action:none}
  .ps.has-img>.ps-img{display:block}
  .ps.has-img>.ps-ph,.ps.has-img>.ps-chip{visibility:hidden}
  .ps-chip{position:absolute;bottom:8px;inset-inline-start:8px;z-index:2;font:500 11.5px/1.3 system-ui,sans-serif;background:rgba(0,0,0,.42);color:#fff;padding:3px 9px;border-radius:999px;max-width:calc(100% - 16px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;backdrop-filter:blur(4px)}
  .ps-tools{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:6;display:none;gap:6px;align-items:center;background:rgba(17,17,17,.82);padding:5px;border-radius:999px;backdrop-filter:blur(6px);max-width:calc(100% - 12px)}
  .ps-tools button{border:0;background:#fff;color:#111;font:600 12.5px/1 system-ui,sans-serif;padding:7px 11px;border-radius:999px;cursor:pointer;white-space:nowrap}
  .ps-tools button.ps-reset{background:transparent;color:#fff}
  .ps-tools input{width:70px;accent-color:#fff;display:none}
  .ps.has-img .ps-tools input{display:block}
  .ps-ui-btn{position:fixed;z-index:62;bottom:calc(16px + env(safe-area-inset-bottom,0px));inset-inline-start:16px;display:flex;align-items:center;gap:8px;border:0;cursor:pointer;
    background:var(--ps-ui,#111);color:var(--ps-ui-fg,#fff);font:600 14.5px/1 system-ui,sans-serif;padding:12px 16px;border-radius:999px;box-shadow:0 14px 30px -12px rgba(0,0,0,.5)}
  .ps-ui-btn svg{width:18px;height:18px}
  .ps-banner{position:fixed;z-index:63;top:10px;left:50%;transform:translateX(-50%);width:min(760px,calc(100% - 20px));display:none;gap:10px;align-items:center;
    background:#111;color:#fff;font:14px/1.45 system-ui,sans-serif;padding:10px 12px 10px 14px;border-radius:14px;box-shadow:0 20px 40px -20px rgba(0,0,0,.6)}
  .ps-banner p{margin:0;flex:1;min-width:0}
  .ps-banner button{border:0;border-radius:999px;padding:8px 12px;font:600 13px/1 system-ui,sans-serif;cursor:pointer;white-space:nowrap}
  .ps-banner .ps-done{background:#fff;color:#111}
  .ps-banner .ps-clear{background:transparent;color:#fff;text-decoration:underline}
  .ps-msg{color:#ffb4a8}
  body.ps-edit .ps-banner{display:flex}
  body.ps-edit .ps{outline:2px dashed var(--ps-edit,#3d8bff);outline-offset:-2px;cursor:pointer}
  body.ps-edit .ps.has-img{cursor:grab}
  body.ps-edit .ps.dragging{cursor:grabbing}
  body.ps-edit .ps.drop{outline-style:solid;outline-width:3px}
  body.ps-edit .ps-tools{display:flex}
  body.ps-edit [data-edit]{outline:1.5px dashed var(--ps-edit,#3d8bff);outline-offset:3px;border-radius:2px;cursor:text}
  body.ps-edit [data-edit]:focus{outline-style:solid}
  .ps-ba{position:relative;overflow:hidden;direction:ltr;user-select:none;touch-action:pan-y}
  .ps-ba>.ps,.ps-ba-before>.ps{position:absolute;inset:0}
  .ps-ba-before{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--pos,50%)) 0 0);z-index:1}
  .ps-ba-range{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;margin:0;z-index:3}
  .ps-ba-line{position:absolute;top:0;bottom:0;left:var(--pos,50%);width:3px;margin-left:-1.5px;background:#fff;pointer-events:none;z-index:4}
  .ps-ba-line::after{content:"⇆";position:absolute;top:50%;left:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;font:700 17px/1 system-ui;box-shadow:0 6px 18px rgba(0,0,0,.25)}
  .ps-ba-range:focus-visible+.ps-ba-line::after{outline:3px solid var(--ps-edit,#3d8bff);outline-offset:3px}
  .ps-ba-tag{position:absolute;top:12px;z-index:4;padding:5px 12px;border-radius:999px;font:700 13px/1.2 system-ui,sans-serif;direction:rtl;pointer-events:none}
  .ps-ba-tag.b{left:12px;background:rgba(20,20,20,.62);color:#fff}
  .ps-ba-tag.a{right:12px;background:#fff;color:#111}
  body.ps-edit .ps-ba-range{pointer-events:none}
  body.ps-edit .ps-ba-line{opacity:.5}
  @media (max-width:520px){.ps-ui-btn .ps-ui-label{display:none}.ps-ui-btn{padding:12px}.ps-banner{font-size:13px;flex-wrap:wrap}}
  `;

  // ---------- tiny IndexedDB key-value store ----------
  let dbp;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      try { const r = indexedDB.open("demo-photos", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    });
    return dbp;
  }
  async function kvGet(k) {
    try { const d = await db(); return await new Promise((res) => { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); }
    catch (e) { return undefined; }
  }
  async function kvSet(k, v) {
    try { const d = await db(); await new Promise((res) => { const tx = d.transaction("kv", "readwrite"); const s = tx.objectStore("kv"); v === undefined ? s.delete(k) : s.put(v, k); tx.oncomplete = res; tx.onerror = res; }); return true; }
    catch (e) { return false; }
  }
  async function kvClear(prefix) {
    try { const d = await db(); await new Promise((res) => { const tx = d.transaction("kv", "readwrite"); const c = tx.objectStore("kv").openCursor();
      c.onsuccess = () => { const cur = c.result; if (!cur) return; if (String(cur.key).startsWith(prefix)) cur.delete(); cur.continue(); }; tx.oncomplete = res; tx.onerror = res; }); }
    catch (e) { /* storage unavailable */ }
  }

  // ---------- helpers ----------
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let uid = 0;
  function placeholder(slot) {
    const id = "psg" + (++uid), icon = ICONS[slot.dataset.icon] || ICONS.camera;
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "ps-ph"); svg.setAttribute("viewBox", "0 0 400 300"); svg.setAttribute("preserveAspectRatio", "xMidYMid slice"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--ps-a,#cfd8dc)"/><stop offset="1" style="stop-color:var(--ps-b,#90a4ae)"/></linearGradient>
      <pattern id="${id}d" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#fff" opacity=".14"/></pattern></defs>
      <rect width="400" height="300" fill="url(#${id})"/><rect width="400" height="300" fill="url(#${id}d)"/>
      <circle cx="320" cy="60" r="120" fill="#fff" opacity=".07"/>
      <g transform="translate(164 114) scale(3)" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></g>`;
    return svg;
  }
  async function shrink(file) {
    const url = URL.createObjectURL(file), img = new Image();
    try {
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.86);
    } finally { URL.revokeObjectURL(url); }
  }

  const PhotoSlots = {
    init(cfg) {
      const page = (cfg && cfg.page) || location.pathname;
      const style = el("style"); style.textContent = CSS; document.head.appendChild(style);
      // A fresh file input per pick: reusing one input can swallow a second click that comes right after a first upload.
      function openPicker(slot) {
        const input = el("input"); input.type = "file"; input.accept = "image/*"; input.hidden = true;
        input.addEventListener("change", () => { if (input.files[0]) slot._ps.setFile(input.files[0]); input.remove(); });
        input.addEventListener("cancel", () => input.remove());
        document.body.appendChild(input); input.click();
      }

      // UI: toggle button and banner
      const btn = el("button", "ps-ui-btn"); btn.type = "button";
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS.camera}"/></svg><span class="ps-ui-label">${(cfg && cfg.label) || "לנסות עם התמונות שלכם"}</span>`;
      const banner = el("div", "ps-banner"); banner.setAttribute("role", "status");
      const msg = el("p", null, "לחצו על תמונה כדי להחליף אותה, או גררו לתוכה קובץ. גוררים כדי למקם, והסליידר מגדיל. גם הטקסטים המסומנים ניתנים לעריכה. הכול נשמר רק בדפדפן הזה.");
      const clear = el("button", "ps-clear", "איפוס הכול"); clear.type = "button";
      const done = el("button", "ps-done", "סיום"); done.type = "button";
      banner.append(msg, clear, done); document.body.append(btn, banner);
      const say = (t, bad) => { msg.textContent = t; msg.classList.toggle("ps-msg", !!bad); };

      function setEdit(on) {
        document.body.classList.toggle("ps-edit", on);
        btn.style.display = on ? "none" : "";
        document.querySelectorAll("[data-edit]").forEach((n) => {
          if (on) { n.setAttribute("contenteditable", "plaintext-only"); if (n.contentEditable !== "plaintext-only") n.setAttribute("contenteditable", "true"); }
          else n.removeAttribute("contenteditable");
        });
      }
      btn.addEventListener("click", () => setEdit(true));
      done.addEventListener("click", () => setEdit(false));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("ps-edit") && !document.activeElement.closest("[data-edit]")) setEdit(false); });
      clear.addEventListener("click", async () => { await kvClear(page + ":"); location.reload(); });

      // Slots
      const slots = [...document.querySelectorAll(".ps[data-slot]")];
      slots.forEach((slot) => {
        const key = page + ":img:" + slot.dataset.slot;
        if (!slot.querySelector(":scope > .ps-ph")) slot.prepend(placeholder(slot));
        // the <img> is attached only once there is a photo, so an empty slot never shows a broken image
        const img = el("img", "ps-img"); img.alt = slot.dataset.label || ""; img.draggable = false;
        if (slot.dataset.label) slot.appendChild(el("span", "ps-chip", slot.dataset.label));
        const tools = el("div", "ps-tools");
        const pick = el("button", "ps-pick", "החלפת תמונה"); pick.type = "button";
        const zoom = el("input"); zoom.type = "range"; zoom.min = "1"; zoom.max = "3"; zoom.step = "0.01"; zoom.value = "1"; zoom.setAttribute("aria-label", "זום");
        const reset = el("button", "ps-reset", "איפוס"); reset.type = "button";
        tools.append(pick, zoom, reset); slot.appendChild(tools);
        let st = { src: null, x: 50, y: 50, z: 1 };

        function apply() {
          slot.classList.toggle("has-img", !!st.src);
          if (st.src) { if (!img.isConnected) slot.insertBefore(img, slot.querySelector(":scope > .ps-chip, :scope > .ps-tools")); if (img.getAttribute("src") !== st.src) img.src = st.src; img.style.objectPosition = `${st.x}% ${st.y}%`; img.style.transformOrigin = `${st.x}% ${st.y}%`; img.style.transform = `scale(${st.z})`; zoom.value = st.z; }
          else { img.removeAttribute("src"); img.remove(); }
        }
        const save = () => kvSet(key, st.src ? st : undefined);
        slot._ps = {
          async setFile(file) {
            if (!file || !/^image\//.test(file.type)) { say("זה לא קובץ תמונה. נסו JPG או PNG.", true); return; }
            try { st = { src: await shrink(file), x: 50, y: 50, z: 1 }; apply(); const ok = await save(); say(ok ? "התמונה הוחלפה. גוררים כדי למקם." : "התמונה הוחלפה, אבל הדפדפן לא מאפשר לשמור אותה.", !ok); }
            catch (e) { say("לא הצלחנו לפתוח את הקובץ. נסו תמונה בפורמט JPG או PNG.", true); }
          },
        };
        kvGet(key).then((v) => { if (v && v.src) { st = v; apply(); } });

        pick.addEventListener("click", (e) => { e.stopPropagation(); openPicker(slot); });
        reset.addEventListener("click", (e) => { e.stopPropagation(); st = { src: null, x: 50, y: 50, z: 1 }; apply(); save(); });
        zoom.addEventListener("input", () => { st.z = +zoom.value; apply(); });
        zoom.addEventListener("change", save);
        tools.addEventListener("click", (e) => e.stopPropagation());
        tools.addEventListener("pointerdown", (e) => e.stopPropagation());

        slot.addEventListener("click", (e) => {
          if (!document.body.classList.contains("ps-edit") || st.src || e.target.closest("[data-edit]")) return;
          e.preventDefault(); openPicker(slot);
        });
        slot.addEventListener("wheel", (e) => {
          if (!document.body.classList.contains("ps-edit") || !st.src) return;
          e.preventDefault(); st.z = clamp(st.z - e.deltaY * 0.0015, 1, 3); apply(); clearTimeout(slot._wt); slot._wt = setTimeout(save, 300);
        }, { passive: false });
        // drag to pan
        slot.addEventListener("pointerdown", (e) => {
          if (!document.body.classList.contains("ps-edit") || !st.src || e.target.closest("[data-edit]")) return;
          e.preventDefault(); slot.setPointerCapture(e.pointerId); slot.classList.add("dragging");
          const r = slot.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ox = st.x, oy = st.y;
          const move = (m) => { st.x = clamp(ox - ((m.clientX - sx) / r.width) * 100 / st.z * 1.6, 0, 100); st.y = clamp(oy - ((m.clientY - sy) / r.height) * 100 / st.z * 1.6, 0, 100); apply(); };
          const up = () => { slot.classList.remove("dragging"); slot.removeEventListener("pointermove", move); slot.removeEventListener("pointerup", up); slot.removeEventListener("pointercancel", up); save(); };
          slot.addEventListener("pointermove", move); slot.addEventListener("pointerup", up); slot.addEventListener("pointercancel", up);
        });
        // drop a file
        slot.addEventListener("dragover", (e) => { if (!document.body.classList.contains("ps-edit")) return; e.preventDefault(); slot.classList.add("drop"); });
        slot.addEventListener("dragleave", () => slot.classList.remove("drop"));
        slot.addEventListener("drop", (e) => { if (!document.body.classList.contains("ps-edit")) return; e.preventDefault(); slot.classList.remove("drop"); slot._ps.setFile(e.dataTransfer.files[0]); });
      });

      // Editable text
      document.querySelectorAll("[data-edit]").forEach((n) => {
        const key = page + ":txt:" + n.dataset.edit;
        kvGet(key).then((v) => { if (typeof v === "string" && v.trim()) n.textContent = v; });
        n.addEventListener("input", () => { clearTimeout(n._t); n._t = setTimeout(() => kvSet(key, n.textContent), 300); });
        n.addEventListener("paste", (e) => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); });
        n.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); n.blur(); } });
      });

      // Before/after sliders
      document.querySelectorAll(".ps-ba").forEach((ba) => {
        const r = ba.querySelector(".ps-ba-range"); if (!r) return;
        const set = () => ba.style.setProperty("--pos", r.value + "%"); r.addEventListener("input", set); set();
      });

      if (/[?&]edit\b/.test(location.search)) setEdit(true);
      return { edit: setEdit };
    },
  };
  window.PhotoSlots = PhotoSlots;
})();
