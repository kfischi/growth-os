/*
  The playable instrument in the music demo's hero, one per instrument:
    piano, keys  a keyboard; every note lands on the staff
    guitar       five chords to strum; the chord's diagram shows what the fingers do
    bass         a small fretboard; every note lands on a tab
    drums        six pads; every hit lands on a pattern
  Instruments.mount(kind, { visual, control, last, name }) builds both parts. All sound is synthesised
  with WebAudio (no files, no recording) and starts only on a tap.
*/
(function () {
  let ctx = null;
  const audio = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); return ctx; } catch (e) { return null; } };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const svgNS = "http://www.w3.org/2000/svg";

  /* ---------- sounds ---------- */
  function tone(f, { types = [[1, "triangle", 1], [2, "sine", 0.35]], dur = 1.4, vol = 0.22 } = {}) {
    const c = audio(); if (!c) return;
    const t = c.currentTime, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(c.destination);
    types.forEach(([m, type, v]) => { const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = f * m; og.gain.value = v; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05); });
  }
  // A plucked string (Karplus-Strong): a burst of noise through a short delay that slowly loses its highs.
  function pluck(f, { when = 0, dur = 1.8, vol = 0.32, damp = 0.996 } = {}) {
    const c = audio(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur), N = Math.max(2, Math.round(c.sampleRate / f));
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 0, p = 0; i < n; i++) { const a = ring[p], b = ring[(p + 1) % N]; d[i] = a; ring[p] = damp * 0.5 * (a + b); p = (p + 1) % N; }
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = vol;
    s.connect(g); g.connect(c.destination); s.start(c.currentTime + when);
  }
  function noise(c, dur) { const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; return s; }
  const DRUM = {
    kick(c, t) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.4); },
    snare(c, t) { const n = noise(c, 0.25), f = c.createBiquadFilter(), g = c.createGain(); f.type = "highpass"; f.frequency.value = 1200; g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); n.connect(f); f.connect(g); g.connect(c.destination); n.start(t); DRUM.tom(c, t, 190, 0.12, 0.3); },
    hat(c, t) { const n = noise(c, 0.08), f = c.createBiquadFilter(), g = c.createGain(); f.type = "highpass"; f.frequency.value = 7000; g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); n.connect(f); f.connect(g); g.connect(c.destination); n.start(t); },
    tom(c, t, hz = 130, len = 0.4, vol = 0.6) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(hz, t); o.frequency.exponentialRampToValueAtTime(hz * 0.7, t + len); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + len + 0.05); },
    floor(c, t) { DRUM.tom(c, t, 85, 0.55, 0.7); },
    crash(c, t) { const n = noise(c, 1.6), f = c.createBiquadFilter(), g = c.createGain(); f.type = "highpass"; f.frequency.value = 4500; g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5); n.connect(f); f.connect(g); g.connect(c.destination); n.start(t); },
  };

  /* ---------- piano and keys: keyboard + staff ---------- */
  const NAMES = ["דו", "רה", "מי", "פה", "סול", "לה", "סי"], WHITE_SEMI = [0, 2, 4, 5, 7, 9, 11];
  function keyboard(kind, ui) {
    ui.visual.innerHTML = `<svg viewBox="0 0 420 150" role="img" aria-label="חמשה. התו שמנגנים מופיע עליה.">
      <g stroke="#c9ccd3" stroke-width="1.4"><line x1="20" y1="40" x2="404" y2="40"/><line x1="20" y1="54" x2="404" y2="54"/><line x1="20" y1="68" x2="404" y2="68"/><line x1="20" y1="82" x2="404" y2="82"/><line x1="20" y1="96" x2="404" y2="96"/></g>
      <path d="M52 112 c-10 0 -12 -12 -4 -14 c8 -2 10 10 2 12 M50 110 C46 70 70 60 66 34 C64 20 52 24 54 38 C58 66 34 70 36 88 C38 104 62 104 64 88 C66 74 48 72 46 84" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
      <text x="86" y="62" font-size="22" fill="currentColor" font-family="serif">4</text><text x="86" y="90" font-size="22" fill="currentColor" font-family="serif">4</text>
      <line x1="404" y1="40" x2="404" y2="96" stroke="currentColor" stroke-width="2"/><g class="notes"></g></svg>`;
    const notes = ui.visual.querySelector(".notes"), keys = el("div", "keys"); keys.setAttribute("role", "group"); keys.setAttribute("aria-label", "קלידים לנגינה");
    ui.control.replaceChildren(keys);
    const whites = 14; let played = [];
    const voice = kind === "keys" ? { types: [[1, "sine", 1], [3, "sine", 0.18], [4.01, "sine", 0.08]], dur: 1.1, vol: 0.26 } : {};
    function show(step, sharp, label) {
      const y = 96 - (step - 2) * 7; played.push({ y, sharp, step }); if (played.length > 8) played.shift();
      notes.innerHTML = played.map((n, i) => {
        const x = 130 + i * 34, last = i === played.length - 1, col = last ? "var(--felt)" : "currentColor";
        const ledger = n.step <= 0 ? `<line x1="${x - 13}" x2="${x + 13}" y1="110" y2="110" stroke="currentColor" stroke-width="1.6"/>` : n.step >= 12 ? `<line x1="${x - 13}" x2="${x + 13}" y1="26" y2="26" stroke="currentColor" stroke-width="1.6"/>` : "";
        const acc = n.sharp ? `<text x="${x - 22}" y="${n.y + 6}" font-size="18" fill="currentColor">♯</text>` : "";
        return `${ledger}${acc}<ellipse cx="${x}" cy="${n.y}" rx="8.5" ry="6.2" transform="rotate(-18 ${x} ${n.y})" fill="${col}"/><line x1="${x + 8}" y1="${n.y}" x2="${x + 8}" y2="${n.y - 34}" stroke="${col}" stroke-width="1.8"/>`;
      }).join("");
      ui.last.textContent = "ניגנתם:"; ui.name.textContent = label;
    }
    function press(b) { tone(261.63 * Math.pow(2, +b.dataset.semi / 12), voice); show(+b.dataset.step, b.dataset.sharp === "1", b.getAttribute("aria-label")); b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 180); }
    for (let i = 0; i < whites; i++) {
      const oct = Math.floor(i / 7), d = i % 7, b = el("button", "k w" + (i >= 10 ? " x2" : ""), d === 0 ? "דו" : null);
      b.type = "button"; b.dataset.semi = oct * 12 + WHITE_SEMI[d]; b.dataset.step = i; b.setAttribute("aria-label", NAMES[d]); keys.append(b);
    }
    for (let i = 0; i < whites - 1; i++) {
      const d = i % 7; if (![0, 1, 3, 4, 5].includes(d)) continue;
      const oct = Math.floor(i / 7), b = el("button", "k b" + (i >= 9 ? " x2" : ""));
      b.type = "button"; b.dataset.semi = oct * 12 + WHITE_SEMI[d] + 1; b.dataset.step = i; b.dataset.sharp = "1"; b.setAttribute("aria-label", NAMES[d] + " דיאז"); keys.append(b);
    }
    keys.addEventListener("pointerdown", (e) => { const b = e.target.closest(".k"); if (b) { e.preventDefault(); press(b); } });
    keys.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.closest(".k")) { e.preventDefault(); press(e.target.closest(".k")); } });
    const mq = matchMedia("(max-width: 620px)");
    function fit() { const n = mq.matches ? 10 : 14, pad = mq.matches ? 6 : 10; keys.style.setProperty("--whites", n);
      keys.querySelectorAll(".k.b").forEach((b) => { b.style.left = `calc(${pad}px + (100% - ${pad * 2}px) / ${n} * ${+b.dataset.step + 1})`; }); }
    fit(); mq.addEventListener ? mq.addEventListener("change", fit) : mq.addListener(fit);
  }

  /* ---------- guitar: five chords and their diagrams ---------- */
  const OPEN = [82.41, 110, 146.83, 196, 246.94, 329.63]; // E A D G B E
  const CHORDS = { "Am": [-1, 0, 2, 2, 1, 0], "C": [-1, 3, 2, 0, 1, 0], "G": [3, 2, 0, 0, 0, 3], "Em": [0, 2, 2, 0, 0, 0], "D": [-1, -1, 0, 2, 3, 2] };
  const HE = { "Am": "לה מינור", "C": "דו מז׳ור", "G": "סול מז׳ור", "Em": "מי מינור", "D": "רה מז׳ור" };
  function chordSVG(name) {
    const f = CHORDS[name]; let s = `<svg viewBox="0 0 220 170" role="img" aria-label="${HE[name]}: איפה האצבעות"><text x="110" y="22" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor" font-family="sans-serif">${name}</text>`;
    s += `<rect x="40" y="38" width="140" height="5" fill="currentColor"/>`;
    for (let i = 0; i < 6; i++) s += `<line x1="${40 + i * 28}" y1="40" x2="${40 + i * 28}" y2="158" stroke="currentColor" stroke-width="${1 + (5 - i) * 0.3}"/>`;
    for (let j = 1; j <= 4; j++) s += `<line x1="40" y1="${40 + j * 29}" x2="180" y2="${40 + j * 29}" stroke="#9aa0aa" stroke-width="1.2"/>`;
    f.forEach((fr, i) => { const x = 40 + i * 28;
      if (fr < 0) s += `<text x="${x}" y="34" text-anchor="middle" font-size="13" fill="currentColor" font-family="sans-serif">×</text>`;
      else if (fr === 0) s += `<circle cx="${x}" cy="30" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
      else s += `<circle cx="${x}" cy="${40 + fr * 29 - 14.5}" r="10" fill="var(--felt)"/>`; });
    return s + "</svg>";
  }
  function guitar(ui) {
    ui.visual.innerHTML = chordSVG("Am");
    const neck = el("div", "neck"), row = el("div", "chords"); row.setAttribute("role", "group"); row.setAttribute("aria-label", "אקורדים לנגינה");
    for (let i = 0; i < 6; i++) neck.append(el("span", "str"));
    Object.keys(CHORDS).forEach((name) => {
      const b = el("button", "chord", name); b.type = "button"; b.setAttribute("aria-label", "לנגן " + HE[name]);
      b.addEventListener("click", () => {
        CHORDS[name].forEach((fr, i) => { if (fr >= 0) pluck(OPEN[i] * Math.pow(2, fr / 12), { when: i * 0.028, vol: 0.22 }); });
        ui.visual.innerHTML = chordSVG(name); ui.last.textContent = "ניגנתם:"; ui.name.textContent = HE[name];
        if (!reduce) { neck.classList.remove("ring"); void neck.offsetWidth; neck.classList.add("ring"); }
        row.querySelectorAll(".chord").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      });
      row.append(b);
    });
    ui.control.replaceChildren(row, neck);
  }

  /* ---------- bass: four strings, five frets, and the tab ---------- */
  const BASS = [["G", 98], ["D", 73.42], ["A", 55], ["E", 41.2]]; // top to bottom, as on a tab
  function bass(ui) {
    let played = [];
    const draw = () => {
      let s = `<svg viewBox="0 0 420 150" role="img" aria-label="טאבולטורה. כל צליל שמנגנים מופיע עליה."><text x="22" y="45" font-size="14" font-weight="700" fill="currentColor" font-family="monospace">T</text><text x="22" y="75" font-size="14" font-weight="700" fill="currentColor" font-family="monospace">A</text><text x="22" y="105" font-size="14" font-weight="700" fill="currentColor" font-family="monospace">B</text>`;
      BASS.forEach(([n], i) => { const y = 36 + i * 26; s += `<line x1="44" y1="${y}" x2="404" y2="${y}" stroke="#c9ccd3" stroke-width="1.4"/><text x="408" y="${y + 4}" font-size="11" fill="#8a8e97" font-family="monospace">${n}</text>`; });
      played.forEach((p, i) => { const x = 74 + i * 40, y = 36 + p.s * 26, last = i === played.length - 1;
        s += `<rect x="${x - 10}" y="${y - 10}" width="20" height="20" fill="var(--ivory, #fff)"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="${last ? "var(--felt)" : "currentColor"}" font-family="monospace">${p.f}</text>`; });
      ui.visual.innerHTML = s + "</svg>";
    };
    draw();
    const board = el("div", "fretboard"); board.setAttribute("role", "group"); board.setAttribute("aria-label", "גריף של בס: מיתר ושריג");
    BASS.forEach(([n, hz], s) => {
      for (let f = 0; f <= 4; f++) {
        const b = el("button", "fret" + (f === 0 ? " open" : ""), f === 0 ? n : null); b.type = "button";
        b.setAttribute("aria-label", `מיתר ${n}, ${f === 0 ? "פתוח" : "שריג " + f}`);
        b.addEventListener("click", () => {
          pluck(hz * Math.pow(2, f / 12), { dur: 2.2, vol: 0.5, damp: 0.998 });
          played.push({ s, f }); if (played.length > 8) played.shift(); draw();
          ui.last.textContent = "ניגנתם:"; ui.name.textContent = `מיתר ${n}, ${f === 0 ? "פתוח" : "שריג " + f}`;
          b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 160);
        });
        board.append(b);
      }
    });
    ui.control.replaceChildren(board);
  }

  /* ---------- drums: six pads and the pattern ---------- */
  const PADS = [["hat", "היי־האט"], ["crash", "מצילה"], ["snare", "סנר"], ["tom", "טום"], ["kick", "בס"], ["floor", "טום רצפה"]];
  const LANE = { hat: 0, crash: 0, snare: 1, tom: 2, floor: 2, kick: 3 };
  function drums(ui) {
    let hits = [];
    const draw = () => {
      let s = `<svg viewBox="0 0 420 150" role="img" aria-label="תבנית קצב. כל מכה מופיעה עליה.">`;
      ["מצלות", "סנר", "טומים", "בס"].forEach((n, i) => { const y = 32 + i * 28; s += `<line x1="70" y1="${y}" x2="404" y2="${y}" stroke="#c9ccd3" stroke-width="1.4"/><text x="62" y="${y + 5}" text-anchor="end" font-size="14" font-weight="700" fill="#565a63" font-family="sans-serif">${n}</text>`; });
      for (let i = 0; i < 8; i++) s += `<line x1="${92 + i * 40}" y1="22" x2="${92 + i * 40}" y2="126" stroke="#e3e5ea" stroke-width="1" ${i % 4 ? 'stroke-dasharray="2 4"' : ""}/>`;
      hits.forEach((h, i) => { const x = 92 + i * 40, y = 32 + LANE[h] * 28, last = i === hits.length - 1, col = last ? "var(--felt)" : "currentColor";
        s += h === "hat" || h === "crash" ? `<path d="M${x - 7} ${y - 7}L${x + 7} ${y + 7}M${x + 7} ${y - 7}L${x - 7} ${y + 7}" stroke="${col}" stroke-width="2.6"/>` : `<circle cx="${x}" cy="${y}" r="8" fill="${col}"/>`; });
      ui.visual.innerHTML = s + "</svg>";
    };
    draw();
    const pads = el("div", "pads"); pads.setAttribute("role", "group"); pads.setAttribute("aria-label", "פדים לנגינה");
    PADS.forEach(([k, label]) => {
      const b = el("button", "pad pad-" + k, label); b.type = "button"; b.setAttribute("aria-label", "לנגן " + label);
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); hit(); });
      b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hit(); } });
      function hit() { const c = audio(); if (c) DRUM[k](c, c.currentTime); hits.push(k); if (hits.length > 8) hits.shift(); draw(); ui.last.textContent = "ניגנתם:"; ui.name.textContent = label; b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 130); }
      pads.append(b);
    });
    ui.control.replaceChildren(pads);
  }

  window.Instruments = {
    mount(kind, ui) {
      ui.control.dataset.kind = kind;
      if (kind === "guitar") return guitar(ui);
      if (kind === "bass") return bass(ui);
      if (kind === "drums") return drums(ui);
      return keyboard(kind, ui);
    },
  };
})();
