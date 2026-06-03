'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseArgs,
  copyDir,
  skillsDir,
  installHook,
  installClaudeSkillLanguage,
  printClaudeMdHint,
  printCodexHint,
} = require('../setup');

// ─── helpers ────────────────────────────────────────────────────────────────

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'anamnesis-setup-test-'));
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// ─── parseArgs ───────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  test('parses --platform', () => {
    assert.equal(parseArgs(['--platform', 'claude']).platform, 'claude');
  });

  test('parses --platform=value', () => {
    assert.equal(parseArgs(['--platform=codex']).platform, 'codex');
  });

  test('parses --target', () => {
    assert.equal(parseArgs(['--target', '/some/path']).target, '/some/path');
  });

  test('parses --target=value', () => {
    assert.equal(parseArgs(['--target=/some/path']).target, '/some/path');
  });

  test('parses --language', () => {
    assert.equal(parseArgs(['--language', 'en']).language, 'en');
  });

  test('parses --language=value', () => {
    assert.equal(parseArgs(['--language=zh']).language, 'zh');
  });

  test('parses --help', () => {
    assert.equal(parseArgs(['--help']).help, true);
  });

  test('parses -h', () => {
    assert.equal(parseArgs(['-h']).help, true);
  });

  test('returns empty object for no args', () => {
    assert.deepEqual(parseArgs([]), {});
  });

  test('parses multiple flags together', () => {
    const args = parseArgs(['--platform', 'claude', '--language', 'en', '--target', '/p']);
    assert.equal(args.platform, 'claude');
    assert.equal(args.language, 'en');
    assert.equal(args.target, '/p');
  });

  test('init subcommand is stripped by caller, not parseArgs', () => {
    // parseArgs receives argv *after* 'init' is stripped
    const args = parseArgs(['--platform', 'claude']);
    assert.equal(args.platform, 'claude');
  });
});

// ─── skillsDir ───────────────────────────────────────────────────────────────

describe('skillsDir', () => {
  test('claude maps to .claude/skills', () => {
    assert.equal(skillsDir('claude', '/proj'), '/proj/.claude/skills');
  });

  test('codex maps to .codex/skills', () => {
    assert.equal(skillsDir('codex', '/proj'), '/proj/.codex/skills');
  });

  test('unknown platform maps to .anamnesis/skills', () => {
    assert.equal(skillsDir('unknown', '/proj'), '/proj/.anamnesis/skills');
  });
});

// ─── copyDir ─────────────────────────────────────────────────────────────────

describe('copyDir', () => {
  test('copies files from src to dest', () => {
    const src = tmpDir();
    const dest = tmpDir();
    fs.writeFileSync(path.join(src, 'file.txt'), 'hello');
    copyDir(src, dest);
    assert.equal(fs.readFileSync(path.join(dest, 'file.txt'), 'utf-8'), 'hello');
  });

  test('creates nested directories', () => {
    const src = tmpDir();
    const dest = tmpDir();
    fs.mkdirSync(path.join(src, 'sub'));
    fs.writeFileSync(path.join(src, 'sub', 'nested.txt'), 'nested');
    copyDir(src, dest);
    assert.equal(fs.readFileSync(path.join(dest, 'sub', 'nested.txt'), 'utf-8'), 'nested');
  });

  test('skips existing files', () => {
    const src = tmpDir();
    const dest = tmpDir();
    fs.writeFileSync(path.join(src, 'file.txt'), 'new');
    fs.writeFileSync(path.join(dest, 'file.txt'), 'original');
    copyDir(src, dest);
    assert.equal(fs.readFileSync(path.join(dest, 'file.txt'), 'utf-8'), 'original');
  });

  test('does nothing when src does not exist', () => {
    const dest = tmpDir();
    assert.doesNotThrow(() => copyDir('/nonexistent/src', dest));
  });
});

// ─── installHook ─────────────────────────────────────────────────────────────

