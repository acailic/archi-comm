#!/usr/bin/env node
/**
 * Synchronize versions across package.json, src-tauri/Cargo.toml, and src-tauri/tauri.conf.json
 * Usage: node scripts/sync-versions.js [version]
 * - If [version] is omitted, reads from package.json
 * - Creates .bak backups before writing
 */

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const files = {
  pkg: path.join(root, 'package.json'),
  cargo: path.join(root, 'src-tauri', 'Cargo.toml'),
  tauri: path.join(root, 'src-tauri', 'tauri.conf.json')
};

function backup(file) {
  const bak = `${file}.bak`;
  try {
    fs.copyFileSync(file, bak);
  } catch (e) {
    // ignore if cannot backup (file may not exist)
  }
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, obj) {
  const content = JSON.stringify(obj, null, 2) + '\n';
  backup(file);
  fs.writeFileSync(file, content, 'utf8');
}

function syncTauriConf(version) {
  if (!fs.existsSync(files.tauri)) return;
  const tauri = readJSON(files.tauri);
  if (!tauri.package) tauri.package = {};
  tauri.package.version = version;
  writeJSON(files.tauri, tauri);
}

function syncCargoToml(version) {
  if (!fs.existsSync(files.cargo)) return;
  const cargoText = fs.readFileSync(files.cargo, 'utf8');
  // Replace version line inside [package]
  let updated = cargoText.replace(/(^|\n)version\s*=\s*"[^"]*"/m, `$1version = "${version}"`);
  // Optional: keep repository/author aligned with package.json if present
  try {
    const pkg = readJSON(files.pkg);
    if (pkg?.repository?.url) {
      const repoUrl = pkg.repository.url;
      updated = updated.replace(/(^|\n)repository\s*=\s*"[^"]*"/m, `$1repository = "${repoUrl}"`);
    }
    if (pkg?.author) {
      const author = typeof pkg.author === 'string' ? pkg.author : (pkg.author.name || '');
      if (author) {
        // authors = ["Name"] or ["Name <email>"]
        if (/\nauthors\s*=\s*\[[^\]]*\]/m.test(updated)) {
          updated = updated.replace(/(^|\n)authors\s*=\s*\[[^\]]*\]/m, `$1authors = ["${author}"]`);
        } else {
          // insert after description if authors key missing
          updated = updated.replace(/(\ndescription\s*=\s*"[^"]*"\n)/m, `$1authors = ["${author}"]\n`);
        }
      }
    }
    if (pkg?.description) {
      updated = updated.replace(/(^|\n)description\s*=\s*"[^"]*"/m, `$1description = "${pkg.description}"`);
    }
  } catch (_) {}
  if (updated !== cargoText) {
    backup(files.cargo);
    fs.writeFileSync(files.cargo, updated, 'utf8');
  }
}

function main() {
  try {
    const inputVersion = process.argv[2];
    const pkg = readJSON(files.pkg);
    const version = inputVersion || pkg.version;
    if (!version) {
      console.error('Unable to determine version. Provide an argument or set package.json version.');
      process.exit(1);
    }
    if (pkg.version !== version) {
      pkg.version = version;
      writeJSON(files.pkg, pkg);
    }
    syncCargoToml(version);
    syncTauriConf(version);
    console.log(`Synchronized versions to ${version}`);
  } catch (err) {
    console.error('Version synchronization failed:', err);
    process.exit(1);
  }
}

main();

