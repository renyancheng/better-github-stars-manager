#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pkg from '../package.json' with { type: 'json' };

const root = process.cwd();
const distDir = path.resolve(root, 'dist');
const artifactsDir = path.resolve(root, 'artifacts');

if (!existsSync(path.join(distDir, 'manifest.json'))) {
  console.error(`❌ No dist/manifest.json found at ${distDir}. Run "pnpm build" first.`);
  process.exit(1);
}

mkdirSync(artifactsDir, { recursive: true });

const baseName = `better-github-stars-manager-${pkg.version}`;
const zipPath = path.join(artifactsDir, `${baseName}.zip`);
const checksumPath = path.join(artifactsDir, `${baseName}.zip.sha256`);

rmSync(zipPath, { force: true });
rmSync(checksumPath, { force: true });

try {
  execFileSync('zip', ['-qr', zipPath, '.'], {
    cwd: distDir,
    stdio: 'inherit',
  });
} catch (error) {
  console.error('❌ Failed to create extension zip. Ensure the "zip" command is available.');
  throw error;
}

const digest = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
writeFileSync(checksumPath, `${digest}  ${path.basename(zipPath)}\n`);

console.log(`✅ Packaged ${path.relative(root, zipPath)}`);
console.log(`✅ Wrote ${path.relative(root, checksumPath)}`);
