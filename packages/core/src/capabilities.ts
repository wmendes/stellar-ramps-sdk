import type { RailType } from './rails';

export type Direction = 'on_ramp' | 'off_ramp';

export type KycFlowType = 'redirect' | 'iframe' | 'form' | 'none';

export interface Limits {
  minAmount?: string;
  maxAmount?: string;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  issuer?: string;
  description: string;
}

export interface Corridor {
  country: string;
  currency: string;
  rail: RailType | string;
  tokens: TokenInfo[];
  directions: Direction[];
  limits?: Limits;
}

export interface OnboardingInfo {
  type?: 'self_service' | 'partnership' | 'review' | 'contact';
  portalUrl?: string;
  contact?: string;
}

export interface ProviderCapabilitiesManifest {
  name: string;
  displayName: string;
  corridors: Corridor[];
  kycFlow: KycFlowType;
  onboarding?: OnboardingInfo;
}

const ISO_ALPHA2 = /^[A-Z]{2}$/;
const ISO_4217 = /^[A-Z]{3}$/;

export interface ManifestValidationIssue {
  field: string;
  message: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  issues: ManifestValidationIssue[];
}

export function validateProviderManifest(
  manifest: ProviderCapabilitiesManifest,
): ManifestValidationResult {
  const issues: ManifestValidationIssue[] = [];

  if (!manifest.name?.trim()) {
    issues.push({ field: 'name', message: 'Provider name is required' });
  }
  if (!manifest.displayName?.trim()) {
    issues.push({ field: 'displayName', message: 'Display name is required' });
  }
  if (!Array.isArray(manifest.corridors) || manifest.corridors.length === 0) {
    issues.push({ field: 'corridors', message: 'At least one corridor is required' });
  }

  for (const [index, corridor] of manifest.corridors.entries()) {
    const base = `corridors[${index}]`;
    if (!ISO_ALPHA2.test(corridor.country)) {
      issues.push({
        field: `${base}.country`,
        message: 'Country must be ISO 3166-1 alpha-2 (e.g. MX, BR)',
      });
    }
    if (!ISO_4217.test(corridor.currency)) {
      issues.push({
        field: `${base}.currency`,
        message: 'Currency must be ISO 4217 (e.g. MXN, BRL)',
      });
    }
    if (!corridor.rail?.trim()) {
      issues.push({
        field: `${base}.rail`,
        message: 'Rail is required',
      });
    }
    if (!Array.isArray(corridor.tokens) || corridor.tokens.length === 0) {
      issues.push({
        field: `${base}.tokens`,
        message: 'At least one token is required',
      });
    }
    if (!Array.isArray(corridor.directions) || corridor.directions.length === 0) {
      issues.push({
        field: `${base}.directions`,
        message: 'At least one direction is required',
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Runtime capability flags used by the existing app flow.
 * These remain for backwards compatibility with current UI and server routes.
 */
export interface AnchorCapabilities {
  emailLookup?: boolean;
  kycUrl?: boolean;
  sep24?: boolean;
  sep6?: boolean;
  requiresTos?: boolean;
  requiresOffRampSigning?: boolean;
  kycFlow?: 'form' | 'iframe' | 'redirect';
  requiresBankBeforeQuote?: boolean;
  requiresBlockchainWalletRegistration?: boolean;
  deferredOffRampSigning?: boolean;
  requiresAnchorPayoutSubmission?: boolean;
  sandbox?: boolean;
}
