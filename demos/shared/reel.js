/* Reel: the short silent video at the top of a demo (and the same behaviour as on client sites).
   Markup:
     <figure class="reel">
       <div class="reel-frame">
         <video muted loop playsinline preload="none" poster="..." aria-label="..."><source src="....mp4" type="video/mp4"><source src="....webm" type="video/webm"></video>
         <button class="reel-toggle" type="button" aria-label="להפעיל את הסרטון" data-state="play"></button>
         <label class="reel-swap">להחליף לסרטון שלכם<input type="file" accept="video/*"></label>   (optional, shown in edit mode)
       </div>
       <figcaption>...</figcaption>
     </figure>
   It plays only while on screen, never for reduced motion, save-data or 2G (then nothing loads until a press),
   and the button stops it (WCAG 2.2.2). In the demos' edit mode (body.ps-edit, from photoslots.js) a visitor can
   try their own video: it plays from their own device and is never uploaded. */
(function () {
  const CSS = `
  .reel-toggle{position:absolute;bottom:16px;inset-inline-start:16px;z-index:3;width:44px;height:44px;border-radius:50%;border:0;background:rgba(10,20,40,.78);cursor:pointer;display:grid;place-items:center}
  .reel-toggle::before{content:"";width:0;height:0;border-block:8px solid transparent;border-inline-start:13px solid #fff;transform:scaleX(-1)}
  .reel-toggle[data-state=pause]::before{width:12px;height:16px;border:0;transform:none;background:linear-gradient(90deg,#fff 0 4px,transparent 4px 8px,#fff 8px 12px)}
  .reel-swap{position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:3;display:none;white-space:nowrap;background:#fff;color:#111;font:600 13px/1 system-ui,sans-serif;padding:9px 13px;border-radius:999px;cursor:pointer;box-shadow:0 8px 20px -8px rgba(0,0,0,.5)}
  .reel-swap input{position:absolute;inset:0;opacity:0;cursor:pointer}
  .reel-swap:focus-within{outline:3px solid #fff;outline-offset:2px}
  body.ps-edit .reel-swap{display:block}`;

  function init(fig) {
    const v = fig.querySelector("video"), b = fig.querySelector(".reel-toggle");
    if (!v || !b) return;
    const c = navigator.connection || {};
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches || c.saveData || /2g/.test(c.effectiveType || "");
    let wanted = !calm;
    const show = () => {
      const on = !v.paused;
      b.dataset.state = on ? "pause" : "play";
      b.setAttribute("aria-label", on ? "לעצור את הסרטון" : "להפעיל את הסרטון");
    };
    const play = () => { v.preload = "auto"; const p = v.play(); if (p && p.catch) p.catch(show); };
    v.addEventListener("play", show);
    v.addEventListener("pause", show);
    b.addEventListener("click", () => { wanted = v.paused; if (wanted) play(); else v.pause(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((e) => { if (e[0].isIntersecting) { if (wanted) play(); } else v.pause(); }).observe(v);
    } else if (wanted) play();

    const input = fig.querySelector(".reel-swap input");
    if (input) input.addEventListener("change", () => {
      const f = input.files[0];
      input.value = "";
      if (!f) return;
      if (fig._url) URL.revokeObjectURL(fig._url);
      fig._url = URL.createObjectURL(f);
      v.querySelectorAll("source").forEach((s) => s.remove());
      v.removeAttribute("poster");
      v.src = fig._url;
      wanted = true;
      play();
    });
  }

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  document.querySelectorAll(".reel").forEach(init);
})();
