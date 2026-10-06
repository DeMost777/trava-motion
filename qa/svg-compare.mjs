#!/usr/bin/env node
// Render an SVG in Chromium and compare it pixel by pixel with a reference PNG from Figma (task 2.2).
// Usage: node qa/svg-compare.mjs <file.svg> <reference.png> <out-dir> [scale=1]
// Needs Playwright with Chromium. The repo has no package.json yet (stack is decided in phase 4),
// so run it from a folder where `playwright` is installed, e.g. NODE_PATH=<dir>/node_modules.
// Writes: render.png (the SVG as the browser draws it), diff.png (heatmap), report.json.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
// require() honours NODE_PATH, ESM imports do not
const { chromium } = createRequire(import.meta.url)('playwright');

const [svgPath, refPath, outDir, scaleArg] = process.argv.slice(2);
if (!svgPath || !refPath || !outDir) { console.error('usage: node qa/svg-compare.mjs <file.svg> <reference.png> <out-dir> [scale]'); process.exit(2); }
const scale = Number(scaleArg || 1);
mkdirSync(outDir, { recursive: true });
const svg = readFileSync(svgPath, 'utf8');
const ref = readFileSync(refPath).toString('base64');
const refType = refPath.endsWith('.webp') ? 'image/webp' : 'image/png';

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const result = await page.evaluate(async ({ svg, ref, refType, scale }) => {
  const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('image load failed')); i.src = src; });
  const svgImg = await load('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))));
  const refImg = await load(`data:${refType};base64,${ref}`);
  const W = refImg.naturalWidth, H = refImg.naturalHeight;
  const canvas = (draw) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); draw(x); return c; };
  const a = canvas((x) => x.drawImage(svgImg, 0, 0, svgImg.naturalWidth * scale, svgImg.naturalHeight * scale));
  const b = canvas((x) => x.drawImage(refImg, 0, 0));
  const A = a.getContext('2d').getImageData(0, 0, W, H).data, B = b.getContext('2d').getImageData(0, 0, W, H).data;
  const diff = canvas(() => {}); const dx = diff.getContext('2d'); const D = dx.createImageData(W, H);
  let sum = 0, max = 0, over8 = 0, over32 = 0, visible = 0;
  const rows = new Array(H).fill(0);
  for (let p = 0; p < A.length; p += 4) {
    // compare premultiplied colour so differences in fully transparent pixels do not count
    const aa = A[p + 3] / 255, ba = B[p + 3] / 255;
    const d = Math.max(Math.abs(A[p] * aa - B[p] * ba), Math.abs(A[p + 1] * aa - B[p + 1] * ba), Math.abs(A[p + 2] * aa - B[p + 2] * ba), Math.abs(A[p + 3] - B[p + 3]));
    if (A[p + 3] || B[p + 3]) visible++;
    sum += d; if (d > max) max = d; if (d > 8) over8++; if (d > 32) { over32++; rows[Math.floor(p / 4 / W)]++; }
    const v = Math.min(255, d * 4);
    D.data[p] = v; D.data[p + 1] = v > 0 ? 40 : 0; D.data[p + 2] = 0; D.data[p + 3] = v > 0 ? 255 : 40;
  }
  dx.putImageData(D, 0, 0);
  const n = A.length / 4;
  return {
    size: [W, H], svgNatural: [svgImg.naturalWidth, svgImg.naturalHeight],
    meanDiff: +(sum / n).toFixed(3), maxDiff: Math.round(max),
    pixelsOver8: over8, pixelsOver32: over32, visiblePixels: visible,
    shareOver8OfVisible: +(over8 / visible * 100).toFixed(3) + '%', shareOver32OfVisible: +(over32 / visible * 100).toFixed(3) + '%',
    worstRows: rows.map((c, y) => [y, c]).filter(([, c]) => c).sort((m, k) => k[1] - m[1]).slice(0, 5),
    render: a.toDataURL('image/png'), diff: diff.toDataURL('image/png'),
  };
}, { svg, ref, refType, scale });
await browser.close();

const save = (name, dataUrl) => writeFileSync(resolve(outDir, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
save('render.png', result.render); save('diff.png', result.diff);
delete result.render; delete result.diff;
writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
