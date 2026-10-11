// Run: node scripts/tests/demo-chats.cjs   Drives the scripted chat on every demo to the end and checks the WhatsApp handoff, and that every photo loads.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../../demos'), CLIENTS = path.join(__dirname, '../../clients');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html');
  const base = u.startsWith('/clients/') ? CLIENTS : ROOT; const f = path.join(base, u.replace(/^\/clients\//, '/'));
  if (!f.startsWith(base)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
}).listen(8790);
// Drives a chat, attaching a photo at the photo step. Returns the page when the chat ended.
async function chatWithPhoto(p, jpeg, ended = async () => !!(await p.$('.lb-panel .lb-wa'))) {
  await p.click('.lb-launch');
  for (let i = 0; i < 16; i++) {
    await p.waitForTimeout(1600);
    if (await ended()) return true;
    if (await p.$('.lb-panel .lb-photo.on')) { await p.setInputFiles('.lb-panel .lb-photo input', { name: 'leak.jpg', mimeType: 'image/jpeg', buffer: jpeg }); continue; }
    const chip = await p.$('.lb-panel .lb-chips button:visible');
    const input = await p.$('.lb-panel form input:visible');
    if (chip) await chip.click();
    else if (input) { const t = await input.getAttribute('type'); await input.fill(t === 'tel' ? '0501234567' : 'בדיקה כהן'); await input.press('Enter'); }
  }
  return false;
}
// The photo step: in a demo it shows in the chat, the summary and the phone mockup, and the WhatsApp text says it follows;
// on a client site (capture) it goes to the lead system with the lead, shrunk to a JPEG.
async function photoStep(b) {
  let bad = 0;
  const shot = await b.newPage({ viewport: { width: 2400, height: 1800 } }); await shot.setContent('<body style="margin:0;background:linear-gradient(90deg,#1b4,#14b)">');
  const jpeg = await shot.screenshot({ type: 'jpeg', quality: 95 }); await shot.close();
  { // the plumber demo's "try": what the visitor sees when the owner writes "עסוק" / "פנוי"
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); await p.route(/fonts\.|wa\.me/, (r) => r.abort());
    await p.goto('http://localhost:8790/plumber/index.html');
    const line = () => p.$eval('.avail-try [data-avail]', (e) => e.dataset.state + ' ' + e.textContent.trim());
    const a0 = await line(); await p.click('[data-avail-try] button:has-text("עסוק")'); const a1 = await line();
    await p.click('[data-avail-try] button:has-text("פנוי")'); const a2 = await line();
    const ok = a0 === 'open זמינים 24/7.' && /^busy באמצע עבודה\. חוזרים אליכם עד \d\d:\d\d\.$/.test(a1) && a2.startsWith('free פנויים עכשיו');
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} demo "available now" try: ${a0} | ${a1} | ${a2}`);
    await p.close(); }
  { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/fonts\.|wa\.me/, (r) => r.abort());
    await p.goto('http://localhost:8790/ac/index.html'); await p.waitForTimeout(600);
    const done = await chatWithPhoto(p, jpeg);
    const inChat = await p.$$eval('.lb-panel .lb-msg.me.pic img', (ims) => ims.filter((i) => i.naturalWidth > 0).length);
    const href = done ? decodeURIComponent(await p.getAttribute('.lb-panel .lb-wa', 'href') || '') : '';
    await p.waitForTimeout(800);
    const inPhone = await p.$$eval('.ph-pic img', (ims) => ims.filter((i) => i.naturalWidth > 0).length);
    const ok = done && inChat === 1 && href.includes('יש לי תמונה של זה') && inPhone === 1 && !errs.length;
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} photo demo (ac) done=${done} chat=${inChat} wa=${href.includes('יש לי תמונה')} phone=${inPhone} errs=${errs.length}${errs.length ? ' ' + errs[0] : ''}`);
    await p.close(); }
  { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/fonts\.|wa\.me/, (r) => r.abort());
    let sentLead = null;
    await p.route(/\/api\/visit\//, (r) => r.fulfill({ status: 204 }));
    await p.route(/\/api\/status\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ state: 'busy', text: 'באמצע עבודה. חוזרים אליכם עד 14:30.', until: null }) }));
    await p.route(/\/api\/lead\//, (r) => { if (r.request().method() === 'POST') sentLead = JSON.parse(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true,"id":"x"}' }); });
    await p.goto('http://localhost:8790/clients/sample-plumber/index.html'); await p.waitForTimeout(600);
    // "available now": the line shows what the server says (functions/status.mjs)
    const avail = await p.$eval('.avail-line [data-avail]', (e) => !e.hidden && getComputedStyle(e).display !== 'none' && e.dataset.state === 'busy' && e.textContent.includes('באמצע עבודה'));
    if (!avail) { bad++; console.log('BAD client "available now" line'); } else console.log('OK  client "available now" line');
    const done = await chatWithPhoto(p, jpeg, async () => !!sentLead && !!(await p.$('.lb-panel .lb-msg:has-text("הקריאה אצלי")')));
    const m = sentLead && /^data:image\/jpeg;base64,(.+)$/.exec(sentLead.photo || '');
    const bytes = m ? Buffer.from(m[1], 'base64') : null;
    const dims = bytes ? await p.evaluate(async (d) => { const i = new Image(); i.src = d; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, sentLead.photo) : [0, 0];
    const ok = done && bytes && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.length < 900 * 1024 && Math.max(...dims) <= 1280 && sentLead.phone.replace(/\D/g, '') === '0501234567' && !errs.length;
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} photo client (capture) done=${done} sent=${!!sentLead} photo=${bytes ? bytes.length + 'B ' + dims.join('x') : 'none'} errs=${errs.length}${errs.length ? ' ' + errs[0] : ''}`);
    await p.close(); }
  return bad;
}
// The price calculator: every answer gives a sum (no NaN, never empty), and the button opens the chat
// with the visitor's choices already answered.
async function estimates(b) {
  let bad = 0;
  for (const d of DEMOS) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/fonts\.|wa\.me/, (r) => r.abort());
    await p.goto(`http://localhost:8790/${d}/index.html`);
    if (!(await p.$('[data-estimate] .est'))) { await p.close(); continue; }
    const sums = await p.evaluate(() => {
      const out = [], root = document.querySelector('[data-estimate]');
      const items = [...root.querySelectorAll('fieldset')[0].querySelectorAll('input')];
      for (const it of items) {
        it.click();
        for (const fs of [...root.querySelectorAll('fieldset')].slice(1)) if (!fs.hidden) for (const o of fs.querySelectorAll('input')) { o.click(); out.push(root.querySelector('.est-sum').textContent); }
        out.push(root.querySelector('.est-sum').textContent);
      }
      items[items.length - 1].click(); items[0].click();
      return out;
    });
    const badSum = sums.find((t) => !t.trim() || /NaN|undefined|Infinity/.test(t) || !(/\d.*₪/.test(t) || /הצעת מחיר/.test(t)));
    await p.click('[data-estimate] .est-go');
    await p.waitForTimeout(3500);
    const first = await p.$eval('.lb-panel', (x) => { const m = x.querySelector('.lb-msg.me'); return m ? m.textContent : ''; }).catch(() => '');
    // A chat that opens with a typed question (movers: "from where?") uses the prefilled answers later on.
    const typing = await p.$('.lb-panel.open form.on input:visible');
    const ok = !badSum && (first.length > 1 || !!typing) && !errs.length;
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} estimate ${d.padEnd(12)} sums=${sums.length} prefilled="${first}"${badSum ? ' bad sum: ' + badSum : ''}${errs.length ? ' ' + errs[0] : ''}`);
    await p.close();
  }
  return bad;
}
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
  bad += await estimates(b);
  bad += await photoStep(b);
  console.log(bad ? `${bad} FAILED` : 'ALL OK'); await b.close(); server.close(); process.exit(bad ? 1 : 0);
})();
