// Run: node scripts/tests/demo-chats.cjs   Drives the scripted chat on every demo to the end and checks the WhatsApp handoff, and that every photo loads.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../../demos');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
}).listen(8790);
const DEMOS = ['plumber','movers','trainer','ac','electrician','cleaning','renovation','locksmith','pest','appliance','handyman','garden','tutor','psychologist','social-worker','music'];
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const d of DEMOS) {
    for (const [w,h] of [[390,844],[1280,900]]) {
      const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      await p.route(/fonts\.|wa\.me/, (r) => r.abort());
      await p.goto(`http://localhost:8790/${d}/index.html`); await p.waitForTimeout(600);
      // photos: every rendered <img> inside a frame must load
      await p.evaluate(async () => { for (const el of document.querySelectorAll('.ps')) el.scrollIntoView(); });
      await p.waitForTimeout(700);
      const broken = await p.$$eval('img', (ims) => ims.filter((i) => i.src && i.complete && i.naturalWidth === 0).map((i) => i.src));
      await p.evaluate(() => scrollTo(0, 0));
      await p.click('.lb-launch');
      let steps = 0, done = false;
      while (steps < 16 && !done) {
        await p.waitForTimeout(1600);
        if (await p.$('.lb-panel .lb-wa')) { done = true; break; }
        const chip = await p.$('.lb-panel .lb-chips button:visible, .lb-panel .lb-chip:visible');
        const input = await p.$('.lb-panel form input:visible');
        if (chip) await chip.click();
        else if (input) { const t = await input.getAttribute('type'); await input.fill(t === 'tel' ? '0501234567' : 'בדיקה כהן'); await input.press('Enter'); }
        steps++;
      }
      const href = done ? await p.getAttribute('.lb-panel .lb-wa', 'href') : '';
      const okWa = /^https:\/\/wa\.me\/972\d{8,9}\?text=/.test(href || '') && decodeURIComponent(href).includes('050');
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      const ok = done && okWa && !errs.length && !broken.length && sw <= w;
      if (!ok) bad++;
      console.log(`${ok ? 'OK ' : 'BAD'} ${d.padEnd(14)} ${w}px steps=${steps} wa=${okWa} errs=${errs.length} broken=${broken.length} sw=${sw}${errs.length ? ' ' + errs[0] : ''}${broken.length ? ' ' + broken[0] : ''}`);
      await p.close();
    }
  }
  console.log(bad ? `${bad} FAILED` : 'ALL OK'); await b.close(); server.close(); process.exit(bad ? 1 : 0);
})();
