import {
  isValidOffRampTransition,
  isValidOnRampTransition,
  type OffRampState,
  type OnRampState,
} from '@stellar-ramps/core';
import type { ConformanceIssue } from './types';

export function validateOnRampTransitions(transitions: OnRampState[]): ConformanceIssue[] {
  const issues: ConformanceIssue[] = [];
  for (let i = 0; i < transitions.length - 1; i += 1) {
    const from = transitions[i];
    const to = transitions[i + 1];
    if (!isValidOnRampTransition(from, to)) {
      issues.push({
        code: 'INVALID_ONRAMP_TRANSITION',
        message: `Invalid on-ramp transition: ${from} -> ${to}`,
        severity: 'error',
      });
    }
  }
  return issues;
}

export function validateOffRampTransitions(transitions: OffRampState[]): ConformanceIssue[] {
  const issues: ConformanceIssue[] = [];
  for (let i = 0; i < transitions.length - 1; i += 1) {
    const from = transitions[i];
    const to = transitions[i + 1];
    if (!isValidOffRampTransition(from, to)) {
      issues.push({
        code: 'INVALID_OFFRAMP_TRANSITION',
        message: `Invalid off-ramp transition: ${from} -> ${to}`,
        severity: 'error',
      });
    }
  }
  return issues;
}
