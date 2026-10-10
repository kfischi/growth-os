// Writes the plumber template, filled with the sample content, as a finished site and as a draft, into <dir>,
// so check-all.sh can run qa-page and the Hebrew lint on what the builder really produces.
// Run: node scripts/tests/builder-render.mjs <dir>
import fs from "node:fs";
import path from "node:path";
import * as P from "../../demos/netlify/lib/templates/plumber.mjs";
import { SAMPLE } from "./builder-sample.mjs";

const out = process.argv[2];
if (!out) { console.error("usage: node scripts/tests/builder-render.mjs <dir>"); process.exit(1); }
const repo = path.resolve(new URL("../..", import.meta.url).pathname);
fs.mkdirSync(path.join(out, "assets/photos"), { recursive: true });
for (const f of ["leadbot.js", "leadform.js"]) fs.copyFileSync(path.join(repo, "clients/sample-plumber/assets", f), path.join(out, "assets", f));
const photos = { portrait: "plumber-portrait.webp", work1: "plumber-siphon.webp", work2: "plumber-leak.webp", work3: "plumber-drain.webp" };
for (const f of Object.values(photos)) fs.copyFileSync(path.join(repo, "clients/sample-plumber/assets/photos", f), path.join(out, "assets/photos", f));
const site = P.render(SAMPLE, { mode: "site", leads: "https://service-pro-web.netlify.app/api/lead/sample-plumber", photos: Object.fromEntries(Object.entries(photos).map(([k, f]) => [k, "assets/photos/" + f])) });
for (const [name, html] of Object.entries(site)) fs.writeFileSync(path.join(out, name), html);
for (const [name, body] of Object.entries(P.STATIC_FILES)) fs.writeFileSync(path.join(out, name), body);
// A site with only what is required: no photos, no prices, no optional facts.
const bare = { ...P.emptyContent(), ...Object.fromEntries(Object.entries(SAMPLE).filter(([k]) => P.FIELDS[k] && P.FIELDS[k].required)), services: SAMPLE.services.map((s) => ({ name: s.name, detail: "", time: "", price: "" })), towns: ["חדרה"] };
fs.writeFileSync(path.join(out, "bare.html"), P.render(bare, { mode: "site" })["index.html"]);
// A draft at the very start: almost everything empty.
fs.writeFileSync(path.join(out, "draft.html"), P.render({ ...P.emptyContent(), owner_name: "אורן לוי", whatsapp: "0526359513" }, { mode: "draft", assets: "assets/" })["index.html"]);
console.log("rendered into " + out);
