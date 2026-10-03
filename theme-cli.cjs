#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');

const VERSION = '2.19.1';
const ORIGINAL_HASH = '341234faf45bd1776fd5418a3c288dedc5487ebfcf153f53d75de17cfe15c1de';
const MARKER = '// antigravity-gemini-theme:1';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

function* entries(node, prefix = '') {
  for (const [name, value] of Object.entries(node.files || {})) {
    const full = prefix + name;
    if (value.files) yield* entries(value, full + '/');
    else yield [full, value];
  }
}

function parseArchive(buffer) {
  if (buffer.length < 16 || buffer.readUInt32LE(0) !== 4) throw new Error('Invalid ASAR archive.');
  const headerSize = buffer.readUInt32LE(4);
  const stringSize = buffer.readUInt32LE(12);
  const start = 8 + headerSize;
  if (headerSize < 8 || stringSize > headerSize - 8 || start > buffer.length) throw new Error('Invalid ASAR header bounds.');
  const header = JSON.parse(buffer.subarray(16, 16 + stringSize).toString('utf8'));
  const files = new Map();
  for (const [name, value] of entries(header)) {
    if (value.unpacked || value.link) continue;
    const offset = Number(value.offset), size = value.size;
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(size) || size < 0 || start + offset + size > buffer.length) throw new Error('Invalid ASAR entry: ' + name);
    const data = buffer.subarray(start + offset, start + offset + size);
    const integrity = value.integrity;
    if (integrity) {
      if (integrity.algorithm !== 'SHA256' || hash(data) !== integrity.hash) throw new Error('ASAR integrity mismatch: ' + name);
      if (!Number.isSafeInteger(integrity.blockSize) || integrity.blockSize <= 0) throw new Error('Invalid integrity block size: ' + name);
      const blocks = [];
      for (let i = 0; i < data.length; i += integrity.blockSize) blocks.push(hash(data.subarray(i, i + integrity.blockSize)));
      if (JSON.stringify(blocks) !== JSON.stringify(integrity.blocks)) throw new Error('ASAR block integrity mismatch: ' + name);
    }
    files.set(name, data);
  }
  return {header, files};
}

function encodeArchive(header, files, changed = new Set()) {
  header = structuredClone(header);
  const packed = [];
  let offset = 0;
  for (const [name, value] of entries(header)) {
    if (value.unpacked || value.link) continue;
    const data = files.get(name);
    if (!Buffer.isBuffer(data)) throw new Error('Missing packed file: ' + name);
    value.offset = String(offset);
    value.size = data.length;
    if (changed.has(name)) {
      const blockSize = value.integrity?.blockSize || 4194304;
      const blocks = [];
      for (let i = 0; i < data.length; i += blockSize) blocks.push(hash(data.subarray(i, i + blockSize)));
      value.integrity = {algorithm:'SHA256', hash:hash(data), blockSize, blocks};
    }
    packed.push(data);
    offset += data.length;
  }
  const encoded = Buffer.from(JSON.stringify(header));
  const padding = (4 - encoded.length % 4) % 4;
  const prefix = Buffer.alloc(16);
  prefix.writeUInt32LE(4, 0);
  prefix.writeUInt32LE(encoded.length + padding + 8, 4);
  prefix.writeUInt32LE(encoded.length + padding + 4, 8);
  prefix.writeUInt32LE(encoded.length, 12);
  return Buffer.concat([prefix, encoded, Buffer.alloc(padding), ...packed]);
}

function runtime(root = __dirname) {
  const font = fs.readFileSync(path.join(root, 'assets/fonts/google-sans-flex.ttf')).toString('base64');
  const license = fs.readFileSync(path.join(root, 'assets/fonts/OFL.txt'), 'utf8');
  const css = "@font-face{font-family:'Gemini UI';font-style:normal;font-weight:400 600;font-display:swap;src:url(data:font/ttf;base64," + font + ") format('truetype');}\n" + fs.readFileSync(path.join(root, 'theme/gemini.css'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'theme/enhance.js'), 'utf8');
  if (source.split('__GEMINI_CSS__').length !== 2) throw new Error('Theme runtime must have one CSS placeholder.');
  return '\n' + MARKER + '\n/* Bundled font license:\n' + license.replaceAll('*/', '* /') + '\n*/\n' + source.replace('__GEMINI_CSS__', () => JSON.stringify(css));
}

function patchArchive(original, source = runtime()) {
  const {header, files} = parseArchive(original);
  const version = JSON.parse(files.get('package.json')?.toString('utf8') || '{}').version;
  if (version !== VERSION) throw new Error('Unsupported Antigravity version ' + version + '; this theme supports ' + VERSION + '.');
  const preload = files.get('dist/preload.js');
  if (!preload) throw new Error('Expected Antigravity preload was not found.');
  if (preload.includes(MARKER) || preload.includes('__antigravityGeminiStyleV2')) throw new Error('Archive already contains a theme; restore its original backup first.');
  const updated = new Map(files);
  updated.set('dist/preload.js', Buffer.concat([preload, Buffer.from(source)]));
  const result = encodeArchive(header, updated, new Set(['dist/preload.js']));
  const verified = parseArchive(result);
  for (const [name, data] of files) {
    const expected = name === 'dist/preload.js' ? updated.get(name) : data;
    if (!verified.files.get(name)?.equals(expected)) throw new Error('Rebuilt archive verification failed: ' + name);
  }
  return result;
}

function sidecars(archive) {
  return {backup:archive + '.gemini-theme-backup', state:archive + '.gemini-theme.json'};
}

