import { spawn } from 'node:child_process';

const APP_NAME = 'Ideon';
const MAX_MESSAGE_LENGTH = 180;

type WriteRunMode = 'fresh' | 'resume';

interface StartParams {
  enabled: boolean;
  idea: string;
  runMode: WriteRunMode;
}

interface SuccessParams {
  enabled: boolean;
  title: string;
  slug: string;
}

interface FailureParams {
  enabled: boolean;
  message: string;
}

interface CanceledParams {
  enabled: boolean;
  signal: NodeJS.Signals;
}

export async function notifyWriteStarted(params: StartParams): Promise<void> {
  if (!params.enabled) {
    return;
  }

  const title = params.runMode === 'resume' ? `${APP_NAME}: Resumed article write` : `${APP_NAME}: Started article write`;
  const message = truncateMessage(params.idea);
  sendOsNotification(title, message);
}

export async function notifyWriteSucceeded(params: SuccessParams): Promise<void> {
  if (!params.enabled) {
    return;
  }

  const title = `${APP_NAME}: Article ready`;
  const message = truncateMessage(`${params.title} (${params.slug})`);
  sendOsNotification(title, message);
}

export async function notifyWriteFailed(params: FailureParams): Promise<void> {
  if (!params.enabled) {
    return;
  }

  const title = `${APP_NAME}: Article write failed`;
  const message = truncateMessage(params.message);
  sendOsNotification(title, message);
}

export async function notifyWriteCanceled(params: CanceledParams): Promise<void> {
  if (!params.enabled) {
    return;
  }

  const title = `${APP_NAME}: Article write canceled`;
  const message = truncateMessage(`Interrupted by ${params.signal}.`);
  sendOsNotification(title, message);
}

function sendOsNotification(title: string, message: string): void {
  if (process.platform === 'darwin') {
    const escapedTitle = escapeAppleScript(title);
    const escapedMessage = escapeAppleScript(message);
    runCommand('osascript', ['-e', `display notification "${escapedMessage}" with title "${escapedTitle}"`]);
    return;
  }

  if (process.platform === 'linux') {
    runCommand('notify-send', [title, message]);
  }
}

function runCommand(command: string, args: string[]): void {
  try {
    const child = spawn(command, args, {
      stdio: 'ignore',
      windowsHide: true,
    });

    child.on('error', () => {
      // Notifications are best-effort and should never interrupt writes.
    });

    child.unref();
  } catch {
    // Notifications are best-effort and should never interrupt writes.
  }
}

function escapeAppleScript(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function truncateMessage(value: string): string {
  const normalized = value.trim();
  if (normalized.length <= MAX_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_MESSAGE_LENGTH - 3)}...`;
}
