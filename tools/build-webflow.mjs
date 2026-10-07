#!/usr/bin/env node
// Build the files that go to Webflow (task 10.1, short path for Queue Manager).
// Usage: node tools/build-webflow.mjs
// Output: exports/webflow/trava-motion.js  — tokens + runtime + primitives + every animations/<name>/animation.js
//         exports/webflow/<name>.svg       — copy of animations/<name>/illustration.svg (upload to Webflow assets)
// Checks: tempo numbers in animation.js equal the `tempo` block of motion.yaml; every package passes qa/check-package.mjs.
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(repo, 'exports/webflow');
const problems = [];

// tokens → runtime values (GSAP ease names from $extensions.com.gsap, durations in seconds)
const mt = JSON.parse(readFileSync(join(repo, 'tokens/motion.tokens.json'), 'utf8')).motion;
const ms = (v) => (v.unit === 'ms' ? v.value : v.value * 1000);
const tokens = {
  ease: Object.fromEntries(Object.entries(mt.ease).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, v.$extensions['com.gsap'].ease])),
  trigger: { threshold: mt.trigger.threshold.$value, delay: ms(mt.trigger.delay.$value) },
};

const packages = readdirSync(join(repo, 'animations'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(repo, 'animations', d.name, 'animation.js'))).map((d) => d.name);

for (const name of packages) {
  const dir = join(repo, 'animations', name);
  // tempo: motion.yaml vs animation.js
  const yaml = readFileSync(join(dir, 'motion.yaml'), 'utf8');
  const block = (yaml.match(/^tempo:[^\n]*\n((?:[ \t]+[^\n]*\n)+)/m) || [])[1] || '';
  const spec = Object.fromEntries([...block.matchAll(/^\s+([A-Za-z]+):\s*([\d.]+)/gm)].map((m) => [m[1], Number(m[2])]));
  const code = readFileSync(join(dir, 'animation.js'), 'utf8');
  const tempoSrc = (code.match(/var TEMPO = (\{[^}]*\})/) || [])[1];
  const tempo = tempoSrc ? Function(`return (${tempoSrc})`)() : {};
  if (JSON.stringify(Object.entries(spec).sort()) !== JSON.stringify(Object.entries(tempo).sort())) {
    problems.push(`${name}: tempo in animation.js ${JSON.stringify(tempo)} differs from motion.yaml ${JSON.stringify(spec)}`);
  }
  try { execFileSync(process.execPath, [join(repo, 'qa/check-package.mjs'), join('animations', name)], { cwd: repo, stdio: 'pipe' }); }
  catch (e) { problems.push(`${name}: qa/check-package.mjs failed\n${e.stdout}`); }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const parts = [
  `/*! Trava Motion — built ${new Date().toISOString().slice(0, 10)} from github repo trava-motion. Animations: ${packages.join(', ')}. */`,
  `window.TravaMotion = window.TravaMotion || {}; window.TravaMotion.tokens = ${JSON.stringify(tokens)};`,
  readFileSync(join(repo, 'src/runtime/trava-motion.js'), 'utf8'),
  ...readdirSync(join(repo, 'src/primitives')).filter((f) => f.endsWith('.js')).sort().map((f) => readFileSync(join(repo, 'src/primitives', f), 'utf8')),
  ...packages.map((n) => readFileSync(join(repo, 'animations', n, 'animation.js'), 'utf8')),
];
writeFileSync(join(out, 'trava-motion.js'), parts.join('\n'));
for (const n of packages) copyFileSync(join(repo, 'animations', n, 'illustration.svg'), join(out, `${n}.svg`));
console.log(JSON.stringify({ ok: true, packages, tokens, files: ['trava-motion.js', ...packages.map((n) => `${n}.svg`)].map((f) => `${f}: ${readFileSync(join(out, f)).length} B`) }, null, 2));
