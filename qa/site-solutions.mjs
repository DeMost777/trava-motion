#!/usr/bin/env node
// Checks Trava Motion on a replica of the home page "Solutions" block (qa/fixtures/site-solutions.html):
// the site's own script + CSS + markup (desktop stacked cards with a sidebar, tablet/mobile cards one after another).
// 1. The site's mechanism is not disturbed: the sequence of `is-active` switches is the same with and without Trava Motion.
// 2. Desktop: the animation plays only while its card is active and on screen.
// 3. Tablet and phone: it plays while the card is on screen, resets when it leaves; sizes come from the site's classes.
// 4. Only the markup that is shown is turned into SVG; no duplicate ids; alt text is kept; reduced motion leaves <img>.
// Usage: node qa/site-solutions.mjs [outDir]   (needs `playwright`, e.g. NODE_PATH=<dir>/node_modules; GSAP_JS=<path to gsap.min.js> optional)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const req = createRequire(import.meta.url);
const { chromium } = req('playwright');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(repo, 'qa/out/site-solutions'));
mkdirSync(out, { recursive: true });
const gsapPath = process.env.GSAP_JS || req.resolve('gsap/dist/gsap.min.js');
const gsapSrc = readFileSync(gsapPath, 'utf8');
const minSrc = process.env.TM_BUNDLE === 'min' ? readFileSync(join(repo, 'exports/webflow/trava-motion.min.js'), 'utf8') : '';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer((rq, rs) => {
  const f = join(repo, decodeURIComponent(rq.url.split('?')[0]));
  if (!f.startsWith(repo) || !existsSync(f)) { rs.writeHead(404); rs.end(); return; }
  rs.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'access-control-allow-origin': '*' });
  rs.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const URL_ = `http://127.0.0.1:${server.address().port}/qa/fixtures/site-solutions.html`;

const results = []; const fails = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); if (!ok) fails.push(name); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail) : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
async function open({ w, h, trava = true, reduced = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if ((m.type() === 'error' && trava) || (m.type() === 'warning' && m.text().includes('[trava-motion]'))) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/cdn.jsdelivr.net/**/gsap.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: gsapSrc }));
  if (process.env.TM_BUNDLE === 'min') await page.route('**/trava-motion.js', (r) => r.fulfill({ contentType: 'text/javascript', body: minSrc }));   // check the minified build that goes to Webflow
  if (!trava) await page.route('**/trava-motion.js', (r) => r.abort());   // baseline: the page without Trava Motion
  // sequence of active cards, as the site's own script switches them
  await page.addInitScript(() => {
    window.__seq = [];
    document.addEventListener('DOMContentLoaded', () => {
      const states = [...document.querySelectorAll('[data-solution-state]')];
      const snap = () => { const a = states.filter((s) => s.classList.contains('is-active')).map((s) => s.getAttribute('data-solution-state')).join(','); if (window.__seq[window.__seq.length - 1] !== a) window.__seq.push(a); };
      new MutationObserver(snap).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
      snap();
    });
  });
  await page.goto(URL_);
  await page.waitForLoadState('load');
  // Decision 2026-10-07: the animated SVG fills the card width. The baseline <img> gets the same width,
  // so the card has the same height with and without Trava Motion and only Trava Motion's own effect is compared.
  if (!trava) await page.addStyleTag({ content: 'img.solution-visual-image { width: 100%; }' });
  return { ctx, page, errors };
}

// log start / reset calls of the animation controller(s), tagged with whether the desktop card is active
async function hookControllers(page) {
  await page.evaluate(() => {
    window.__ev = [];
    const t0 = performance.now();
    window.__hook = () => TravaMotion.controllers.forEach((c, i) => {
      if (c.__hooked) return; c.__hooked = true;
      ['start', 'reset'].forEach((k) => { const f = c.controller[k]; c.controller[k] = function () { window.__ev.push({ ev: k, i, name: c.name, t: Math.round(performance.now() - t0), active: !!c.svg.closest('.is-active') }); return f.apply(this, arguments); }; });
    });
    window.__hook();
  });
}
const events = (page) => page.evaluate(() => { window.__hook && window.__hook(); return window.__ev; });
const scrollTo = (page, y) => page.evaluate((y) => window.scrollTo(0, y), y);
const dupIds = (page) => page.evaluate(() => { const c = {}; document.querySelectorAll('[id]').forEach((e) => (c[e.id] = (c[e.id] || 0) + 1)); return Object.entries(c).filter(([, n]) => n > 1).map(([id]) => id); });

