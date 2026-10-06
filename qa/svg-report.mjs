#!/usr/bin/env node
// Facts about a raw Figma SVG export (task 2.1). Read-only: never modifies the file.
// Usage: node qa/svg-report.mjs <file.svg> [tokens.json ...]
// Prints JSON: size and hashes, element counts, ids (m-* roles, duplicates), filters, clip paths,
// gradients, transforms on m-* layers, and every colour compared against the design tokens.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [file, ...tokenFiles] = process.argv.slice(2);
if (!file) { console.error('usage: node qa/svg-report.mjs <file.svg> [tokens.json ...]'); process.exit(2); }
const svg = readFileSync(file, 'utf8');

// --- parse tags into a flat list with parent links (Figma output is well-formed XML) ---
const nodes = [];
const stack = [];
for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g)) {
  const [, closing, tag, attrStr, selfClosing] = m;
  if (closing) { stack.pop(); continue; }
  const attrs = Object.fromEntries([...attrStr.matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
  const node = { tag, attrs, parent: stack.at(-1) ?? null, depth: stack.length };
  nodes.push(node);
  if (!selfClosing) stack.push(node);
}
const byTag = (t) => nodes.filter((n) => n.tag === t);
const count = (arr, key) => arr.reduce((acc, x) => ((acc[key(x)] = (acc[key(x)] || 0) + 1), acc), {});
const nearestId = (n) => { for (let p = n; p; p = p.parent) if (p.attrs.id) return p.attrs.id; return null; };

// --- hashes ---
let fnv = 0x811c9dc5;
for (let i = 0; i < svg.length; i++) { fnv ^= svg.charCodeAt(i); fnv = Math.imul(fnv, 0x01000193) >>> 0; }

// --- ids ---
const ids = nodes.filter((n) => n.attrs.id).map((n) => n.attrs.id);
const dupIds = Object.entries(count(ids, (x) => x)).filter(([, c]) => c > 1).map(([id, c]) => `${id} ×${c}`);
const roles = nodes.filter((n) => /^m-/.test(n.attrs.id || ''));
const roleCounts = count(roles, (n) => n.attrs.id.replace(/_\d+$/, ''));

// --- references: which drawn layers use filters / clip paths ---
const usage = (attr) => count(nodes.filter((n) => n.attrs[attr]), (n) => (n.attrs.id || nearestId(n) || '?').replace(/_\d+$/, ''));
const filterPrims = count(nodes.filter((n) => n.parent && n.parent.tag === 'filter'), (n) => n.tag);
const filterKinds = count(byTag('filter'), (f) => (f.attrs.id.match(/^filter\d+_([a-z]+)_/) || [, '?'])[1]);

// --- transforms on animated layers ---
const roleTransforms = roles.map((n) => ({ id: n.attrs.id, tag: n.tag, transform: n.attrs.transform || null }))
  .filter((r) => r.transform);

// --- colours: hex in attributes + rgba encoded in feColorMatrix ---
const hexes = [];
for (const n of nodes) for (const k of ['fill', 'stroke', 'stop-color', 'flood-color']) {
  let v = n.attrs[k];
  if (v === 'white') v = '#ffffff'; else if (v === 'black') v = '#000000';
  if (v && /^#[0-9a-f]{3,8}$/i.test(v)) hexes.push({ hex: v.toLowerCase(), where: `${n.tag}[${k}]`, layer: nearestId(n) });
}
const matrices = byTag('feColorMatrix').filter((n) => n.attrs.type === 'matrix' || !n.attrs.type)
  .map((n) => n.attrs.values.trim().split(/\s+/).map(Number))
  .filter((v) => v.length === 20 && v[0] === 0 && v[6] === 0 && v[12] === 0 && v[18] <= 1) // constant-colour matrices (shadow colour; skips the alpha-extract matrix)
  .map((v) => {
    const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${to(v[4])}${to(v[9])}${to(v[14])} a${+v[18].toFixed(3)}`;
  });

// --- compare with tokens ---
const tokenHex = new Set();
const walk = (o) => { if (o && typeof o === 'object') { if (typeof o.hex === 'string') tokenHex.add(o.hex.toLowerCase()); Object.values(o).forEach(walk); } };
for (const t of tokenFiles) walk(JSON.parse(readFileSync(t, 'utf8')));
// colours documented in $extensions as used by the illustration but owned by the site palette
const extra = new Set();
for (const t of tokenFiles) for (const h of readFileSync(t, 'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g)) extra.add(h[0].toLowerCase());
const uniqHex = [...new Set(hexes.map((h) => h.hex))].sort();
const shadowHex = [...new Set(matrices.map((m) => m.split(' ')[0]))].sort();
const notInTokens = tokenFiles.length ? [...new Set([...uniqHex, ...shadowHex])].filter((h) => !tokenHex.has(h) && !extra.has(h)) : null;
const onlyInExtensions = tokenFiles.length ? [...new Set([...uniqHex, ...shadowHex])].filter((h) => !tokenHex.has(h) && extra.has(h)) : null;

const root = nodes[0];
console.log(JSON.stringify({
  file,
  bytes: Buffer.byteLength(svg),
  sha256: createHash('sha256').update(svg).digest('hex'),
  fnv1a: fnv.toString(16),
  root: { width: root.attrs.width, height: root.attrs.height, viewBox: root.attrs.viewBox },
  elements: nodes.length,
  byTag: count(nodes, (n) => n.tag),
  maxDepth: Math.max(...nodes.map((n) => n.depth)),
  ids: { total: ids.length, unique: new Set(ids).size, duplicates: dupIds },
  roles: roleCounts,
  roleTransforms: { count: roleTransforms.length, examples: roleTransforms.slice(0, 3) },
  text: byTag('text').length, image: byTag('image').length, mask: byTag('mask').length,
  filters: { total: byTag('filter').length, kinds: filterKinds, primitives: filterPrims, usedBy: usage('filter') },
  clipPaths: { total: byTag('clipPath').length, usedBy: usage('clip-path') },
  gradients: { linear: byTag('linearGradient').length, radial: byTag('radialGradient').length },
  colours: { hex: uniqHex, shadows: [...new Set(matrices)].sort(), notInTokens, onlyInExtensions },
}, null, 2));
