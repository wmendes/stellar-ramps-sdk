import { describe, expect, it } from 'vitest';
import {
  isValidOffRampTransition,
  isValidOnRampTransition,
  toKycVerificationStatus,
  toOffRampState,
  toOnRampState,
  type KycStatus,
  type TransactionStatus,
} from './status';

describe('toOnRampState', () => {
  const cases: Array<[TransactionStatus, string]> = [
    ['pending', 'PENDING_PAYMENT'],
    ['processing', 'PENDING_TOKENS'],
    ['completed', 'COMPLETED'],
    ['failed', 'ERROR'],
    ['expired', 'EXPIRED'],
    ['cancelled', 'ERROR'],
    ['refunded', 'REFUNDED'],
  ];

  it.each(cases)('maps %s -> %s', (input, expected) => {
    expect(toOnRampState(input)).toBe(expected);
  });
});

describe('toOffRampState', () => {
  const cases: Array<[TransactionStatus, string]> = [
    ['pending', 'PENDING_TOKENS'],
    ['processing', 'PENDING_SETTLEMENT'],
    ['completed', 'COMPLETED'],
    ['failed', 'ERROR'],
    ['expired', 'EXPIRED'],
    ['cancelled', 'ERROR'],
    ['refunded', 'ERROR'],
  ];

  it.each(cases)('maps %s -> %s', (input, expected) => {
    expect(toOffRampState(input)).toBe(expected);
  });
});

describe('toKycVerificationStatus', () => {
  const cases: Array<[KycStatus, string]> = [
    ['not_started', 'NONE'],
    ['pending', 'PENDING'],
    ['update_required', 'PENDING'],
    ['approved', 'ACCEPTED'],
    ['rejected', 'REJECTED'],
  ];

  it.each(cases)('maps %s -> %s', (input, expected) => {
    expect(toKycVerificationStatus(input)).toBe(expected);
  });
});

describe('state transitions', () => {
  it('accepts valid on-ramp transition', () => {
    expect(isValidOnRampTransition('QUOTED', 'PENDING_PAYMENT')).toBe(true);
  });

  it('rejects invalid on-ramp transition', () => {
    expect(isValidOnRampTransition('CREATED', 'COMPLETED')).toBe(false);
  });

  it('accepts valid off-ramp transition', () => {
    expect(isValidOffRampTransition('TOKENS_RECEIVED', 'PENDING_SETTLEMENT')).toBe(true);
  });

  it('rejects invalid off-ramp transition', () => {
    expect(isValidOffRampTransition('QUOTED', 'COMPLETED')).toBe(false);
  });
});