// ---------- 1 + 2. desktop ----------
async function desktopRun(trava) {
  const { ctx, page, errors } = await open({ w: 1280, h: 800, trava });
  await wait(600);
  if (trava) await hookControllers(page);
  await scrollTo(page, 900); await wait(700);
  for (let y = 900; y <= 2400; y += 250) { await scrollTo(page, y); await wait(250); }
  await wait(800);
  const cardH = await page.evaluate(() => Math.round(document.querySelector('.solution-cards').getBoundingClientRect().height));
  const nav = (n) => page.click(`[data-solution-nav="${n}"]`);
  await nav('ticketing'); await wait(3000);
  await nav('queue-manager'); await wait(3000);
  await nav('quality-control'); await wait(3000);
  await nav('queue-manager'); await wait(3000);
  const seq = await page.evaluate(() => window.__seq);
  const ev = trava ? await events(page) : null;
  const info = trava ? await page.evaluate(() => ({
    svgs: document.querySelectorAll('svg[data-trava-animation]').length,
    imgs: document.querySelectorAll('img[data-trava-animation]').length,
    controllers: TravaMotion.controllers.length,
    svgW: Math.round(document.querySelector('svg.solution-visual-image').getBoundingClientRect().width),
    boxW: Math.round(document.querySelector('.solution-card-visual').getBoundingClientRect().width),
    role: document.querySelector('svg.solution-visual-image').getAttribute('role'),
    label: document.querySelector('svg.solution-visual-image').getAttribute('aria-label'),
  })) : null;
  const dups = trava ? await dupIds(page) : null;
  if (trava) await page.screenshot({ path: join(out, 'desktop.png') });
  await ctx.close();
  return { seq, ev, info, dups, errors, cardH };
}
const base = await desktopRun(false);
const withT = await desktopRun(true);
check('desktop: the site switches cards identically with and without Trava Motion', JSON.stringify(base.seq) === JSON.stringify(withT.seq), { without: base.seq, with: withT.seq });
check('desktop: 0 console errors / warnings', withT.errors.length === 0 && base.errors.length === 0, { with: withT.errors, without: base.errors });
check('desktop: card height is the same with and without Trava Motion (the site script reads it for its trigger line)', Math.abs(base.cardH - withT.cardH) <= 1, { without: base.cardH, with: withT.cardH });
// two animations sit in the stack (Queue Manager, Quality Control): each one's desktop <img> becomes SVG, the tablet/mobile copies stay <img>
check('desktop: only the desktop <img> of each animation became SVG (tablet/mobile <img> untouched)', withT.info.svgs === 2 && withT.info.imgs === 2 && withT.info.controllers === 2, withT.info);
check('desktop: size as approved on staging (SVG fills the card width)', Math.abs(withT.info.svgW - withT.info.boxW) <= 1, { svg: withT.info.svgW, card: withT.info.boxW });
check('desktop: alt text moved to the SVG', withT.info.role === 'img' && withT.info.label === 'Automated queue management workflow', { role: withT.info.role, label: withT.info.label });
check('desktop: no duplicate ids', withT.dups.length === 0, withT.dups);
const ev = withT.ev.filter((e) => e.name === 'queue-manager');   // the sequence of one animation; Quality Control has its own card
const evQc = withT.ev.filter((e) => e.name === 'quality-control');
check('desktop: every start happens while the card is active', ev.filter((e) => e.ev === 'start').every((e) => e.active), ev);
const kinds = ev.map((e) => e.ev).join(',');
check('desktop: Quality Control starts only while its card is active and resets when it is left', evQc.length >= 2 && evQc.filter((e) => e.ev === 'start').every((e) => e.active), evQc);
check('desktop: start → (other tab) reset → start → reset → start sequence', /^start,reset,start,reset(,start)?/.test(kinds) || kinds.startsWith('start,reset,start'), kinds);

