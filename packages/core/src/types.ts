import type { AnchorCapabilities, ProviderCapabilitiesManifest, TokenInfo } from './capabilities';
import type { PaymentInstructions } from './rails';
import type { KycStatus, TransactionStatus } from './status';

export type { KycStatus, TransactionStatus } from './status';
export type { TokenInfo } from './capabilities';

export interface Customer {
  id: string;
  email?: string;
  name?: string;
  taxId?: string;
  taxIdCountry?: string;
  kycStatus: KycStatus;
  bankAccountId?: string;
  blockchainWalletId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  fee: string;
  expiresAt: string;
  createdAt: string;
}

export interface SpeiFiatAccountInput {
  type: 'spei';
  clabe: string;
  bankName?: string;
  beneficiary: string;
}

export type FiatAccountInput = SpeiFiatAccountInput;

export interface RegisterFiatAccountInput {
  customerId: string;
  account: FiatAccountInput;
  publicKey?: string;
}

export interface FiatAccountSummary {
  id: string;
  type: string;
  label: string;
  bankName?: string;
  accountIdentifier?: string;
  beneficiary?: string;
}

export interface RegisteredFiatAccount {
  id: string;
  customerId: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface SavedFiatAccount {
  id: string;
  type: string;
  accountNumber: string;
  bankName: string;
  accountHolderName: string;
  createdAt: string;
}

export interface OnRampTransaction {
  id: string;
  customerId: string;
  quoteId: string;
  status: TransactionStatus;
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  stellarAddress: string;
  paymentInstructions?: PaymentInstructions;
  feeBps?: number;
  feeAmount?: string;
  stellarTxHash?: string;
  interactiveUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OffRampTransaction {
  id: string;
  customerId: string;
  quoteId: string;
  status: TransactionStatus;
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  stellarAddress: string;
  fiatAccount?: FiatAccountSummary;
  feeBps?: number;
  feeAmount?: string;
  memo?: string;
  stellarTxHash?: string;
  signableTransaction?: string;
  statusPage?: string;
  interactiveUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  email?: string;
  name?: string;
  taxId?: string;
  taxIdCountry?: string;
  country?: string;
  publicKey?: string;
}

export interface GetCustomerInput {
  customerId?: string;
  email?: string;
  country?: string;
}

export interface GetQuoteInput {
  fromCurrency: string;
  toCurrency: string;
  fromAmount?: string;
  toAmount?: string;
  customerId?: string;
  stellarAddress?: string;
  resourceId?: string;
}

export interface CreateOnRampInput {
  customerId: string;
  quoteId: string;
  stellarAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  memo?: string;
  bankAccountId?: string;
  email?: string;
  name?: string;
  taxId?: string;
  taxIdCountry?: string;
}

export interface CreateOffRampInput {
  customerId: string;
  quoteId: string;
  stellarAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  fiatAccountId: string;
  memo?: string;
  email?: string;
  name?: string;
  taxId?: string;
  taxIdCountry?: string;
}

export interface Anchor {
  readonly name: string;
  readonly displayName: string;
  readonly capabilities: AnchorCapabilities;
  readonly supportedTokens: readonly TokenInfo[];
  readonly supportedCurrencies: readonly string[];
  readonly supportedRails: readonly string[];
  /** Whitepaper-aligned static declaration (optional during migration). */
  readonly manifest?: ProviderCapabilitiesManifest;

  createCustomer(input: CreateCustomerInput): Promise<Customer>;
  getCustomer(input: GetCustomerInput): Promise<Customer | null>;

  getQuote(input: GetQuoteInput): Promise<Quote>;

  createOnRamp(input: CreateOnRampInput): Promise<OnRampTransaction>;
  getOnRampTransaction(transactionId: string): Promise<OnRampTransaction | null>;

  registerFiatAccount(input: RegisterFiatAccountInput): Promise<RegisteredFiatAccount>;
  getFiatAccounts(customerId: string): Promise<SavedFiatAccount[]>;
  createOffRamp(input: CreateOffRampInput): Promise<OffRampTransaction>;
  getOffRampTransaction(transactionId: string): Promise<OffRampTransaction | null>;

  getKycUrl?(customerId: string, publicKey?: string, bankAccountId?: string): Promise<string>;
  getKycStatus(customerId: string, publicKey?: string): Promise<KycStatus>;
}
