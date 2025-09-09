#!/usr/bin/env node
/**
 * Pre-release validation script.
 * - Verifies version consistency across package.json, Cargo.toml, tauri.conf.json
 * - Prints basic guidance for build/test checks (hands-off by default)
 */

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml');
const tauriPath = path.join(root, 'src-tauri', 'tauri.conf.json');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getCargoVersion() {
  if (!fs.existsSync(cargoPath)) return null;
  const text = fs.readFileSync(cargoPath, 'utf8');
  const m = text.match(/\nversion\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function getTauriVersion() {
  if (!fs.existsSync(tauriPath)) return null;
  try {
    const t = readJSON(tauriPath);
    return t?.package?.version || null;
  } catch (_) {
    return null;
  }
}

try {
  const pkg = readJSON(pkgPath);
  const pkgVersion = pkg.version;
  const cargoVersion = getCargoVersion();
  const tauriVersion = getTauriVersion();

  const issues = [];
  if (!pkgVersion) issues.push('package.json has no version');
  if (cargoVersion && cargoVersion !== pkgVersion) issues.push(`Cargo.toml version (${cargoVersion}) != package.json (${pkgVersion})`);
  if (tauriVersion && tauriVersion !== pkgVersion) issues.push(`tauri.conf.json version (${tauriVersion}) != package.json (${pkgVersion})`);

  if (issues.length) {
    console.error('Pre-release checks failed:');
    for (const i of issues) console.error(' -', i);
    process.exit(1);
  }

  console.log('Versions are consistent:', pkgVersion);
  console.log('\nSuggested manual checks (optional):');
  console.log('- npm run lint');
  console.log('- npm test');
  console.log('- npm run web:build');
  console.log('- npm run tauri:build');
} catch (err) {
  console.error('prepare-release failed:', err);
  process.exit(1);
}

