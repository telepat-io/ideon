import { jest } from '@jest/globals';

const readdirMock = jest.fn<(...args: any[]) => Promise<any>>();
const readFileMock = jest.fn<(...args: any[]) => Promise<string>>();
const rmMock = jest.fn<(...args: any[]) => Promise<void>>();
const writeFileMock = jest.fn<(...args: any[]) => Promise<void>>();
const mkdirMock = jest.fn<(...args: any[]) => Promise<void>>();
const renameMock = jest.fn<(...args: any[]) => Promise<void>>();

jest.unstable_mockModule('node:fs/promises', () => ({
  readdir: readdirMock,
  readFile: readFileMock,
  rm: rmMock,
  writeFile: writeFileMock,
  mkdir: mkdirMock,
  rename: renameMock,
}));

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: '/tmp/author-store-branches' }),
}));

const { listAuthors, deleteAuthor, loadAuthor } = await import('../config/authorStore.js');

describe('authorStore error branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  it('returns an empty list when the authors directory is missing', async () => {
    readdirMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    await expect(listAuthors()).resolves.toEqual([]);
  });

  it('rethrows non-ENOENT errors when listing authors', async () => {
    readdirMock.mockRejectedValue(new Error('permission denied'));

    await expect(listAuthors()).rejects.toThrow('permission denied');
  });

  it('throws a not-found error when deleting a missing author', async () => {
    rmMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    await expect(deleteAuthor('missing-author')).rejects.toThrow(/not found/);
  });

  it('rethrows non-ENOENT errors when deleting authors', async () => {
    rmMock.mockRejectedValue(new Error('permission denied'));

    await expect(deleteAuthor('any-author')).rejects.toThrow('permission denied');
  });

  it('throws a not-found error when loading a missing author', async () => {
    readFileMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    await expect(loadAuthor('missing-author')).rejects.toThrow(/not found/);
  });

  it('rethrows non-ENOENT errors when loading authors', async () => {
    readFileMock.mockRejectedValue(new Error('permission denied'));

    await expect(loadAuthor('broken-author')).rejects.toThrow('permission denied');
  });
});
