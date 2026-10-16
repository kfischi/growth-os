// The looks of the plumber template: six layouts on the same content, each with eight colour palettes.
// The owner picks one in the builder ("עיצוב") and sees the draft change next to the chat.
// A look is fonts, a few CSS overrides and the picture at the top of the page. A palette is only colours.
// No yellow in any palette (house rule). Text on every colour keeps WCAG AA contrast.
//
// content.look and content.palette hold the choice; anything unknown falls back to the first look and palette.

// The blueprint drawing: lines and dots in the palette's colours (CSS classes, see LOOK_CSS.blueprint).
const DRAWING = `<svg class="drawing" viewBox="0 0 520 420" aria-hidden="true">
      <path class="p" d="M40 300 L170 225 L170 140 L300 65 L430 140"/>
      <path class="p" d="M170 225 L300 300 L300 360"/>
      <path class="p" d="M430 140 L430 230 L360 270"/>
      <g class="n">
        <circle cx="170" cy="225" r="9"/><circle cx="170" cy="140" r="9"/><circle cx="300" cy="65" r="9"/>
        <circle cx="430" cy="140" r="9"/><circle cx="300" cy="300" r="9"/><circle cx="430" cy="230" r="9"/>
      </g>
      <g class="w" transform="translate(235 102)"><path d="M-14 -8 L14 8 M-14 8 L14 -8"/><path d="M0 0 L0 -22 M-10 -22 L10 -22" stroke-linecap="round"/></g>
      <circle class="s" cx="360" cy="270" r="6"/>
      <path class="drop" d="M360 282 c-5 8 -7 12 -7 16 a7 7 0 0 0 14 0 c0 -4 -2 -8 -7 -16z"/>
      <path class="d" d="M40 330 L170 255"/><text x="70" y="318">Ø 3/4״</text>
      <path class="d" d="M200 140 L200 225"/><text x="208" y="190">85 ס״מ</text>
      <text x="318" y="52">לחץ 3.5 בר</text>
      <text class="st" x="372" y="300">נקודת נזילה</text>
      <text x="40" y="404">שרטוט: מטבח, דירה 3 חד׳ · גיליון 1/1</text>
    </svg>`;

// The same blueprint sheet for any other trade: a floor plan with the owner's own first services as its notes.
function planDrawing({ h, c }) {
  const names = (Array.isArray(c.services) ? c.services : []).map((s) => String((s && s.name) || "").trim()).filter(Boolean);
  const note = (i, fallback) => h((names[i] || fallback).slice(0, 26));
  return `<svg class="drawing" viewBox="0 0 520 420" aria-hidden="true">
      <path class="p" d="M60 60 H460 V360 H60 Z"/>
      <path class="p" d="M60 210 H250 V360 M250 60 V150 M330 210 H460 M330 210 V360"/>
      <g class="n"><circle cx="250" cy="150" r="9"/><circle cx="250" cy="210" r="9"/><circle cx="330" cy="210" r="9"/><circle cx="155" cy="135" r="9"/></g>
      <path class="d" d="M60 384 H460"/><text x="240" y="378">8.40 מ׳</text>
      <path class="d" d="M484 60 V360"/><text x="438" y="214">6.10 מ׳</text>
      <circle class="s" cx="395" cy="285" r="6"/>
      <text x="92" y="120">${note(0, "עבודה")}</text>
      <text x="92" y="290">${note(1, String(c.trade || "").trim() || "תכנון")}</text>
      <text class="st" x="352" y="270">${note(2, "כאן מתחילים")}</text>
      <text x="40" y="410">שרטוט: ${h(String(c.trade || "").trim().slice(0, 20) || "תוכנית")} · גיליון 1/1</text>
    </svg>`;
}

// The certificate's seal: the owner's own warranty, or years, or else just the trade. Nothing invented.
function seal({ h, c, yearsHe }) {
  const w = String(c.warranty || "").trim(), y = String(c.years || "").trim(), trade = String(c.trade || "").trim();
  const [big, small] = w ? [w, "אחריות"] : y ? [yearsHe(y), "בתחום"] : [trade || "עבודה", "בעבודה מסודרת"];
  // The inner ring is about 110 units wide: the text shrinks to fit it.
  const size = Math.max(14, Math.min(36, Math.floor(100 / (big.length * 0.56))));
  return `<div class="seal" aria-hidden="true"><svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="96" class="s1"/><circle cx="100" cy="100" r="88" class="s2"/>
        <circle cx="100" cy="100" r="74" class="s3"/><circle cx="100" cy="100" r="58" class="s1"/>
        <text x="100" y="${100 + Math.round(size * 0.18)}" class="sb" font-size="${size}">${h(big)}</text>
        <text x="100" y="126" class="ss">${h(small)}</text>
      </svg></div>`;
}

// The van's side panel: the name and the phone number, painted big.
function vanPlate({ h, v, has, c, callLocal, prettyPhone, draft }) {
  const num = callLocal ? `<a class="vp-num" href="tel:${h(callLocal)}" dir="ltr">${h(prettyPhone(callLocal))}</a>`
    : draft ? `<span class="vp-num"><span class="todo">טלפון</span></span>` : "";
  return `<div class="vanplate">
      <span class="vp-tag mono"><i></i>${has("hours") ? h(c.hours) : v("trade")}</span>
      <b class="vp-name">${v("business_name")}</b>
      ${num}
      <span class="vp-stripe" aria-hidden="true"></span>
      <span class="vp-area">${v("area")}</span>
    </div>`;
}


