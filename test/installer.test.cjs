'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const theme = require('../theme-cli.cjs');

function fixture(version = '2.19.1') {
  const files = new Map([
    ['package.json', Buffer.from(JSON.stringify({name:'fixture-app',version}))],
    ['dist/preload.js', Buffer.from('globalThis.fixture = true;')],
    ['dist/untouched.bin', Buffer.from([0,1,255,83,6])],
    ['empty.txt', Buffer.alloc(0)]
  ]);
  const header = {files:{'package.json':{size:0,offset:'0'}, dist:{files:{'preload.js':{size:0,offset:'0',integrity:{blockSize:16}}, 'untouched.bin':{size:0,offset:'0'}}}, 'empty.txt':{size:0,offset:'0'}, 'native.node':{size:123,unpacked:true}, 'alias':{link:'dist/untouched.bin'}}};
  return theme.encodeArchive(header, files, new Set(files.keys()));
}

function workspace(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-theme-test-'));
  t.after(() => fs.rmSync(directory, {recursive:true, force:true}));
  const archive = path.join(directory, 'app.asar');
  const original = fixture();
  fs.writeFileSync(archive, original);
  return {archive, original, expectedHash:theme.hash(original)};
}

test('patch changes only the preload and preserves unpacked/link metadata', () => {
  const original = fixture();
  const before = theme.parseArchive(original);
  const after = theme.parseArchive(theme.patchArchive(original, '\n// appearance fixture'));
  for (const [name, data] of before.files) {
    if (name === 'dist/preload.js') assert.ok(after.files.get(name).subarray(0, data.length).equals(data));
    else assert.ok(after.files.get(name).equals(data), name);
  }
  assert.deepEqual(after.header.files['native.node'], before.header.files['native.node']);
  assert.deepEqual(after.header.files.alias, before.header.files.alias);
  assert.ok(after.header.files.dist.files['preload.js'].integrity.blocks.length > 1);
});

test('corrupt headers, payloads and unsupported versions are rejected', () => {
  assert.throws(() => theme.parseArchive(Buffer.alloc(12)), /Invalid ASAR/);
  const corrupt = fixture();
  corrupt[corrupt.length - 1] ^= 1;
  assert.throws(() => theme.parseArchive(corrupt), /integrity mismatch/);
  assert.throws(() => theme.patchArchive(fixture('9.0.0')), /Unsupported/);
  const patched = theme.patchArchive(fixture(), '\n// antigravity-gemini-theme:1');
  assert.throws(() => theme.patchArchive(patched), /already contains a theme/);
});

test('dry run writes nothing; install is idempotent and restore is byte exact', t => {
  const {archive, original, expectedHash} = workspace(t);
  const options = {expectedHash, source:'\n// antigravity-gemini-theme:1\n// fixture style'};
  assert.equal(theme.install(archive, {...options,dryRun:true}).action, 'dry run');
  assert.ok(fs.readFileSync(archive).equals(original));
  assert.equal(fs.existsSync(theme.sidecars(archive).backup), false);
  assert.equal(theme.install(archive, options).action, 'installed');
  assert.equal(theme.status(archive, expectedHash).state, 'themed');
  assert.ok(fs.readFileSync(theme.sidecars(archive).backup).equals(original));
  assert.equal(theme.install(archive, options).action, 'already installed');
  assert.equal(theme.restore(archive, expectedHash).action, 'restored');
  assert.ok(fs.readFileSync(archive).equals(original));
  assert.equal(theme.restore(archive, expectedHash).action, 'already original');
});

test('a newer theme can be applied using the verified original backup', t => {
  const {archive, expectedHash} = workspace(t);
  theme.install(archive, {expectedHash,source:'\n// antigravity-gemini-theme:1\n// first'});
  theme.install(archive, {expectedHash,source:'\n// antigravity-gemini-theme:1\n// second'});
  assert.match(theme.parseArchive(fs.readFileSync(archive)).files.get('dist/preload.js').toString(), /second/);
  assert.equal(theme.restore(archive, expectedHash).action, 'restored');
});

test('an updated app is never overwritten during install or restore', t => {
  const {archive, expectedHash} = workspace(t);
  theme.install(archive, {expectedHash,source:'\n// antigravity-gemini-theme:1'});
  const updated = fixture('2.20.0');
  fs.writeFileSync(archive, updated);
  assert.throws(() => theme.install(archive, {expectedHash}), /unrecognized or has been updated/);
  assert.throws(() => theme.restore(archive, expectedHash), /App has changed/);
  assert.ok(fs.readFileSync(archive).equals(updated));
});

test('corrupt backups and mismatched existing backups are rejected', t => {
  const {archive, original, expectedHash} = workspace(t);
  theme.install(archive, {expectedHash,source:'\n// antigravity-gemini-theme:1'});
  const installed = fs.readFileSync(archive);
  fs.writeFileSync(theme.sidecars(archive).backup, 'broken backup');
  assert.throws(() => theme.restore(archive, expectedHash), /Backup checksum/);
  assert.throws(() => theme.install(archive, {expectedHash}), /Backup checksum/);
  assert.ok(fs.readFileSync(archive).equals(installed));
  fs.writeFileSync(archive, original);
  assert.throws(() => theme.install(archive, {expectedHash}), /existing backup differs/);
  assert.ok(fs.readFileSync(archive).equals(original));
});

test('the complete bundled runtime is valid JavaScript and has embedded CSS/font license', () => {
  const source = theme.runtime();
  new vm.Script(source);
  assert.match(source, /data:font\/ttf;base64/);
  assert.match(source, /SIL OPEN FONT LICENSE/);
  assert.doesNotMatch(source, /__GEMINI_CSS__/);
});
