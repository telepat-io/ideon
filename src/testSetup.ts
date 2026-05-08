import os from 'node:os';
import path from 'node:path';

const workerSuffix = process.env.JEST_WORKER_ID ? `-${process.env.JEST_WORKER_ID}` : '';
const tempHome = path.join(os.tmpdir(), `ideon-jest-home${workerSuffix}`);

process.env.IDEON_HOME = process.env.IDEON_HOME || tempHome;
process.env.HOME = process.env.HOME || process.env.IDEON_HOME;
process.env.USERPROFILE = process.env.USERPROFILE || process.env.IDEON_HOME;
