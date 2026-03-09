import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransferoClient } from '$lib/anchors/transfero/client';

describe('TransferoClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an in-memory customer with identity fields', async () => {
    const client = new TransferoClient({
      clientId: 'cid',
      clientSecret: 'sec',
      scope: 'api',
      baseUrl: 'https://transfero.test',
      apiVersion: '2',
    });

    const customer = await client.createCustomer({
      email: 'user@example.com',
      name: 'User Name',
      taxId: '12345678900',
      taxIdCountry: 'BRA',
      country: 'BR',
    });

    expect(customer.email).toBe('user@example.com');
    expect(customer.name).toBe('User Name');
    expect(customer.taxId).toBe('12345678900');
    expect(customer.taxIdCountry).toBe('BRA');
    expect(customer.kycStatus).toBe('approved');
  });

  it('gets quote using OAuth token and quote endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              quoteId: 'q-1',
              price: 55,
              expireAt: '2026-03-08T00:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = new TransferoClient({
      clientId: 'cid',
      clientSecret: 'sec',
      scope: 'api',
      baseUrl: 'https://transfero.test',
      apiVersion: '2',
      defaultTaxId: '12345678900',
      defaultName: 'Test User',
      defaultEmail: 'test@example.com',
    });

    const quote = await client.getQuote({
      fromCurrency: 'USDC',
      toCurrency: 'BRL',
      fromAmount: '10',
    });

    expect(quote.id).toBe('q-1');
    expect(quote.exchangeRate).toBe('5.5');
    expect(quote.fromAmount).toBe('10');
    expect(quote.toAmount).toBe('55');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gets quote when only target amount is provided', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              quoteId: 'q-to-1',
              price: 52.8,
              expireAt: '2026-03-08T00:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = new TransferoClient({
      clientId: 'cid',
      clientSecret: 'sec',
      scope: 'api',
      baseUrl: 'https://transfero.test',
      apiVersion: '2',
      defaultTaxId: '12345678900',
      defaultName: 'Test User',
      defaultEmail: 'test@example.com',
    });

    const quote = await client.getQuote({
      fromCurrency: 'BRL',
      toCurrency: 'USDC',
      toAmount: '10',
    });

    expect(quote.id).toBe('q-to-1');
    expect(quote.fromCurrency).toBe('BRL');
    expect(quote.toCurrency).toBe('USDC');
    expect(quote.fromAmount).toBe('52.8');
    expect(quote.toAmount).toBe('10');
    expect(quote.exchangeRate).toBe(String(10 / 52.8));
  });

  it('throws when quote response is not an array', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            quoteId: 'q-bad-1',
            price: 19.2,
            expireAt: '2026-03-08T00:00:00.000Z',
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = new TransferoClient({
      clientId: 'cid',
      clientSecret: 'sec',
      scope: 'api',
      baseUrl: 'https://transfero.test',
      apiVersion: '2',
      defaultTaxId: '12345678900',
      defaultName: 'Test User',
      defaultEmail: 'test@example.com',
    });

    await expect(
      client.getQuote({
        fromCurrency: 'BRL',
        toCurrency: 'USDC',
        fromAmount: '100',
      }),
    ).rejects.toThrow('Transfero quote response must be an array');
  });

  it('creates off-ramp via v2 preview + accept', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            previewId: 'preview-1',
            status: 'SwapOrderCreated',
            depositInformation: {
              depositAddress: 'GTRANSFERODEPOSIT',
              memo: 'memo-preview',
              blockchain: 'Stellar',
            },
            quote: { baseCurrencySize: 10, quoteCurrencySize: 54 },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'order-1',
            status: 'SwapOrderCreated',
            createdAt: '2026-03-08T00:00:00.000Z',
            updatedAt: '2026-03-08T00:01:00.000Z',
            depositInformation: {
              depositAddress: 'GTRANSFERODEPOSIT',
              memo: 'memo-123',
              blockchain: 'Stellar',
            },
            quote: { quoteCurrencySize: 54 },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = new TransferoClient({
      clientId: 'cid',
      clientSecret: 'sec',
      scope: 'api',
      baseUrl: 'https://transfero.test',
      apiVersion: '2',
      defaultTaxId: '12345678900',
      defaultName: 'Test User',
      defaultEmail: 'test@example.com',
    });

    const customer = await client.createCustomer({
      email: 'user@example.com',
      name: 'User Name',
      taxId: '12345678900',
      taxIdCountry: 'BRA',
    });

    await client.registerFiatAccount({
      customerId: customer.id,
      account: { type: 'spei', clabe: 'pix-copy-paste', beneficiary: 'Merchant' },
    });

    const tx = await client.createOffRamp({
      customerId: customer.id,
      quoteId: 'quote-1',
      stellarAddress: 'GUSERADDRESS',
      fromCurrency: 'USDC',
      toCurrency: 'BRL',
      amount: '10',
      fiatAccountId: (await client.getFiatAccounts(customer.id))[0].id,
      memo: 'pix-qr-code',
    });

    expect(tx.id).toBe('order-1');
    expect(tx.stellarAddress).toBe('GTRANSFERODEPOSIT');
    expect(tx.memo).toBe('memo-123');
    expect(tx.status).toBe('pending');
  });

  it('maps completed swaporder status on lookup', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'order-1',
            status: 'SwapOrderCompleted',
            createdAt: '2026-03-08T00:00:00.000Z',
            updatedAt: '2026-03-08T00:05:00.000Z',
            depositInformation: {
              depositAddress: 'GTRANSFERODEPOSIT',
              memo: 'memo-123',
              blockchain: 'Stellar',
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = new TransferoClient({
      clientId: 'cid',
      clientSecret: 'sec',
      scope: 'api',
      baseUrl: 'https://transfero.test',
      apiVersion: '2',
      defaultTaxId: '12345678900',
      defaultName: 'Test User',
      defaultEmail: 'test@example.com',
    });

    const tx = await client.getOffRampTransaction('order-1');
    expect(tx?.status).toBe('completed');
    expect(tx?.memo).toBe('memo-123');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/api/ramp/v2/id/order-1');
  });

  it('creates on-ramp via strict v2 create endpoint without fallback', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'onramp-1',
            status: 'SwapOrderCreated',
            createdAt: '2026-03-08T00:00:00.000Z',
            updatedAt: '2026-03-08T00:01:00.000Z',
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = new TransferoClient({
      clientId: 'cid',
      clientSecret: 'sec',
      scope: 'api',
      baseUrl: 'https://transfero.test',
      apiVersion: '2',
      defaultTaxId: '12345678900',
      defaultName: 'Test User',
      defaultEmail: 'test@example.com',
    });

    const customer = await client.createCustomer({
      email: 'user@example.com',
      name: 'User Name',
      taxId: '12345678900',
      taxIdCountry: 'BRA',
    });

    const tx = await client.createOnRamp({
      customerId: customer.id,
      quoteId: 'quote-on-1',
      stellarAddress: 'GDESTINATION',
      fromCurrency: 'BRL',
      toCurrency: 'USDC',
      amount: '100',
      memo: 'm',
    });

    expect(tx.id).toBe('onramp-1');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/api/ramp/v2/swaporder');
  });
});
