import type { LayoutServerLoad } from './$types';
import { getAnchor as getAnchorProfile } from '$lib/config/anchors';
import { getRegionsForAnchor, getRegion } from '$lib/config/regions';
import { getAnchor as getAnchorInstance, isValidProvider } from '$lib/server/anchorFactory';
import { error } from '@sveltejs/kit';

/**
 * Server-side layout load for the per-provider pages.
 *
 * Reads UI metadata from config (AnchorProfile) and runtime metadata
 * (capabilities, tokens, rails) from the anchor client instance.
 */
export const load: LayoutServerLoad = ({ params }) => {
    const anchorId = params.provider;
    if (!isValidProvider(anchorId)) {
        error(404, { message: `Anchor not found: ${anchorId}` });
    }
    const profile = getAnchorProfile(anchorId);
    if (!profile) {
        error(404, { message: `Anchor not found: ${anchorId}` });
    }

    const instance = getAnchorInstance(anchorId);
    const firstRegionId = Object.keys(profile.regions)[0];
    const region = firstRegionId ? getRegion(firstRegionId) : undefined;
    const fiatCurrency = region?.currency ?? 'MXN';
    const firstRegionCap = firstRegionId ? profile.regions[firstRegionId] : undefined;
    const primaryToken = firstRegionCap?.tokens[0] ?? instance.supportedTokens[0]?.symbol ?? 'USDC';

    return {
        anchor: profile,
        displayName: instance.displayName,
        capabilities: instance.capabilities,
        supportedTokens: [...instance.supportedTokens],
        supportedRails: [...instance.supportedRails],
        regions: getRegionsForAnchor(anchorId),
        fiatCurrency,
        primaryToken,
    };
};
