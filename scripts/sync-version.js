#!/usr/bin/env node

/**
 * Syncs the version from extension/package.json to extension/public/manifest.json
 *
 * Usage: node scripts/sync-version.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const packageJsonPath = resolve(rootDir, 'extension/package.json');
const manifestPath = resolve(rootDir, 'extension/public/manifest.json');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

const oldVersion = manifest.version;
const newVersion = packageJson.version;

if (oldVersion === newVersion) {
  console.log(`Version already in sync: ${newVersion}`);
  process.exit(0);
}

manifest.version = newVersion;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

console.log(`Synced manifest.json version: ${oldVersion} → ${newVersion}`);
