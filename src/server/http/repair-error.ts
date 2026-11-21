export class RepairApiError extends Error {
  constructor(readonly status: 400 | 429 | 502 | 503 | 504, message: string) {
    super(message);
  }
}
