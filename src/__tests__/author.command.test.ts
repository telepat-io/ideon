import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-author-command-test-'));
const tempConfigDir = path.join(tempRoot, 'config');

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: tempConfigDir }),
}));

const {
  runAuthorAddCommand,
  runAuthorListCommand,
  runAuthorEditCommand,
  runAuthorRemoveCommand,
  assertAuthorExists,
} = await import('../cli/commands/author.js');
const { ReportedError } = await import('../cli/reportedError.js');

describe('author commands', () => {
  afterAll(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('adds an author with profile', async () => {
    const logs: string[] = [];
    await runAuthorAddCommand(
      { name: 'Jane Doe', profile: 'Platform engineer.' },
      { log: (message) => logs.push(message) },
    );

    expect(logs[0]).toContain('jane-doe');
    await expect(assertAuthorExists('jane-doe')).resolves.toBeUndefined();
  });

  it('rejects duplicate author slugs', async () => {
    await expect(runAuthorAddCommand({ name: 'Jane Doe', profile: 'Duplicate.' }))
      .rejects.toThrow(ReportedError);
  });

  it('lists authors in table, verbose, and JSON modes', async () => {
    const tableSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runAuthorListCommand({ json: false, verbose: false });
    expect(tableSpy.mock.calls.some((call) => String(call[0]).includes('jane-doe'))).toBe(true);
    tableSpy.mockRestore();

    const verboseSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runAuthorListCommand({ json: false, verbose: true });
    expect(verboseSpy.mock.calls.some((call) => String(call[0]).includes('Profile:'))).toBe(true);
    verboseSpy.mockRestore();

    const jsonSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runAuthorListCommand({ json: true, verbose: false });
    const output = jsonSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(output).toContain('jane-doe');
    jsonSpy.mockRestore();
  });

  it('truncates long profiles in verbose list output', async () => {
    await runAuthorEditCommand({
      slug: 'jane-doe',
      profile: 'x'.repeat(250),
    });

    const verboseSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runAuthorListCommand({ json: false, verbose: true });
    expect(verboseSpy.mock.calls.some((call) => String(call[0]).includes('...'))).toBe(true);
    verboseSpy.mockRestore();
  });

  it('edits and removes an author', async () => {
    await runAuthorEditCommand({
      slug: 'jane-doe',
      name: 'Jane Q. Doe',
      profile: 'Updated profile.',
    });

    const logs: string[] = [];
    await runAuthorRemoveCommand(
      { slug: 'jane-doe', force: true },
      { log: (message) => logs.push(message) },
    );

    expect(logs[0]).toContain('Deleted author "jane-doe"');
    await expect(assertAuthorExists('jane-doe')).rejects.toThrow(ReportedError);
  });

});
