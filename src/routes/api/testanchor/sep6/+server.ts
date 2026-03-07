/**
 * SEP-6 Proxy Endpoint
 *
 * Proxies SEP-6 requests to testanchor.stellar.org to avoid CORS issues.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTransaction } from '$lib/anchors/sep/sep6';

const SEP6_SERVER = 'https://testanchor.stellar.org/sep6';

export const GET: RequestHandler = async ({ url, request }) => {
    try {
        const transactionId = url.searchParams.get('transactionId');
        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            throw error(401, { message: 'Authentication token is required' });
        }

        if (!transactionId) {
            throw error(400, { message: 'Transaction ID is required' });
        }

        const transaction = await getTransaction(SEP6_SERVER, token, transactionId);

        return json(transaction);
    } catch (err) {
        console.error('SEP-6 transaction status error:', err);
        return json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { action, token, ...params } = body;

        if (!token) {
            throw error(401, { message: 'Authentication token is required' });
        }

        let url: string;

        switch (action) {
            case 'deposit': {
                console.log('SEP-6 deposit params received:', params);
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        searchParams.set(key, String(value));
                    }
                });
                console.log('SEP-6 deposit URL params:', searchParams.toString());
                url = `${SEP6_SERVER}/deposit?${searchParams.toString()}`;
                break;
            }

            case 'withdraw': {
                console.log('SEP-6 withdraw params received:', params);
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        searchParams.set(key, String(value));
                    }
                });
                console.log('SEP-6 withdraw URL params:', searchParams.toString());
                url = `${SEP6_SERVER}/withdraw?${searchParams.toString()}`;
                break;
            }

            default:
                throw error(400, { message: `Unknown action: ${action}` });
        }

        console.log('SEP-6 proxy request:', { url });

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const text = await response.text();
        console.log('SEP-6 proxy response:', { status: response.status, body: text });

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            return json({ error: `Invalid JSON response: ${text}` }, { status: 500 });
        }

        if (!response.ok) {
            return json(data, { status: response.status });
        }

        return json(data);
    } catch (error) {
        console.error('SEP-6 proxy error:', error);
        return json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 },
        );
    }
};
