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
  generateSkill,
  readInstalledSections,
  printClaudeMdHint,
  printCodexHint,
  createCustomizationMarker,
  uninstall,
  hasUserData,
  removeSnippet,
  removeHook,
  DEFAULT_SECTIONS,
  SNIPPET_START,
  SNIPPET_END,
} = require('../setup');

// ─── helpers ────────────────────────────────────────────────────────────────

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'anamnesis-setup-test-'));
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function write(dir, relPath, content) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
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

  test('parses --help', () => {
    assert.equal(parseArgs(['--help']).help, true);
  });

  test('parses -h', () => {
    assert.equal(parseArgs(['-h']).help, true);
  });

  test('returns empty object for no args', () => {
    assert.deepEqual(parseArgs([]), {});
  });

  test('does not accept --language (removed)', () => {
    const args = parseArgs(['--language', 'en']);
    assert.equal(args.language, undefined);
  });

  test('parses --force', () => {
    assert.equal(parseArgs(['--force']).force, true);
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
    assert.doesNotThrow(() => copyDir('/nonexistent/src', tmpDir()));
  });
});

// ─── readInstalledSections ───────────────────────────────────────────────────

describe('readInstalledSections', () => {
  test('returns defaults when config.yaml absent', () => {
    assert.deepEqual(readInstalledSections(tmpDir()), DEFAULT_SECTIONS);
  });

  test('reads custom section names', () => {
    const target = tmpDir();
    write(target, '.anamnesis/config.yaml', 'sections:\n  conclusion: "Fazit"\n  question: "Forschungsfrage"\n');
    const sections = readInstalledSections(target);
    assert.equal(sections.conclusion, 'Fazit');
    assert.equal(sections.question, 'Forschungsfrage');
    assert.equal(sections.design, DEFAULT_SECTIONS.design);
  });
});

// ─── generateSkill ───────────────────────────────────────────────────────────

describe('generateSkill', () => {
  test('generates SKILL.md with default section names', () => {
    const target = tmpDir();
    generateSkill('claude', target, DEFAULT_SECTIONS);
    const skill = fs.readFileSync(path.join(target, '.claude/skills/am/SKILL.md'), 'utf-8');
    assert.ok(skill.includes('## Conclusion'));
    assert.ok(skill.includes('## Research Question'));
    assert.ok(!skill.includes('{{conclusion}}'));
  });

  test('generates SKILL.md with custom section names', () => {
    const target = tmpDir();
    const custom = { ...DEFAULT_SECTIONS, conclusion: 'Fazit', question: 'Frage' };
    generateSkill('claude', target, custom);
    const skill = fs.readFileSync(path.join(target, '.claude/skills/am/SKILL.md'), 'utf-8');
    assert.ok(skill.includes('## Fazit'));
    assert.ok(skill.includes('## Frage'));
    assert.ok(!skill.includes('{{conclusion}}'));
    assert.ok(!skill.includes('{{question}}'));
  });

  test('no {{placeholder}} left in output', () => {
    const target = tmpDir();
    generateSkill('claude', target, DEFAULT_SECTIONS);
    const skill = fs.readFileSync(path.join(target, '.claude/skills/am/SKILL.md'), 'utf-8');
    assert.ok(!skill.includes('{{'));
    assert.ok(!skill.includes('}}'));
  });
});

// ─── installHook ─────────────────────────────────────────────────────────────

