import { randomUUID } from 'node:crypto';
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
  TokenInfo,
  TransactionStatus,
} from '@stellar-ramps/core';
import { AnchorError } from '@stellar-ramps/core';
import { transferoManifest } from './manifest';
import type {
  TransferoConfig,
  TransferoV2CreateRampRequest,
  TransferoErrorResponse,
  TransferoQuoteResponse,
  TransferoQuoteRequest,
  TransferoV2PreviewResponse,
  TransferoV2RampByIdResponse,
  TransferoSwapStatus,
  TransferoTokenResponse,
  TransferoV2AcceptRequest,
  TransferoV2OrderResponse,
  TransferoV2PreviewRequest,
} from './types';

interface TransferoCustomerMeta {
  id: string;
  email?: string;
  name?: string;
  taxId?: string;
  taxIdCountry?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

interface TransferoFiatAccountMeta {
  id: string;
  customerId: string;
  pixKey: string;
  beneficiary?: string;
  bankName?: string;
  createdAt: string;
}

interface SwapOrderMeta {
  customerId: string;
  quoteId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  stellarAddress: string;
}

/**
 * Transfero BaaSiC API Client
 *
 * IMPORTANT API CONVENTIONS:
 * - Root-level fields use camelCase: taxId, depositBlockchain, externalId
 * - Nested quoteRequest fields use PascalCase: Side, BaseCurrency, QuoteCurrency
 * - Nested withdrawal fields use PascalCase: QrCode (fiat), blockchain/key (crypto)
 * - cryptoWithdrawalInformation uses: blockchain (not depositBlockchain), key (not accountKey)
 *
 * Based on working implementation in vcontract/frontend and API testing.
 */
export class TransferoClient implements Anchor {
  readonly name = 'transfero';
  readonly displayName = 'Transfero';
  readonly manifest = transferoManifest;
  readonly capabilities: AnchorCapabilities = {
    sandbox: true,
  };
  readonly supportedTokens: readonly TokenInfo[] = [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      description: 'A fully-reserved stablecoin pegged 1:1 to the US Dollar.',
    },
  ];
  readonly supportedCurrencies: readonly string[] = ['BRL'];
  readonly supportedRails: readonly string[] = ['pix'];

  private readonly config: TransferoConfig;
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private readonly customers = new Map<string, TransferoCustomerMeta>();
  private readonly fiatAccountsByCustomer = new Map<string, TransferoFiatAccountMeta[]>();
  private readonly quotePairs = new Map<string, { from: string; to: string; amount: string }>();
  private readonly swapOrderMeta = new Map<string, SwapOrderMeta>();

  constructor(config: TransferoConfig) {
    this.config = config;
  }

  private ensureIdentity(identity: {
    taxId?: string;
    taxIdCountry?: string;
    name?: string;
    email?: string;
  }): { taxId: string; taxIdCountry: string; name: string; email: string } {
    const taxId = identity.taxId ?? this.config.defaultTaxId;
    const taxIdCountry = identity.taxIdCountry ?? this.config.defaultTaxIdCountry ?? 'BRA';
    const name = identity.name ?? this.config.defaultName;
    const email = identity.email ?? this.config.defaultEmail;

    if (!taxId || !name || !email) {
      throw new AnchorError(
        'Transfero requires taxId, name, and email. Provide them via customer/transaction inputs or TRANSFERO_DEFAULT_* env vars.',
        'TRANSFERO_IDENTITY_REQUIRED',
        400,
      );
    }

    return { taxId, taxIdCountry, name, email };
  }

