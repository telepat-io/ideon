export class ReportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportedError';
  }
}