describe('installHook', () => {
  test('creates settings.json with hook when absent', () => {
    const target = tmpDir();
    installHook(target);
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    assert.ok(settings.hooks.UserPromptSubmit.some(
      h => h.hooks?.some(hh => hh.command.includes('inject-context'))
    ));
  });

  test('merges into existing settings.json', () => {
    const target = tmpDir();
    write(target, '.claude/settings.json', JSON.stringify({ theme: 'dark', hooks: {} }));
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
    write(target, '.claude/settings.json', 'not json {{{');
    assert.doesNotThrow(() => installHook(target));
    assert.equal(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf-8'), 'not json {{{');
  });
});

// ─── printClaudeMdHint ────────────────────────────────────────────────────────

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

// ─── printCodexHint ──────────────────────────────────────────────────────────

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

// ─── createCustomizationMarker ───────────────────────────────────────────────

describe('createCustomizationMarker', () => {
  test('creates .needs-customization inside .anamnesis/', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'));
    createCustomizationMarker(target);
    assert.ok(fs.existsSync(path.join(target, '.anamnesis', '.needs-customization')));
  });

  test('does not overwrite an existing marker', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'));
    const markerPath = path.join(target, '.anamnesis', '.needs-customization');
    fs.writeFileSync(markerPath, 'already here');
    createCustomizationMarker(target);
    assert.equal(fs.readFileSync(markerPath, 'utf-8'), 'already here');
  });

  test('marker file is empty', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'));
    createCustomizationMarker(target);
    assert.equal(fs.readFileSync(path.join(target, '.anamnesis', '.needs-customization'), 'utf-8'), '');
  });
});

// ─── snippet markers (install) ───────────────────────────────────────────────

describe('printClaudeMdHint — snippet markers', () => {
  test('wraps snippet with HTML markers', () => {
    const target = tmpDir();
    printClaudeMdHint(target);
    const content = fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8');
    assert.ok(content.includes(SNIPPET_START));
    assert.ok(content.includes(SNIPPET_END));
  });

  test('markers appear in correct order', () => {
    const target = tmpDir();
    printClaudeMdHint(target);
    const content = fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8');
    assert.ok(content.indexOf(SNIPPET_START) < content.indexOf(SNIPPET_END));
  });
});

describe('printCodexHint — snippet markers', () => {
  test('wraps snippet with HTML markers', () => {
    const target = tmpDir();
    printCodexHint(target);
    const content = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf-8');
    assert.ok(content.includes(SNIPPET_START));
    assert.ok(content.includes(SNIPPET_END));
  });
});

// ─── removeSnippet ───────────────────────────────────────────────────────────

describe('removeSnippet', () => {
  test('returns false when file does not exist', () => {
    assert.equal(removeSnippet('/nonexistent/CLAUDE.md'), false);
  });

  test('returns false when file has no anamnesis snippet', () => {
    const target = tmpDir();
    const p = path.join(target, 'CLAUDE.md');
    fs.writeFileSync(p, '# My Project\n\nsome content\n');
    assert.equal(removeSnippet(p), false);
    assert.equal(fs.readFileSync(p, 'utf-8'), '# My Project\n\nsome content\n');
  });

  test('removes snippet between HTML markers', () => {
    const target = tmpDir();
    const p = path.join(target, 'CLAUDE.md');
    fs.writeFileSync(p, `# My Project\n\n${SNIPPET_START}\n## Anamnesis\ncontent\n${SNIPPET_END}\n`);
    assert.equal(removeSnippet(p), true);
    const result = fs.readFileSync(p, 'utf-8');
    assert.ok(!result.includes(SNIPPET_START));
    assert.ok(!result.includes(SNIPPET_END));
    assert.ok(!result.includes('## Anamnesis'));
    assert.ok(result.includes('# My Project'));
  });

  test('preserves content before and after markers', () => {
    const target = tmpDir();
    const p = path.join(target, 'CLAUDE.md');
    fs.writeFileSync(p, `# Before\n\n${SNIPPET_START}\nsnippet\n${SNIPPET_END}\n\n# After\n`);
    removeSnippet(p);
    const result = fs.readFileSync(p, 'utf-8');
    assert.ok(result.includes('# Before'));
    assert.ok(result.includes('# After'));
  });

  test('legacy fallback: removes from heading to end of file', () => {
    const target = tmpDir();
    const p = path.join(target, 'CLAUDE.md');
    fs.writeFileSync(p, '# My Project\n\nexisting content\n\n## Anamnesis — Research Workflow Memory\nsnippet content\n');
    assert.equal(removeSnippet(p), true);
    const result = fs.readFileSync(p, 'utf-8');
    assert.ok(result.includes('# My Project'));
    assert.ok(!result.includes('Anamnesis'));
  });

  test('legacy fallback: handles snippet at start of file', () => {
    const target = tmpDir();
    const p = path.join(target, 'CLAUDE.md');
    fs.writeFileSync(p, '## Anamnesis — Research Workflow Memory\nsnippet only\n');
    assert.equal(removeSnippet(p), true);
    assert.equal(fs.readFileSync(p, 'utf-8'), '');
  });

  test('snippet at end of file — nothing after SNIPPET_END', () => {
    const target = tmpDir();
    const p = path.join(target, 'CLAUDE.md');
    fs.writeFileSync(p, `# My Project\n\n${SNIPPET_START}\nsnippet\n${SNIPPET_END}\n`);
    removeSnippet(p);
    const result = fs.readFileSync(p, 'utf-8');
    assert.ok(result.includes('# My Project'));
    assert.ok(!result.includes(SNIPPET_START));
  });

  test('file contains only the snippet — produces empty file', () => {
    const target = tmpDir();
    const p = path.join(target, 'CLAUDE.md');
    fs.writeFileSync(p, `${SNIPPET_START}\nonly snippet\n${SNIPPET_END}\n`);
    removeSnippet(p);
    assert.equal(fs.readFileSync(p, 'utf-8'), '');
  });
});

// ─── removeHook ──────────────────────────────────────────────────────────────

describe('removeHook', () => {
  test('does nothing when settings.json is absent', () => {
    assert.doesNotThrow(() => removeHook(tmpDir()));
  });

  test('removes inject-context hook entry', () => {
    const target = tmpDir();
    installHook(target);
    removeHook(target);
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    assert.equal(settings.hooks, undefined);
  });

  test('preserves other hooks when removing', () => {
    const target = tmpDir();
    write(target, '.claude/settings.json', JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { matcher: '', hooks: [{ type: 'command', command: 'node .anamnesis/hooks/inject-context.js' }] },
          { matcher: '', hooks: [{ type: 'command', command: 'node other-hook.js' }] },
        ]
      }
    }));
    removeHook(target);
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    assert.equal(settings.hooks.UserPromptSubmit.length, 1);
    assert.ok(settings.hooks.UserPromptSubmit[0].hooks[0].command.includes('other-hook'));
  });

  test('does not crash on malformed settings.json', () => {
    const target = tmpDir();
    write(target, '.claude/settings.json', 'not json {{{');
    assert.doesNotThrow(() => removeHook(target));
  });

  test('preserves other hook types when removing inject-context', () => {
    const target = tmpDir();
    write(target, '.claude/settings.json', JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { matcher: '', hooks: [{ type: 'command', command: 'node .anamnesis/hooks/inject-context.js' }] },
        ],
        PostToolUse: [
          { matcher: '', hooks: [{ type: 'command', command: 'node other.js' }] },
        ],
      }
    }));
    removeHook(target);
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    assert.equal(settings.hooks.UserPromptSubmit, undefined);
    assert.ok(Array.isArray(settings.hooks.PostToolUse));
  });

  test('does nothing when UserPromptSubmit has no inject-context hook', () => {
    const target = tmpDir();
    const original = { hooks: { UserPromptSubmit: [{ matcher: '', hooks: [{ type: 'command', command: 'node other.js' }] }] } };
    write(target, '.claude/settings.json', JSON.stringify(original));
    removeHook(target);
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    assert.equal(settings.hooks.UserPromptSubmit.length, 1);
  });
});

