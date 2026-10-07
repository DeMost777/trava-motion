#!/usr/bin/env node
// Prepare a raw Figma SVG export for animation (task 2.4, rules: docs/svg-prep-rules.md, ADR 0014).
// Usage: node tools/prepare-svg.mjs <raw.svg> <out.svg> --name <illustration> --expect impulse=24,hub=1,gear=1
//        [--reference <figma.png>] [--tokens <tokens.json>]
// --expect: animated layers the storyboard needs; a layer lost in Figma stops the tool.
//
// Only technical edits, everything else stays byte for byte:
//   id="m-<role>[_N]"  -> data-m="<role>"        (animated layers, ADR 0014 decision 2)
//   other layer ids    -> removed                (ids inside <defs> stay: shapes reference them)
//   <svg>              -> no width/height, + data-trava-animation, aria-hidden, focusable
// The output is written only if every check passes. Visual checks need Playwright on NODE_PATH
// (see qa/svg-compare.mjs); without it the tool says so and skips them.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const name = opt('--name'), reference = opt('--reference'), tokens = opt('--tokens'), expectArg = opt('--expect');
const [rawPath, outPath] = args;
if (!rawPath || !outPath || !name || !/^[a-z0-9-]+$/.test(name) || !expectArg || !/^([a-z][a-z0-9-]*=\d+,?)+$/.test(expectArg)) {
  console.error('usage: node tools/prepare-svg.mjs <raw.svg> <out.svg> --name <kebab-name> --expect role=N,... [--reference <png>] [--tokens <json>]');
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- transform
function prepare(svg) {
  const defsStart = svg.indexOf('<defs>');
  const defsEnd = svg.indexOf('</defs>');
  return svg.replace(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)(\s*\/?)>/g, (tag, el, attrs, end, offset) => {
    if (el === 'svg') {
      let a = attrs.replace(/\s+(width|height)="[^"]*"/g, '');
      for (const [k, v] of [['data-trava-animation', name], ['aria-hidden', 'true'], ['focusable', 'false']]) {
        if (!new RegExp(`\\s${k}="`).test(a)) a += ` ${k}="${v}"`;
      }
      return `<${el}${a}${end}>`;
    }
    const inDefs = defsStart >= 0 && offset > defsStart && offset < defsEnd;
    if (inDefs) return tag;
    const a = attrs.replace(/\s+id="([^"]*)"/, (m, id) => {
      const role = id.match(/^m-([a-z][a-z0-9-]*?)(?:_\d+)?$/);
      return role ? ` data-m="${role[1]}"` : '';
    });
    return `<${el}${a}${end}>`;
  });
}

// ---------------------------------------------------------------- structural checks
const raw = readFileSync(rawPath, 'utf8');
const out = prepare(raw);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); return ok; };
const results = {};

const countRaw = {}, countOut = {};
for (const m of raw.matchAll(/\sid="m-([a-z][a-z0-9-]*?)(?:_\d+)?"/g)) countRaw[m[1]] = (countRaw[m[1]] || 0) + 1;
for (const m of out.matchAll(/\sdata-m="([^"]+)"/g)) countOut[m[1]] = (countOut[m[1]] || 0) + 1;
results.roles = countOut;
check(Object.keys(countRaw).length > 0, 'no m-* layers in the raw export: name animated layers in Figma (docs/figma-layer-naming.md)');
check(JSON.stringify(countRaw) === JSON.stringify(countOut), `roles changed: raw ${JSON.stringify(countRaw)} vs prepared ${JSON.stringify(countOut)}`);
const expected = Object.fromEntries(expectArg.split(',').filter(Boolean).map((p) => { const [k, v] = p.split('='); return [k, Number(v)]; }));
const sorted = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).sort()));
check(sorted(countOut) === sorted(expected), `roles do not match --expect: found ${sorted(countOut)}, expected ${sorted(expected)}`);

