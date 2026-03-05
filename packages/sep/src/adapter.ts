import type {
  Anchor,
  AnchorCapabilities,
  CreateCustomerInput,
  CreateOffRampInput,
  CreateOnRampInput,
  Customer,
  GetCustomerInput,
  GetQuoteInput,
  KycStatus,
  OffRampTransaction,
  OnRampTransaction,
  Quote,
  RegisterFiatAccountInput,
  RegisteredFiatAccount,
  SavedFiatAccount,
  TransactionStatus,
  TokenInfo,
} from '@stellar-ramps/core';
import { AnchorError as CoreAnchorError } from '@stellar-ramps/core';
import type { ProviderCapabilitiesManifest } from '@stellar-ramps/core';
import {
  fetchStellarToml,
  getSep24Endpoint,
  getSep12Endpoint,
  getSep38Endpoint,
  type StellarTomlRecord,
} from './sep1';
import { authenticate, type Sep10SignerFn } from './sep10';
import { getCustomer as sep12GetCustomer, putCustomer as sep12PutCustomer } from './sep12';
import {
  deposit as sep24Deposit,
  getTransaction as sep24GetTransaction,
  withdraw as sep24Withdraw,
} from './sep24';
import {
  fiatAssetId,
  getPrice as sep38GetPrice,
  stellarAssetId,
} from './sep38';
import type { Sep38PriceRequest } from './types';

export interface SepAnchorConfig {
  domain: string;
  networkPassphrase: string;
  homeDomain?: string;
  account?: string;
  token?: string;
  quoteServer?: string;
  transferServerSep24?: string;
  kycServer?: string;
  assetIssuers?: Record<string, string>;
  fiatCodes?: string[];
  sep10?: {
    authEndpoint: string;
    serverSigningKey: string;
    signer: Sep10SignerFn;
    homeDomain?: string;
    account?: string;
  };
  fetchFn?: typeof fetch;
}

/**
 * Minimal generic SEP adapter scaffold implementing the Anchor interface.
 * Full lifecycle mapping is phased in incrementally.
 */
export class SepAnchor implements Anchor {
  readonly name = 'sep';
  readonly displayName = 'SEP Anchor';
  readonly capabilities: AnchorCapabilities = {
    sep6: true,
    sep24: true,
    kycUrl: true,
    kycFlow: 'redirect',
  };
  readonly supportedTokens: readonly TokenInfo[] = [];
  readonly supportedCurrencies: readonly string[] = [];
  readonly supportedRails: readonly string[] = [];
  readonly manifest: ProviderCapabilitiesManifest = {
    name: 'sep',
    displayName: 'SEP Anchor',
    kycFlow: 'redirect',
    corridors: [],
  };
  private cachedToml?: StellarTomlRecord;
  private cachedToken?: string;

  constructor(readonly config: SepAnchorConfig) {}

  private get fetchFn(): typeof fetch {
    return this.config.fetchFn ?? fetch;
  }

  private async getToml(): Promise<StellarTomlRecord> {
    if (!this.cachedToml) {
      this.cachedToml = await fetchStellarToml(this.config.domain, undefined);
    }
    return this.cachedToml;
  }

  private async getSep24Server(): Promise<string> {
    if (this.config.transferServerSep24) return this.config.transferServerSep24;
    const toml = await this.getToml();
    const endpoint = getSep24Endpoint(toml);
    if (!endpoint) {
      throw new CoreAnchorError(
        'SEP-24 transfer server is not available for this anchor',
        'SEP24_NOT_AVAILABLE',
        400,
      );
    }
    return endpoint;
  }

  private async getSep38Server(): Promise<string> {
    if (this.config.quoteServer) return this.config.quoteServer;
    const toml = await this.getToml();
    const endpoint = getSep38Endpoint(toml);
    if (!endpoint) {
      throw new CoreAnchorError(
        'SEP-38 quote server is not available for this anchor',
        'SEP38_NOT_AVAILABLE',
        400,
      );
    }
    return endpoint;
  }

