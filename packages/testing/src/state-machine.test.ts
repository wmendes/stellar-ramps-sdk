import { describe, expect, it } from 'vitest';
import { validateOffRampTransitions, validateOnRampTransitions } from './state-machine';

describe('state machine validators', () => {
  it('accepts valid on-ramp sequence', () => {
    const issues = validateOnRampTransitions(['CREATED', 'QUOTED', 'PENDING_PAYMENT', 'PENDING_TOKENS', 'COMPLETED']);
    expect(issues).toEqual([]);
  });

  it('rejects invalid off-ramp sequence', () => {
    const issues = validateOffRampTransitions(['CREATED', 'COMPLETED']);
    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe('INVALID_OFFRAMP_TRANSITION');
  });
});