// The work ticket: the business's own first services as the lines of an open job card. Nothing invented.
function jobTicket({ h, v, has, c, draft }) {
  const names = (Array.isArray(c.services) ? c.services : []).map((s) => String((s && s.name) || "").trim()).filter(Boolean).slice(0, 4);
  const lines = names.length ? names.map((n, i) => `<li><i class="${i ? "" : "on"}"></i>${h(n)}</li>`).join("")
    : draft ? `<li><i></i><span class="todo">השירותים שלכם</span></li>` : "";
  return `<div class="ticket">
      <div class="tk-head mono"><span>כרטיס עבודה</span><span class="tk-open">פתוח</span></div>
      <b class="tk-name">${v("business_name")}</b>
      ${lines ? `<ul class="tk-list">${lines}</ul>` : ""}
      <div class="tk-foot mono">${has("response_time") ? `חוזרים תוך ${h(c.response_time)}` : v("trade")}<span>${v("area")}</span></div>
    </div>`;
}

// The dispatch board: the business's status, area, hours and phone, as on a control-room screen.
function dispatchBoard({ h, v, has, c, callLocal, prettyPhone, draft, words = {} }) {
  const num = callLocal ? `<a class="db-num" href="tel:${h(callLocal)}" dir="ltr">${h(prettyPhone(callLocal))}</a>`
    : draft ? `<span class="db-num"><span class="todo">טלפון</span></span>` : "";
  const row = (k, val) => `<div class="db-row"><span>${k}</span><b>${val}</b></div>`;
  return `<div class="board">
      <div class="db-top mono"><span class="db-dot" aria-hidden="true"></span>מוקד ${v("business_name")}</div>
      ${row("סטטוס", h(words.status || "מקבלים קריאות"))}
      ${has("response_time") ? row("זמן חזרה", h(c.response_time)) : ""}
      ${row("אזור", v("area"))}
      ${has("hours") ? row("שעות", h(c.hours)) : ""}
      ${num}
    </div>`;
}

// The mosaic: tiles in the palette's colours, the business's first letter on the big one.
function mosaicTiles({ h, c }) {
  const letter = String(c.business_name || "").trim().charAt(0) || "·";
  const t = (cls) => `<i class="t ${cls}"></i>`;
  return `<div class="mosaic" aria-hidden="true">
      ${t("a")}${t("b")}${t("c")}<span class="t big">${h(letter)}</span>${t("d")}${t("a")}
      ${t("c")}${t("b")}${t("d")}${t("a")}${t("c")}${t("b")}
    </div>`;
}

