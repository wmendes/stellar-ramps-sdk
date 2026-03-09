import { describe, it, expect } from 'vitest';
import { getAnchor, getAllAnchors } from '$lib/config/anchors';

describe('getAnchor', () => {
    it('returns Etherfuse profile', () => {
        const anchor = getAnchor('etherfuse');
        expect(anchor).toBeDefined();
        expect(anchor!.id).toBe('etherfuse');
        expect(anchor!.name).toBe('Etherfuse');
    });

    it('returns AlfredPay profile', () => {
        const anchor = getAnchor('alfredpay');
        expect(anchor).toBeDefined();
        expect(anchor!.id).toBe('alfredpay');
    });

    it('returns BlindPay profile', () => {
        const anchor = getAnchor('blindpay');
        expect(anchor).toBeDefined();
        expect(anchor!.id).toBe('blindpay');
    });

    it('returns Transfero profile', () => {
        const anchor = getAnchor('transfero');
        expect(anchor).toBeDefined();
        expect(anchor!.id).toBe('transfero');
    });

    it('returns undefined for nonexistent anchor', () => {
        expect(getAnchor('nonexistent')).toBeUndefined();
    });
});

describe('getAllAnchors', () => {
    it('returns all 4 anchors', () => {
        const anchors = getAllAnchors();
        expect(anchors).toHaveLength(4);
        const ids = anchors.map((a) => a.id);
        expect(ids).toContain('etherfuse');
        expect(ids).toContain('alfredpay');
        expect(ids).toContain('blindpay');
        expect(ids).toContain('transfero');
    });
});
