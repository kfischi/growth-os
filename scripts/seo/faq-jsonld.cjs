#!/usr/bin/env node
// Writes the FAQPage JSON-LD of a page from its own <details> questions, so the
// structured data never drifts from what the visitor reads.
//   node scripts/seo/faq-jsonld.cjs demos/index.html          write
//   node scripts/seo/faq-jsonld.cjs demos/index.html --check  fail if out of date
const fs = require("fs");

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: faq-jsonld.cjs <page.html> [--check]"); process.exit(2); }

const html = fs.readFileSync(file, "utf8");
const start = html.indexOf('id="faq"');
if (start < 0) { console.error(`${file}: no #faq section`); process.exit(1); }
const section = html.slice(start, html.indexOf("</section>", start));

const text = (s) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();
const items = [...section.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)]
  .map(([, q, a]) => ({ "@type": "Question", name: text(q), acceptedAnswer: { "@type": "Answer", text: text(a) } }));
if (!items.length) { console.error(`${file}: #faq has no <details>`); process.exit(1); }

const json = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items });
const block = `<script type="application/ld+json" id="faq-ld">${json.replace(/</g, "\\u003c")}</script>`;
const re = /<script type="application\/ld\+json" id="faq-ld">[\s\S]*?<\/script>/;

if (flag === "--check") {
  const cur = html.match(re);
  if (!cur || cur[0] !== block) { console.error(`${file}: FAQPage JSON-LD is out of date. Run: node scripts/seo/faq-jsonld.cjs ${file}`); process.exit(1); }
  console.log(`${file}: FAQPage JSON-LD up to date (${items.length} questions)`);
  process.exit(0);
}

const out = re.test(html) ? html.replace(re, block) : html.replace("</head>", `${block}\n</head>`);
fs.writeFileSync(file, out);
console.log(`${file}: FAQPage JSON-LD written (${items.length} questions)`);
