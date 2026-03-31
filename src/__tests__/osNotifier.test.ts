import { jest } from '@jest/globals';

const spawnMock = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  spawn: spawnMock,
}));

const {
  notifyWriteCanceled,
  notifyWriteFailed,
  notifyWriteStarted,
  notifyWriteSucceeded,
} = await import('../cli/notifications/osNotifier.js');

describe('osNotifier', () => {
  const originalPlatform = process.platform;

  function setPlatform(platform: NodeJS.Platform): void {
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: platform,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    spawnMock.mockReturnValue({
      on: jest.fn(),
      unref: jest.fn(),
    });
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: originalPlatform,
    });
  });

  it('uses osascript on macOS for start notifications', async () => {
    setPlatform('darwin');

    await notifyWriteStarted({
      enabled: true,
      idea: 'A cross-platform notification test.',
      runMode: 'fresh',
    });

    expect(spawnMock).toHaveBeenCalledWith(
      'osascript',
      [
        '-e',
        'display notification "A cross-platform notification test." with title "Ideon: Started article write"',
      ],
      {
        stdio: 'ignore',
        windowsHide: true,
      },
    );
  });

  it('uses notify-send on linux for success notifications', async () => {
    setPlatform('linux');

    await notifyWriteSucceeded({
      enabled: true,
      title: 'Generated title',
      slug: 'generated-title',
    });

    expect(spawnMock).toHaveBeenCalledWith(
      'notify-send',
      ['Ideon: Article ready', 'Generated title (generated-title)'],
      {
        stdio: 'ignore',
        windowsHide: true,
      },
    );
  });

  it('does not call spawn when notifications are disabled', async () => {
    setPlatform('darwin');

    await notifyWriteFailed({
      enabled: false,
      message: 'This should not be sent.',
    });

    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('swallows spawn failures', async () => {
    setPlatform('darwin');
    spawnMock.mockImplementation(() => {
      throw new Error('spawn unavailable');
    });

    await expect(
      notifyWriteCanceled({
        enabled: true,
        signal: 'SIGINT',
      }),
    ).resolves.toBeUndefined();
  });
});
