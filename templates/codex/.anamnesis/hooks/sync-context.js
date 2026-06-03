#!/usr/bin/env node
/**
 * Anamnesis — Codex context sync
 *
 * Writes current research state to .anamnesis/context.md so it can be
 * referenced from AGENTS.md before each Codex session.
 *
 * Usage: node .anamnesis/hooks/sync-context.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const anamnesisDir = path.join(process.cwd(), '.anamnesis');
const outputPath = path.join(anamnesisDir, 'context.md');

if (!fs.existsSync(anamnesisDir)) {
  console.error('No .anamnesis directory found. Run setup first.');
  process.exit(1);
}

const config = loadConfig(anamnesisDir);
const context = buildContext(anamnesisDir, config);

fs.writeFileSync(outputPath, context);
console.log(`✅ Updated .anamnesis/context.md`);

// ─── helpers ────────────────────────────────────────────────────────────────

function buildContext(anamnesisDir, config) {
  const sections = [];

  const hypotheses = loadFiles(path.join(anamnesisDir, 'hypotheses'));
  const open = hypotheses.filter(h => h.meta.status === 'open');
  if (open.length) {
    sections.push('Open Hypotheses:\n' + open.map(h =>
      `  • [${h.meta.id}] ${h.firstLine}`
    ).join('\n'));
  }

  const experiments = loadFiles(path.join(anamnesisDir, 'experiments'));
  const running = experiments.filter(e => e.meta.status === 'running');
  if (running.length) {
    sections.push('Running Experiments:\n' + running.map(e =>
      `  • [${e.meta.id}] ${e.firstLine}`
    ).join('\n'));
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
    sections.push('Recent Conclusions:\n' + concluded.map(e =>
      `  [${e.meta.id}] ${e.conclusion || e.firstLine}`
    ).join('\n'));
  }

  if (!sections.length) {
    return `<!-- anamnesis: no active research -->\n`;
  }

  const updated = new Date().toISOString().slice(0, 10);
  return [
    `<!-- anamnesis context — updated ${updated} -->`,
    '<anamnesis>',
    ...sections,
    '</anamnesis>',
    ''
  ].join('\n\n');
}

function loadConfig(anamnesisDir) {
  const defaults = { max_concluded: 3, include_planning: false };
  const configPath = path.join(anamnesisDir, 'config.yaml');
  if (!fs.existsSync(configPath)) return defaults;
  try {
    const text = fs.readFileSync(configPath, 'utf-8');
    const maxMatch = text.match(/max_concluded:\s*(\d+)/);
    const planningMatch = text.match(/include_planning:\s*(true|false)/);
    return {
      max_concluded: maxMatch ? parseInt(maxMatch[1], 10) : defaults.max_concluded,
      include_planning: planningMatch ? planningMatch[1] === 'true' : defaults.include_planning,
    };
  } catch {
    return defaults;
  }
}

function loadFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => parseFile(path.join(dir, f)))
    .filter(Boolean);
}

function parseFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { meta, body } = parseFrontmatter(content);
    const bodyLines = body.split('\n').filter(l => l.trim());
    const firstLine = bodyLines.find(l => !l.startsWith('#'))?.trim() || '';
    const conclusionMatch = body.match(/^## (?:結論|Conclusion)\s*\n([\s\S]*?)(?=\n##|$)/m);
    const conclusion = conclusionMatch
      ? conclusionMatch[1].split('\n').find(l => l.trim())?.trim() || ''
      : '';
    return { meta, firstLine, conclusion };
  } catch {
    return null;
  }
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return { meta: {}, body: content };
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return { meta: {}, body: content };
  const meta = {};
  for (const line of content.slice(4, end).split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return { meta, body: content.slice(end + 5) };
}
