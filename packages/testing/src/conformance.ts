import type { Anchor } from '@stellar-ramps/core';
import { checkManifest } from './manifest';
import { checkIdempotentJson } from './idempotency';
import { validateOffRampTransitions, validateOnRampTransitions } from './state-machine';
import type {
  ConformanceContext,
  ConformanceIssue,
  ConformanceOptions,
  ConformanceResult,
} from './types';

function checkInterfaceCompleteness(adapter: Anchor): ConformanceIssue[] {
  const requiredMethods: Array<keyof Anchor> = [
    'createCustomer',
    'getCustomer',
    'getQuote',
    'createOnRamp',
    'getOnRampTransaction',
    'registerFiatAccount',
    'getFiatAccounts',
    'createOffRamp',
    'getOffRampTransaction',
    'getKycStatus',
  ];

  const issues: ConformanceIssue[] = [];
  for (const method of requiredMethods) {
    if (typeof adapter[method] !== 'function') {
      issues.push({
        code: 'MISSING_METHOD',
        message: `Adapter missing required method: ${String(method)}`,
        severity: 'error',
      });
    }
  }

  if (!adapter.name || !adapter.displayName) {
    issues.push({
      code: 'MISSING_IDENTITY',
      message: 'Adapter must expose non-empty name and displayName',
      severity: 'error',
    });
  }

  return issues;
}

export async function runConformanceSuite(
  makeContext: () => Promise<ConformanceContext> | ConformanceContext,
  options: ConformanceOptions = {},
): Promise<ConformanceResult> {
  const context = await makeContext();
  const secondContext = await makeContext();
  const providerName =
    options.providerName ?? context.manifest?.name ?? context.adapter.name ?? 'unknown-provider';

  const issues: ConformanceIssue[] = [];
  issues.push(...checkInterfaceCompleteness(context.adapter));

  if (context.manifest) {
    issues.push(...checkManifest(context.manifest));
  }
  if (options.onRampLifecycle && options.onRampLifecycle.length > 1) {
    issues.push(...validateOnRampTransitions(options.onRampLifecycle));
  }
  if (options.offRampLifecycle && options.offRampLifecycle.length > 1) {
    issues.push(...validateOffRampTransitions(options.offRampLifecycle));
  }

  if (options.checkIdempotency !== false) {
    // Identity snapshot should be stable across equivalent adapter construction.
    const snapshotA = {
      name: context.adapter.name,
      displayName: context.adapter.displayName,
      supportedRails: [...context.adapter.supportedRails],
      supportedCurrencies: [...context.adapter.supportedCurrencies],
      supportedTokens: context.adapter.supportedTokens.map((t) => ({
        symbol: t.symbol,
        issuer: t.issuer,
      })),
    };
    const snapshotB = {
      name: secondContext.adapter.name,
      displayName: secondContext.adapter.displayName,
      supportedRails: [...secondContext.adapter.supportedRails],
      supportedCurrencies: [...secondContext.adapter.supportedCurrencies],
      supportedTokens: secondContext.adapter.supportedTokens.map((t) => ({
        symbol: t.symbol,
        issuer: t.issuer,
      })),
    };
    issues.push(...checkIdempotentJson('adapter identity snapshot', snapshotA, snapshotB));

    if (context.manifest && secondContext.manifest) {
      issues.push(
        ...checkIdempotentJson('manifest snapshot', context.manifest, secondContext.manifest),
      );
    }
  }

  return {
    providerName,
    passed: issues.every((issue) => issue.severity !== 'error'),
    checksRun: 5,
    issues,
  };
}
