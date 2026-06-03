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
  DEFAULT_SECTIONS,
  escapeRegex,
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

function makeHypothesis(dir, id, { status = 'open', question = 'Test question?', conclusionKey = '結論' } = {}) {
  write(dir, `hypotheses/${id}.md`,
    `---\nid: ${id}\nstatus: ${status}\nupdated: 2026-06-01\n---\n## 核心問題\n${question}\n\n## 目前認為\nsome belief\n`
  );
}

function makeExperiment(dir, id, {
  status = 'running',
  conclusion = '',
  updated = '2026-06-01',
  conclusionKey = 'Conclusion',
} = {}) {
  const conclusionSection = conclusion
    ? `## ${conclusionKey}\n${conclusion}\n`
    : `## ${conclusionKey}\n(pending)\n`;
  write(dir, `experiments/${id}.md`,
    `---\nid: ${id}\nhypothesis: hyp-1\nstatus: ${status}\nupdated: ${updated}\n---\n## 假說\nTest claim\n\n## Design\nRun it\n\n## Results\n-\n\n${conclusionSection}`
  );
}

// ─── escapeRegex ─────────────────────────────────────────────────────────────

describe('escapeRegex', () => {
  test('escapes special regex characters', () => {
    assert.equal(escapeRegex('a.b'), 'a\\.b');
    assert.equal(escapeRegex('a+b'), 'a\\+b');
  });

  test('passes through plain strings unchanged', () => {
    assert.equal(escapeRegex('結論'), '結論');
    assert.equal(escapeRegex('Conclusion'), 'Conclusion');
  });
});

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

  test('parses nested metrics block', () => {
    const { meta } = parseFrontmatter('---\nid: exp-1\nmetrics:\n  f1: 0.93\n  loss: 0.016\n---\nbody');
    assert.deepEqual(meta.metrics, { f1: '0.93', loss: '0.016' });
  });

  test('does not treat other empty-value keys as nested', () => {
    const { meta } = parseFrontmatter('---\nblocked_by:\nstatus: running\n---\nbody');
    assert.equal(meta.blocked_by, '');
    assert.equal(meta.status, 'running');
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
    assert.deepEqual(cfg.sections, DEFAULT_SECTIONS);
  });

  test('returns defaults when config.yaml is absent', () => {
    const cfg = loadConfig(tmpDir());
    assert.deepEqual(cfg.sections, DEFAULT_SECTIONS);
  });

  test('reads max_concluded', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'inject:\n  max_concluded: 5\n  include_planning: false\n');
    assert.equal(loadConfig(dir).max_concluded, 5);
  });

  test('reads include_planning: true', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'inject:\n  max_concluded: 3\n  include_planning: true\n');
    assert.equal(loadConfig(dir).include_planning, true);
  });

  test('reads custom section names', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'sections:\n  conclusion: "Conclusion"\n  question: "Research Question"\n');
    const cfg = loadConfig(dir);
    assert.equal(cfg.sections.conclusion, 'Conclusion');
    assert.equal(cfg.sections.question, 'Research Question');
  });

  test('merges custom sections with defaults for missing keys', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'sections:\n  conclusion: "Ergebnis"\n');
    const cfg = loadConfig(dir);
    assert.equal(cfg.sections.conclusion, 'Ergebnis');
    assert.equal(cfg.sections.question, DEFAULT_SECTIONS.question);
  });

  test('returns defaults for malformed config', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'not: yaml: at: all: :::\n');
    assert.equal(loadConfig(dir).max_concluded, 3);
  });
});

// ─── parseFile ───────────────────────────────────────────────────────────────

