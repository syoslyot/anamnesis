'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseFrontmatter,
  parseFile,
  loadConfig,
  buildContext,
} = require('../templates/common/.anamnesis/hooks/inject-context');

// ─── helpers ────────────────────────────────────────────────────────────────

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'anamnesis-test-'));
}

function write(dir, relPath, content) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
}

function makeHypothesis(dir, id, { status = 'open', question = 'Test question?' } = {}) {
  write(dir, `hypotheses/${id}.md`, `---\nid: ${id}\nstatus: ${status}\nupdated: 2026-06-01\n---\n## 核心問題\n${question}\n\n## 目前認為\nsome belief\n`);
}

function makeExperiment(dir, id, { status = 'running', conclusion = '', updated = '2026-06-01' } = {}) {
  const conclusionSection = conclusion
    ? `## 結論\n${conclusion}\n`
    : `## Conclusion\n(pending)\n`;
  write(dir, `experiments/${id}.md`, `---\nid: ${id}\nhypothesis: hyp-1\nstatus: ${status}\nupdated: ${updated}\n---\n## 假說\nTest claim\n\n## Design\nRun it\n\n## Results\n-\n\n${conclusionSection}`);
}

// ─── parseFrontmatter ────────────────────────────────────────────────────────

describe('parseFrontmatter', () => {
  test('parses valid frontmatter', () => {
    const { meta, body } = parseFrontmatter('---\nid: test\nstatus: open\n---\nbody');
    assert.equal(meta.id, 'test');
    assert.equal(meta.status, 'open');
    assert.equal(body.trim(), 'body');
  });

  test('returns empty meta when no frontmatter', () => {
    const { meta, body } = parseFrontmatter('just body');
    assert.deepEqual(meta, {});
    assert.equal(body, 'just body');
  });

  test('returns empty meta when closing --- is missing', () => {
    const { meta } = parseFrontmatter('---\nid: test\nbody without close');
    assert.deepEqual(meta, {});
  });

  test('parses value that contains a colon', () => {
    const { meta } = parseFrontmatter('---\nurl: http://example.com\n---\nbody');
    assert.equal(meta.url, 'http://example.com');
  });

  test('skips lines without colon', () => {
    const { meta } = parseFrontmatter('---\nid: test\nno-colon-line\n---\nbody');
    assert.equal(meta.id, 'test');
    assert.equal(Object.keys(meta).length, 1);
  });
});

// ─── loadConfig ─────────────────────────────────────────────────────────────

describe('loadConfig', () => {
  test('returns defaults when directory does not exist', () => {
    const cfg = loadConfig('/nonexistent/path');
    assert.equal(cfg.max_concluded, 3);
    assert.equal(cfg.include_planning, false);
  });

  test('returns defaults when config.yaml is absent', () => {
    const dir = tmpDir();
    const cfg = loadConfig(dir);
    assert.equal(cfg.max_concluded, 3);
    assert.equal(cfg.include_planning, false);
  });

  test('reads max_concluded', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'version: "0.1"\ninject:\n  max_concluded: 5\n  include_planning: false\n');
    const cfg = loadConfig(dir);
    assert.equal(cfg.max_concluded, 5);
  });

  test('reads include_planning: true', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'version: "0.1"\ninject:\n  max_concluded: 3\n  include_planning: true\n');
    const cfg = loadConfig(dir);
    assert.equal(cfg.include_planning, true);
  });

  test('returns defaults for malformed config', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'not: yaml: at: all: :::\n');
    const cfg = loadConfig(dir);
    assert.equal(cfg.max_concluded, 3);
  });
});

// ─── parseFile ───────────────────────────────────────────────────────────────