// ─── hasUserData ─────────────────────────────────────────────────────────────

describe('hasUserData', () => {
  test('returns false when .anamnesis/ has only gitkeep files', () => {
    const target = tmpDir();
    for (const dir of ['hypotheses', 'experiments', 'reports']) {
      fs.mkdirSync(path.join(target, '.anamnesis', dir), { recursive: true });
      fs.writeFileSync(path.join(target, '.anamnesis', dir, '.gitkeep'), '');
    }
    assert.equal(hasUserData(target), false);
  });

  test('returns true when hypotheses/ has a .md file', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis', 'hypotheses'), { recursive: true });
    fs.writeFileSync(path.join(target, '.anamnesis', 'hypotheses', 'my-hyp.md'), '---\nid: my-hyp\n---\n');
    assert.equal(hasUserData(target), true);
  });

  test('returns true when experiments/ has a .md file', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis', 'experiments'), { recursive: true });
    fs.writeFileSync(path.join(target, '.anamnesis', 'experiments', 'exp-1.md'), '---\nid: exp-1\n---\n');
    assert.equal(hasUserData(target), true);
  });

  test('returns true when reports/ has a .md file', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis', 'reports'), { recursive: true });
    fs.writeFileSync(path.join(target, '.anamnesis', 'reports', 'report.md'), 'content');
    assert.equal(hasUserData(target), true);
  });

  test('returns false when subdirectories are absent', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    assert.equal(hasUserData(target), false);
  });

  test('returns false when directory contains only non-.md files', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis', 'hypotheses'), { recursive: true });
    fs.writeFileSync(path.join(target, '.anamnesis', 'hypotheses', 'config.yaml'), 'key: value');
    assert.equal(hasUserData(target), false);
  });

  test('returns false when hypothesis directory is completely empty', () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis', 'hypotheses'), { recursive: true });
    assert.equal(hasUserData(target), false);
  });
});

