// Records the three video beats at 1080x1920 with Playwright's video capture:
// (a) prompt scene, (b) code being written, (c) the game being played (demo autopilot).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/hatch/workspace/xe-testnet/sdk/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8372;
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
  return undefined;
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch({
    executablePath: chromiumPath(),
    args: ['--no-sandbox', '--force-color-profile=srgb'],
  });
  const recDir = path.join(__dirname, 'rec');
  fs.rmSync(recDir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: { dir: recDir, size: { width: 1080, height: 1920 } },
  });
  const page = await context.newPage();
  const t0 = Date.now();
  const marks = {};
  await page.goto(`http://127.0.0.1:${PORT}/work/prompt.html`);
  marks.promptLoaded = (Date.now() - t0) / 1000;
  await page.waitForTimeout(6600);
  marks.codeStart = (Date.now() - t0) / 1000;
  await page.goto(`http://127.0.0.1:${PORT}/work/code.html`);
  await page.waitForTimeout(15700);
  marks.gameStart = (Date.now() - t0) / 1000;
  await page.goto(`http://127.0.0.1:${PORT}/game/index.html?demo=1`);
  await page.waitForTimeout(24500);
  marks.end = (Date.now() - t0) / 1000;
  const video = page.video();
  await context.close();
  await browser.close();
  server.close();
  const p = await video.path();
  console.log('VIDEO', p);
  console.log('MARKS', JSON.stringify(marks));
})().catch(e => { console.error('FATAL', e); process.exit(2); });