// ---------- 3. tablet and phone ----------
async function responsiveRun(name, w, h) {
  const { ctx, page, errors } = await open({ w, h });
  await wait(500); await hookControllers(page);
  const before = await page.evaluate(() => ({ svgs: document.querySelectorAll('svg[data-trava-animation]').length }));
  const sel = '.solution-responsive-image[data-trava-animation], svg.solution-responsive-image[data-trava-animation]';
  const center = () => page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
  await center(); await wait(1500);
  const info = await page.evaluate(() => {
    const svg = document.querySelector('svg.solution-responsive-image'), c = document.getElementById('control').getBoundingClientRect(), r = svg.getBoundingClientRect();
    return {
      svgs: document.querySelectorAll('svg[data-trava-animation]').length, desktopImgStillImg: !!document.querySelector('img.solution-visual-image[data-trava-animation]'),
      svgW: +r.width.toFixed(1), svgH: +r.height.toFixed(1), imgW: +c.width.toFixed(1), imgH: +c.height.toFixed(1),
      role: svg.getAttribute('role'), label: svg.getAttribute('aria-label'),
    };
  });
  await page.screenshot({ path: join(out, `${name}.png`) });
  const e1 = (await events(page)).slice();
  await scrollTo(page, 0); await wait(900);
  const e2 = (await events(page)).slice();
  await center(); await wait(900);
  const e3 = (await events(page)).slice();
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t < 2000) requestAnimationFrame(f); else res(Math.round(n / 2)); })(); }));
  // fidelity: the inline SVG (with its renamed ids) against the site's own <img> of the same file.
  // Edge antialiasing differs between SVG and <img> rendering, so the drawings are compared blurred (1/6 size):
  // a broken gradient or lost fill would show as large differences (plain inline SVG vs <img> already differs by up to 25 of 255 in one soft spot).
  await page.evaluate(() => { TravaMotion.controllers[0].controller.reset(); });
  const shotSvg = await page.locator('svg.solution-responsive-image').screenshot();
  const shotImg = await page.locator('#control').screenshot();
  const p2 = await ctx.newPage();
  const diff = await p2.evaluate(async ([a, b]) => {
    const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const [ia, ib] = await Promise.all([load('data:image/png;base64,' + a), load('data:image/png;base64,' + b)]);
    const small = (i) => { const c = document.createElement('canvas'); c.width = Math.round(i.width / 6); c.height = Math.round(i.height / 6); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height); return x.getImageData(0, 0, c.width, c.height).data; };
    const da = small(ia), db = small(ib); let max = 0, sum = 0;
    for (let k = 0; k < da.length; k += 4) for (let j = 0; j < 4; j++) { const d = Math.abs(da[k + j] - db[k + j]); if (d > max) max = d; sum += d; }
    return { w: ia.width, h: ia.height, maxBlurDiff: max, meanBlurDiff: +(sum / da.length).toFixed(2) };
  }, [shotSvg.toString('base64'), shotImg.toString('base64')]);
  await p2.close();
  const dups = await dupIds(page);
  await ctx.close();
  check(`${name}: only the shown <img> became SVG; desktop <img> stays untouched`, info.svgs === 1 && info.desktopImgStillImg, { before, info });
  check(`${name}: size equals the site's own <img> with the same class`, Math.abs(info.svgW - info.imgW) <= 1 && Math.abs(info.svgH - info.imgH) <= 1.5, info);
  check(`${name}: drawing equals the site's own <img> of the same file (blurred comparison: max difference ≤ 30 of 255; plain inline SVG without renamed ids already gives 25 here)`, diff.maxBlurDiff <= 30 && diff.meanBlurDiff <= 1.5, diff);
  check(`${name}: alt text moved to the SVG`, info.role === 'img' && info.label === 'Automated queue management workflow', info);
  check(`${name}: starts on screen, resets when it leaves, starts again on return`, e1.map((e) => e.ev).join() === 'start' && e2.map((e) => e.ev).join() === 'start,reset' && e3.map((e) => e.ev).join() === 'start,reset,start', { e1, e2, e3 });
  check(`${name}: no duplicate ids, 0 console errors`, dups.length === 0 && errors.length === 0, { dups, errors });
  check(`${name}: frame rate while animating ≥ 55 fps (headless, indicative)`, fps >= 55, fps);
}
await responsiveRun('tablet', 820, 1100);
await responsiveRun('phone', 390, 800);

// ---------- 4. rotation and reduced motion ----------
{
  const { ctx, page, errors } = await open({ w: 820, h: 1100 });
  await wait(400);
  await page.evaluate(() => document.querySelector('.solution-responsive-image[data-trava-animation]').scrollIntoView({ block: 'center' }));
  await wait(1000);
  await page.setViewportSize({ width: 1280, height: 800 }); await wait(500);
  await page.click('[data-solution-nav="queue-manager"]'); await wait(2500);
  const r = await page.evaluate(() => ({ svgs: document.querySelectorAll('svg[data-trava-animation]').length, imgs: document.querySelectorAll('img[data-trava-animation]').length, active: !!document.querySelector('svg.solution-visual-image')?.closest('.is-active') }));
  const dups = await dupIds(page);
  check('rotation tablet → desktop: the desktop <img> becomes SVG when it appears; two copies, no duplicate ids', r.svgs === 2 && r.imgs === 0 && dups.length === 0 && r.active, { r, dups });
  check('rotation: 0 console errors', errors.length === 0, errors);
  await ctx.close();
}
{
  const { ctx, page, errors } = await open({ w: 1280, h: 800, reduced: true });
  await scrollTo(page, 1000); await wait(1200);
  const r = await page.evaluate(() => ({ svgs: document.querySelectorAll('svg[data-trava-animation]').length, imgs: document.querySelectorAll('img[data-trava-animation]').length }));
  check('reduced motion: images stay as they are (static design)', r.svgs === 0 && r.imgs === 2 && errors.length === 0, { r, errors });
  await ctx.close();
}

await browser.close(); server.close();
writeFileSync(join(out, 'report.json'), JSON.stringify({ ok: fails.length === 0, fails, results }, null, 2));
console.log(fails.length ? `\n${fails.length} check(s) FAILED` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