// ─── uninstall ───────────────────────────────────────────────────────────────

describe('uninstall', () => {
  test('removes .anamnesis/ directory', async () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    await uninstall(target, { force: true });
    assert.ok(!fs.existsSync(path.join(target, '.anamnesis')));
  });

  test('removes anamnesis snippet from CLAUDE.md', async () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    printClaudeMdHint(target);
    await uninstall(target, { force: true });
    const content = fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8');
    assert.ok(!content.includes(SNIPPET_START));
    assert.ok(!content.includes('Anamnesis'));
  });

  test('removes .claude/skills/am/ directory', async () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    generateSkill('claude', target, DEFAULT_SECTIONS);
    await uninstall(target, { force: true });
    assert.ok(!fs.existsSync(path.join(target, '.claude', 'skills', 'am')));
  });

  test('removes inject-context hook from settings.json', async () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    installHook(target);
    await uninstall(target, { force: true });
    const settings = readJson(path.join(target, '.claude', 'settings.json'));
    assert.equal(settings.hooks, undefined);
  });

  test('does nothing when .anamnesis/ is absent', async () => {
    await assert.doesNotReject(() => uninstall(tmpDir(), { force: true }));
  });

  test('preserves existing CLAUDE.md content outside snippet', async () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), '# My Project\n\nexisting rules\n');
    printClaudeMdHint(target);
    await uninstall(target, { force: true });
    const content = fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf-8');
    assert.ok(content.includes('# My Project'));
    assert.ok(content.includes('existing rules'));
  });

  test('removes AGENTS.md snippet for codex installs', async () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    printCodexHint(target);
    await uninstall(target, { force: true });
    const content = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf-8');
    assert.ok(!content.includes(SNIPPET_START));
    assert.ok(!content.includes('Anamnesis'));
  });

  test('removes .codex/skills/am/ for codex installs', async () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    generateSkill('codex', target, DEFAULT_SECTIONS);
    await uninstall(target, { force: true });
    assert.ok(!fs.existsSync(path.join(target, '.codex', 'skills', 'am')));
  });

  test('does not crash when CLAUDE.md does not exist', async () => {
    const target = tmpDir();
    fs.mkdirSync(path.join(target, '.anamnesis'), { recursive: true });
    await assert.doesNotReject(() => uninstall(target, { force: true }));
  });
});