function readState(archive) {
  const {state} = sidecars(archive);
  if (!fs.existsSync(state)) return null;
  const data = JSON.parse(fs.readFileSync(state, 'utf8'));
  if (data.schema !== 1 || data.archive !== archive || !/^[a-f0-9]{64}$/.test(data.originalHash) || !/^[a-f0-9]{64}$/.test(data.themedHash)) throw new Error('Invalid theme state; keep the backup and check the installation manually.');
  return data;
}

function atomicWrite(target, data) {
  const temporary = target + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temporary, data, {flag:'wx', mode:fs.existsSync(target) ? fs.statSync(target).mode : 0o600});
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function status(archive, expectedHash = ORIGINAL_HASH) {
  const current = fs.readFileSync(archive);
  const currentHash = hash(current);
  const state = readState(archive);
  const parsed = parseArchive(current);
  const version = JSON.parse(parsed.files.get('package.json')?.toString('utf8') || '{}').version;
  return {archive, version, state:currentHash === expectedHash ? 'original' : state && currentHash === state.themedHash ? 'themed' : 'unrecognized', supported:version === VERSION && (currentHash === expectedHash || state?.originalHash === expectedHash && currentHash === state.themedHash), backupExists:fs.existsSync(sidecars(archive).backup), sha256:currentHash};
}

function install(archive, {dryRun = false, expectedHash = ORIGINAL_HASH, source = runtime()} = {}) {
  archive = path.resolve(archive);
  const current = fs.readFileSync(archive);
  const currentHash = hash(current);
  const state = readState(archive);
  const {backup, state:statePath} = sidecars(archive);
  let original = current;
  if (state && currentHash === state.themedHash) {
    original = fs.readFileSync(backup);
    if (hash(original) !== state.originalHash) throw new Error('Backup checksum mismatch; refusing to modify the app.');
  } else if (currentHash !== expectedHash) {
    throw new Error('This app build is unrecognized or has been updated. No files were changed. Supported build: Antigravity ' + VERSION + ' for Windows.');
  }
  if (hash(original) !== expectedHash) throw new Error('Original app checksum is not supported.');
  const themed = patchArchive(original, source);
  const themedHash = hash(themed);
  if (currentHash === themedHash) return {action:'already installed', sha256:themedHash};
  if (fs.existsSync(backup) && hash(fs.readFileSync(backup)) !== expectedHash) throw new Error('An existing backup differs; refusing to overwrite it.');
  if (dryRun) return {action:'dry run', version:VERSION, modifiedFiles:['dist/preload.js'], sha256:themedHash};
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, original, {flag:'wx'});
  // Save recovery metadata before the archive swap, so a failed swap remains recoverable.
  atomicWrite(statePath, JSON.stringify({schema:1, archive, version:VERSION, originalHash:expectedHash, themedHash}, null, 2) + '\n');
  atomicWrite(archive, themed);
  return {action:'installed', backup, sha256:themedHash};
}

function restore(archive, expectedHash = ORIGINAL_HASH) {
  archive = path.resolve(archive);
  const currentHash = hash(fs.readFileSync(archive));
  const state = readState(archive);
  if (currentHash === expectedHash) return {action:'already original'};
  if (!state || state.originalHash !== expectedHash || currentHash !== state.themedHash) throw new Error('App has changed since installation; refusing to overwrite it with an old backup.');
  const {backup} = sidecars(archive);
  const original = fs.readFileSync(backup);
  if (hash(original) !== expectedHash) throw new Error('Backup checksum mismatch; refusing to restore.');
  atomicWrite(archive, original);
  return {action:'restored', backup};
}

function requireClosedApp() {
  if (process.platform !== 'win32') throw new Error('Installation and restore are supported on Windows only.');
  const command = "$ErrorActionPreference='Stop'; if (Get-Process -Name Antigravity -ErrorAction SilentlyContinue) { exit 10 }";
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {encoding:'utf8', windowsHide:true});
  if (result.status === 10) throw new Error('Close Antigravity completely, including its background processes, then try again.');
  if (result.error || result.status !== 0) throw new Error('Could not verify that Antigravity is closed; no files were changed.');
}

function cli(args) {
  const command = args.shift();
  if (!command || command === '--help' || command === 'help') {
    console.log('Usage: node theme-cli.cjs <status|install|restore> [--archive PATH] [--dry-run]\nDefault: %LOCALAPPDATA%/Programs/antigravity/resources/app.asar\n--dry-run is available for install only. Close Antigravity before install or restore.');
    return;
  }
  if (!['status','install','restore'].includes(command)) throw new Error('Unknown command: ' + command);
  let archive = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs/antigravity/resources/app.asar') : null;
  let dryRun = false;
  while (args.length) {
    const option = args.shift();
    if (option === '--archive' && args[0] && !args[0].startsWith('--')) archive = args.shift();
    else if (option === '--dry-run' && command === 'install') dryRun = true;
    else throw new Error('Unknown or incomplete option: ' + option);
  }
  if (!archive) throw new Error('Set --archive to the installed app.asar path.');
  archive = path.resolve(archive);
  if (command !== 'status' && !dryRun) requireClosedApp();
  const result = command === 'status' ? status(archive) : command === 'install' ? install(archive, {dryRun}) : restore(archive);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {hash, entries, parseArchive, encodeArchive, patchArchive, runtime, install, restore, status, sidecars, requireClosedApp, cli, VERSION, ORIGINAL_HASH};
if (require.main === module) {
  try { cli(process.argv.slice(2)); }
  catch (error) { console.error(error.code === 'ENOENT' ? 'Required file was not found. Check the app path and keep the complete theme folder.' : error.message); process.exitCode = 1; }
}
