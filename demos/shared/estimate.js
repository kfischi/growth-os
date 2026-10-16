/*
  Estimate: "כמה זה יעלה?" A price range the visitor works out on the page, per trade, before they write.

  The page gives the section and its heading; Estimate.init(el, config) fills it. It is themed by the
  same --bot-* variables the page already sets for the chat, so it takes each business's own look.
  The answer is always a range with its conditions, never a promise. The button opens the chat with
  the visitor's choices already answered (LeadBot's open(prefill)), so they don't answer them twice.

  config = {
    pick:    { ask: "מה התקלה?", items: [{ label, range: [min, max] | null, prefill?: { stepKey: value }, note? }] },
    factors: [{ ask: "כמה דחוף?", for?: [item labels], options: [{ label, mul?: n | [nMin, nMax], add?: n | [aMin, aMax], prefill?, note? }] }],
                                           // for: the question shows only for these items
    unit?: "₪", per?: "לשעה",            // per: shown after the sum (an item's own per wins)
    note: "טווח מקובל לדוגמה. …",          // always under the result
    quote?: "לפי הצעת מחיר, …",            // shown for an item whose range is null
    cta: "לפתוח קריאה עם זה",
    onAsk: (prefill, text) => bot.open(prefill),
  }
  The range is (min × mul + add) to (max × mul + add) for every factor picked, rounded to 10 ₪ (50 ₪ above 1,000, 1,000 ₪ above 10,000).
*/
(function () {
  let n = 0;
  const CSS = `
  .est{display:grid;gap:18px;font-family:var(--bot-font,inherit);color:var(--bot-fg,inherit)}
  @media (min-width:760px){.est{grid-template-columns:1.35fr 1fr;align-items:start;gap:28px}}
  .est-qs{display:grid;gap:16px;min-width:0}
  .est fieldset{border:0;margin:0;padding:0;min-width:0}
  .est legend{font-weight:700;font-size:16px;margin-bottom:8px;padding:0}
  .est-opts{display:flex;flex-wrap:wrap;gap:8px}
  .est-opts label{position:relative;display:inline-flex;align-items:center;min-height:44px;padding:9px 14px;border:1.5px solid var(--bot-line,#d0d0d0);border-radius:var(--bot-radius-pill,999px);background:var(--bot-bg,#fff);font-size:15px;line-height:1.3;cursor:pointer;transition:border-color .15s,background .15s}
  .est-opts input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
  .est-opts label:hover{border-color:var(--bot-accent,#333)}
  .est-opts label:has(input:checked){background:var(--bot-accent,#333);border-color:var(--bot-accent,#333);color:var(--bot-accent-fg,#fff);font-weight:700}
  .est-opts label:has(input:focus-visible){outline:3px solid var(--bot-focus,var(--bot-accent,#333));outline-offset:2px}
  .est-out{border:1.5px solid var(--bot-line,#d0d0d0);border-radius:var(--bot-radius,12px);background:var(--bot-bg,#fff);padding:20px;display:grid;gap:10px;min-width:0}
  .est-k{font-size:14px;color:var(--bot-muted,#666)}
  .est-sum{font-size:clamp(26px,6vw,34px);font-weight:800;line-height:1.15;font-variant-numeric:tabular-nums}
  .est-sum small{font-size:16px;font-weight:600;color:var(--bot-muted,#666)}
  .est-why{margin:0;font-size:14px;color:var(--bot-fg,inherit)}
  .est-note{margin:0;font-size:13px;line-height:1.5;color:var(--bot-muted,#666)}
  .est-go{justify-self:start;min-height:46px;padding:11px 18px;border:0;border-radius:var(--bot-radius-input,10px);background:var(--bot-accent,#333);color:var(--bot-accent-fg,#fff);font:700 16px var(--bot-font,inherit);cursor:pointer}
  .est-go:focus-visible{outline:3px solid var(--bot-focus,var(--bot-accent,#333));outline-offset:2px}
  @media (prefers-reduced-motion:reduce){.est-opts label{transition:none}}`;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const pair = (v, d) => (Array.isArray(v) ? v : [v == null ? d : v, v == null ? d : v]);
  const round = (x) => (x >= 10000 ? Math.round(x / 1000) * 1000 : x >= 1000 ? Math.round(x / 50) * 50 : Math.round(x / 10) * 10);
  const money = (x) => round(x).toLocaleString("en-US");

  function group(ask, options, name, onChange) {
    const fs = el("fieldset"); fs.append(el("legend", null, ask));
    const box = el("div", "est-opts");
    options.forEach((o, i) => {
      const l = el("label"); const r = el("input"); r.type = "radio"; r.name = name; r.value = String(i); r.checked = i === 0;
      r.addEventListener("change", onChange);
      l.append(r, document.createTextNode(o.label)); box.append(l);
    });
    fs.append(box);
    return fs;
  }

  window.Estimate = {
    init(root, cfg) {
      if (!root) return null;
      if (!document.getElementById("est-css")) { const s = el("style"); s.id = "est-css"; s.textContent = CSS; document.head.append(s); }
      const id = "est" + ++n, unit = cfg.unit || "₪";
      const wrap = el("div", "est"), qs = el("div", "est-qs"), out = el("div", "est-out");
      const k = el("span", "est-k", "בדרך כלל"), sum = el("div", "est-sum"), why = el("p", "est-why"), note = el("p", "est-note", cfg.note || "");
      sum.setAttribute("aria-live", "polite"); sum.setAttribute("aria-atomic", "true");
      const go = el("button", "est-go", cfg.cta || "לפתוח קריאה עם זה"); go.type = "button";
      const groups = [{ ask: cfg.pick.ask, options: cfg.pick.items }].concat(cfg.factors || []);
      const sets = [];
      // The chosen item, then the answer to every question that applies to it.
      function picked() {
        const item = groups[0].options[+root.querySelector(`input[name="${id}-0"]:checked`).value];
        const fs = [];
        groups.forEach((g, i) => {
          if (!i) return;
          const on = !g.for || g.for.includes(item.label);
          sets[i].hidden = !on;
          if (on) fs.push(g.options[+root.querySelector(`input[name="${id}-${i}"]:checked`).value]);
        });
        return [item, ...fs];
      }

      function paint() {
        const [item, ...fs] = picked();
        if (!item.range) {
          k.textContent = ""; sum.textContent = cfg.quote || "לפי הצעת מחיר, אחרי שרואים את העבודה";
          sum.style.fontSize = "22px";
        } else {
          let [lo, hi] = item.range;
          for (const f of fs) { const m = pair(f.mul, 1), a = pair(f.add, 0); lo = lo * m[0] + a[0]; hi = hi * m[1] + a[1]; }
          k.textContent = "בדרך כלל"; sum.style.fontSize = "";
          sum.textContent = (round(lo) === round(hi) ? money(lo) : `${money(lo)} עד ${money(hi)}`) + " " + unit;
          const per = item.per || cfg.per;
          if (per) { sum.append(" "); sum.append(el("small", null, per)); }
        }
        const notes = [item, ...fs].map((x) => x.note).filter(Boolean);
        why.textContent = notes.join(" "); why.hidden = !notes.length;
      }
      groups.forEach((g, i) => { sets[i] = group(g.ask, g.options, `${id}-${i}`, paint); qs.append(sets[i]); });
      out.append(k, sum, why, note, go);
      wrap.append(qs, out);
      root.replaceChildren(wrap);
      go.addEventListener("click", () => {
        const all = picked(); const prefill = Object.assign({}, ...all.map((x) => x.prefill || {}));
        if (cfg.onAsk) cfg.onAsk(prefill, sum.textContent);
      });
      paint();
      return { paint };
    },
  };
})();
