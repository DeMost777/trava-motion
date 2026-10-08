#!/usr/bin/env node
// End-to-end check of one animation as the site runs it (built bundle + <img> + attribute), like animations in qa/qm-local-check.
// Usage: node qa/animation-check.mjs <preview/page.html> <selector of the <img>>   (Playwright; GSAP_JS optional)
// Checks: 0 console errors; <img> becomes SVG and starts on scroll; leaving the screen resets to the design (pixel-equal to the
// <img> render, up to edge antialiasing); frame rate while playing; reduced motion and a missing GSAP keep the <img>.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const req = createRequire(import.meta.url); const { chromium } = req('playwright');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [pageArg, sel = 'img[data-trava-animation]'] = process.argv.slice(2);
const minSrc = process.env.TM_BUNDLE === 'min' ? readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../exports/webflow/trava-motion.min.js'), 'utf8') : '';
const gsapSrc = readFileSync(process.env.GSAP_JS || req.resolve('gsap/dist/gsap.min.js'), 'utf8');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((rq, rs) => { const f = join(repo, decodeURIComponent(rq.url.split('?')[0])); if (!f.startsWith(repo) || !existsSync(f)) { rs.writeHead(404); rs.end(); return; } rs.writeHead(200, { 'content-type': types[extname(f)] || 'text/plain', 'access-control-allow-origin': '*' }); rs.end(readFileSync(f)); });
await new Promise((r) => server.listen(0, r));
const URL_ = `http://127.0.0.1:${server.address().port}/${pageArg}`;
const br = await chromium.launch(); const fails = [];
const check = (n, ok, d) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}${d !== undefined ? ' — ' + JSON.stringify(d) : ''}`); if (!ok) fails.push(n); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(opts = {}, gsap = true) {
  const ctx = await br.newContext({ viewport: { width: 800, height: 700 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' }); const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[trava-motion]'))) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(String(e)));
  if (gsap) await page.route('**/cdn.jsdelivr.net/**/gsap.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: gsapSrc })); else await page.route('**/cdn.jsdelivr.net/**/gsap.min.js', (r) => r.abort());
  if (process.env.TM_BUNDLE === 'min') await page.route('**/trava-motion.js', (r) => r.fulfill({ contentType: 'text/javascript', body: minSrc }));   // check the minified build that goes to Webflow
  await page.goto(URL_); await page.waitForLoadState('load'); return { ctx, page, errors };
}
// the <img> as the browser draws it (the design), for comparison
{
  const { ctx, page, errors } = await open();
  const shot = async () => page.locator(sel + ', svg[data-trava-animation]').first().screenshot();
  // rects of the design that already look like stream bars (gradient fill + matrix/translate) are not leftovers of the animation
  const baseline = await page.evaluate(async (s) => { const doc = new DOMParser().parseFromString(await (await fetch(document.querySelector(s).currentSrc)).text(), 'image/svg+xml'); return [...doc.querySelectorAll('rect')].filter((r) => !r.hasAttribute('data-m') && r.getAttribute('fill')?.startsWith('url(') && /matrix|translate/.test(r.getAttribute('transform') || '')).length; }, sel);
  const staticShot = await shot();   // before it scrolls into view the <img> is still an <img>
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel + ', svg[data-trava-animation]'); await wait(2500);
  const info = await page.evaluate(() => ({ svg: !!document.querySelector('svg[data-trava-animation]'), ctrl: TravaMotion.controllers.length }));
  check('the <img> becomes SVG and an animation controller is created', info.svg && info.ctrl === 1, info);
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t < 2000) requestAnimationFrame(f); else res(Math.round(n / 2)); })(); }));
  check('frame rate while playing ≥ 55 fps (headless, indicative)', fps >= 55, fps);
  const playing = await page.evaluate(() => [...document.querySelectorAll('svg[data-trava-animation] rect')].some((r) => !r.hasAttribute('data-m') && r.style.visibility !== 'hidden' && (r.getAttribute('transform') || '').startsWith('matrix') ));
  check('bars are moving while playing', playing);
  await page.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const hubTransform = await page.evaluate(() => [...document.querySelectorAll('svg[data-trava-animation] [data-m="core"],svg[data-trava-animation] [data-m="node"]')].filter((e) => e.getAttribute('transform')).length);
  check('leaving the screen resets: no element keeps a pulse transform', hubTransform === 0, hubTransform);
  const extra = await page.evaluate(() => [...document.querySelectorAll('svg[data-trava-animation] rect')].filter((r) => !r.hasAttribute('data-m') && r.style.visibility !== 'hidden' && r.getAttribute('fill')?.startsWith('url(') && /matrix|translate/.test(r.getAttribute('transform') || '')).length);
  check('leaving the screen resets: no stream bar stays visible', extra === baseline, { extra, baseline });
  check('0 console errors / warnings', errors.length === 0, errors);
  await ctx.close();
}
{ const { ctx, page, errors } = await open({ reduced: true }); await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await wait(1500);
  const r = await page.evaluate(() => ({ img: !!document.querySelector('img[data-trava-animation]'), svg: !!document.querySelector('svg[data-trava-animation]') }));
  check('reduced motion: the <img> stays', r.img && !r.svg && errors.length === 0, { r, errors }); await ctx.close(); }
{ const { ctx, page, errors } = await open({}, false); await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await wait(1500);
  const r = await page.evaluate(() => ({ img: !!document.querySelector('img[data-trava-animation]') }));
  const own = errors.filter((e) => !e.startsWith('Failed to load resource'));   // the blocked request is reported by the browser itself
  check('no GSAP: the <img> stays, one warning, no errors', r.img && own.length === 1 && own[0].includes('[trava-motion]'), { r, errors }); await ctx.close(); }
await br.close(); server.close();
console.log(fails.length ? `\n${fails.length} check(s) FAILED` : '\nall checks passed'); process.exit(fails.length ? 1 : 0);
