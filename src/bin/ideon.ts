#!/usr/bin/env node

import { runCli } from '../cli/app.js';
import { ReportedError } from '../cli/reportedError.js';

try {
  await runCli(process.argv);
} catch (error) {
  process.exitCode = 1;

  if (!(error instanceof ReportedError)) {
    const message = error instanceof Error ? error.message : 'Unknown CLI error.';
    console.error(message);
  }
}