export const LOOKS = {
  blueprint: {
    label: "שרטוט",
    note: "דף שרטוט טכני עם רשת קווים",
    fonts: "family=Secular+One&family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500",
    dark: true,
    visual: (a) => (a.tradeId && a.tradeId !== "plumber" ? planDrawing(a) : DRAWING),
    palettes: {
      blue: { label: "כחול", hero: "#123a8c", deep: "#0c2a68", accent: "#123a8c", signal: "#cc2e26", paper: "#f3f6fb", tint: "#eef2f9", ink: "#0f1d3a", inkSoft: "#4b5873", rule: "#c9d4e6", soft: "#a9bce6", text: "#d5def3", linew: "#e8efff", psA: "#2a56b8", drop: "#7fb2ff" },
      green: { label: "ירוק", hero: "#17493c", deep: "#0f342b", accent: "#17493c", signal: "#bf3f2b", paper: "#f2f6f3", tint: "#e9f0eb", ink: "#13241e", inkSoft: "#4c5e56", rule: "#c8d6cd", soft: "#a7c9b9", text: "#d3e5dc", linew: "#e6f2ec", psA: "#2c7a63", drop: "#8fd1b7" },
      graphite: { label: "גרפיט", hero: "#262c35", deep: "#191d23", accent: "#2f3a48", signal: "#c73c2c", paper: "#f3f4f6", tint: "#eceef1", ink: "#181c22", inkSoft: "#535b67", rule: "#cfd4db", soft: "#aab3c0", text: "#d6dbe2", linew: "#eceff3", psA: "#4a5668", drop: "#8fb4e6" },
      wine: { label: "בורדו", hero: "#5b1f2e", deep: "#3f1520", accent: "#6b2436", signal: "#1f6f6a", paper: "#f7f3f3", tint: "#f1e9ea", ink: "#2a1418", inkSoft: "#6a5257", rule: "#e0cfd2", soft: "#d9b3bc", text: "#ecd8dc", linew: "#f6e8eb", psA: "#8a3a4e", drop: "#e6a3b2" },
      petrol: { label: "פטרול", hero: "#0f4c5c", deep: "#0a3540", accent: "#0f4c5c", signal: "#c4412d", paper: "#f1f6f7", tint: "#e6eff1", ink: "#0f2328", inkSoft: "#4a5f64", rule: "#c5d6da", soft: "#a3c8d1", text: "#d2e6eb", linew: "#e4f2f5", psA: "#1f7489", drop: "#8fd0e0" },
      plum: { label: "שזיף", hero: "#4a2350", deep: "#33173a", accent: "#4a2350", signal: "#1f7a6c", paper: "#f6f2f7", tint: "#efe7f0", ink: "#24152a", inkSoft: "#5f4f66", rule: "#dccfe0", soft: "#d0b4d6", text: "#eadcee", linew: "#f5eaf7", psA: "#6e3a78", drop: "#d6a8e0" },
      earth: { label: "חום אדמה", hero: "#5a3a22", deep: "#3f2817", accent: "#5a3a22", signal: "#2a6f8f", paper: "#f7f3ee", tint: "#efe8df", ink: "#2a1d12", inkSoft: "#665748", rule: "#ddd0c1", soft: "#d6bfa6", text: "#ecdfd0", linew: "#f6ece1", psA: "#80573a", drop: "#9fc9dc" },
      night: { label: "לילה", hero: "#151b2e", deep: "#0d1120", accent: "#1f2942", signal: "#d0452f", paper: "#f3f4f7", tint: "#eaecf2", ink: "#141826", inkSoft: "#4f5568", rule: "#cdd1dc", soft: "#a7afc6", text: "#d4d9e6", linew: "#e9ecf5", psA: "#33406a", drop: "#8fa8e6" },
    },
  },
  certificate: {
    label: "תעודת אחריות",
    note: "מסגרת כמו של תעודה, וחותמת. רציני ואמין",
    fonts: "family=Noto+Serif+Hebrew:wght@700;900&family=Noto+Sans+Hebrew:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500",
    dark: false,
    visual: seal,
    palettes: {
      green: { label: "ירוק מסמך", accent: "#1f4d3f", deep: "#12332a", signal: "#9b2c2c", paper: "#f4f1e9", tint: "#ebe7dc", ink: "#1a2420", inkSoft: "#4f5c56", rule: "#cfd6cf", soft: "#b6cbbf", text: "#dbe6df", linew: "#eef4f0" },
      navy: { label: "כחול", accent: "#1e3a6b", deep: "#12264a", signal: "#a1342b", paper: "#f2f3f6", tint: "#e7eaf0", ink: "#161d2b", inkSoft: "#4d5668", rule: "#cdd3de", soft: "#aebbd3", text: "#d8dfec", linew: "#edf1f8" },
      plum: { label: "שזיף", accent: "#4a2a52", deep: "#321b38", signal: "#1f5f5b", paper: "#f5f1f3", tint: "#ece4ea", ink: "#23192a", inkSoft: "#5c4f61", rule: "#d9cfd9", soft: "#c8b3cc", text: "#e6dae8", linew: "#f4ecf5" },
      slate: { label: "צפחה", accent: "#2f3b45", deep: "#1e262d", signal: "#b4462a", paper: "#f1f3f3", tint: "#e6eaeb", ink: "#1b2126", inkSoft: "#525d66", rule: "#ccd3d6", soft: "#b0bcc4", text: "#d9e0e4", linew: "#eef2f4" },
      burgundy: { label: "בורדו", accent: "#6b1f2e", deep: "#4a1520", signal: "#1f5f5b", paper: "#f7f2f0", tint: "#efe6e3", ink: "#2a1418", inkSoft: "#66525a", rule: "#e0d0d2", soft: "#dbb4bc", text: "#eedadf", linew: "#f7eaee" },
      sea: { label: "ים", accent: "#1d5c63", deep: "#123f44", signal: "#a6402b", paper: "#f1f5f4", tint: "#e5eeec", ink: "#13272a", inkSoft: "#4c6064", rule: "#c8d8d8", soft: "#a9cdd0", text: "#d6e8ea", linew: "#ebf5f5" },
      brown: { label: "חום", accent: "#5b4030", deep: "#3e2b20", signal: "#2c5f7a", paper: "#f5f1ea", tint: "#ece5da", ink: "#271c14", inkSoft: "#63574c", rule: "#dcd1c3", soft: "#d3bda8", text: "#ebdfd2", linew: "#f6eee4" },
      charcoal: { label: "פחם", accent: "#262a30", deep: "#16191d", signal: "#9b2c2c", paper: "#f3f3f2", tint: "#e8e8e6", ink: "#17191c", inkSoft: "#55585e", rule: "#d2d3d4", soft: "#b4b8be", text: "#dcdfe2", linew: "#eff0f1" },
    },
  },
  van: {
    label: "שלט על הרכב",
    note: "צבע אחד חזק ומספר טלפון ענק, כמו על הוואן",
    fonts: "family=Rubik:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500",
    dark: true,
    visual: vanPlate,
    palettes: {
      red: { label: "אדום", hero: "#b93427", deep: "#8e2419", accent: "#b93427", signal: "#1c1d21", paper: "#ffffff", tint: "#f3f3f5", ink: "#1c1d21", inkSoft: "#5a5d66", rule: "#e3e4e8", soft: "#fbd9d4", text: "#fff0ee", linew: "#ffffff" },
      teal: { label: "טורקיז", hero: "#0e7470", deep: "#0a5552", accent: "#0e7470", signal: "#1c1d21", paper: "#ffffff", tint: "#f1f5f5", ink: "#1c1d21", inkSoft: "#5a5d66", rule: "#e1e6e6", soft: "#c9ecea", text: "#e7f7f6", linew: "#ffffff" },
      royal: { label: "כחול רויאל", hero: "#2342b8", deep: "#182f88", accent: "#2342b8", signal: "#1c1d21", paper: "#ffffff", tint: "#f2f4fa", ink: "#1c1d21", inkSoft: "#5a5d66", rule: "#e2e5ee", soft: "#d0d9fa", text: "#e8edfd", linew: "#ffffff" },
      graphite: { label: "גרפיט", hero: "#2b2e35", deep: "#1a1c21", accent: "#2b2e35", signal: "#b93427", paper: "#ffffff", tint: "#f3f3f5", ink: "#1c1d21", inkSoft: "#5a5d66", rule: "#e3e4e8", soft: "#c4c7ce", text: "#e6e8ec", linew: "#ffffff" },
      bottle: { label: "ירוק בקבוק", hero: "#1f6a45", deep: "#164f33", accent: "#1f6a45", signal: "#1c1d21", paper: "#ffffff", tint: "#f1f5f3", ink: "#1c1d21", inkSoft: "#5a5d66", rule: "#e1e7e3", soft: "#c8e6d6", text: "#e6f5ec", linew: "#ffffff" },
      purple: { label: "סגול", hero: "#5b2a86", deep: "#3f1d5e", accent: "#5b2a86", signal: "#1c1d21", paper: "#ffffff", tint: "#f4f1f8", ink: "#1c1d21", inkSoft: "#5a5d66", rule: "#e5e0ec", soft: "#ddcdee", text: "#f1e9f8", linew: "#ffffff" },
      fuchsia: { label: "פוקסיה", hero: "#b5245f", deep: "#861a46", accent: "#b5245f", signal: "#1c1d21", paper: "#ffffff", tint: "#f8f1f4", ink: "#1c1d21", inkSoft: "#5a5d66", rule: "#ece0e5", soft: "#f6cfdd", text: "#fdebf2", linew: "#ffffff" },
      navy: { label: "נייבי", hero: "#1b2f5e", deep: "#111f40", accent: "#1b2f5e", signal: "#b93427", paper: "#ffffff", tint: "#f2f3f7", ink: "#1c1d21", inkSoft: "#5a5d66", rule: "#e2e4ec", soft: "#c9d3ec", text: "#e6ebf7", linew: "#ffffff" },
    },
  },
  ticket: {
    label: "כרטיס עבודה",
    note: "כמו כרטיס עבודה פתוח, עם השירותים שלכם. מעשי וברור",
    fonts: "family=Assistant:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500",
    dark: false,
    visual: jobTicket,
    palettes: {
      blue: { label: "כחול עבודה", accent: "#1d4ea0", deep: "#143a78", signal: "#b3372a", paper: "#f6f4ee", tint: "#ece8dc", ink: "#1b2230", inkSoft: "#525b6b", rule: "#d9d4c6", soft: "#b8c9e8", text: "#dde6f6", linew: "#eef3fb" },
      green: { label: "ירוק", accent: "#1f6648", deep: "#154a34", signal: "#b3372a", paper: "#f5f5ef", tint: "#eaeadf", ink: "#1a241f", inkSoft: "#4f5b55", rule: "#d6d8cb", soft: "#b6d6c6", text: "#dcefe5", linew: "#edf7f1" },
      brick: { label: "לבנה", accent: "#a33a26", deep: "#7a2a1b", signal: "#1f4f7a", paper: "#f7f3ec", tint: "#efe7da", ink: "#2a1d18", inkSoft: "#62554f", rule: "#e0d5c5", soft: "#ebc3b8", text: "#f6e4df", linew: "#fbf0ec" },
      charcoal: { label: "פחם", accent: "#2c3038", deep: "#1b1e23", signal: "#b3372a", paper: "#f5f4f1", tint: "#eae8e3", ink: "#1b1d21", inkSoft: "#55585f", rule: "#d8d6d0", soft: "#c2c5cc", text: "#e2e4e8", linew: "#f0f1f3" },
      teal: { label: "טורקיז", accent: "#0d6b6b", deep: "#094d4d", signal: "#b3372a", paper: "#f3f6f4", tint: "#e6eeeb", ink: "#14262a", inkSoft: "#4c5f62", rule: "#cfdcd9", soft: "#b3dcdb", text: "#ddf1f0", linew: "#ecf8f7" },
      violet: { label: "סגול", accent: "#5a3192", deep: "#40226b", signal: "#1d6b5c", paper: "#f6f4f8", tint: "#ebe7f1", ink: "#221a2e", inkSoft: "#5b536a", rule: "#dbd5e4", soft: "#d2c2ea", text: "#ece4f7", linew: "#f5f0fb" },
      rust: { label: "חלודה", accent: "#8a4519", deep: "#653212", signal: "#1f4f7a", paper: "#f7f2eb", tint: "#efe5d8", ink: "#2a1e14", inkSoft: "#625548", rule: "#e0d3c2", soft: "#e5c6ab", text: "#f5e6d8", linew: "#fbf2ea" },
      navy: { label: "נייבי", accent: "#1c2f5c", deep: "#111e3e", signal: "#b3372a", paper: "#f4f4f1", tint: "#e8e8e2", ink: "#171c28", inkSoft: "#505666", rule: "#d6d6ce", soft: "#c2cbe3", text: "#e1e7f4", linew: "#eff2f9" },
    },
  },
  dispatch: {
    label: "מוקד",
    note: "מסך מוקד כהה: זמינים, זמן חזרה ומספר טלפון גדול",
    fonts: "family=Heebo:wght@400;500;700;800;900&family=IBM+Plex+Mono:wght@400;500",
    dark: true,
    visual: dispatchBoard,
    palettes: {
      teal: { label: "לילה וטורקיז", hero: "#0f1418", deep: "#0a0e11", accent: "#0f6b66", signal: "#0f6b66", paper: "#f3f5f5", tint: "#e7ecec", ink: "#121a1d", inkSoft: "#4b585c", rule: "#cdd8d8", soft: "#9fb4b6", text: "#d3e0e1", linew: "#7ee0d6", drop: "#5cd3c7" },
      red: { label: "לילה ואדום", hero: "#141113", deep: "#0d0b0c", accent: "#b2321f", signal: "#b2321f", paper: "#f6f4f3", tint: "#ece8e6", ink: "#1d1715", inkSoft: "#5d5452", rule: "#ddd5d2", soft: "#b8aaa8", text: "#e6dbd9", linew: "#ff8f7c", drop: "#ff7a66" },
      blue: { label: "לילה וכחול", hero: "#0e1220", deep: "#090c16", accent: "#2347b0", signal: "#2347b0", paper: "#f3f4f8", tint: "#e7e9f1", ink: "#141827", inkSoft: "#4e5468", rule: "#d0d4e1", soft: "#a6aec8", text: "#d6dbea", linew: "#8fb0ff", drop: "#7aa2ff" },
      green: { label: "לילה וירוק", hero: "#0e1511", deep: "#09100c", accent: "#1d6b3f", signal: "#1d6b3f", paper: "#f3f6f3", tint: "#e6eee8", ink: "#131b16", inkSoft: "#4c5a51", rule: "#cddacf", soft: "#a1b8a8", text: "#d4e3d8", linew: "#7fe0a4", drop: "#69d494" },
      violet: { label: "לילה וסגול", hero: "#13101c", deep: "#0c0a13", accent: "#5b34a6", signal: "#5b34a6", paper: "#f5f3f8", tint: "#ebe7f2", ink: "#1b1626", inkSoft: "#575069", rule: "#d9d3e4", soft: "#b2a8c8", text: "#e0daec", linew: "#c3a6ff", drop: "#b090ff" },
      magenta: { label: "לילה ומג׳נטה", hero: "#160f15", deep: "#0e0a0e", accent: "#a3245c", signal: "#a3245c", paper: "#f7f3f5", tint: "#efe6ea", ink: "#21161c", inkSoft: "#5f515a", rule: "#e0d3d9", soft: "#c2a7b5", text: "#ecdbe3", linew: "#ff8fc0", drop: "#ff7ab3" },
      steel: { label: "פלדה", hero: "#1a1e24", deep: "#111418", accent: "#3a4655", signal: "#b2321f", paper: "#f3f4f5", tint: "#e8eaec", ink: "#171a1e", inkSoft: "#51575f", rule: "#d3d7dc", soft: "#a9b1bc", text: "#d9dee4", linew: "#b6c4d6", drop: "#9fb4cc" },
      ocean: { label: "לילה ותכלת", hero: "#0c1519", deep: "#080f12", accent: "#135c78", signal: "#135c78", paper: "#f2f5f7", tint: "#e5ecf0", ink: "#111b20", inkSoft: "#4a5861", rule: "#ccd8de", soft: "#9db5c0", text: "#d1e1e8", linew: "#7fd0f0", drop: "#66c3ea" },
    },
  },
  mosaic: {
    label: "פסיפס",
    note: "אריחים צבעוניים ופינות מעוגלות. חם ונעים",
    fonts: "family=Varela+Round&family=Rubik:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500",
    dark: false,
    visual: mosaicTiles,
    palettes: {
      aqua: { label: "מים", accent: "#0f5f7a", deep: "#0a4458", signal: "#b3372a", paper: "#f7fafb", tint: "#e3f0f4", ink: "#13222a", inkSoft: "#4b5c64", rule: "#d2e2e8", soft: "#b5dbe8", text: "#dff0f6", linew: "#eef8fb", psA: "#7cc6dc" },
      sage: { label: "מרווה", accent: "#2f6248", deep: "#204634", signal: "#b3372a", paper: "#f7f9f6", tint: "#e5eee7", ink: "#17221c", inkSoft: "#4e5d54", rule: "#d4e0d7", soft: "#bfd9c8", text: "#e2f0e6", linew: "#f0f8f2", psA: "#9fcab0" },
      terracotta: { label: "טרקוטה", accent: "#9a3d22", deep: "#722c18", signal: "#1f5a72", paper: "#fbf8f5", tint: "#f4e8e0", ink: "#2a1c16", inkSoft: "#62544e", rule: "#e8dad0", soft: "#efc9b8", text: "#f8e6de", linew: "#fdf3ee", psA: "#e2a387" },
      cobalt: { label: "קובלט", accent: "#2341a0", deep: "#182e74", signal: "#b3372a", paper: "#f8f9fc", tint: "#e6eaf6", ink: "#161c2e", inkSoft: "#4f5670", rule: "#d6dcee", soft: "#c2cdf0", text: "#e3e9fa", linew: "#f0f3fd", psA: "#8ea4e6" },
      plum: { label: "שזיף", accent: "#6a2c6b", deep: "#4c1f4d", signal: "#1f6b5c", paper: "#fbf8fb", tint: "#f2e6f1", ink: "#26172a", inkSoft: "#5e5163", rule: "#e6d8e5", soft: "#e2c3e1", text: "#f5e5f4", linew: "#fbf1fa", psA: "#c993c7" },
      slate: { label: "צפחה", accent: "#34495c", deep: "#233342", signal: "#b3372a", paper: "#f8f9fa", tint: "#e8ecef", ink: "#192129", inkSoft: "#525c66", rule: "#d9dfe4", soft: "#c3ced8", text: "#e5ebf0", linew: "#f1f4f7", psA: "#9fb2c3" },
      rose: { label: "ורד", accent: "#9c2f4f", deep: "#742239", signal: "#1f5a72", paper: "#fcf8f9", tint: "#f5e5ea", ink: "#2a171d", inkSoft: "#63515a", rule: "#ebd7de", soft: "#f0c3d1", text: "#f9e5ec", linew: "#fdf2f5", psA: "#e39ab0" },
      forest: { label: "יער", accent: "#2d5638", deep: "#1f3d27", signal: "#9c2f4f", paper: "#f7f9f6", tint: "#e3ece4", ink: "#17221a", inkSoft: "#4f5d52", rule: "#d3dfd5", soft: "#bcd6c2", text: "#e1efe4", linew: "#eff7f1", psA: "#8fbf9b" },
    },
  },
};

