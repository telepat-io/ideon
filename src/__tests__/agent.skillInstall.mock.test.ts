import { jest } from '@jest/globals';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const symlinkMock = jest.fn<(...args: unknown[]) => Promise<void>>();
const cpMock = jest.fn<(...args: unknown[]) => Promise<void>>();
const mkdirMock = jest.fn<(...args: unknown[]) => Promise<void>>();
const lstatMock = jest.fn<(target: string) => Promise<{ isSymbolicLink: () => boolean }>>();
const rmMock = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.unstable_mockModule('node:fs/promises', () => ({
  symlink: symlinkMock,
  cp: cpMock,
  mkdir: mkdirMock,
  lstat: lstatMock,
  rm: rmMock,
}));

const { installSkillLink } = await import('../integrations/agent/skillInstall.js');

describe('skillInstall symlink fallback', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ideon-skill-mock-'));
    jest.clearAllMocks();
    symlinkMock.mockRejectedValue(new Error('symlink not permitted'));
    cpMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    lstatMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    rmMock.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('falls back to copy when symlink creation fails', async () => {
    const result = await installSkillLink('/source/ideon-cli', path.join(tempDir, 'ideon-cli'), {
      dryRun: false,
      force: true,
    });
    expect(result.method).toBe('copy');
    expect(result.changed).toBe(true);
    expect(cpMock).toHaveBeenCalled();
  });
});