  private async getSep12Server(): Promise<string> {
    if (this.config.kycServer) return this.config.kycServer;
    const toml = await this.getToml();
    const endpoint = getSep12Endpoint(toml);
    if (!endpoint) {
      throw new CoreAnchorError(
        'SEP-12 KYC server is not available for this anchor',
        'SEP12_NOT_AVAILABLE',
        400,
      );
    }
    return endpoint;
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;
    if (this.config.token) {
      this.cachedToken = this.config.token;
      return this.cachedToken;
    }
    if (!this.config.sep10) {
      throw new CoreAnchorError(
        'SEP-10 auth configuration is required when token is not provided',
        'SEP10_CONFIG_REQUIRED',
        401,
      );
    }

    const account = this.config.sep10.account ?? this.config.account;
    if (!account) {
      throw new CoreAnchorError(
        'A Stellar account is required for SEP-10 authentication',
        'SEP10_ACCOUNT_REQUIRED',
        400,
      );
    }

    this.cachedToken = await authenticate(
      {
        authEndpoint: this.config.sep10.authEndpoint,
        serverSigningKey: this.config.sep10.serverSigningKey,
        networkPassphrase: this.config.networkPassphrase,
        homeDomain: this.config.sep10.homeDomain ?? this.config.homeDomain,
      },
      account,
      this.config.sep10.signer,
      undefined,
      this.fetchFn,
    );
    return this.cachedToken;
  }

  private getAssetId(code: string): string {
    if (code.includes(':')) return code;
    if (code.toUpperCase() === 'XLM') return stellarAssetId('XLM');

    const fiatCodes = new Set(this.config.fiatCodes ?? ['USD', 'EUR', 'BRL', 'MXN', 'COP', 'ARS']);
    if (fiatCodes.has(code.toUpperCase())) {
      return fiatAssetId(code.toUpperCase());
    }

    const issuer = this.config.assetIssuers?.[code];
    if (!issuer) {
      throw new CoreAnchorError(
        `Missing issuer for asset code ${code}. Provide config.assetIssuers[${code}]`,
        'ASSET_ISSUER_REQUIRED',
        400,
      );
    }
    return stellarAssetId(code, issuer);
  }

  private mapSepStatus(status: string): TransactionStatus {
    if (status === 'completed') return 'completed';
    if (status === 'refunded') return 'refunded';
    if (status === 'expired') return 'expired';
    if (status === 'error' || status === 'no_market') return 'failed';

    if (
      status === 'pending_user_transfer_start' ||
      status === 'pending_user' ||
      status === 'pending_customer_info_update' ||
      status === 'pending_transaction_info_update'
    ) {
      return 'pending';
    }

    return 'processing';
  }

  private mapSep12Status(status: string): KycStatus {
    switch (status) {
      case 'ACCEPTED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'PROCESSING':
        return 'pending';
      case 'NEEDS_INFO':
        return 'update_required';
      default:
        return 'not_started';
    }
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const kycServer = await this.getSep12Server();
    const token = await this.getToken();
    const account = input.publicKey ?? this.config.account;
    if (!account) {
      throw new CoreAnchorError(
        'publicKey or config.account is required to create a SEP customer',
        'SEP12_ACCOUNT_REQUIRED',
        400,
      );
    }

    const putRequest: Record<string, string> = { account };
    if (input.email) putRequest.email_address = input.email;
    if (input.country) putRequest.address_country_code = input.country;

    const created = await sep12PutCustomer(kycServer, token, putRequest, this.fetchFn);
    const current = await sep12GetCustomer(
      kycServer,
      token,
      { id: created.id, account },
      this.fetchFn,
    );

    const now = new Date().toISOString();
    return {
      id: created.id,
      email: input.email,
      kycStatus: this.mapSep12Status(current.status),
      createdAt: now,
      updatedAt: now,
    };
  }

  async getCustomer(input: GetCustomerInput): Promise<Customer | null> {
    const kycServer = await this.getSep12Server();
    const token = await this.getToken();
    const account = this.config.account;

    if (!input.customerId && !account) {
      return null;
    }

    const current = await sep12GetCustomer(
      kycServer,
      token,
      { id: input.customerId, account },
      this.fetchFn,
    );

    const now = new Date().toISOString();
    return {
      id: input.customerId ?? current.id ?? account ?? 'sep-customer',
      email: input.email,
      kycStatus: this.mapSep12Status(current.status),
      createdAt: now,
      updatedAt: now,
    };
  }

  async getQuote(input: GetQuoteInput): Promise<Quote> {
    const quoteServer = await this.getSep38Server();
    const request: Sep38PriceRequest = {
      context: 'sep6',
      sell_asset: this.getAssetId(input.fromCurrency),
      buy_asset: this.getAssetId(input.toCurrency),
      sell_amount: input.fromAmount,
      buy_amount: input.toAmount,
    };
    const result = await sep38GetPrice(quoteServer, request, this.fetchFn);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60_000).toISOString();

