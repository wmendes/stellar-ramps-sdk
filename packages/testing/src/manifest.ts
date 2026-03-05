import {
  type ProviderCapabilitiesManifest,
  validateProviderManifest,
} from '@stellar-ramps/core';
import type { ConformanceIssue } from './types';

export function checkManifest(manifest: ProviderCapabilitiesManifest): ConformanceIssue[] {
  const result = validateProviderManifest(manifest);
  if (result.valid) return [];

  return result.issues.map((issue) => ({
    code: 'MANIFEST_INVALID',
    message: `${issue.field}: ${issue.message}`,
    severity: 'error' as const,
  }));
}
