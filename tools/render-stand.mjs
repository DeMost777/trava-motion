#!/usr/bin/env node
// Render a stand page to an exact-timing video: for every frame the controllers are moved to time t with seek(t),
// a screenshot is taken, ffmpeg joins them (the video does not depend on how fast the machine is).
// Usage: node tools/render-stand.mjs <page.html[?query]> <out.mp4> [seconds=14] [fps=30] [width=1260] [height=660]   (DSF=2 for a sharper picture)
// Needs Playwright (NODE_PATH=<dir>/node_modules), GSAP_JS=<path to gsap.min.js> (optional), ffmpeg.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const req = createRequire(import.meta.url);
const { chromium } = req('playwright');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [pageArg, outArg, sec = '14', fpsArg = '30', w = '1260', h = '660'] = process.argv.slice(2);
if (!pageArg || !outArg) { console.error('usage: node tools/render-stand.mjs <page.html> <out.mp4> [seconds] [fps] [width] [height]'); process.exit(2); }
const gsapSrc = readFileSync(process.env.GSAP_JS || req.resolve('gsap/dist/gsap.min.js'), 'utf8');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.css': 'text/css' };
const server = createServer((rq, rs) => {
  const f = join(repo, decodeURIComponent(rq.url.split('?')[0]));
  if (!f.startsWith(repo) || !existsSync(f)) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); rs.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const fps = +fpsArg, frames = Math.round(+sec * fps), tmp = join(resolve(dirname(outArg)), '.frames-' + process.pid);
mkdirSync(tmp, { recursive: true });
const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DSF || 1) }); const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route('**/cdn.jsdelivr.net/**/gsap.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: gsapSrc }));
await page.goto(`http://127.0.0.1:${server.address().port}/${pageArg}`);   // pageArg may carry a query: preview/x.html?view=bounce
await page.waitForFunction(() => window.__ready === true);
const want = await page.evaluate(() => document.querySelectorAll('[data-trava-animation]').length);
await page.waitForFunction((n) => window.TravaMotion.controllers.length === n, want, { timeout: 15000 });
await page.waitForTimeout(1500);   // the runtime has started every animation by now
await page.evaluate(() => TravaMotion.controllers.forEach((c) => c.controller.reset()));   // stops the live clock; frames are set by seek(t) only
const stills = (process.env.STILLS || '').split(',').filter(Boolean).map(Number);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => TravaMotion.controllers.forEach((c) => c.controller.seek(t)), i / fps);
  await page.screenshot({ path: join(tmp, `f${String(i).padStart(5, '0')}.png`) });
}
for (const t of stills) {   // sharp stills at exact times (STILLS=0.7,1.5 → <out>-0.7.png …)
  await page.evaluate((t) => TravaMotion.controllers.forEach((c) => c.controller.seek(t)), t);
  await page.screenshot({ path: resolve(outArg).replace(/\.mp4$/, `-${t}.png`) });
}
await br.close(); server.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(tmp, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', resolve(outArg)]);
rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ out: outArg, frames, fps, seconds: +sec, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