    return {
      id: `sep38-indicative-${now.getTime()}`,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      fromAmount: result.sell_amount,
      toAmount: result.buy_amount,
      exchangeRate: result.price,
      fee: result.fee?.total ?? '0',
      expiresAt,
      createdAt: now.toISOString(),
    };
  }

  async createOnRamp(input: CreateOnRampInput): Promise<OnRampTransaction> {
    const transferServer = await this.getSep24Server();
    const token = await this.getToken();

    const response = await sep24Deposit(
      transferServer,
      token,
      {
        asset_code: input.toCurrency,
        amount: input.amount,
        account: input.stellarAddress,
      },
      this.fetchFn,
    );

    const now = new Date().toISOString();
    return {
      id: response.id || input.quoteId,
      customerId: input.customerId,
      quoteId: input.quoteId,
      status: 'pending',
      fromAmount: input.amount,
      fromCurrency: input.fromCurrency,
      toAmount: '',
      toCurrency: input.toCurrency,
      stellarAddress: input.stellarAddress,
      interactiveUrl: response.url,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getOnRampTransaction(transactionId: string): Promise<OnRampTransaction | null> {
    const transferServer = await this.getSep24Server();
    const token = await this.getToken();
    const tx = await sep24GetTransaction(transferServer, token, transactionId, this.fetchFn);

    return {
      id: tx.id,
      customerId: '',
      quoteId: '',
      status: this.mapSepStatus(tx.status),
      fromAmount: tx.amount_in ?? '',
      fromCurrency: tx.amount_in_asset ?? '',
      toAmount: tx.amount_out ?? '',
      toCurrency: tx.amount_out_asset ?? '',
      stellarAddress: tx.to ?? '',
      stellarTxHash: tx.stellar_transaction_id,
      createdAt: tx.started_at ?? new Date().toISOString(),
      updatedAt: tx.completed_at ?? tx.started_at ?? new Date().toISOString(),
    };
  }

  async registerFiatAccount(_input: RegisterFiatAccountInput): Promise<RegisteredFiatAccount> {
    throw new CoreAnchorError(
      'SEP generic adapter does not provide a universal fiat account registration flow',
      'UNSUPPORTED_OPERATION',
      501,
    );
  }

  async getFiatAccounts(_customerId: string): Promise<SavedFiatAccount[]> {
    throw new CoreAnchorError(
      'SEP generic adapter does not provide a universal fiat account listing flow',
      'UNSUPPORTED_OPERATION',
      501,
    );
  }

  async createOffRamp(_input: CreateOffRampInput): Promise<OffRampTransaction> {
    const transferServer = await this.getSep24Server();
    const token = await this.getToken();

    const response = await sep24Withdraw(
      transferServer,
      token,
      {
        asset_code: _input.fromCurrency,
        amount: _input.amount,
        account: _input.stellarAddress,
        memo: _input.memo,
        customer_id: _input.customerId,
      },
      this.fetchFn,
    );

    const now = new Date().toISOString();
    return {
      id: response.id || _input.quoteId,
      customerId: _input.customerId,
      quoteId: _input.quoteId,
      status: 'pending',
      fromAmount: _input.amount,
      fromCurrency: _input.fromCurrency,
      toAmount: '',
      toCurrency: _input.toCurrency,
      stellarAddress: _input.stellarAddress,
      interactiveUrl: response.url,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getOffRampTransaction(_transactionId: string): Promise<OffRampTransaction | null> {
    const transferServer = await this.getSep24Server();
    const token = await this.getToken();
    const tx = await sep24GetTransaction(transferServer, token, _transactionId, this.fetchFn);

    return {
      id: tx.id,
      customerId: '',
      quoteId: '',
      status: this.mapSepStatus(tx.status),
      fromAmount: tx.amount_in ?? '',
      fromCurrency: tx.amount_in_asset ?? '',
      toAmount: tx.amount_out ?? '',
      toCurrency: tx.amount_out_asset ?? '',
      stellarAddress: tx.from ?? '',
      stellarTxHash: tx.stellar_transaction_id,
      createdAt: tx.started_at ?? new Date().toISOString(),
      updatedAt: tx.completed_at ?? tx.started_at ?? new Date().toISOString(),
    };
  }

  async getKycStatus(_customerId: string, _publicKey?: string): Promise<KycStatus> {
    const customer = await this.getCustomer({ customerId: _customerId });
    return customer?.kycStatus ?? 'not_started';
  }
}
