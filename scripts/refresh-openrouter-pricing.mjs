#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ANALYTICS_FILE = path.resolve(process.cwd(), 'src/pipeline/analytics.ts');
const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const START_MARKER = '// AUTO-GENERATED:OPENROUTER_PRICING_START';
const END_MARKER = '// AUTO-GENERATED:OPENROUTER_PRICING_END';

async function main() {
  const source = await readFile(ANALYTICS_FILE, 'utf8');
  const existingModelIds = parseExistingModelIds(source);
  if (existingModelIds.length === 0) {
    throw new Error('No existing model IDs found in pricing table. Seed at least one entry first.');
  }

  const modelsPayload = await fetchModels();
  const refreshed = refreshPricing(existingModelIds, modelsPayload);
  const next = replaceGeneratedBlock(source, refreshed);

  if (next === source) {
    console.log('OpenRouter pricing table already up to date for tracked models.');
    return;
  }

  await writeFile(ANALYTICS_FILE, next, 'utf8');
  console.log(`Updated OpenRouter pricing for ${refreshed.updatedCount}/${existingModelIds.length} tracked models.`);
  if (refreshed.missing.length > 0) {
    console.warn(`Missing model IDs from OpenRouter payload: ${refreshed.missing.join(', ')}`);
  }
}

async function fetchModels() {
  const response = await fetch(MODELS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${MODELS_URL}: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json || !Array.isArray(json.data)) {
    throw new Error('Unexpected OpenRouter models payload format.');
  }

  return json.data;
}

function parseExistingModelIds(fileContent) {
  const lines = getGeneratedBlock(fileContent)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith("'") && line.includes("': { input:"));

  const ids = [];
  for (const line of lines) {
    const match = line.match(/^'([^']+)'\s*:/);
    if (match && match[1]) {
      ids.push(match[1]);
    }
  }

  return ids;
}

function refreshPricing(modelIds, modelsPayload) {
  const byId = new Map(modelsPayload.map((entry) => [entry.id, entry]));
  const rows = [];
  const missing = [];

  for (const modelId of [...modelIds].sort()) {
    const model = byId.get(modelId);
    const prompt = toNumber(model?.pricing?.prompt);
    const completion = toNumber(model?.pricing?.completion);
    if (prompt === null || completion === null) {
      missing.push(modelId);
      continue;
    }

    rows.push({
      modelId,
      inputPer1k: prompt * 1000,
      outputPer1k: completion * 1000,
    });
  }

  return {
    rows,
    missing,
    updatedCount: rows.length,
  };
}

function replaceGeneratedBlock(fileContent, refreshed) {
  const startIndex = fileContent.indexOf(START_MARKER);
  const endIndex = fileContent.indexOf(END_MARKER);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error('Could not locate pricing table markers in analytics.ts.');
  }

  const before = fileContent.slice(0, startIndex + START_MARKER.length);
  const after = fileContent.slice(endIndex);
  const date = new Date().toISOString().slice(0, 10);

  const generatedLines = [
    '',
    `  // Last refreshed: ${date}`,
    '  // Source: https://openrouter.ai/api/v1/models (per-token USD converted to per-1k-token USD)',
    ...refreshed.rows.map((row) => `  '${row.modelId}': { input: ${formatNumber(row.inputPer1k)}, output: ${formatNumber(row.outputPer1k)} },`),
    '',
  ];

  return `${before}\n${generatedLines.join('\n')}${after}`;
}

function getGeneratedBlock(fileContent) {
  const startIndex = fileContent.indexOf(START_MARKER);
  const endIndex = fileContent.indexOf(END_MARKER);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error('Could not locate pricing table markers in analytics.ts.');
  }

  return fileContent.slice(startIndex + START_MARKER.length, endIndex);
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatNumber(value) {
  const fixed = value.toFixed(8);
  return fixed.replace(/\.?(0+)$/, '');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to refresh OpenRouter pricing: ${message}`);
  process.exitCode = 1;
});