export const DEFAULT_LOOK = "blueprint";

// The look and palette a content object asks for, or the defaults.
export function lookOf(c) {
  const id = Object.hasOwn(LOOKS, c && c.look) ? c.look : DEFAULT_LOOK;
  const look = LOOKS[id];
  const pid = Object.hasOwn(look.palettes, c && c.palette) ? c.palette : Object.keys(look.palettes)[0];
  return { id, look, pid, p: look.palettes[pid] };
}

// What the builder page shows: the looks, their palettes and a few colours of each to draw the swatch.
export function catalog() {
  return Object.entries(LOOKS).map(([id, l]) => ({
    id, label: l.label, note: l.note,
    palettes: Object.entries(l.palettes).map(([pid, p]) => ({ id: pid, label: p.label, swatch: [l.dark ? p.hero : p.paper, p.accent, p.signal] })),
  }));
}

// The palette as CSS custom properties. Dark looks put light text on the hero; the certificate's hero is paper.
export function cssVars(look, p) {
  const line = (a) => `color-mix(in srgb, ${p.linew} ${a}%, transparent)`;
  const v = {
    "--paper": p.paper, "--surface": "#ffffff", "--tint": p.tint, "--ink": p.ink, "--ink-soft": p.inkSoft, "--rule": p.rule,
    "--signal": p.signal, "--accent": p.accent, "--deep": p.deep, "--line-w": p.linew,
    "--on-deep-soft": p.soft, "--on-deep-text": p.text, "--on-deep-line": line(35), "--on-deep-line-strong": line(55),
    "--ps-a": p.psA || p.accent, "--ps-b": p.deep, "--drop": p.drop || p.soft,
    ...(look.dark
      ? { "--hero": p.hero, "--hero-fg": "#ffffff", "--hero-soft": p.soft, "--hero-text": p.text, "--hero-line": line(35), "--hero-line-strong": line(55) }
      : { "--hero": p.paper, "--hero-fg": p.accent, "--hero-soft": p.inkSoft, "--hero-text": p.ink, "--hero-line": p.rule, "--hero-line-strong": p.accent }),
  };
  return Object.entries(v).map(([k, x]) => `${k}: ${x};`).join(" ");
}

