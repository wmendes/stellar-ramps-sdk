/**
 * Whitepaper-aligned state machines.
 */

export type OnRampState =
  | 'CREATED'
  | 'KYC_REQUIRED'
  | 'KYC_COMPLETE'
  | 'QUOTED'
  | 'PENDING_PAYMENT'
  | 'PENDING_TOKENS'
  | 'COMPLETED'
  | 'ERROR'
  | 'EXPIRED'
  | 'REFUNDED';

export type OffRampState =
  | 'CREATED'
  | 'QUOTED'
  | 'PENDING_TOKENS'
  | 'TOKENS_RECEIVED'
  | 'PENDING_SETTLEMENT'
  | 'COMPLETED'
  | 'ERROR'
  | 'EXPIRED';

export type KycVerificationStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

/** Legacy transaction states currently used by adapters/UI. */
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'refunded';

/** Legacy KYC states currently used by adapters/UI. */
export type KycStatus = 'pending' | 'approved' | 'rejected' | 'not_started' | 'update_required';

export const ONRAMP_ALLOWED_TRANSITIONS: Readonly<Record<OnRampState, readonly OnRampState[]>> = {
  CREATED: ['KYC_REQUIRED', 'QUOTED', 'ERROR'],
  KYC_REQUIRED: ['KYC_COMPLETE', 'ERROR'],
  KYC_COMPLETE: ['QUOTED', 'ERROR'],
  QUOTED: ['PENDING_PAYMENT', 'EXPIRED', 'ERROR'],
  PENDING_PAYMENT: ['PENDING_TOKENS', 'EXPIRED', 'ERROR'],
  PENDING_TOKENS: ['COMPLETED', 'REFUNDED', 'ERROR'],
  COMPLETED: [],
  ERROR: [],
  EXPIRED: [],
  REFUNDED: [],
};

export const OFFRAMP_ALLOWED_TRANSITIONS: Readonly<Record<OffRampState, readonly OffRampState[]>> = {
  CREATED: ['QUOTED', 'ERROR'],
  QUOTED: ['PENDING_TOKENS', 'EXPIRED', 'ERROR'],
  PENDING_TOKENS: ['TOKENS_RECEIVED', 'EXPIRED', 'ERROR'],
  TOKENS_RECEIVED: ['PENDING_SETTLEMENT', 'ERROR'],
  PENDING_SETTLEMENT: ['COMPLETED', 'ERROR'],
  COMPLETED: [],
  ERROR: [],
  EXPIRED: [],
};

export function isValidOnRampTransition(from: OnRampState, to: OnRampState): boolean {
  return ONRAMP_ALLOWED_TRANSITIONS[from].includes(to);
}

export function isValidOffRampTransition(from: OffRampState, to: OffRampState): boolean {
  return OFFRAMP_ALLOWED_TRANSITIONS[from].includes(to);
}

export function toOnRampState(status: TransactionStatus): OnRampState {
  switch (status) {
    case 'pending':
      return 'PENDING_PAYMENT';
    case 'processing':
      return 'PENDING_TOKENS';
    case 'completed':
      return 'COMPLETED';
    case 'failed':
    case 'cancelled':
      return 'ERROR';
    case 'expired':
      return 'EXPIRED';
    case 'refunded':
      return 'REFUNDED';
    default:
      return 'ERROR';
  }
}

export function toOffRampState(status: TransactionStatus): OffRampState {
  switch (status) {
    case 'pending':
      return 'PENDING_TOKENS';
    case 'processing':
      return 'PENDING_SETTLEMENT';
    case 'completed':
      return 'COMPLETED';
    case 'failed':
    case 'cancelled':
      return 'ERROR';
    case 'expired':
      return 'EXPIRED';
    case 'refunded':
      return 'ERROR';
    default:
      return 'ERROR';
  }
}

export function toKycVerificationStatus(status: KycStatus): KycVerificationStatus {
  switch (status) {
    case 'approved':
      return 'ACCEPTED';
    case 'rejected':
      return 'REJECTED';
    case 'pending':
    case 'update_required':
      return 'PENDING';
    case 'not_started':
      return 'NONE';
    default:
      return 'PENDING';
  }
}
