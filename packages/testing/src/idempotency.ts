import type { ConformanceIssue } from './types';

export function checkIdempotentJson(label: string, a: unknown, b: unknown): ConformanceIssue[] {
  const left = JSON.stringify(a);
  const right = JSON.stringify(b);
  if (left === right) return [];

  return [
    {
      code: 'IDEMPOTENCY_MISMATCH',
      message: `${label} returned inconsistent results for equivalent calls`,
      severity: 'error',
    },
  ];
}