export const themeColor = (look, p) => (look.dark ? p.hero : p.accent);

// Per look: fonts and the few rules that make it its own. The shared CSS in plumber.mjs uses only the variables.
export const LOOK_CSS = {
  blueprint: `
  :root { --display: "Secular One", "IBM Plex Sans Hebrew", sans-serif; --body: "IBM Plex Sans Hebrew", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace; }
  .drawing { width: 100%; height: auto; max-width: 560px; justify-self: center; }
  .drawing .p { fill: none; stroke: var(--line-w); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .drawing .n { fill: var(--hero); stroke: var(--line-w); stroke-width: 3; }
  .drawing .w { fill: none; stroke: var(--line-w); stroke-width: 3; }
  .drawing .s { fill: none; stroke: var(--signal); stroke-width: 3; }
  .drawing .d { fill: none; stroke: var(--hero-soft); stroke-width: 1; stroke-dasharray: 4 4; }
  .drawing text { font-family: var(--mono); font-size: 13px; fill: var(--hero-soft); }
  .drawing .st { fill: var(--hero-text); }
  .drawing .drop { fill: var(--drop); animation: drip 2.4s ease-in infinite; }
  @keyframes drip { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 80% { transform: translateY(46px); opacity: 1; } 100% { transform: translateY(52px); opacity: 0; } }
  @media (max-width: 880px) { .drawing { max-width: 420px; } }
`,
  certificate: `
  :root { --display: "Noto Serif Hebrew", "Times New Roman", serif; --body: "Noto Sans Hebrew", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace; --grid: transparent;
    --bot-radius: 4px; --bot-radius-msg: 4px; --bot-radius-pill: 2px; --bot-radius-input: 2px; }
  h1, h2, h3, .logo { font-weight: 900; }
  .hero { background-image: none; border-bottom: 1px solid var(--rule); }
  .hero-grid { position: relative; margin-bottom: 56px; padding: clamp(22px, 4.5vw, 52px); border: 1.5px solid var(--accent);
    box-shadow: 0 0 0 7px var(--hero), 0 0 0 8.5px var(--accent), 0 0 0 14px var(--hero), 0 0 0 15px color-mix(in srgb, var(--accent) 45%, transparent); }
  .hero h1 { font-size: clamp(40px, 6.4vw, 76px); color: var(--deep); }
  .hero h1 span { background: none; color: inherit; padding: 0; }
  .hero .tag { color: var(--accent); font-weight: 500; letter-spacing: .04em; }
  .btn { border-radius: 2px; }
  .btn-signal { background: var(--accent); }
  .btn-ghost { border-color: var(--accent); color: var(--accent); }
  .facts { border-top: 1px solid var(--rule); }
  .facts b { color: var(--deep); }
  .seal { justify-self: center; width: min(260px, 70vw); aspect-ratio: 1; }
  .seal svg { width: 100%; height: 100%; display: block; transform: rotate(-9deg); }
  .seal circle { fill: none; stroke: var(--signal); }
  .seal .s1 { stroke-width: 3; } .seal .s2 { stroke-width: 1.2; stroke-dasharray: 2 4; } .seal .s3 { stroke-width: 10; stroke-dasharray: 1.5 5.5; opacity: .55; }
  .seal text { fill: var(--signal); text-anchor: middle; }
  .seal .sb { font-family: var(--display); font-weight: 900; }
  .seal .ss { font-family: var(--body); font-weight: 700; font-size: 13px; }
  .order { border-width: 1px; }
  .step .mono { color: var(--signal); }
  .badge { border-radius: 4px; transform: none; }
  @media (max-width: 880px) { .seal { width: 170px; order: -1; justify-self: start; margin-bottom: -10px; } .hero-grid { gap: 18px; } }
`,
  van: `
  :root { --display: "Rubik", system-ui, sans-serif; --body: "Rubik", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace; --grid: transparent;
    --bot-radius: 18px; --bot-radius-msg: 14px; --bot-radius-pill: 999px; --bot-radius-input: 12px; }
  h1, h2, h3, .logo { font-weight: 900; letter-spacing: -.02em; }
  .hero { background-image: none; }
  .hero::after { content: ""; display: block; height: 22px; background: var(--deep); }
  .hero h1 span { background: none; padding: 0; color: inherit; }
  .btn { border-radius: 999px; min-height: 52px; }
  .hero .btn-signal, .area .btn-signal { background: var(--hero-fg); color: var(--deep); }
  .hero .btn-ghost { border-width: 2px; }
  .live { border-radius: 999px; }
  .order { border: 0; border-top: 3px solid var(--ink); border-bottom: 3px solid var(--ink); }
  .order-top { border-bottom-width: 2px; }
  .order button { border-radius: 999px; }
  .steps { border-top-width: 3px; }
  .step .mono { color: var(--accent); }
  .badge { border-radius: 20px; }
  .vanplate { container-type: inline-size; justify-self: center; width: min(100%, 470px); min-width: 0; border: 3px solid var(--hero-fg); border-radius: 24px; padding: 22px 24px 20px; display: grid; gap: 6px; }
  .vp-tag { justify-self: start; display: inline-flex; align-items: center; gap: 8px; border: 2px solid var(--hero-fg); padding: 5px 10px; font-size: 12.5px; letter-spacing: .06em; }
  .vp-tag i { width: 8px; height: 8px; border-radius: 50%; background: var(--hero-fg); }
  .vp-name { font: 900 clamp(24px, 3.4vw, 34px)/1.05 var(--display); margin-top: 10px; overflow-wrap: anywhere; }
  .vp-num { font: 900 12cqi/.95 var(--display); letter-spacing: -.045em; direction: ltr; text-align: right; text-decoration: none; white-space: nowrap; color: inherit; }
  .vp-stripe { height: 12px; background: var(--deep); margin: 10px -24px 4px; }
  .vp-area { color: var(--hero-text); font-weight: 500; }
`,
  ticket: `
  :root { --display: "Assistant", system-ui, sans-serif; --body: "Assistant", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace; --grid: transparent;
    --bot-radius: 6px; --bot-radius-msg: 6px; --bot-radius-pill: 4px; --bot-radius-input: 4px; }
  h1, h2, h3, .logo { font-weight: 800; letter-spacing: -.01em; }
  .hero { background-image: repeating-linear-gradient(0deg, transparent 0 31px, var(--rule) 31px 32px); border-bottom: 2px solid var(--accent); }
  .hero h1 { color: var(--deep); }
  .hero h1 span { background: none; color: inherit; padding: 0; box-shadow: inset 0 -.22em 0 color-mix(in srgb, var(--accent) 22%, transparent); }
  .btn { border-radius: 4px; }
  .btn-signal { background: var(--accent); }
  .btn-ghost { border-color: var(--accent); color: var(--accent); }
  .ticket { justify-self: center; width: min(100%, 420px); background: #fff; color: var(--ink); border: 1.5px solid var(--rule); border-radius: 6px; padding: 22px 24px 18px; transform: rotate(-1.5deg);
    box-shadow: 0 24px 50px -30px rgba(0,0,0,.35); position: relative;
    background-image: radial-gradient(circle at 0 64px, var(--hero) 9px, transparent 10px), radial-gradient(circle at 100% 64px, var(--hero) 9px, transparent 10px); }
  .tk-head { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--ink-soft); border-bottom: 2px dashed var(--rule); padding-bottom: 12px; }
  .tk-open { color: #fff; background: var(--signal); padding: 2px 8px; border-radius: 3px; }
  .tk-name { display: block; font: 800 clamp(22px, 3vw, 28px)/1.15 var(--display); margin: 14px 0 10px; color: var(--deep); overflow-wrap: anywhere; }
  .tk-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .tk-list li { display: flex; align-items: center; gap: 10px; font-weight: 600; }
  .tk-list i { width: 18px; height: 18px; border: 2px solid var(--accent); border-radius: 3px; flex: none; }
  .tk-list i.on { background: var(--accent); box-shadow: inset 0 0 0 3px #fff; }
  .tk-foot { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--rule); font-size: 13px; color: var(--ink-soft); }
  @media (max-width: 880px) { .ticket { transform: none; } }
`,
  dispatch: `
  :root { --display: "Heebo", system-ui, sans-serif; --body: "Heebo", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace;
    --grid: color-mix(in srgb, var(--line-w) 7%, transparent); --bot-radius: 10px; --bot-radius-msg: 10px; --bot-radius-pill: 999px; --bot-radius-input: 8px; }
  h1, h2, h3, .logo { font-weight: 900; letter-spacing: -.02em; }
  .hero h1 span { background: none; padding: 0; color: inherit; }
  .hero h1 span + br + span { color: var(--line-w); }
  .btn { border-radius: 8px; }
  .hero .btn-signal { background: var(--signal); }
  .board { justify-self: center; width: min(100%, 440px); border: 1px solid var(--hero-line-strong); border-radius: 14px; padding: 18px 20px; display: grid; gap: 2px;
    background: color-mix(in srgb, var(--deep) 70%, transparent); box-shadow: 0 0 0 6px color-mix(in srgb, var(--line-w) 6%, transparent); }
  .db-top { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--hero-soft); padding-bottom: 10px; margin-bottom: 6px; border-bottom: 1px solid var(--hero-line); }
  .db-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--line-w); box-shadow: 0 0 0 0 var(--line-w); animation: dbPulse 2s ease-out infinite; }
  @keyframes dbPulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--line-w) 60%, transparent); } 100% { box-shadow: 0 0 0 12px transparent; } }
  @media (prefers-reduced-motion: reduce) { .db-dot { animation: none; } }
  .db-row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px dashed var(--hero-line); font-size: 15px; }
  .db-row span { color: var(--hero-soft); font-family: var(--mono); font-size: 13px; }
  .db-row b { color: var(--hero-text); font-weight: 700; text-align: left; overflow-wrap: anywhere; }
  .db-num { margin-top: 12px; font: 900 clamp(30px, 5vw, 44px)/1 var(--display); color: #fff; text-decoration: none; letter-spacing: -.02em; direction: ltr; text-align: right; }
`,
  mosaic: `
  :root { --display: "Varela Round", "Rubik", system-ui, sans-serif; --body: "Rubik", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace; --grid: transparent;
    --bot-radius: 20px; --bot-radius-msg: 16px; --bot-radius-pill: 999px; --bot-radius-input: 14px; }
  .hero { background-image: radial-gradient(circle at 18% 20%, var(--tint) 0 140px, transparent 141px), radial-gradient(circle at 92% 85%, color-mix(in srgb, var(--ps-a) 25%, transparent) 0 110px, transparent 111px); }
  .hero h1 { color: var(--deep); }
  .hero h1 span { background: none; color: inherit; padding: 0; }
  .btn { border-radius: 999px; }
  .btn-signal { background: var(--accent); }
  .btn-ghost { border-color: var(--accent); color: var(--accent); }
  .badge, .order, .live { border-radius: 16px; }
  .mosaic { justify-self: center; width: min(100%, 420px); display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-flow: dense; gap: 10px; transform: rotate(3deg); }
  .mosaic .t { aspect-ratio: 1; border-radius: 18px; display: block; }
  .mosaic .a { background: var(--accent); } .mosaic .b { background: var(--ps-a); } .mosaic .c { background: var(--tint); border: 1px solid var(--rule); } .mosaic .d { background: var(--soft); }
  .mosaic .big { grid-column: span 2; grid-row: span 2; aspect-ratio: auto; background: var(--deep); color: #fff; display: grid; place-items: center; font: 400 clamp(64px, 9vw, 110px)/1 var(--display); }
  @media (max-width: 880px) { .mosaic { width: min(100%, 300px); transform: none; } }
`,
};