import { validateIntegrationContracts } from './sync-validator.js';

const drifts = validateIntegrationContracts();

if (drifts.length === 0) {
  console.log('Integration contract sync check passed.');
  process.exit(0);
}

console.error('Integration contract drift detected.');
for (const drift of drifts) {
  console.error(`- ${drift.id}`);
  console.error(`  expected: ${drift.expected}`);
  console.error(`  actual:   ${drift.actual}`);
}

process.exit(1);
