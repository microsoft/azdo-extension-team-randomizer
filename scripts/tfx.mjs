#!/usr/bin/env node

// Minimal cross-platform tfx wrapper: create/publish + dev/prod.
// Usage: node scripts/tfx.mjs <create|publish> <dev|prod>
// Env:
//   AZURE_DEVOPS_PUBLISHER (dev)  - publisher id if not in manifest(s)
//   AZURE_DEVOPS_TOKEN (publish)  - PAT with marketplace rights
//   AZURE_DEVOPS_BASE_URI (optional) - override baseUri for dev (defaults https://localhost:33000)

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , action, mode] = process.argv;
const validActions = new Set(['create', 'publish']);
const validModes = new Set(['dev', 'prod']);

if (!validActions.has(action) || !validModes.has(mode)) {
  err('Usage: node scripts/tfx.mjs <create|publish> <dev|prod>');
}

const isDev = mode === 'dev';
const overrideFile = `azure-devops-extension.${mode}.json`;
// Dev baseUri override (falls back to localhost if not provided)
const devBaseUri = process.env.AZURE_DEVOPS_BASE_URI || 'https://localhost:33000';
const token = process.env.AZURE_DEVOPS_TOKEN || '';
let publisher = process.env.AZURE_DEVOPS_PUBLISHER || '';

// Lightweight fallback: try override manifest, then base manifest.
if (!publisher) {
  for (const file of [overrideFile, 'azure-devops-extension.json']) {
    try {
      const fp = path.resolve(process.cwd(), file);
      if (fs.existsSync(fp)) {
        const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (data.publisher) {
          publisher = data.publisher;
          break;
        }
      }
    } catch {
      err('Failed to read manifest file for publisher.');
    }
  }
}

if (action === 'publish' && !token) {
  err('Missing AZURE_DEVOPS_TOKEN.');
}

if (isDev && !publisher) {
  err('Missing AZURE_DEVOPS_PUBLISHER.');
}

const args = [
  'extension',
  action === 'create' ? 'create' : 'publish',
  '--manifest-globs',
  'azure-devops-extension.json src/**/*.json',
  '--overrides-file',
  overrideFile,
  '--rev-version',
  '--output-path',
  'out'
];

if (publisher) args.push('--publisher', publisher);
if (action === 'publish') args.push('--token', token);
// Inline dev override for baseUri (takes precedence over override file)
if (isDev && devBaseUri) {
  args.push('--override', `{\\"baseUri\\":\\"${devBaseUri}\\"}`);
}

const cmd = `tfx ${args.join(' ')}`;
log(`Executing: ${cmd}`);

try {
  execSync(cmd, { stdio: 'inherit' });
  log('Done.');
} catch (e) {
  log('Failed.');
  if (String(e).includes('tfx')) {
    err('tfx-cli not found? Install dev dependency or add to PATH.');
  }
}

function log(m) {
  console.log(`[tfx] ${m}`);
}

function err(m) {
  console.error(`[tfx] ${m}`);
  process.exit(1);
}
