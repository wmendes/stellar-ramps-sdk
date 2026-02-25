<script lang="ts">
    import RampPage from '$lib/components/RampPage.svelte';
    import OffRampFlow from '$lib/components/OffRampFlow.svelte';

    import type { PageProps } from './$types';
    const { data }: PageProps = $props();
    const { anchor, fiatCurrency, primaryToken, capabilities, supportedTokens, displayName } =
        $derived(data);

    const tokenIssuer = $derived(
        supportedTokens.find((t) => t.symbol === primaryToken)?.issuer,
    );
</script>

<RampPage
    provider={anchor.id}
    title="Off-Ramp with {anchor.name}"
    description="Send digital assets from your Stellar wallet and receive local currency directly to your bank account."
    connectMessage="Connect your Freighter wallet to get started."
    {capabilities}
>
    <OffRampFlow
        provider={anchor.id}
        fromCurrency={primaryToken}
        {fiatCurrency}
        {capabilities}
        {tokenIssuer}
        {displayName}
    />
</RampPage>
