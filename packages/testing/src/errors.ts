export class ConformanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConformanceError';
  }
}