const defs = out.slice(out.indexOf('<defs>'));
const defIds = new Set([...defs.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const refs = [...out.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] || m[2]);
const broken = [...new Set(refs.filter((r) => !defIds.has(r)))];
results.references = { total: refs.length, broken };
check(broken.length === 0, `broken references: ${broken.join(', ')}`);
const strayIds = (out.slice(0, out.indexOf('<defs>')).match(/\sid="/g) || []).length;
check(strayIds === 0, `${strayIds} ids left outside <defs>`);
check(prepare(out) === out, 'not repeatable: preparing the output again changes it');
check(/viewBox="/.test(out.match(/<svg[^>]*>/)[0]), 'root <svg> has no viewBox');

// svg-report: warnings about effects Figma exports wrong, colours outside tokens
const reportArgs = [resolve(here, '../qa/svg-report.mjs'), rawPath, ...(tokens ? [tokens] : [])];
const report = JSON.parse(execFileSync(process.execPath, reportArgs, { encoding: 'utf8' }));
results.warnings = report.warnings;
check(report.warnings.length === 0, `export warnings: ${report.warnings.join('; ')}`);
if (tokens) check(report.colours.notInTokens.length === 0, `colours outside tokens: ${report.colours.notInTokens.join(', ')}`);

// ---------------------------------------------------------------- visual checks (Playwright)
let chromium = null;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { /* optional */ }
if (!chromium) {
  results.visual = 'skipped: Playwright not found (set NODE_PATH)';
} else if (problems.length === 0) {
  const [, , w, h] = raw.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const ref = reference ? readFileSync(reference).toString('base64') : null;
  results.visual = await page.evaluate(async ({ raw, out, ref, w, h }) => {
    const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('load failed')); i.src = src; });
    const svgUrl = (s) => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
    const pixels = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
    const A = pixels(await load(svgUrl(raw))), B = pixels(await load(svgUrl(out)));
    let changed = 0; for (let i = 0; i < A.length; i += 4) if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2] || A[i + 3] !== B[i + 3]) changed++;
    let vsReference = null;
    if (ref) {
      const R = pixels(await load('data:image/png;base64,' + ref));
      let sum = 0, over32 = 0, visible = 0;
      for (let p = 0; p < B.length; p += 4) {
        const ba = B[p + 3] / 255, ra = R[p + 3] / 255;
        const d = Math.max(Math.abs(B[p] * ba - R[p] * ra), Math.abs(B[p + 1] * ba - R[p + 1] * ra), Math.abs(B[p + 2] * ba - R[p + 2] * ra), Math.abs(B[p + 3] - R[p + 3]));
        sum += d; if (d > 32) over32++; if (B[p + 3] || R[p + 3]) visible++;
      }
      vsReference = { meanDiff: +(sum / (B.length / 4)).toFixed(3), shareOver32OfVisible: +(over32 / visible * 100).toFixed(3) + '%' };
    }
    // addressable: inline the prepared SVG and query the roles
    const host = document.createElement('div'); host.innerHTML = out; document.body.append(host);
    const root = host.querySelector('svg');
    const found = {}; root.querySelectorAll('[data-m]').forEach((n) => { found[n.dataset.m] = (found[n.dataset.m] || 0) + 1; });
    return { pixelsChangedVsRaw: changed, vsReference, addressable: found, root: root.dataset.travaAnimation };
  }, { raw, out, ref, w, h });
  await browser.close();
  check(results.visual.pixelsChangedVsRaw === 0, `${results.visual.pixelsChangedVsRaw} pixels differ from the raw export`);
  check(sorted(results.visual.addressable) === sorted(expected), `roles not addressable in the browser: ${JSON.stringify(results.visual.addressable)}`);
  check(results.visual.root === name, 'data-trava-animation not found on the root');
}

// ---------------------------------------------------------------- result
results.bytes = { raw: Buffer.byteLength(raw), prepared: Buffer.byteLength(out) };
if (problems.length) {
  console.error(JSON.stringify({ ok: false, problems, results }, null, 2));
  console.error(`\nNot written: ${outPath}`);
  process.exit(1);
}
writeFileSync(outPath, out);
console.log(JSON.stringify({ ok: true, out: outPath, results }, null, 2));
