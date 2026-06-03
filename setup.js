#!/usr/bin/env node
/**
 * Anamnesis setup script
 * Usage: anamnesis init [--platform claude|codex] [--target /path]
 *        node setup.js [--platform claude|codex] [--target /path]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const PLATFORMS = ['claude', 'codex'];
const SCRIPT_DIR = path.dirname(fs.realpathSync(__filename));
const TEMPLATES = path.join(SCRIPT_DIR, 'templates');

const DEFAULT_SECTIONS = {
  question:   '核心問題',
  belief:     '目前認為',
  related:    '相關實驗',
  hypothesis: '假說',
  design:     '設計',
  results:    '結果',
  runs:       '執行記錄',
  conclusion: '結論',
};

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv[0] === 'init' ? argv.slice(1) : argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const target = args.target ? path.resolve(args.target) : process.cwd();
  const platform = args.platform || await askPlatform();

  if (!PLATFORMS.includes(platform)) {
    console.error(`Unknown platform: ${platform}. Choose: ${PLATFORMS.join(', ')}`);
    process.exit(1);
  }

  if (!isGitRepo(target)) {
    console.warn('  ⚠  Target directory is not a git repository.');
    console.warn('     Anamnesis files will not be version-controlled.');
    console.warn('     Consider running `git init` first.\n');
  }

  console.log(`\nInstalling anamnesis for ${platform} in: ${target}\n`);

  copyDir(path.join(TEMPLATES, 'common', '.anamnesis'), path.join(target, '.anamnesis'));

  const sections = readInstalledSections(target);
  generateSkill(platform, target, sections);

  if (platform === 'claude') {
    installHook(target);
    printClaudeMdHint(target);
  }

  if (platform === 'codex') {
    copyDir(
      path.join(TEMPLATES, 'codex', '.anamnesis', 'hooks'),
      path.join(target, '.anamnesis', 'hooks')
    );
    printCodexHint(target);
  }

  console.log('\n✅ Anamnesis installed.');
  console.log('   Start by running /am hyp to record your first research question.\n');
}

// Reads section names from the installed config.yaml (or returns defaults).
function readInstalledSections(target) {
  const configPath = path.join(target, '.anamnesis', 'config.yaml');
  if (!fs.existsSync(configPath)) return DEFAULT_SECTIONS;
  try {
    const text = fs.readFileSync(configPath, 'utf-8');
    const sections = { ...DEFAULT_SECTIONS };
    for (const key of Object.keys(DEFAULT_SECTIONS)) {
      const m = text.match(new RegExp(`${key}:\\s*"([^"]+)"`));
      if (m) sections[key] = m[1];
    }
    return sections;
  } catch {
    return DEFAULT_SECTIONS;
  }
}

// Generates SKILL.md from SKILL.template.md, substituting section names.
function generateSkill(platform, target, sections) {
  const templatePath = path.join(TEMPLATES, platform, 'skills', 'am', 'SKILL.template.md');
  if (!fs.existsSync(templatePath)) return;

  let content = fs.readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(sections)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }

  const destDir = path.join(skillsDir(platform, target), 'am');
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, 'SKILL.md'), content);
  console.log(`  created  ${path.relative(process.cwd(), path.join(destDir, 'SKILL.md'))}`);
}

function skillsDir(platform, target) {
  if (platform === 'claude') return path.join(target, '.claude', 'skills');
  if (platform === 'codex') return path.join(target, '.codex', 'skills');
  return path.join(target, '.anamnesis', 'skills');
}

function isGitRepo(dir) {
  try {
    execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
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
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch (e) {
      console.warn(`  ⚠  Could not parse .claude/settings.json: ${e.message}`);
      console.warn('     Hook registration skipped. Fix the file and re-run setup.');
      return;
    }
  }

  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];

  const hookCmd = 'node .anamnesis/hooks/inject-context.js';
  const alreadyInstalled = settings.hooks.UserPromptSubmit.some(
    h => h.hooks?.some(hh => hh.command?.includes('inject-context'))
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
  const snippet = fs.readFileSync(snippetPath, 'utf-8').trimEnd();
  const claudeMd = path.join(target, 'CLAUDE.md');

  if (fs.existsSync(claudeMd)) {
    const existing = fs.readFileSync(claudeMd, 'utf-8');
    if (existing.includes('anamnesis')) {
      console.log('  skipped  CLAUDE.md (anamnesis already present)');
      return;
    }
    fs.writeFileSync(claudeMd, existing.trimEnd() + '\n\n' + snippet + '\n');
    console.log('  updated  CLAUDE.md (anamnesis snippet appended)');
  } else {
    fs.writeFileSync(claudeMd, snippet + '\n');
    console.log('  created  CLAUDE.md');
  }
}

function printCodexHint(target) {
  const snippetPath = path.join(TEMPLATES, 'codex', 'agents-md-snippet.md');
  if (!fs.existsSync(snippetPath)) return;

  const snippet = fs.readFileSync(snippetPath, 'utf-8').trimEnd();
  const agentsMd = path.join(target, 'AGENTS.md');

  if (fs.existsSync(agentsMd)) {
    const existing = fs.readFileSync(agentsMd, 'utf-8');
    if (existing.includes('anamnesis')) {
      console.log('  skipped  AGENTS.md (anamnesis already present)');
      return;
    }
    fs.writeFileSync(agentsMd, existing.trimEnd() + '\n\n' + snippet + '\n');
    console.log('  updated  AGENTS.md (anamnesis snippet appended)');
  } else {
    fs.writeFileSync(agentsMd, snippet + '\n');
    console.log('  created  AGENTS.md');
  }

  console.log('\n  ℹ  Run `node .anamnesis/hooks/sync-context.js` before each Codex session');
  console.log('     to update .anamnesis/context.md with your current research state.\n');
}

function printHelp() {
  console.log(`
anamnesis — research workflow memory for AI coding agents

Usage:
  anamnesis init [options]
  node setup.js [options]

Options:
  --platform <name>   Target platform: claude (default), codex
  --target <path>     Project directory to install into (default: cwd)
  --help              Show this help message

Section names are configured in .anamnesis/config.yaml after install.

Examples:
  anamnesis init --platform claude
  anamnesis init --platform codex --target ~/my-project
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--platform') args.platform = argv[++i];
    else if (argv[i] === '--target') args.target = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
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

if (require.main === module) {
  main().catch(err => { console.error(err.message); process.exit(1); });
} else {
  module.exports = {
    parseArgs, copyDir, skillsDir, isGitRepo,
    installHook, generateSkill, readInstalledSections,
    printClaudeMdHint, printCodexHint,
    DEFAULT_SECTIONS,
  };
}
