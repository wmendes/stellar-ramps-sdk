/**
 * Payment instruction types shared across provider adapters.
 *
 * This keeps legacy `type`-based fields for current consumers while introducing
 * the whitepaper-aligned `rail` discriminator for forward compatibility.
 */

export type RailType =
  | 'pix'
  | 'spei'
  | 'bank_transfer'
  | 'mobile_money'
  | 'card'
  | 'custom';

interface PaymentInstructionsBase {
  amount: string;
  currency: string;
  reference?: string;
}

export interface SpeiPaymentInstructions extends PaymentInstructionsBase {
  /** Legacy discriminator used by current SDK consumers. */
  type: 'spei';
  /** Whitepaper-aligned discriminator. */
  rail?: 'spei';
  clabe: string;
  bankName?: string;
  beneficiary?: string;
}

export interface PixPaymentInstructions extends PaymentInstructionsBase {
  rail: 'pix';
  qrCode?: string;
  pixCopyPaste?: string;
  expiration?: string;
}

export interface BankTransferPaymentInstructions extends PaymentInstructionsBase {
  rail: 'bank_transfer';
  accountNumber: string;
  routingNumber?: string;
  bankName?: string;
  swift?: string;
  beneficiary?: string;
}

export interface MobileMoneyPaymentInstructions extends PaymentInstructionsBase {
  rail: 'mobile_money';
  phoneNumber: string;
  providerName?: string;
}

export interface CardPaymentInstructions extends PaymentInstructionsBase {
  rail: 'card';
  paymentUrl: string;
  redirectUrl?: string;
}

export interface CustomPaymentInstructions extends PaymentInstructionsBase {
  rail: 'custom';
  metadata: Record<string, unknown>;
}

/**
 * Legacy shared payment instructions used by current adapters.
 * Keep narrow for compatibility while provider packages are extracted.
 */
export type PaymentInstructions = SpeiPaymentInstructions;

/**
 * Whitepaper-aligned extensible union for future provider manifests/adapters.
 */
export type WhitepaperPaymentInstructions =
  | SpeiPaymentInstructions
  | PixPaymentInstructions
  | BankTransferPaymentInstructions
  | MobileMoneyPaymentInstructions
  | CardPaymentInstructions
  | CustomPaymentInstructions;
