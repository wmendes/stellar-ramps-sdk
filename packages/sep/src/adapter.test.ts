import { describe, expect, it, vi } from 'vitest';
import { SepAnchor } from './adapter';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('SepAnchor', () => {
  it('creates customer via SEP-12 and maps KYC status', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/customer') && init?.method === 'PUT') {
        return jsonResponse({ id: 'cust-sep-1' });
      }
      if (url.includes('/customer') && (!init?.method || init?.method === 'GET')) {
        return jsonResponse({ id: 'cust-sep-1', status: 'PROCESSING' });
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    const anchor = new SepAnchor({
      domain: 'example.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      kycServer: 'https://kyc.example.org',
      token: 'jwt',
      account: 'GACCOUNT',
      fetchFn,
    });

    const customer = await anchor.createCustomer({
      email: 'user@example.org',
      country: 'MX',
      publicKey: 'GACCOUNT',
    });

    expect(customer.id).toBe('cust-sep-1');
    expect(customer.kycStatus).toBe('pending');
  });

  it('gets customer and kyc status via SEP-12', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/customer') && (!init?.method || init?.method === 'GET')) {
        return jsonResponse({ id: 'cust-sep-2', status: 'ACCEPTED' });
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    const anchor = new SepAnchor({
      domain: 'example.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      kycServer: 'https://kyc.example.org',
      token: 'jwt',
      account: 'GACCOUNT',
      fetchFn,
    });

    const customer = await anchor.getCustomer({ customerId: 'cust-sep-2' });
    expect(customer).toBeTruthy();
    expect(customer!.kycStatus).toBe('approved');

    const kyc = await anchor.getKycStatus('cust-sep-2');
    expect(kyc).toBe('approved');
  });

  it('maps SEP-38 price to Quote', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/price')) {
        return jsonResponse({
          total_price: '1.01',
          price: '1.01',
          sell_amount: '100',
          buy_amount: '101',
          fee: { total: '1', asset: 'iso4217:MXN' },
        });
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    const anchor = new SepAnchor({
      domain: 'example.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      quoteServer: 'https://quote.example.org',
      token: 'jwt',
      assetIssuers: { USDC: 'GABC' },
      fetchFn,
    });

    const quote = await anchor.getQuote({
      fromCurrency: 'MXN',
      toCurrency: 'USDC',
      fromAmount: '100',
    });

    expect(quote.fromAmount).toBe('100');
    expect(quote.toAmount).toBe('101');
    expect(quote.exchangeRate).toBe('1.01');
    expect(quote.fee).toBe('1');
    expect(quote.id.startsWith('sep38-indicative-')).toBe(true);
  });

  it('creates on-ramp via SEP-24 interactive deposit', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/transactions/deposit/interactive')) {
        return jsonResponse({ id: 'tx-123', url: 'https://anchor.example.org/flow' });
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    const anchor = new SepAnchor({
      domain: 'example.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      transferServerSep24: 'https://transfer.example.org',
      token: 'jwt',
      fetchFn,
    });

    const tx = await anchor.createOnRamp({
      customerId: 'cust-1',
      quoteId: 'quote-1',
      stellarAddress: 'GABC',
      fromCurrency: 'MXN',
      toCurrency: 'USDC',
      amount: '100',
    });

    expect(tx.id).toBe('tx-123');
    expect(tx.status).toBe('pending');
    expect(tx.interactiveUrl).toBe('https://anchor.example.org/flow');
  });

  it('maps SEP transaction status to shared transaction status', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/transaction')) {
        return jsonResponse({
          transaction: {
            id: 'tx-123',
            kind: 'deposit',
            status: 'pending_anchor',
            amount_in: '100',
            amount_in_asset: 'iso4217:MXN',
            amount_out: '99',
            amount_out_asset: 'stellar:USDC:GABC',
            started_at: '2026-03-05T00:00:00Z',
          },
        });
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    const anchor = new SepAnchor({
      domain: 'example.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      transferServerSep24: 'https://transfer.example.org',
      token: 'jwt',
      fetchFn,
    });

    const tx = await anchor.getOnRampTransaction('tx-123');
    expect(tx).toBeTruthy();
    expect(tx!.status).toBe('processing');
    expect(tx!.id).toBe('tx-123');
  });

  it('creates off-ramp via SEP-24 interactive withdraw', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/transactions/withdraw/interactive')) {
        return jsonResponse({ id: 'tx-wd-1', url: 'https://anchor.example.org/withdraw' });
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    const anchor = new SepAnchor({
      domain: 'example.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      transferServerSep24: 'https://transfer.example.org',
      token: 'jwt',
      fetchFn,
    });

    const tx = await anchor.createOffRamp({
      customerId: 'cust-1',
      quoteId: 'quote-off-1',
      stellarAddress: 'GABC',
      fromCurrency: 'USDC',
      toCurrency: 'MXN',
      amount: '50',
      fiatAccountId: 'fiat-1',
    });

    expect(tx.id).toBe('tx-wd-1');
    expect(tx.status).toBe('pending');
    expect(tx.interactiveUrl).toBe('https://anchor.example.org/withdraw');
  });

  it('maps SEP withdrawal transaction to off-ramp shape', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/transaction')) {
        return jsonResponse({
          transaction: {
            id: 'tx-wd-1',
            kind: 'withdrawal',
            status: 'completed',
            amount_in: '50',
            amount_in_asset: 'stellar:USDC:GABC',
            amount_out: '1000',
            amount_out_asset: 'iso4217:MXN',
            stellar_transaction_id: 'stellar-hash-1',
            started_at: '2026-03-05T00:00:00Z',
            completed_at: '2026-03-05T00:03:00Z',
            from: 'GABC',
          },
        });
      }
      return jsonResponse({ error: 'not found' }, 404);
    });

    const anchor = new SepAnchor({
      domain: 'example.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      transferServerSep24: 'https://transfer.example.org',
      token: 'jwt',
      fetchFn,
    });

    const tx = await anchor.getOffRampTransaction('tx-wd-1');
    expect(tx).toBeTruthy();
    expect(tx!.id).toBe('tx-wd-1');
    expect(tx!.status).toBe('completed');
    expect(tx!.stellarTxHash).toBe('stellar-hash-1');
  });

  it('returns typed unsupported errors for fiat account methods', async () => {
    const anchor = new SepAnchor({
      domain: 'example.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      token: 'jwt',
      fetchFn: vi.fn(),
    });

    await expect(
      anchor.registerFiatAccount({
        customerId: 'c1',
        account: { type: 'spei', clabe: '123456789012345678', beneficiary: 'Jane' },
      }),
    ).rejects.toMatchObject({
      name: 'AnchorError',
      code: 'UNSUPPORTED_OPERATION',
      statusCode: 501,
    });

    await expect(anchor.getFiatAccounts('c1')).rejects.toMatchObject({
      name: 'AnchorError',
      code: 'UNSUPPORTED_OPERATION',
      statusCode: 501,
    });
  });
});
