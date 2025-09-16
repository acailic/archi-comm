#!/usr/bin/env node
// scripts/process-demo-videos.js
// Post-process demo videos: generate MP4 copies and thumbnails.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function hasFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toMp4(input, output) {
  const cmd = `ffmpeg -y -i "${input}" -c:v libx264 -crf 18 -preset veryslow -pix_fmt yuv420p -c:a aac -movflags +faststart "${output}"`;
  execSync(cmd, { stdio: 'inherit' });
}

function thumbnail(input, outputJpg, ss = '00:00:03.000') {
  const cmd = `ffmpeg -y -ss ${ss} -i "${input}" -vframes 1 -q:v 2 "${outputJpg}"`;
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  const inputDir = path.join(process.cwd(), 'e2e', 'demo-videos');
  const outDir = path.join(process.cwd(), 'e2e', 'processed-videos');
  ensureDir(outDir);

  const ffmpeg = hasFFmpeg();
  if (!ffmpeg) {
    console.warn('⚠️ ffmpeg not found. Skipping MP4/thumbnail generation.');
    console.log('Videos are available in:', inputDir);
    process.exit(0);
  }

  const files = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.webm'));
  if (!files.length) {
    console.log('No .webm videos found in', inputDir);
    process.exit(0);
  }

  console.log('🎬 Processing demo videos...');
  for (const file of files) {
    const base = file.replace(/\.webm$/i, '');
    const inPath = path.join(inputDir, file);
    const mp4Path = path.join(outDir, `${base}.mp4`);
    const jpgPath = path.join(outDir, `${base}-thumb.jpg`);

    try {
      console.log(`→ ${file} → ${base}.mp4`);
      toMp4(inPath, mp4Path);
      console.log(`→ ${file} → ${base}-thumb.jpg`);
      thumbnail(inPath, jpgPath);
    } catch (e) {
      console.warn('Failed to process', file, e);
    }
  }

  console.log('✅ Processed outputs in:', outDir);
}

main();