  private normalizeAmount(value: string | undefined): number {
    if (!value) return 0;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  private requireApiVersion(): string {
    if (!this.config.apiVersion || !this.config.apiVersion.trim()) {
      throw new AnchorError(
        'Transfero apiVersion is required for strict endpoint mode.',
        'TRANSFERO_API_VERSION_REQUIRED',
        500,
      );
    }
    return this.config.apiVersion.trim();
  }

  private buildQuotePath(): string {
    return `/api/quote/v${this.requireApiVersion()}/requestquote`;
  }

  private buildRampByIdPath(orderId: string): string {
    return `/api/ramp/v${this.requireApiVersion()}/id/${encodeURIComponent(orderId)}`;
  }

  private mapStatus(status: string | undefined): TransactionStatus {
    const raw = (status ?? 'Pending') as TransferoSwapStatus;
    const map: Record<TransferoSwapStatus, TransactionStatus> = {
      SwapOrderCreated: 'pending',
      DepositReceived: 'processing',
      TradeCompleted: 'processing',
      WithdrawalCompleted: 'processing',
      SwapOrderCompleted: 'completed',
      Pending: 'pending',
      Processing: 'processing',
      Completed: 'completed',
      Canceled: 'cancelled',
      Cancelled: 'cancelled',
      Failed: 'failed',
    };

    return map[raw] ?? 'pending';
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const formData = new URLSearchParams();
    formData.set('grant_type', 'client_credentials');
    formData.set('client_id', this.config.clientId);
    formData.set('client_secret', this.config.clientSecret);
    formData.set('scope', this.config.scope);

    const response = await fetch(`${this.config.baseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AnchorError(
        `Transfero auth failed: ${text || response.statusText}`,
        'TRANSFERO_AUTH_FAILED',
        response.status,
      );
    }

    const data = (await response.json()) as TransferoTokenResponse;
    const ttlMs = Math.max((data.expires_in - 300) * 1000, 60_000);
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + ttlMs,
    };

    return data.access_token;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData: TransferoErrorResponse = {};
      try {
        errorData = JSON.parse(text) as TransferoErrorResponse;
      } catch {
        // no-op
      }

      throw new AnchorError(
        errorData.error?.message || errorData.message || text || `Transfero API error: ${response.status}`,
        errorData.error?.code || 'TRANSFERO_API_ERROR',
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const now = new Date().toISOString();
    const id = randomUUID();

    const customer: TransferoCustomerMeta = {
      id,
      email: input.email,
      name: input.name,
      taxId: input.taxId,
      taxIdCountry: input.taxIdCountry,
      country: input.country,
      createdAt: now,
      updatedAt: now,
    };

    this.customers.set(id, customer);

    return {
      id,
      email: customer.email,
      name: customer.name,
      taxId: customer.taxId,
      taxIdCountry: customer.taxIdCountry,
      kycStatus: 'approved',
      createdAt: now,
      updatedAt: now,
    };
  }

  async getCustomer(input: GetCustomerInput): Promise<Customer | null> {
    let customer: TransferoCustomerMeta | undefined;

    if (input.customerId) {
      customer = this.customers.get(input.customerId);
    } else if (input.email) {
      customer = Array.from(this.customers.values()).find((c) => c.email === input.email);
    }

    if (!customer) {
      return null;
    }

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      taxId: customer.taxId,
      taxIdCountry: customer.taxIdCountry,
      kycStatus: 'approved',
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  async getQuote(input: GetQuoteInput): Promise<Quote> {
    const baseAmount = this.normalizeAmount(input.fromAmount);
    const quoteAmount = this.normalizeAmount(input.toAmount);

    const payload: TransferoQuoteRequest = {
      baseCurrency: input.fromCurrency,
      quoteCurrency: input.toCurrency,
      baseCurrencySize: baseAmount,
      quoteCurrencySize: quoteAmount,
      side: input.fromAmount ? 'sell' : 'buy',
    };
    const quotePath = this.buildQuotePath();
    console.log('[Transfero][Quote] request', JSON.stringify({ endpoint: quotePath, payload }));

    const raw = await this.request<TransferoQuoteResponse>(
      'POST',
      quotePath,
      payload,
    );
    console.log('[Transfero][Quote] response', JSON.stringify(raw));

    if (!Array.isArray(raw)) {
      console.error('[Transfero][Quote] invalid response shape', JSON.stringify({ type: typeof raw }));
      throw new AnchorError('Transfero quote response must be an array', 'TRANSFERO_QUOTE_INVALID', 500);
    }

    const item = raw[0];
    if (!item) {
      console.error('[Transfero][Quote] empty response array');
      throw new AnchorError('Transfero quote response is empty', 'TRANSFERO_QUOTE_INVALID', 500);
    }

    if (!item.quoteId) {
      console.error('[Transfero][Quote] response missing quoteId', JSON.stringify({ keys: Object.keys(item) }));
      throw new AnchorError('Transfero quote response missing quoteId', 'TRANSFERO_QUOTE_INVALID', 500);
    }

    if (typeof item.price !== 'number' || !Number.isFinite(item.price)) {
      console.error('[Transfero][Quote] response missing numeric price', JSON.stringify({ keys: Object.keys(item) }));
      throw new AnchorError('Transfero quote response missing price', 'TRANSFERO_QUOTE_INVALID', 500);
    }

    if (!item.expireAt) {
      console.error('[Transfero][Quote] response missing expireAt', JSON.stringify({ keys: Object.keys(item) }));
      throw new AnchorError('Transfero quote response missing expireAt', 'TRANSFERO_QUOTE_INVALID', 500);
    }

    const fromAmount = input.fromAmount ? baseAmount : item.price;
    const toAmount = input.fromAmount ? item.price : quoteAmount;
    const exchangeRate = fromAmount > 0 ? (toAmount / fromAmount) : 0;

    this.quotePairs.set(item.quoteId, {
      from: input.fromCurrency,
      to: input.toCurrency,
      amount: String(fromAmount),
    });

    return {
      id: item.quoteId,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      fromAmount: String(fromAmount),
      toAmount: String(toAmount),
      exchangeRate: String(exchangeRate),
      fee: '0',
      expiresAt: item.expireAt,
      createdAt: new Date().toISOString(),
    };
  }

  async createOnRamp(input: CreateOnRampInput): Promise<OnRampTransaction> {
    const customer = this.customers.get(input.customerId);
    const identity = this.ensureIdentity({
      taxId: input.taxId ?? customer?.taxId,
      taxIdCountry: input.taxIdCountry ?? customer?.taxIdCountry,
      name: input.name ?? customer?.name,
      email: input.email ?? customer?.email,
    });

    const externalId = `onramp-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const payload: TransferoV2CreateRampRequest = {
      taxId: identity.taxId,
      taxIdCountry: identity.taxIdCountry,
      externalId,
      name: identity.name,
      email: identity.email,
      quoteId: input.quoteId,
      cryptoWithdrawalInformation: {
        blockchain: 'Stellar',  // Fixed: was depositBlockchain
        key: input.stellarAddress,  // Fixed: was accountKey
        // Note: memo removed - not supported in V2 API per working implementation
      },
    };

    const response = await this.request<TransferoV2OrderResponse>(
      'POST',
      `/api/ramp/v${this.requireApiVersion()}/swaporder`,
      payload,
    );

    const id = response.id;
    if (!id || !response.status || !response.createdAt) {
      throw new AnchorError('Transfero on-ramp response missing order id', 'TRANSFERO_ORDER_INVALID', 500);
    }

    this.swapOrderMeta.set(id, {
      customerId: input.customerId,
      quoteId: input.quoteId,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      amount: input.amount,
      stellarAddress: input.stellarAddress,
    });

    return {
      id,
      customerId: input.customerId,
      quoteId: input.quoteId,
      status: this.mapStatus(response.status),
      fromAmount: input.amount,
      fromCurrency: input.fromCurrency,
      toAmount: input.amount,
      toCurrency: input.toCurrency,
      stellarAddress: input.stellarAddress,
      createdAt: response.createdAt ?? new Date().toISOString(),
      updatedAt: response.updatedAt ?? new Date().toISOString(),
    };
  }

  async getOnRampTransaction(transactionId: string): Promise<OnRampTransaction | null> {
    const order = await this.request<TransferoV2RampByIdResponse>(
      'GET',
      this.buildRampByIdPath(transactionId),
    );

    const id = order.id;
    if (!id || !order.status || !order.createdAt) {
      throw new AnchorError('Transfero retrieve ramp response is invalid', 'TRANSFERO_ORDER_INVALID', 500);
    }

    const meta = this.swapOrderMeta.get(id);

    return {
      id,
      customerId: meta?.customerId ?? '',
      quoteId: meta?.quoteId ?? '',
      status: this.mapStatus(order.status),
      fromAmount: meta?.amount ?? '0',
      fromCurrency: meta?.fromCurrency ?? 'BRL',
      toAmount: meta?.amount ?? '0',
      toCurrency: meta?.toCurrency ?? 'USDC',
      stellarAddress: meta?.stellarAddress ?? '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt ?? new Date().toISOString(),
    };
  }

  async registerFiatAccount(input: RegisterFiatAccountInput): Promise<RegisteredFiatAccount> {
    const now = new Date().toISOString();
    const id = randomUUID();

    const account: TransferoFiatAccountMeta = {
      id,
      customerId: input.customerId,
      pixKey: input.account.clabe,
      beneficiary: input.account.beneficiary,
      bankName: input.account.bankName,
      createdAt: now,
    };

    const existing = this.fiatAccountsByCustomer.get(input.customerId) ?? [];
    this.fiatAccountsByCustomer.set(input.customerId, [...existing, account]);

    return {
      id,
      customerId: input.customerId,
      type: 'pix',
      status: 'active',
      createdAt: now,
    };
  }

  async getFiatAccounts(customerId: string): Promise<SavedFiatAccount[]> {
    const accounts = this.fiatAccountsByCustomer.get(customerId) ?? [];
    return accounts.map((account) => ({
      id: account.id,
      type: 'pix',
      accountNumber: account.pixKey,
      bankName: account.bankName || 'PIX',
      accountHolderName: account.beneficiary || 'PIX Receiver',
      createdAt: account.createdAt,
    }));
  }

  async createOffRamp(input: CreateOffRampInput): Promise<OffRampTransaction> {
    const customer = this.customers.get(input.customerId);
    const identity = this.ensureIdentity({
      taxId: input.taxId ?? customer?.taxId,
      taxIdCountry: input.taxIdCountry ?? customer?.taxIdCountry,
      name: input.name ?? customer?.name,
      email: input.email ?? customer?.email,
    });

    const account = (this.fiatAccountsByCustomer.get(input.customerId) ?? []).find(
      (item) => item.id === input.fiatAccountId,
    );

    const qrCode = input.memo || account?.pixKey;
    if (!qrCode) {
      throw new AnchorError(
        'Transfero off-ramp requires a PIX QR code. Provide it as transaction memo or fiat account identifier.',
        'TRANSFERO_PIX_QR_REQUIRED',
        400,
      );
    }

    const externalId = `pix-v2-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const previewPayload: TransferoV2PreviewRequest = {
      taxId: identity.taxId,
      taxIdCountry: identity.taxIdCountry,
      depositBlockchain: 'Stellar',
      externalId,
      name: identity.name,
      email: identity.email,
      quoteRequest: {
        Side: 'Sell',
        BaseCurrency: input.fromCurrency,
        QuoteCurrency: input.toCurrency,
        BaseAmount: this.normalizeAmount(input.amount),
        QuoteAmount: 0,
      },
      fiatWithdrawalInformation: {
        QrCode: qrCode,
      },
    };

    const preview = await this.request<TransferoV2PreviewResponse>(
      'POST',
      '/api/ramp/v2/swaporder/preview',
      previewPayload,
    );

    const previewId = preview.previewId;
    if (!previewId || !preview.status) {
      throw new AnchorError('Transfero preview response missing preview id', 'TRANSFERO_PREVIEW_INVALID', 500);
    }

    const acceptPayload: TransferoV2AcceptRequest = { previewId };
    const accepted = await this.request<TransferoV2OrderResponse>(
      'POST',
      '/api/ramp/v2/swaporder/accept',
      acceptPayload,
    );

    const id = accepted.id;
    if (!id || !accepted.status || !accepted.createdAt) {
      throw new AnchorError('Transfero accept response missing order id', 'TRANSFERO_ORDER_INVALID', 500);
    }

    const depositInfo = accepted.depositInformation;
    if (!depositInfo?.depositAddress || !depositInfo.memo) {
      throw new AnchorError(
        'Transfero accept response missing required deposit information.',
        'TRANSFERO_ORDER_INVALID',
        500,
      );
    }

    this.swapOrderMeta.set(id, {
      customerId: input.customerId,
      quoteId: input.quoteId,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      amount: input.amount,
      stellarAddress: depositInfo.depositAddress,
    });

    return {
      id,
      customerId: input.customerId,
      quoteId: input.quoteId,
      status: this.mapStatus(accepted.status),
      fromAmount: input.amount,
      fromCurrency: input.fromCurrency,
      toAmount: String(accepted.quote?.quoteCurrencySize ?? input.amount),
      toCurrency: input.toCurrency,
      stellarAddress: depositInfo.depositAddress,
      memo: depositInfo.memo,
      createdAt: accepted.createdAt,
      updatedAt: accepted.updatedAt ?? new Date().toISOString(),
    };
  }

  async getOffRampTransaction(transactionId: string): Promise<OffRampTransaction | null> {
    const order = await this.request<TransferoV2RampByIdResponse>(
      'GET',
      this.buildRampByIdPath(transactionId),
    );
    const id = order.id;
    if (!id || !order.status || !order.createdAt) {
      throw new AnchorError('Transfero retrieve ramp response is invalid', 'TRANSFERO_ORDER_INVALID', 500);
    }

    const meta = this.swapOrderMeta.get(id);

    return {
      id,
      customerId: meta?.customerId ?? '',
      quoteId: meta?.quoteId ?? '',
      status: this.mapStatus(order.status),
      fromAmount: meta?.amount ?? '0',
      fromCurrency: meta?.fromCurrency ?? 'USDC',
      toAmount: meta?.amount ?? '0',
      toCurrency: meta?.toCurrency ?? 'BRL',
      stellarAddress: order.depositInformation?.depositAddress ?? meta?.stellarAddress ?? '',
      memo: order.depositInformation?.memo,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt ?? new Date().toISOString(),
    };
  }

  async getKycStatus(): Promise<KycStatus> {
    return 'approved';
  }
}