describe('parseFile', () => {
  test('extracts firstLine from hypothesis', () => {
    const dir = tmpDir();
    makeHypothesis(dir, 'hyp-1', { question: 'Does pruning hurt BLEU?' });
    const result = parseFile(path.join(dir, 'hypotheses/hyp-1.md'), '結論');
    assert.equal(result.firstLine, 'Does pruning hurt BLEU?');
  });

  test('extracts conclusion using configured header', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-1', { status: 'concluded', conclusion: '✅ it worked', conclusionKey: '結論' });
    const result = parseFile(path.join(dir, 'experiments/exp-1.md'), '結論');
    assert.equal(result.conclusion, '✅ it worked');
  });

  test('uses custom conclusionHeader correctly', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-custom', { status: 'concluded', conclusion: '✅ confirmed', conclusionKey: 'Fazit' });
    const result = parseFile(path.join(dir, 'experiments/exp-custom.md'), 'Fazit');
    assert.equal(result.conclusion, '✅ confirmed');
  });

  test('returns empty conclusion when header does not match', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-mismatch', { status: 'concluded', conclusion: '✅ result', conclusionKey: '結論' });
    const result = parseFile(path.join(dir, 'experiments/exp-mismatch.md'), 'WrongHeader');
    assert.equal(result.conclusion, '');
  });

  test('returns null for nonexistent file', () => {
    assert.equal(parseFile('/nonexistent/file.md', '結論'), null);
  });

  test('returns empty conclusion when section absent', () => {
    const dir = tmpDir();
    write(dir, 'hypotheses/no-conclusion.md', '---\nid: x\nstatus: open\n---\n## 核心問題\nsome question\n');
    const result = parseFile(path.join(dir, 'hypotheses/no-conclusion.md'), '結論');
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
    assert.equal(buildContext(dir), null);
  });

  test('does not include parked hypotheses', () => {
    const dir = tmpDir();
    makeHypothesis(dir, 'hyp-parked', { status: 'parked' });
    assert.equal(buildContext(dir), null);
  });

  test('includes running experiments', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-1', { status: 'running' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('Running Experiments'));
    assert.ok(ctx.includes('[exp-1]'));
  });

  test('shows n= tag for running experiments when n is set', () => {
    const dir = tmpDir();
    write(dir, 'experiments/exp-n.md',
      `---\nid: exp-n\nhypothesis: hyp-1\nstatus: running\nn: 3\nupdated: 2026-06-01\n---\n## 假說\nTest claim\n\n## 結論\n(pending)\n`
    );
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('(n=3)'));
  });

  test('shows n= tag for concluded experiments when n is set', () => {
    const dir = tmpDir();
    write(dir, 'experiments/exp-n.md',
      `---\nid: exp-n\nhypothesis: hyp-1\nstatus: concluded\nn: 2\nupdated: 2026-06-01\n---\n## 假說\nTest claim\n\n## 結論\n✅ confirmed\n`
    );
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('(n=2)'));
  });

  test('excludes planning experiments by default', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'inject:\n  include_planning: false\n');
    makeExperiment(dir, 'exp-plan', { status: 'planning' });
    assert.equal(buildContext(dir), null);
  });

  test('includes planning experiments when config says so', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'inject:\n  include_planning: true\n');
    makeExperiment(dir, 'exp-plan', { status: 'planning' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('Planned Experiments'));
  });

  test('includes concluded experiments', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-done', { status: 'concluded', conclusion: '✅ it worked' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('Recent Conclusions'));
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

  test('includes blocked experiments', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-blocked', { status: 'blocked' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('Blocked Experiments'));
    assert.ok(ctx.includes('[exp-blocked]'));
  });

  test('shows blocked_by reason in context', () => {
    const dir = tmpDir();
    write(dir, 'experiments/exp-stalled.md',
      `---\nid: exp-stalled\nhypothesis: hyp-1\nstatus: blocked\nblocked_by: waiting for GPU\nupdated: 2026-06-01\n---\n## 假說\nTest claim\n\n## 結論\n(pending)\n`
    );
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('waiting for GPU'));
  });

  test('conclusion does not double-prefix emoji', () => {
    const dir = tmpDir();
    makeExperiment(dir, 'exp-1', { status: 'concluded', conclusion: '✅ confirmed result' });
    assert.ok(!buildContext(dir).includes('✅ ✅'));
  });

  test('uses custom conclusion section name from config', () => {
    const dir = tmpDir();
    write(dir, 'config.yaml', 'sections:\n  conclusion: "Fazit"\n');
    makeExperiment(dir, 'exp-de', { status: 'concluded', conclusion: '✅ gut', conclusionKey: 'Fazit' });
    const ctx = buildContext(dir);
    assert.ok(ctx.includes('✅ gut'));
  });
});
