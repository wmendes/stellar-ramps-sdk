# Stellar Ramps SDK — Architecture Whitepaper

**A community-driven, modular toolkit for integrating fiat on/off-ramps into any Stellar application.**

*Version 1.0 | February 2026 | Prepared by NearX for the Stellar Development Foundation*

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Package Architecture](#3-package-architecture)
4. [The Anchor Interface](#4-the-anchor-interface)
5. [Payment Instructions and Rail Types](#5-payment-instructions-and-rail-types)
6. [Capability Declaration](#6-capability-declaration)
7. [Transaction State Machine](#7-transaction-state-machine)
8. [The Provider Catalog](#8-the-provider-catalog)
9. [Conformance Testing](#9-conformance-testing)
10. [Relationship to SEP Standards](#10-relationship-to-sep-standards)
11. [Community Contribution Model](#11-community-contribution-model)
12. [Repository Structure](#12-repository-structure)
13. [Development Roadmap](#13-development-roadmap)

---

## 1. Problem Statement

The Stellar network has a growing number of fiat-to-crypto providers operating across different countries. Each provider has a proprietary REST API with its own authentication scheme, data models, transaction lifecycle, and error handling. A wallet developer who wants to offer on/off-ramp services must write custom integration code for each provider they work with.

This creates three cascading problems:

1. **Repeated integration work.** Every wallet team writes essentially the same translation layer: take a deposit request, map it to the provider's API, parse the response, poll for status. This work is duplicated across every team for every provider.

2. **Provider lock-in.** Because each integration is bespoke, switching providers or adding a second provider in the same country requires significant rework. Wallet teams tend to integrate one provider and stop, even when better options exist.

3. **Slow geographic expansion.** A wallet that works in Mexico through Etherfuse cannot serve Brazil without a completely separate integration with a Brazilian provider. There is no shared infrastructure, no reusable patterns, no common interface.

&gt; **The Core Insight:** The work of integrating a fiat provider is the same everywhere: create a customer, get a quote, initiate a transaction, render payment instructions, poll for completion. What varies is the API shape, the payment rail, and the KYC requirements. A universal interface that captures the common lifecycle, with typed extensions for rail-specific details, eliminates the repeated work.

---

## 2. Solution Overview

Stellar Ramps SDK is an open-source TypeScript toolkit organized as a monorepo of independently publishable npm packages. At the center is a universal Anchor interface that every provider adapter must implement. Around it, the community builds and maintains adapters for individual providers. A wallet developer installs the core package and whichever provider packages they have business agreements with, then integrates through a single, consistent API surface.

### Design Principles

- **Providers, not regions.** Each provider is an independent package. A provider operating in five countries publishes one package declaring five countries in its capabilities. There is no "brazil package." There is a BlindPay package that happens to serve Brazil.

- **Capability catalog, not magic discovery.** Providers require API keys and business agreements. The SDK provides a structured catalog where wallet teams browse providers and evaluate capabilities before committing. Once you have credentials, integration is trivial.

- **One interface, universal.** Every adapter implements the same Anchor interface. The interface is narrow enough to cover any provider and expressive enough to surface rail-specific details through typed metadata.

- **Install only what you use.** A wallet installs `@stellar-ramps/core` plus only the provider packages it has agreements with.

- **Framework-agnostic.** Plain TypeScript with zero framework dependencies. Works in Node.js, Deno, Bun, browsers, and edge runtimes.

- **Community-maintained.** Anyone can build and publish an adapter. The conformance test suite validates compatibility. The catalog makes it findable.

---

## 3. Package Architecture

The SDK is organized into three layers: core packages that define the shared contract and utilities, provider packages that implement the contract for specific providers, and the wallet/application layer that consumes them.

```mermaid
graph TB
    subgraph Core["CORE PACKAGES"]
        CORE["@stellar-ramps/core<br>Interface + Types + Utilities"]
        SEP["@stellar-ramps/sep<br>SEP-1/6/10/12/24/31/38"]
        TEST["@stellar-ramps/testing<br>Conformance Suite + Mocks"]
        CLI["@stellar-ramps/cli<br>Scaffold + Validate + Publish"]
    end

    subgraph Providers["PROVIDER PACKAGES (community-maintained)"]
        BP["@stellar-ramps/blindpay<br>BR MX CO AR — USDC USDB"]
        TR["@stellar-ramps/transfero<br>BR — BRZ"]
        EF["@stellar-ramps/etherfuse<br>MX — CETES"]
        AP["@stellar-ramps/alfredpay<br>MX — USDC"]
        NT["@stellar-ramps/...<br>Any provider, any country"]
    end

    subgraph Wallets["WALLET / APPLICATION LAYER"]
        W1["Wallet App A"]
        W2["Wallet App B"]
        W3["Any TypeScript App"]
    end

    CORE --&gt; BP &amp; TR &amp; EF &amp; AP &amp; NT
    SEP --&gt; CORE
    TEST --&gt; CORE
    CLI --&gt; CORE &amp; TEST
    BP &amp; TR --&gt; W1
    EF &amp; AP --&gt; W2
    BP &amp; NT --&gt; W3

    style Core fill:#F4F7FA,stroke:#1B2A4A,stroke-width:2px
    style Providers fill:#F4F7FA,stroke:#38A169,stroke-width:2px
    style Wallets fill:#F4F7FA,stroke:#2A3E66,stroke-width:2px
```

### Core Packages

| Package | Purpose | Dependencies |
|---------|---------|--------------|
| `@stellar-ramps/core` | Anchor interface, shared types (Customer, Quote, Transaction, PaymentInstructions, FiatAccount, KycStatus), capability declaration schema, error types, utility functions. | None |
| `@stellar-ramps/sep` | Generic SEP protocol adapter. Implements the Anchor interface for any SEP-compliant provider. Handles SEP-1 discovery, SEP-10 auth, SEP-6/24 flows, SEP-12 KYC, SEP-31 cross-border, SEP-38 quotes. | `@stellar/stellar-sdk`, `core` |
| `@stellar-ramps/testing` | Conformance test suite that validates any adapter against the full interface contract. Mock providers and simulated payment rails for development. | `core`, `vitest` |
| `@stellar-ramps/cli` | Command-line tool: scaffold new provider packages, run conformance checks, validate capability declarations. | `core`, `testing` |

### Provider Packages

Each provider is its own independently versioned npm package. The package exports a client class implementing the Anchor interface and a static capabilities manifest.

| Package | Provider | Countries | Currencies | Rails | Tokens |
|---------|----------|-----------|------------|-------|--------|
| `@stellar-ramps/blindpay` | BlindPay | BR, MX, CO, AR | BRL, MXN, COP, ARS | Pix, SPEI, PSE, Transfer | USDC, USDB |
| `@stellar-ramps/transfero` | Transfero | BR | BRL | Pix | BRZ |
| `@stellar-ramps/etherfuse` | Etherfuse | MX | MXN | SPEI | CETES |
| `@stellar-ramps/alfredpay` | AlfredPay | MX | MXN | SPEI | USDC |
| `@stellar-ramps/ntokens` | nTokens | BR | BRL | Pix | BRL token |

New provider packages follow the same structure. A developer scaffolds the package with the CLI, implements the Anchor interface, declares capabilities, passes the conformance suite, and publishes.

---

## 4. The Anchor Interface

The Anchor interface is the central contract of the SDK. Every provider adapter implements it. Every wallet application consumes it. It is deliberately minimal: the smallest surface that covers the complete on-ramp and off-ramp lifecycle for any provider in any country.

```mermaid
graph LR
    subgraph Adapters["Provider Adapters<br>(implements)"]
        A1["BlindPay"]
        A2["Transfero"]
        A3["Etherfuse"]
        A4["Any Adapter"]
    end

    subgraph Interface["Anchor Interface<br>@stellar-ramps/core"]
        I1["Identity<br>name, displayName, capabilities"]
        I2["Customer<br>createCustomer, getCustomer<br>getKycStatus, getKycUrl"]
        I3["Quoting<br>getQuote"]
        I4["On-Ramp<br>createOnRamp<br>getOnRampTransaction"]
        I5["Off-Ramp<br>createOffRamp<br>getOffRampTransaction"]
        I6["Fiat Accounts<br>registerFiatAccount<br>getFiatAccounts"]
    end

    subgraph Consumers["Wallet Apps<br>(consumes)"]
        C1["Wallet A"]
        C2["Wallet B"]
        C3["Any App"]
    end

    A1 &amp; A2 &amp; A3 &amp; A4 --&gt; Interface
    Interface --&gt; C1 &amp; C2 &amp; C3

    style Interface fill:#F4F7FA,stroke:#1B2A4A,stroke-width:2px
    style Adapters fill:#F4F7FA,stroke:#38A169,stroke-width:2px
    style Consumers fill:#F4F7FA,stroke:#3B82C4,stroke-width:2px
```

### Interface Methods

#### Customer Management

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `createCustomer` | Register a new customer identity with the provider | Email, name, country, Stellar public key, identity documents | Customer object with provider-assigned ID and KYC status |
| `getCustomer` | Retrieve an existing customer by provider ID | Customer ID | Customer object or null |
| `getKycStatus` | Check current KYC verification status | Customer ID, optional Stellar public key | KYC status: NONE, PENDING, ACCEPTED, REJECTED |
| `getKycUrl` | Get URL for interactive KYC (if provider uses redirect/iframe) | Customer ID | URL string |

#### Quoting

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `getQuote` | Request a real-time exchange rate for a fiat/crypto pair | From currency, to currency, amount, customer ID, Stellar address | Quote with rate, fees, expiration, and quote ID |

#### On-Ramp (Fiat → Crypto)

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `createOnRamp` | Initiate a fiat payment resulting in tokens sent to user's Stellar address | Customer ID, quote ID, Stellar address, amount, currency pair | OnRampTransaction with payment instructions (rail-specific), tx ID, initial status |
| `getOnRampTransaction` | Poll for transaction status | Transaction ID | OnRampTransaction with current status, Stellar tx hash when complete |

#### Off-Ramp (Crypto → Fiat)

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `createOffRamp` | Initiate crypto-to-fiat. User sends tokens to provider's Stellar address. | Customer ID, quote ID, Stellar address, amount, fiat destination | OffRampTransaction with provider's Stellar address, memo, initial status |
| `getOffRampTransaction` | Poll for settlement status | Transaction ID | OffRampTransaction with current status, fiat settlement confirmation |

#### Fiat Accounts

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `registerFiatAccount` | Register user's payment destination for off-ramp | Customer ID, account details (Pix key, CLABE, bank account) | RegisteredFiatAccount with provider-assigned ID |
| `getFiatAccounts` | List registered destinations | Customer ID | Array of SavedFiatAccount |

---

## 5. Payment Instructions and Rail Types

The most important architectural decision in the interface is how it handles variation between payment rails. A Pix deposit in Brazil returns a QR code. A SPEI deposit in Mexico returns a CLABE. A bank transfer in Nigeria returns account details. The interface must accommodate all of these without changing its shape.

### The PaymentInstructions Discriminated Union

When a wallet calls `createOnRamp`, the response includes a `paymentInstructions` field. This field is a discriminated union typed by the `rail` property:

```mermaid
graph TB
    CR["createOnRamp()"] --&gt; PI["PaymentInstructions"]
    
    PI --&gt; PIX["rail: 'pix'<br>qr_code: string (base64)<br>pix_copy_paste: string<br>amount: string<br>expiration: ISO 8601"]
    PI --&gt; SPEI["rail: 'spei'<br>clabe: string (18 digits)<br>reference_number: string<br>bank_name: string<br>amount: string"]
    PI --&gt; BANK["rail: 'bank_transfer'<br>account_number: string<br>routing_number: string<br>bank_name: string<br>swift: string"]
    PI --&gt; MM["rail: 'mobile_money'<br>phone_number: string<br>provider_name: string<br>reference: string"]
    PI --&gt; CARD["rail: 'card'<br>payment_url: string<br>redirect_url: string"]

    style PI fill:#F4F7FA,stroke:#1B2A4A,stroke-width:2px
    style PIX fill:#fff,stroke:#38A169,stroke-width:2px
    style SPEI fill:#fff,stroke:#3B82C4,stroke-width:2px
    style BANK fill:#fff,stroke:#EB8C3C,stroke-width:2px
    style MM fill:#fff,stroke:#7C3AED,stroke-width:2px
    style CARD fill:#fff,stroke:#E8524A,stroke-width:2px
```

| Rail Type | Key Fields | Wallet Renders |
|-----------|-----------|----------------|
| `pix` | qr_code, pix_copy_paste, amount, expiration | QR code with countdown timer and copy-paste fallback |
| `spei` | clabe, reference_number, bank_name, beneficiary, amount | Account details card with copy buttons |
| `bank_transfer` | account_number, routing_number, bank_name, swift, beneficiary | Bank transfer instructions |
| `mobile_money` | phone_number, provider_name, reference, amount | Mobile money payment details |
| `card` | payment_url, redirect_url | Redirect to provider's card payment page |
| `custom` | provider-defined fields (extensible) | Provider-specific rendering via metadata |

### Extending the Rail System

When a provider operates in a country with a payment rail not yet defined in the SDK, the adapter developer defines a new rail type in their package. The type extends the base `PaymentInstructions` type. The core interface does not change. Existing wallets that don't support the new rail ignore providers that declare it. Wallets that want to support it import the type from the provider package.

This extensibility model means the SDK can accommodate any payment rail in any country without requiring coordinated releases of the core package.

---

## 6. Capability Declaration

Every provider package exports a static capabilities manifest alongside its client class. This manifest is the structured, machine-readable description of everything the provider can do.

```mermaid
graph LR
    subgraph Package["@stellar-ramps/blindpay"]
        CLIENT["BlindPayClient<br>implements Anchor"]
        CAP["Capabilities Manifest"]
    end

    CAP --&gt; C1["🇧🇷 BR<br>BRL / Pix<br>USDC, USDB<br>on-ramp, off-ramp"]
    CAP --&gt; C2["🇲🇽 MX<br>MXN / SPEI<br>USDC, USDB<br>on-ramp, off-ramp"]
    CAP --&gt; C3["🇨🇴 CO<br>COP / PSE<br>USDC<br>on-ramp"]
    CAP --&gt; C4["🇦🇷 AR<br>ARS / Transfer<br>USDC<br>on-ramp, off-ramp"]
    CAP --&gt; META["KYC: redirect<br>Onboarding: self-service<br>developer.blindpay.com"]

    style Package fill:#F4F7FA,stroke:#38A169,stroke-width:2px
```

### Manifest Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Machine-readable provider identifier (e.g., `blindpay`) |
| `displayName` | string | Human-readable name (e.g., `BlindPay`) |
| `corridors` | Corridor[] | Array of supported corridors |
| `corridor.country` | ISO 3166-1 alpha-2 | Country code (e.g., `BR`, `MX`) |
| `corridor.currency` | ISO 4217 | Fiat currency code (e.g., `BRL`, `MXN`) |
| `corridor.rail` | RailType | Payment rail identifier (e.g., `pix`, `spei`) |
| `corridor.tokens` | TokenInfo[] | Stellar assets, each with `asset_code` and `issuer` |
| `corridor.directions` | Direction[] | `on_ramp`, `off_ramp`, or both |
| `corridor.limits` | Limits | Min and max transaction amounts |
| `kycFlow` | KycFlowType | `redirect`, `iframe`, `form`, or `none` |
| `onboarding` | OnboardingInfo | Developer portal URL, contact, sign-up process type |

The manifest is static metadata available at import time without API calls. Wallet code reads installed providers' capabilities at initialization and filters by country, currency, and direction to present users with available options.

---

## 7. Transaction State Machine

Every on-ramp and off-ramp transaction follows a defined state machine. The conformance test suite validates that all adapters follow these transitions correctly.

### On-Ramp States

```mermaid
stateDiagram-v2
    [*] --&gt; CREATED
    CREATED --&gt; KYC_REQUIRED
    CREATED --&gt; QUOTED
    KYC_REQUIRED --&gt; KYC_COMPLETE
    KYC_COMPLETE --&gt; QUOTED
    QUOTED --&gt; PENDING_PAYMENT
    PENDING_PAYMENT --&gt; PENDING_TOKENS
    PENDING_TOKENS --&gt; COMPLETED
    
    CREATED --&gt; ERROR
    KYC_REQUIRED --&gt; ERROR
    QUOTED --&gt; EXPIRED
    PENDING_PAYMENT --&gt; EXPIRED
    PENDING_PAYMENT --&gt; ERROR
    PENDING_TOKENS --&gt; ERROR
    PENDING_TOKENS --&gt; REFUNDED
    
    COMPLETED --&gt; [*]
    ERROR --&gt; [*]
    EXPIRED --&gt; [*]
    REFUNDED --&gt; [*]
```

| State | Meaning | Triggered By |
|-------|---------|-------------|
| `CREATED` | Transaction record created | `createOnRamp()` called |
| `KYC_REQUIRED` | Provider requires identity verification | Provider response indicates incomplete KYC |
| `KYC_COMPLETE` | User passed verification | KYC callback or status poll |
| `QUOTED` | Exchange rate locked, payment instructions available | `getQuote()` returns valid quote |
| `PENDING_PAYMENT` | Waiting for user to pay via local rail | Payment instructions displayed to user |
| `PENDING_TOKENS` | Fiat received, tokens being sent to user's Stellar address | Provider confirms fiat payment |
| `COMPLETED` | Tokens delivered. Stellar tx hash available. | On-chain confirmation |
| `ERROR` | Transaction failed. Reason in error field. | Any failure at any stage |
| `EXPIRED` | Quote or payment instructions expired | Timeout |
| `REFUNDED` | Fiat returned to user after post-payment failure | Provider-initiated refund |

### Off-Ramp States

```mermaid
stateDiagram-v2
    [*] --&gt; CREATED
    CREATED --&gt; QUOTED
    QUOTED --&gt; PENDING_TOKENS
    PENDING_TOKENS --&gt; TOKENS_RECEIVED
    TOKENS_RECEIVED --&gt; PENDING_SETTLEMENT
    PENDING_SETTLEMENT --&gt; COMPLETED
    
    CREATED --&gt; ERROR
    QUOTED --&gt; EXPIRED
    PENDING_TOKENS --&gt; EXPIRED
    PENDING_TOKENS --&gt; ERROR
    TOKENS_RECEIVED --&gt; ERROR
    PENDING_SETTLEMENT --&gt; ERROR
    
    COMPLETED --&gt; [*]
    ERROR --&gt; [*]
    EXPIRED --&gt; [*]
```

| State | Meaning | Triggered By |
|-------|---------|-------------|
| `CREATED` | Transaction record created | `createOffRamp()` called |
| `QUOTED` | Rate locked, provider's Stellar address and memo available | `getQuote()` returns valid quote |
| `PENDING_TOKENS` | Waiting for user to send tokens | Deposit instructions displayed |
| `TOKENS_RECEIVED` | Provider confirmed on-chain token receipt | Provider detects incoming Stellar payment |
| `PENDING_SETTLEMENT` | Provider processing fiat payout | Provider initiates fiat transfer |
| `COMPLETED` | Fiat settled to user's account | Provider confirms settlement |
| `ERROR` | Transaction failed | Any failure at any stage |
| `EXPIRED` | Quote expired before user sent tokens | Timeout |

Adapters must only transition between valid states. The conformance test suite feeds simulated sequences and verifies no invalid transitions occur.

---

## 8. The Provider Catalog

The SDK maintains a public catalog — a structured directory hosted on GitHub — that lists every known provider package with its full capability declaration and onboarding information. This is not an automatic discovery system. It is a reference for wallet teams making business and integration decisions.

### What the Catalog Contains

For each provider:

- **Package name and version** — npm identifier and current stable version
- **Full capability declaration** — Countries, currencies, rails, tokens, directions, limits
- **Onboarding process** — Self-service API keys, partnership agreement, or integration review. Link to developer portal or contact.
- **Sandbox availability** — Whether the provider offers a sandbox for testing
- **Status** — Active, sandbox-only, deprecated, or community-preview
- **Maintainer** — Who maintains the adapter (provider team, wallet team, independent contributor)

### Catalog as Business Tool

The catalog respects the reality that provider integrations are business relationships. A wallet team building for Brazil opens the catalog and sees that BlindPay offers BRL/USDC via Pix with self-service API keys and a sandbox, that Transfero offers BRL/BRZ via Pix but requires a partnership agreement, and that nTokens offers BRL via Pix with a contact-for-access process.

The team evaluates, signs agreements, obtains credentials, and installs the corresponding packages. The catalog is maintained via pull requests.

---

## 9. Conformance Testing

The `@stellar-ramps/testing` package provides a comprehensive test suite that every adapter must pass before being listed in the catalog.

```mermaid
graph LR
    S["Scaffold<br>CLI generates<br>package skeleton"] --&gt; I["Implement<br>Map provider API<br>to Anchor interface"]
    I --&gt; T["Test<br>Conformance suite<br>validates contract"]
    T --&gt; P["Publish<br>npm publish +<br>catalog PR"]
    P --&gt; M["Maintain<br>Version updates<br>as API evolves"]

    style S fill:#fff,stroke:#1B2A4A,stroke-width:2px
    style I fill:#fff,stroke:#3B82C4,stroke-width:2px
    style T fill:#fff,stroke:#38A169,stroke-width:2px
    style P fill:#fff,stroke:#2CA6A4,stroke-width:2px
    style M fill:#fff,stroke:#EB8C3C,stroke-width:2px
```

### What the Suite Validates

| Category | Checks |
|----------|--------|
| **Interface Completeness** | All required methods exist. All return correct types. Optional methods correctly declared in capabilities. |
| **Capability Declaration** | Manifest is valid. Country codes are ISO 3166. Currency codes are ISO 4217. Rail types are recognized or correctly extend base. Token info includes valid Stellar asset codes and issuers. |
| **State Machine Compliance** | Transaction states follow allowed transitions. No state skipped. Terminal states cannot transition further. |
| **Error Handling** | API errors wrapped in typed SDK errors. Network failures are retryable. Provider-specific codes mapped to standard error types. No unhandled promise rejections. |
| **Idempotency** | `getOnRampTransaction` with same ID returns consistent results. `createCustomer` with existing data returns or references existing customer. |
| **Type Safety** | All exported types correct. PaymentInstructions union resolves correctly. No `any` types leak into the public API. |

### Testing Workflow

A developer building a new adapter runs the conformance suite locally. The suite runs against mock data (fast iteration) or against the provider's sandbox API (integration validation). The CLI provides a single command: `stellar-ramps test --provider ./my-adapter`. Adapters that pass all checks are eligible for catalog listing.

---

## 10. Relationship to SEP Standards

Most fiat-to-crypto providers today have proprietary REST APIs. They do not implement Stellar Ecosystem Proposals. The SDK wraps these APIs behind the universal Anchor interface so wallet developers don't need custom code for each one.

For SEP-compliant providers, `@stellar-ramps/sep` provides a generic adapter that works with any SEP anchor. The wallet developer provides a domain, and the SEP module handles stellar.toml discovery, SEP-10 authentication, SEP-24 interactive flows, and SEP-38 quotes. It implements the same Anchor interface.

### The Graduation Path

```mermaid
graph LR
    P1["Provider has<br>proprietary API"] --&gt; A1["Community builds<br>custom adapter"]
    A1 --&gt; W1["Wallets use<br>custom adapter"]
    
    P1 --&gt; P2["Provider<br>adopts SEP"]
    P2 --&gt; A2["@stellar-ramps/sep<br>generic adapter"]
    A2 --&gt; W2["Same wallets,<br>same code"]
    
    W1 -.-&gt;|"wallet code<br>doesn't change"| W2

    style P1 fill:#fff,stroke:#EB8C3C,stroke-width:2px
    style P2 fill:#fff,stroke:#38A169,stroke-width:2px
    style A1 fill:#fff,stroke:#3B82C4,stroke-width:2px
    style A2 fill:#fff,stroke:#2CA6A4,stroke-width:2px
```

1. **Custom adapter phase.** Provider has a proprietary API. Someone builds a custom adapter implementing the Anchor interface.
2. **SEP adoption.** The provider implements SEP endpoints. They now serve stellar.toml and respond to standard SEP requests.
3. **Generic adapter replaces custom.** The wallet switches to `@stellar-ramps/sep` pointed at the provider's domain. Wallet code doesn't change — the Anchor interface is the same.

The SDK doesn't replace SEP. It bridges the gap for providers that haven't adopted it. For providers that never adopt SEP, the SDK ensures they remain accessible through the same interface.

---

## 11. Community Contribution Model

### Publishing a New Provider Adapter

1. **Scaffold.** Use `@stellar-ramps/cli` to generate a package skeleton with correct structure, dependencies, and boilerplate.
2. **Implement.** Map the provider's API to the Anchor interface. Implement all required methods. Define rail-specific PaymentInstructions types if needed.
3. **Declare capabilities.** Fill in the manifest: countries, currencies, rails, tokens, directions, KYC flow, limits, onboarding.
4. **Test.** Run the conformance suite. Fix failures. Run against the provider's sandbox for integration validation.
5. **Publish.** Publish to npm under your own scope or request inclusion in the `@stellar-ramps` namespace.
6. **Catalog.** Submit a PR to add the package to the public catalog.

### Who Can Contribute

- **The provider themselves** — Best positioned to build and maintain. Ensures accuracy.
- **A wallet team** — Building because they need it. Motivated by their own timeline.
- **An independent developer** — Local expertise in the provider's country and API.
- **An ecosystem grant recipient** — Funded by SCF or SDF to fill a catalog gap.

The conformance test suite is the quality bar, not organizational affiliation.

---

## 12. Repository Structure

```
stellar-ramps-sdk/
  packages/
    core/                     # @stellar-ramps/core
      src/
        anchor.ts             # The Anchor interface
        types.ts              # Customer, Quote, Transaction, FiatAccount...
        capabilities.ts       # Capability declaration schema
        errors.ts             # Typed error hierarchy
        rails.ts              # Base PaymentInstructions union
        index.ts              # Public API exports
    sep/                      # @stellar-ramps/sep
      src/
        sep1.ts               # stellar.toml discovery
        sep10.ts              # Web authentication
        sep6.ts               # Programmatic deposit/withdrawal
        sep12.ts              # KYC API
        sep24.ts              # Interactive deposit/withdrawal
        sep31.ts              # Cross-border payments
        sep38.ts              # Anchor RFQ
        adapter.ts            # SepAnchor class (implements Anchor)
    testing/                  # @stellar-ramps/testing
      src/
        conformance.ts        # Test suite runner
        mocks.ts              # Mock provider + rail simulators
        fixtures.ts           # Test data
    cli/                      # @stellar-ramps/cli
  providers/
    blindpay/                 # @stellar-ramps/blindpay
    transfero/                # @stellar-ramps/transfero
    etherfuse/                # @stellar-ramps/etherfuse
    alfredpay/                # @stellar-ramps/alfredpay
  catalog/
    catalog.json              # Machine-readable provider catalog
    README.md                 # Human-readable catalog
  docs/
    architecture.md           # This document
    contributing.md           # Guide for adapter developers
    interface.md              # Anchor interface reference
  pnpm-workspace.yaml
  tsconfig.base.json
```

### Versioning Strategy

- **Core packages** follow strict semver. Breaking Anchor interface changes trigger major bumps. Minor versions add optional capabilities. Patches fix bugs.
- **Provider packages** are versioned independently. A provider API change triggers a provider update without affecting core or others.
- **Compatibility** is managed via `peerDependencies` — each provider declares which `@stellar-ramps/core` version range it supports.

---

*The foundation exists. The architecture follows the natural unit — the provider — and respects the reality that integrations require business relationships, not just code.*