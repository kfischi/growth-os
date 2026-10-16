// Drives the chat of every trade's site (rendered by builder-render.mjs into <dir>/trade-<id>/) to its WhatsApp
// handoff, on a phone: the trade's own first question, an answer for each step, and the summary in the WhatsApp text.
// Run: node scripts/tests/builder-render.mjs <dir> && node scripts/tests/trade-chats.cjs <dir>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = process.argv[2];
if (!DIR) { console.error('usage: node scripts/tests/trade-chats.cjs <dir>'); process.exit(1); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(DIR, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
}).listen(8791);

(async () => {
  const b = await chromium.launch();
  let bad = 0;
  const trades = fs.readdirSync(DIR).filter((d) => d.startsWith('trade-')).sort();
  for (const d of trades) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/wa\.me|fonts\./, (r) => r.abort());
    await p.goto(`http://localhost:8791/${d}/index.html`); await p.waitForTimeout(500);
    await p.click('.lb-launch');
    let first = '', href = '', picked = '';
    for (let i = 0; i < 18 && !href; i++) {
      await p.waitForTimeout(1300);
      const wa = await p.$('.lb-panel .lb-wa');
      if (wa) { href = decodeURIComponent(await wa.getAttribute('href')); break; }
      if (!first) first = await p.$$eval('.lb-panel .lb-msg', (m) => m.map((x) => x.textContent).join(' | '));
      const skip = await p.$('.lb-panel .lb-chips button:has-text("בלי תמונה")');
      if (skip) { await skip.click(); continue; }
      const chip = await p.$('.lb-panel .lb-chips button:visible');
      const input = await p.$('.lb-panel form input:visible');
      if (chip) { if (!picked) picked = (await chip.textContent()).trim(); await chip.click(); }
      else if (input) { const t = await input.getAttribute('type'); await input.fill(t === 'tel' ? '0501234567' : 'בדיקה כהן'); await input.press('Enter'); }
    }
    const ok = !!href && href.includes(picked) && href.replace(/\D/g, '').includes('0501234567') && href.includes('בדיקה כהן') && !/undefined/.test(href) && !errs.length;
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} ${d.padEnd(20)} picked="${picked}" wa=${!!href}${/undefined/.test(href) ? ' UNDEFINED in text' : ''}${errs.length ? ' ' + errs[0] : ''}`);
    await p.close();
  }
  await b.close(); server.close();
  console.log(bad ? `${bad} trade chats failed` : 'ALL TRADE CHATS OK');
  process.exit(bad ? 1 : 0);
})();
