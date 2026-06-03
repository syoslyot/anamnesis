#!/usr/bin/env node
/**
 * Anamnesis setup script
 * Usage: node setup.js [--platform claude|codex] [--target /path/to/project]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PLATFORMS = ['claude', 'codex'];
const SCRIPT_DIR = path.dirname(__filename);
const TEMPLATES = path.join(SCRIPT_DIR, 'templates');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = args.target ? path.resolve(args.target) : process.cwd();
  const platform = args.platform || await askPlatform();

  if (!PLATFORMS.includes(platform)) {
    console.error(`Unknown platform: ${platform}. Choose: ${PLATFORMS.join(', ')}`);
    process.exit(1);
  }

  console.log(`\nInstalling anamnesis for ${platform} in: ${target}\n`);

  copyDir(path.join(TEMPLATES, 'common', '.anamnesis'), path.join(target, '.anamnesis'));
  copyDir(path.join(TEMPLATES, platform, 'skills'), skillsDir(platform, target));

  if (platform === 'claude') {
    installHook(target);
    printClaudeMdHint(target);
  }

  if (platform === 'codex') {
    printCodexHint();
  }

  console.log('\n✅ Anamnesis installed.');
  console.log('   Start by running /am hyp to record your first research question.\n');
}

function skillsDir(platform, target) {
  if (platform === 'claude') return path.join(target, '.claude', 'skills');
  if (platform === 'codex') return path.join(target, '.codex', 'skills');
  return path.join(target, '.anamnesis', 'skills');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  created  ${path.relative(process.cwd(), destPath)}`);
    } else {
      console.log(`  skipped  ${path.relative(process.cwd(), destPath)} (already exists)`);
    }
  }
}

function installHook(target) {
  const settingsPath = path.join(target, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch {}
  }

  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];

  const hookCmd = 'node .anamnesis/hooks/inject-context.js';
  const alreadyInstalled = settings.hooks.UserPromptSubmit.some(
    h => h.hooks?.some(hh => hh.command === hookCmd)
  );

  if (!alreadyInstalled) {
    settings.hooks.UserPromptSubmit.push({
      matcher: '',
      hooks: [{ type: 'command', command: hookCmd }]
    });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`  updated  .claude/settings.json (hook registered)`);
  } else {
    console.log(`  skipped  .claude/settings.json (hook already registered)`);
  }
}

function printClaudeMdHint(target) {
  const snippetPath = path.join(TEMPLATES, 'claude', 'claude-md-snippet.md');
  const snippet = fs.readFileSync(snippetPath, 'utf-8');
  const claudeMd = path.join(target, 'CLAUDE.md');

  if (fs.existsSync(claudeMd) && fs.readFileSync(claudeMd, 'utf-8').includes('anamnesis')) {
    return;
  }

  console.log('\n  ⚠  Add this to your CLAUDE.md:\n');
  console.log(snippet.split('\n').map(l => '     ' + l).join('\n'));
}

function printCodexHint() {
  console.log('\n  ℹ  Codex hook support coming in v0.2.');
  console.log('     For now, the /am skill is available manually.');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--platform') args.platform = argv[++i];
    else if (argv[i] === '--target') args.target = argv[++i];
    else if (argv[i].startsWith('--platform=')) args.platform = argv[i].slice(11);
    else if (argv[i].startsWith('--target=')) args.target = argv[i].slice(9);
  }
  return args;
}

async function askPlatform() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('Platform? (claude / codex): ', answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

main().catch(err => { console.error(err.message); process.exit(1); });