describe('parseFile', () => {
  test('extracts firstLine from hypothesis', () => {
    const dir = tmpDir();
    makeHypothesis(dir, 'hyp-1', { question: 'Does pruning hurt BLEU?' });
    const result = parseFile(path.join(dir, 'hypotheses/hyp-1.md'));
    assert.equal(result.firstLine, 'Does pruning hurt BLEU?');
  });

  test('extracts conclusion under Chinese header', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-1', { status: 'concluded', conclusion: '✅ loss masking 有效' });
    const result = parseFile(path.join(dir, 'experiments/exp-1.md'));
    assert.equal(result.conclusion, '✅ loss masking 有效');
  });

  test('extracts conclusion under English header', () => {
    const dir = tmpDir();
    const content = '---\nid: exp-en\nstatus: concluded\nupdated: 2026-06-01\n---\n## Hypothesis\nclaim\n\n## Conclusion\n❌ did not work\n';
    write(dir, 'experiments/exp-en.md', content);
    const result = parseFile(path.join(dir, 'experiments/exp-en.md'));
    assert.equal(result.conclusion, '❌ did not work');
  });

  test('returns null for nonexistent file', () => {
    const result = parseFile('/nonexistent/file.md');
    assert.equal(result, null);
  });

  test('returns empty conclusion when section absent', () => {
    const dir = tmpDir();
    write(dir, 'hypotheses/no-conclusion.md', '---\nid: x\nstatus: open\n---\n## Core Question\nsome question\n');
    const result = parseFile(path.join(dir, 'hypotheses/no-conclusion.md'));
    assert.equal(result.conclusion, '');
  });
});

// ─── buildContext ────────────────────────────────────────────────────────────

describe('buildContext', () => {
  test('returns null when directory is empty', () => {
    const dir = tmpDir();
    fs.mkdirSync(path.join(dir, 'hypotheses'));
    fs.mkdirSync(path.join(dir, 'experiments'));
    assert.equal(buildContext(dir), null);
  });

  test('includes open hypotheses', () => {
    const dir = tmpDir();
    makeHypothesis(dir, 'hyp-1', { question: 'Does X work?' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('Open Hypotheses'));
    assert.ok(ctx.includes('[hyp-1]'));
    assert.ok(ctx.includes('Does X work?'));
  });

  test('does not include confirmed hypotheses in open section', () => {
    const dir = tmpDir();
    makeHypothesis(dir, 'hyp-confirmed', { status: 'confirmed' });
    const ctx = buildContext(dir);
    assert.equal(ctx, null);
  });

  test('includes running experiments', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-1', { status: 'running' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('Running Experiments'));
    assert.ok(ctx.includes('[exp-1]'));
  });

  test('excludes planning experiments by default', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'inject:\n  include_planning: false\n');
    makeExperiment(dir, 'exp-plan', { status: 'planning' });
    const ctx = buildContext(dir);
    assert.equal(ctx, null);
  });

  test('includes planning experiments when config says so', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'inject:\n  include_planning: true\n');
    makeExperiment(dir, 'exp-plan', { status: 'planning' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('Planned Experiments'));
    assert.ok(ctx.includes('[exp-plan]'));
  });

  test('includes concluded experiments', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-done', { status: 'concluded', conclusion: '✅ it worked' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('Recent Conclusions'));
    assert.ok(ctx.includes('[exp-done]'));
    assert.ok(ctx.includes('✅ it worked'));
  });

  test('respects max_concluded from config', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'inject:\n  max_concluded: 1\n');
    makeExperiment(dir, 'exp-a', { status: 'concluded', conclusion: '✅ A', updated: '2026-06-03' });
    makeExperiment(dir, 'exp-b', { status: 'concluded', conclusion: '✅ B', updated: '2026-06-02' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('[exp-a]'));
    assert.ok(!ctx.includes('[exp-b]'));
  });

  test('sorts concluded by updated date descending', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'older', { status: 'concluded', conclusion: '✅ old', updated: '2026-05-01' });
    makeExperiment(dir, 'newer', { status: 'concluded', conclusion: '✅ new', updated: '2026-06-01' });
    const ctx = buildContext(dir);
    assert.ok(ctx.indexOf('[newer]') < ctx.indexOf('[older]'));
  });

  test('wraps output in <anamnesis> tags', () => {
    const dir = tmpDir();
    makeHypothesis(dir, 'hyp-1');
    const ctx = buildContext(dir);
    assert.ok(ctx.startsWith('<anamnesis>'));
    assert.ok(ctx.endsWith('</anamnesis>'));
  });

  test('conclusion does not double-prefix emoji', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-1', { status: 'concluded', conclusion: '✅ confirmed result' });
    const ctx = buildContext(dir);
    assert.ok(!ctx.includes('✅ ✅'));
  });
});
