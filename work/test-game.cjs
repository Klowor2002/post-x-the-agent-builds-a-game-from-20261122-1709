// Play-test for Star Cat: loads the game headlessly, plays it, requires 0 console errors.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/hatch/workspace/xe-testnet/sdk/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8371;
const MIME = { '.html': 'text/html', '.webm': 'video/webm', '.json': 'application/json', '.md': 'text/plain', '.ts': 'text/plain' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

function chromiumPath() {
  const local = '/home/hatch/workspace/tools/chrome-local/opt/google/chrome/chrome';
  if (fs.existsSync(local)) return local;
  const base = '/home/hatch/.cache/ms-playwright';
  const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const p = `${base}/${d}/chrome-linux/chrome`;
    if (fs.existsSync(p)) return p;
  }
  return undefined; // let playwright use its own build
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch({
    executablePath: chromiumPath(),
    args: ['--no-sandbox'],
  });
  const result = { manual: {}, demo: {}, errors: [] };

  // --- manual mode: click to start, steer with keys
  let page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('console', m => { if (m.type() === 'error') result.errors.push('[manual console] ' + m.text()); });
  page.on('pageerror', e => result.errors.push('[manual pageerror] ' + e.message));
  await page.goto(`http://127.0.0.1:${PORT}/game/index.html`);
  await page.waitForTimeout(600);
  await page.mouse.click(270, 480);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1600);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(1600);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(5000);
  result.manual = await page.evaluate(() => {
    const s = window.__gameState;
    return { running: s.running, over: s.over, score: s.score, lives: s.lives, caught: s.caught, hits: s.hits, t: +s.t.toFixed(1) };
  });
  await page.screenshot({ path: path.join(__dirname, 'test-manual.png') });
  await page.close();

  // --- demo mode: autopilot must score on its own
  page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('console', m => { if (m.type() === 'error') result.errors.push('[demo console] ' + m.text()); });
  page.on('pageerror', e => result.errors.push('[demo pageerror] ' + e.message));
  await page.goto(`http://127.0.0.1:${PORT}/game/index.html?demo=1`);
  await page.waitForTimeout(26000);
  result.demo = await page.evaluate(() => {
    const s = window.__gameState;
    return { running: s.running, over: s.over, score: s.score, lives: s.lives, caught: s.caught, hits: s.hits, t: +s.t.toFixed(1) };
  });
  await page.screenshot({ path: path.join(__dirname, 'test-demo.png') });
  await page.close();

  await browser.close();
  server.close();
  console.log(JSON.stringify(result, null, 1));
  const ok = result.errors.length === 0 && result.manual.running && result.demo.score > 0 && result.demo.caught >= 1 && !result.demo.over;
  console.log(ok ? 'PLAYTEST PASS' : 'PLAYTEST FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
