#!/usr/bin/env node
// Frame-time check of a raw SVG while its m-* layers move (task 2.2). Indicative only: headless Chromium
// renders in software, real devices with GPU differ. Run with Playwright on NODE_PATH (see svg-compare.mjs).
// Usage: node qa/svg-perf.mjs <file.svg>
// Variants: raw file / without the filter on the root group / without any filters.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const src = fs.readFileSync(process.argv[2], 'utf8');
const variants = {
  raw: src,
  noRootFilter: src.replace(/(<svg[^>]*>\s*<g[^>]*?) filter="url\(#[^)]+\)"/, '$1'),
  noFilters: src.replace(/ filter="url\(#[^)]+\)"/g, ''),
};
const b = await chromium.launch();
const out = {};
for (const [name, svg] of Object.entries(variants)) {
  for (const throttle of [1, 4]) {
    const p = await b.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 2 });
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    await p.setContent(`<body style="margin:0;background:#0b2a33">${svg}</body>`);
    const r = await p.evaluate(() => new Promise((done) => {
      const imps = [...document.querySelectorAll('[id^="m-impulse"]')];
      const gear = document.getElementById('m-gear') || document.querySelector('[id^="m-"]');
      const t0 = performance.now(); let last = t0; const dts = [];
      function tick(now) {
        const t = (now - t0) / 1000;
        imps.forEach((el, i) => el.style.translate = `${(t * 40 + i * 3) % 20}px 0`);
        gear.style.transformOrigin = '239.75px 231.33px'; gear.style.transformBox = 'view-box';
        gear.style.transform = `rotate(${t * 120}deg) scale(${1 + 0.1 * Math.sin(t * 3)})`;
        dts.push(now - last); last = now;
        if (now - t0 < 3000) requestAnimationFrame(tick); else {
          dts.shift(); dts.sort((a, b) => a - b);
          done({ frames: dts.length, fps: +(dts.length / 3).toFixed(1), p50: +dts[Math.floor(dts.length / 2)].toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1) });
        }
      }
      requestAnimationFrame(tick);
    }));
    out[`${name} cpu×${throttle}`] = r;
    await p.close();
  }
}
await b.close();
console.log(JSON.stringify(out, null, 1));
