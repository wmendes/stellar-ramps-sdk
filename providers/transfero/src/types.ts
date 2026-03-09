export interface TransferoConfig {
  clientId: string;
  clientSecret: string;
  scope: string;
  baseUrl: string;
  apiVersion?: string;
  defaultTaxId?: string;
  defaultTaxIdCountry?: string;
  defaultName?: string;
  defaultEmail?: string;
}

export interface TransferoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type?: string;
}

export interface TransferoQuoteRequest {
  baseCurrency: string;
  quoteCurrency: string;
  baseCurrencySize: number;
  quoteCurrencySize: number;
  side: 'buy' | 'sell';
}

export interface TransferoQuoteItem {
  quoteId?: string;
  price?: number;
  expireAt?: string;
}

export type TransferoQuoteResponse = TransferoQuoteItem[];

export interface TransferoV2CreateRampRequest {
  taxId: string;
  taxIdCountry: string;
  externalId: string;
  name: string;
  email: string;
  quoteId: string;
  cryptoWithdrawalInformation: {
    blockchain: 'Stellar';  // Fixed: was depositBlockchain
    key: string;             // Fixed: was accountKey
  };
}

export interface TransferoV2PreviewRequest {
  taxId: string;
  taxIdCountry: string;
  depositBlockchain: 'Stellar';
  externalId: string;
  name: string;
  email: string;
  quoteRequest: {
    Side: 'Sell';           // PascalCase per working implementation
    BaseCurrency: string;   // PascalCase per working implementation
    QuoteCurrency: string;  // PascalCase per working implementation
    BaseAmount: number;     // PascalCase per working implementation
    QuoteAmount: number;    // PascalCase per working implementation
  };
  fiatWithdrawalInformation: {
    QrCode: string;  // PascalCase per working implementation (confirmed from vcontract)
  };
}

export interface TransferoV2AcceptRequest {
  previewId: string;
}

export interface TransferoV2DepositInformation {
  depositAddress: string;
  memo: string;
  blockchain: string;
}

export interface TransferoV2QuoteInformation {
  baseCurrencySize: number;
  quoteCurrencySize: number;
  expireAt?: string;
}

export interface TransferoV2PreviewResponse {
  previewId: string;
  status: string;
  quote: TransferoV2QuoteInformation;
  depositInformation: TransferoV2DepositInformation;
}

export interface TransferoV2OrderResponse {
  id: string;
  referenceId?: string;
  externalId?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  quote?: TransferoV2QuoteInformation;
  depositInformation?: TransferoV2DepositInformation;
}

export interface TransferoV2RampByIdResponse {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  referenceId?: string;
  externalId?: string;
  quote?: TransferoV2QuoteInformation;
  depositInformation?: TransferoV2DepositInformation;
}

export interface TransferoErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

export type TransferoSwapStatus =
  | 'SwapOrderCreated'
  | 'DepositReceived'
  | 'TradeCompleted'
  | 'WithdrawalCompleted'
  | 'SwapOrderCompleted'
  | 'Pending'
  | 'Processing'
  | 'Completed'
  | 'Canceled'
  | 'Cancelled'
  | 'Failed';
