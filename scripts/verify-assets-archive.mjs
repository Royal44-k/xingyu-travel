import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = 'archive/asset-manifest.json';
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'archive/source-ledger.json'), 'utf8'));
const failures = [];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const safeFile = relative => {
  assert(!relative.includes('\\') && !relative.split('/').includes('..') && !path.isAbsolute(relative), `Unsafe path: ${relative}`);
  const full = path.resolve(root, relative);
  assert(full.startsWith(root + path.sep), `Path escapes archive root: ${relative}`);
  return full;
};
const check = (label, fn) => {
  try { fn(); } catch (error) { failures.push({ check: label, error: error.message }); }
};
const entries = new Map(manifest.files.map(entry => [entry.path, entry]));
check('unique manifest paths', () => assert.equal(entries.size, manifest.files.length));

for (const entry of manifest.files) {
  check(entry.path, () => {
    let bytes = fs.readFileSync(safeFile(entry.path));
    // Git checkout may apply CRLF to ordinary text. Historical archive bytes remain exact.
    if (entry.allowCRLF && digest(bytes) !== entry.sha256) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    assert.equal(bytes.length, entry.bytes, 'Byte count differs');
    assert.equal(digest(bytes), entry.sha256, 'SHA-256 differs');
    if (entry.dimensions) {
      assert.equal(bytes.readUInt32BE(16), entry.dimensions.width, 'PNG width differs');
      assert.equal(bytes.readUInt32BE(20), entry.dimensions.height, 'PNG height differs');
    }
  });
}

const skipped = new Set(['.git', '.next', '.vercel', '.worktrees', 'node_modules', 'test-results', 'playwright-report']);
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  if (skipped.has(entry.name) || entry.name.endsWith('.tsbuildinfo') || (entry.name.startsWith('.env') && entry.name !== '.env.example')) return [];
  if (entry.isSymbolicLink()) return [];
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [path.relative(root, full).replaceAll('\\', '/')];
});
check('file inventory', () => {
  const actual = fs.existsSync(path.join(root, '.git'))
    ? execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
    : walk(root);
  assert.deepEqual(actual.sort(), [...entries.keys(), manifestPath].sort(), 'Repository/ZIP file set differs from manifest');
});

for (const source of ledger.sources) {
  check(`source: ${source.source}`, () => {
    assert(entries.has(source.path), 'Mapped asset is not in the repository manifest');
    const bytes = fs.readFileSync(safeFile(source.path));
    assert.equal(bytes.length, source.bytes, 'Original source byte count differs');
    assert.equal(digest(bytes), source.sha256, 'Source mapping is not byte-identical');
  });
}
check('history metadata', () => {
  const history = JSON.parse(fs.readFileSync(safeFile('archive/git-history.json'), 'utf8'));
  assert.equal(history.count, history.commits.length);
  assert.equal(history.commits.at(-1).commit, manifest.baselineCommit);
  assert.equal(ledger.baselineCommit, manifest.baselineCommit);
});

const summary = { result: failures.length ? 'failed' : 'passed', files: manifest.files.length, sourceRecords: ledger.sources.length,
  unavailableOriginals: ledger.missing.length, pngFiles: manifest.files.filter(entry => entry.dimensions).length, failures };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
