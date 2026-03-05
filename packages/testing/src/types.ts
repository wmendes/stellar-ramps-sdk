import type { Anchor, ProviderCapabilitiesManifest } from '@stellar-ramps/core';
import type { OffRampState, OnRampState } from '@stellar-ramps/core';

export type ConformanceSeverity = 'error' | 'warning';

export interface ConformanceIssue {
  code: string;
  message: string;
  severity: ConformanceSeverity;
  details?: Record<string, unknown>;
}

export interface ConformanceResult {
  providerName: string;
  passed: boolean;
  checksRun: number;
  issues: ConformanceIssue[];
}

export interface ConformanceContext {
  adapter: Anchor;
  manifest?: ProviderCapabilitiesManifest;
}

export interface ConformanceOptions {
  providerName?: string;
  checkIdempotency?: boolean;
  onRampLifecycle?: OnRampState[];
  offRampLifecycle?: OffRampState[];
}
