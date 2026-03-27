const WRITE_RESUME_HINT = 'Run `ideon write resume` to retry the latest job.';

export function withWriteResumeHint(message: string): string {
  const trimmed = message.trim();
  if (trimmed.includes('ideon write resume')) {
    return trimmed;
  }

  return `${trimmed} ${WRITE_RESUME_HINT}`;
}