describe('installHook', () => {
  test('creates settings.json with hook when absent', () => {
    const target = tmpDir();
    installHook(target);
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    const hooks = settings.hooks.UserPromptSubmit;
    assert.ok(hooks.some(h => h.hooks?.some(hh => hh.command.includes('inject-context'))));
  });

  test('merges into existing settings.json', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.claude'), { recursive: true });
    fs.writeFileSync(
      path.join(target, '.claude', 'settings.json'),
      JSON.stringify({ theme: 'dark', hooks: {} })
    );
    installHook(target);
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    assert.equal(settings.theme, 'dark');
    assert.ok(settings.hooks.UserPromptSubmit.length > 0);
  });

  test('does not register hook twice on repeated install', () => {
    const target = tmpDir();
    installHook(target);
    installHook(target);
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    const count = settings.hooks.UserPromptSubmit.filter(
      h => h.hooks?.some(hh => hh.command.includes('inject-context'))
    ).length;
    assert.equal(count, 1);
  });

  test('warns and returns when settings.json is malformed', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(target, '.claude', 'settings.json'), 'not json {{{');
    assert.doesNotThrow(() => installHook(target));
    // file should remain unchanged (not overwritten)
    assert.equal(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf-8'), 'not json {{{');
  });
});

// ─── printClaudeMdHint (write behaviour) ─────────────────────────────────────

describe('printClaudeMdHint', () => {
  test('creates CLAUDE.md when absent', () => {
    const target = tmpDir();
    printClaudeMdHint(target);
    assert.ok(fs.existsSync(path.join(target, 'CLAUDE.md')));
    assert.ok(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8').includes('anamnesis'));
  });

  test('appends to existing CLAUDE.md that lacks anamnesis', () => {
    const target = tmpDir();
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), '# My Project\n\nexisting content\n');
    printClaudeMdHint(target);
    const content = fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8');
    assert.ok(content.startsWith('# My Project'));
    assert.ok(content.includes('existing content'));
    assert.ok(content.includes('anamnesis'));
  });

  test('does not modify CLAUDE.md that already has anamnesis', () => {
    const target = tmpDir();
    const original = '# Existing\n\nanamnesis is already here\n';
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), original);
    printClaudeMdHint(target);
    assert.equal(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8'), original);
  });
});

// ─── printCodexHint (write behaviour) ────────────────────────────────────────

describe('printCodexHint', () => {
  test('creates AGENTS.md when absent', () => {
    const target = tmpDir();
    printCodexHint(target);
    assert.ok(fs.existsSync(path.join(target, 'AGENTS.md')));
    assert.ok(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf-8').includes('anamnesis'));
  });

  test('appends to existing AGENTS.md that lacks anamnesis', () => {
    const target = tmpDir();
    fs.writeFileSync(path.join(target, 'AGENTS.md'), '# Agents\n\nsome existing rules\n');
    printCodexHint(target);
    const content = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf-8');
    assert.ok(content.startsWith('# Agents'));
    assert.ok(content.includes('anamnesis'));
  });

  test('does not modify AGENTS.md that already has anamnesis', () => {
    const target = tmpDir();
    const original = '# Agents\n\nanamnesis already here\n';
    fs.writeFileSync(path.join(target, 'AGENTS.md'), original);
    printCodexHint(target);
    assert.equal(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf-8'), original);
  });
});

// ─── installClaudeSkillLanguage ───────────────────────────────────────────────

describe('installClaudeSkillLanguage', () => {
  test('zh: does not overwrite skill installed by copyDir', () => {
    const target = tmpDir();
    const skillDir = path.join(target, '.claude', 'skills', 'am');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Chinese skill');
    installClaudeSkillLanguage(target, 'zh');
    assert.equal(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8'), '# Chinese skill');
  });

  test('en: installs English skill when SKILL.en.md template exists', () => {
    const target = tmpDir();
    const skillDir = path.join(target, '.claude', 'skills', 'am');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Chinese skill');
    installClaudeSkillLanguage(target, 'en');
    const installed = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8');
    // SKILL.en.md exists in templates — should be different from original
    assert.notEqual(installed, '# Chinese skill');
    assert.ok(installed.includes('## Core Question'));
  });
});
