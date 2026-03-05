import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runConformanceSuite } from './conformance';
import type { ConformanceContext, ConformanceIssue, ConformanceResult } from './types';

export interface ConformanceCommandIO {
  log: (msg: string) => void;
  error: (msg: string) => void;
}

export interface ConformanceCommandOptions {
  io: ConformanceCommandIO;
  providerResolver?: (
    provider: string,
  ) => Promise<ConformanceContext | null> | ConformanceContext | null;
}

interface ModuleLoadOptions {
  factory: string;
  adapterExport: string;
  manifestExport: string;
}

type DynamicConformanceModule = Record<string, unknown>;

function argValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function formatIssues(issues: ConformanceIssue[]): string {
  return issues.map((issue) => `[${issue.code}] ${issue.message}`).join('; ');
}

function summarize(result: ConformanceResult): { errorCount: number; warningCount: number } {
  const errorCount = result.issues.filter((issue) => issue.severity === 'error').length;
  return { errorCount, warningCount: result.issues.length - errorCount };
}

export function formatConformanceFailure(result: ConformanceResult): string[] {
  const { errorCount, warningCount } = summarize(result);
  const lines = [
    `Conformance failed for ${result.providerName} (${errorCount} errors, ${warningCount} warnings).`,
  ];
  for (const issue of result.issues) {
    const level = issue.severity.toUpperCase();
    lines.push(`[${level}] ${issue.code}: ${issue.message}`);
  }
  return lines;
}

export function formatConformanceSuccess(result: ConformanceResult): string {
  const { warningCount } = summarize(result);
  return `Conformance passed for ${result.providerName} (${result.checksRun} checks, ${warningCount} warnings).`;
}

export async function loadConformanceContextFromModule(
  modulePath: string,
  opts: ModuleLoadOptions,
): Promise<ConformanceContext> {
  const url = pathToFileURL(resolve(modulePath)).href;
  const mod = (await import(url)) as DynamicConformanceModule;
  const defaultExport = mod.default as Record<string, unknown> | undefined;
  const exportNames = Object.keys(mod).sort().join(', ') || '(none)';

  const factory = mod[opts.factory];
  if (typeof factory === 'function') {
    return (await (factory as () => Promise<ConformanceContext> | ConformanceContext)()) as ConformanceContext;
  }

  const adapter =
    mod[opts.adapterExport] ??
    (defaultExport ? defaultExport[opts.adapterExport] : undefined) ??
    mod.adapter ??
    (defaultExport ? defaultExport.adapter : undefined);
  const manifest =
    mod[opts.manifestExport] ??
    (defaultExport ? defaultExport[opts.manifestExport] : undefined) ??
    mod.manifest ??
    (defaultExport ? defaultExport.manifest : undefined);

  if (adapter && typeof adapter === 'object') {
    return { adapter: adapter as ConformanceContext['adapter'], manifest: manifest as ConformanceContext['manifest'] };
  }

  throw new Error(
    `Invalid conformance module "${modulePath}". Expected ${opts.factory}() or exports "${opts.adapterExport}" (+ optional "${opts.manifestExport}"). Available exports: ${exportNames}`,
  );
}

export async function runConformanceCommand(
  args: string[],
  options: ConformanceCommandOptions,
): Promise<{ code: number; result?: ConformanceResult }> {
  const { io, providerResolver } = options;
  const provider = argValue(args, '--provider');
  const modulePath = argValue(args, '--module');
  const factory = argValue(args, '--factory') ?? 'createConformanceContext';
  const adapterExport = argValue(args, '--adapter-export') ?? 'adapter';
  const manifestExport = argValue(args, '--manifest-export') ?? 'manifest';

  if (!provider && !modulePath) {
    io.error(
      'Missing required flag: --provider <name> or --module <path>. Optional: --factory/--adapter-export/--manifest-export.',
    );
    return { code: 1 };
  }
  if (provider && modulePath) {
    io.error('Use either --provider or --module, not both.');
    return { code: 1 };
  }

  let result: ConformanceResult;
  try {
    if (provider) {
      if (!providerResolver) {
        io.error('No provider resolver configured for --provider mode.');
        return { code: 1 };
      }
      const context = await providerResolver(provider);
      if (!context) {
        io.error(`Unknown provider: ${provider}`);
        return { code: 1 };
      }
      result = await runConformanceSuite(() => context, { providerName: provider });
    } else {
      const context = await loadConformanceContextFromModule(modulePath as string, {
        factory,
        adapterExport,
        manifestExport,
      });
      result = await runConformanceSuite(() => context);
    }
  } catch (error) {
    io.error(`Conformance command failed: ${(error as Error).message}`);
    return { code: 1 };
  }

  if (!result.passed) {
    for (const line of formatConformanceFailure(result)) {
      io.error(line);
    }
    if (process.env.CI) {
      io.error(`::error::${formatIssues(result.issues)}`);
    }
    return { code: 1, result };
  }

  io.log(formatConformanceSuccess(result));
  return { code: 0, result };
}
