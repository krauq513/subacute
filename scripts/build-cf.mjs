import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CF_SINGLE_FILE_LIMIT = 25 * 1024 * 1024; // 25 MiB

const RUNTIME_FILES = [
  'index.html',
  'app.js',
  'style.css',
  'sw.js',
  'robots.txt',
  '_headers'
];

const RUNTIME_DATA_FILES = [
  path.join('data', 'subjects_manifest.js'),
  path.join('data', 'pdf_manifest.js')
];

const RUNTIME_DIRS = [
  path.join('data', 'subjects'),
  'images_webp',
  'original_pdf',
  'vendor'
];

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileEnsuringDir(src, dst) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing required runtime file: ${path.relative(ROOT, src)}`);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDirRecursive(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Missing required runtime directory: ${path.relative(ROOT, srcDir)}`);
  }
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.env') || entry.name === '__pycache__' || entry.name.endsWith('.pyc')) {
      continue;
    }
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function auditDist(distDir) {
  let fileCount = 0;
  let totalBytes = 0;
  let largest = { size: 0, rel: '' };
  const oversized = [];

  function walk(cur) {
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const size = fs.statSync(full).size;
        const rel = path.relative(distDir, full);
        fileCount += 1;
        totalBytes += size;
        if (size > largest.size) {
          largest = { size, rel };
        }
        if (size >= CF_SINGLE_FILE_LIMIT) {
          oversized.push({ size, rel });
        }
      }
    }
  }

  walk(distDir);
  return { fileCount, totalBytes, largest, oversized };
}

ensureCleanDir(DIST);

for (const rel of RUNTIME_FILES) {
  copyFileEnsuringDir(path.join(ROOT, rel), path.join(DIST, rel));
}

for (const rel of RUNTIME_DATA_FILES) {
  copyFileEnsuringDir(path.join(ROOT, rel), path.join(DIST, rel));
}

for (const rel of RUNTIME_DIRS) {
  copyDirRecursive(path.join(ROOT, rel), path.join(DIST, rel));
}

const stats = auditDist(DIST);
if (stats.oversized.length > 0) {
  console.error('Cloudflare Pages 25 MiB single-file limit exceeded:', stats.oversized);
  process.exit(1);
}

console.log(
  `[build-cf] Built dist/ (${stats.fileCount} files, ${(stats.totalBytes / 1048576).toFixed(2)} MB, ` +
  `largest: ${stats.largest.rel} ${(stats.largest.size / 1048576).toFixed(2)} MB)`
);
