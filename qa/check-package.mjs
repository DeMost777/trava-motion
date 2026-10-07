#!/usr/bin/env node
// Check an animation package against the standard (ADR 0015). Read-only.
// Usage: node qa/check-package.mjs animations/<name>
// Checks: required files exist; figma.json is complete and its sha256 match the files;
// illustration.svg is current (preparing the export again gives the same bytes).
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) { console.error('usage: node qa/check-package.mjs animations/<name>'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const problems = [];
const required = ['README.md', 'brief.md', 'storyboard.md', 'figma.json', 'illustration.svg'];
for (const f of required) if (!existsSync(join(dir, f))) problems.push(`missing ${f}`);

let manifest = null;
try { manifest = JSON.parse(readFileSync(join(dir, 'figma.json'), 'utf8')); } catch (e) { problems.push(`figma.json unreadable: ${e.message}`); }
if (manifest) {
  for (const k of ['figma', 'roles', 'export', 'reference']) if (!manifest[k]) problems.push(`figma.json: no "${k}"`);
  for (const k of ['export', 'reference']) {
    const f = manifest[k] && join(dir, manifest[k].file || '');
    if (!f || !existsSync(f)) { problems.push(`figma.json ${k}: file not found`); continue; }
    const sum = createHash('sha256').update(readFileSync(f)).digest('hex');
    if (sum !== manifest[k].sha256) problems.push(`${manifest[k].file}: sha256 differs from figma.json`);
  }
}
if (!problems.length) {
  const tmp = mkdtempSync(join(tmpdir(), 'pkg-'));
  try {
    execFileSync(process.execPath, [resolve(here, '../tools/prepare-svg.mjs'), dir, '--out', join(tmp, 'illustration.svg')], { stdio: 'pipe' });
    if (!readFileSync(join(tmp, 'illustration.svg')).equals(readFileSync(join(dir, 'illustration.svg')))) {
      problems.push('illustration.svg is out of date: run node tools/prepare-svg.mjs ' + dir);
    }
  } catch (e) {
    problems.push('prepare-svg failed: ' + String(e.stderr || e.message).slice(0, 400));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
console.log(JSON.stringify({ package: dir, ok: problems.length === 0, problems }, null, 2));
process.exit(problems.length ? 1 : 0);
