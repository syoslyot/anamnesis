#!/usr/bin/env node
/**
 * Anamnesis — UserPromptSubmit hook
 * Injects active hypotheses and experiments into Claude's context.
 *
 * Claude Code hook format:
 *   stdin:  JSON with session info (cwd, prompt, etc.)
 *   stdout: JSON with { additionalContext: string }
 */

'use strict';

const fs = require('fs');
const path = require('path');

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);

  let data = {};
  try { data = JSON.parse(raw); } catch { process.exit(0); }

  const cwd = data.cwd || process.cwd();
  const anamnesisDir = path.join(cwd, '.anamnesis');

  if (!fs.existsSync(anamnesisDir)) process.exit(0);

  const context = buildContext(anamnesisDir);
  if (!context) process.exit(0);

  process.stdout.write(JSON.stringify({ additionalContext: context }));
}

function buildContext(anamnesisDir) {
  const config = loadConfig(anamnesisDir);
  const sections = [];

  const hypotheses = loadFiles(path.join(anamnesisDir, 'hypotheses'), config);
  const open = hypotheses.filter(h => h.meta.status === 'open');
  if (open.length) {
    sections.push('Open Hypotheses:\n' + open.map(h =>
      `  • [${h.meta.id}] ${h.firstLine}`
    ).join('\n'));
  }

  const experiments = loadFiles(path.join(anamnesisDir, 'experiments'), config);
  const running = experiments.filter(e => e.meta.status === 'running');
  if (running.length) {
    sections.push('Running Experiments:\n' + running.map(e => {
      const nTag = e.meta.n ? ` (n=${e.meta.n})` : '';
      return `  • [${e.meta.id}] ${e.firstLine}${nTag}`;
    }).join('\n'));
  }

  const blocked = experiments.filter(e => e.meta.status === 'blocked');
  if (blocked.length) {
    sections.push('Blocked Experiments:\n' + blocked.map(e => {
      const reason = e.meta.blocked_by ? ` — ${e.meta.blocked_by}` : '';
      return `  ⏸ [${e.meta.id}] ${e.firstLine}${reason}`;
    }).join('\n'));
  }

  if (config.include_planning) {
    const planning = experiments.filter(e => e.meta.status === 'planning');
    if (planning.length) {
      sections.push('Planned Experiments:\n' + planning.map(e =>
        `  • [${e.meta.id}] ${e.firstLine}`
      ).join('\n'));
    }
  }

  const concluded = experiments
    .filter(e => e.meta.status === 'concluded')
    .sort((a, b) => (b.meta.updated || '').localeCompare(a.meta.updated || ''))
    .slice(0, config.max_concluded);
  if (concluded.length) {
    sections.push('Recent Conclusions:\n' + concluded.map(e => {
      const nTag = e.meta.n ? ` (n=${e.meta.n})` : '';
      return `  [${e.meta.id}] ${e.conclusion || e.firstLine}${nTag}`;
    }).join('\n'));
  }

  if (!sections.length) return null;

  return ['<anamnesis>', ...sections, '</anamnesis>'].join('\n\n');
}

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

const NESTED_KEYS = new Set(['metrics']);

function loadConfig(anamnesisDir) {
  const defaults = {
    max_concluded: 3,
    include_planning: false,
    sections: DEFAULT_SECTIONS,
  };
  const configPath = path.join(anamnesisDir, 'config.yaml');
  if (!fs.existsSync(configPath)) return defaults;
  try {
    const text = fs.readFileSync(configPath, 'utf-8');
    const maxMatch = text.match(/max_concluded:\s*(\d+)/);
    const planningMatch = text.match(/include_planning:\s*(true|false)/);

    const sections = { ...DEFAULT_SECTIONS };
    for (const key of Object.keys(DEFAULT_SECTIONS)) {
      const m = text.match(new RegExp(`${key}:\\s*"([^"]+)"`));
      if (m) sections[key] = m[1];
    }

    return {
      max_concluded: maxMatch ? parseInt(maxMatch[1], 10) : defaults.max_concluded,
      include_planning: planningMatch ? planningMatch[1] === 'true' : defaults.include_planning,
      sections,
    };
  } catch {
    return defaults;
  }
}

function loadFiles(dir, config) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => parseFile(path.join(dir, f), config.sections.conclusion))
    .filter(Boolean);
}

function parseFile(filePath, conclusionHeader) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { meta, body } = parseFrontmatter(content);

    const bodyLines = body.split('\n').filter(l => l.trim());
    const firstLine = bodyLines.find(l => !l.startsWith('#'))?.trim() || '';

    const re = new RegExp(`^## ${escapeRegex(conclusionHeader)}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'm');
    const conclusionMatch = body.match(re);
    const conclusion = conclusionMatch
      ? conclusionMatch[1].split('\n').find(l => l.trim())?.trim() || ''
      : '';

    return { meta, firstLine, conclusion };
  } catch {
    return null;
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return { meta: {}, body: content };
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return { meta: {}, body: content };

  const meta = {};
  let nestedKey = null;
  for (const line of content.slice(4, end).split('\n')) {
    if (nestedKey && /^\s+\S/.test(line)) {
      const colon = line.indexOf(':');
      if (colon !== -1) {
        meta[nestedKey][line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
      }
      continue;
    }
    nestedKey = null;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (value === '' && NESTED_KEYS.has(key)) {
      meta[key] = {};
      nestedKey = key;
    } else {
      meta[key] = value;
    }
  }
  return { meta, body: content.slice(end + 5) };
}

function readStdin() {
  return new Promise(resolve => {
    let buf = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', c => buf += c);
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', () => resolve(''));
    setTimeout(() => resolve(buf), 1000);
  });
}

if (require.main === module) {
  main().catch(() => process.exit(0));
} else {
  module.exports = { parseFrontmatter, parseFile, loadFiles, loadConfig, buildContext, DEFAULT_SECTIONS, escapeRegex };
}
