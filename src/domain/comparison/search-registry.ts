import type { ComparisonSearchInput } from '@/domain/shared/api';
import { comparisonSearchSchema } from './search-schema';

const searches = new Map<string, ComparisonSearchInput>();

function canonicalSearch(input: ComparisonSearchInput): string {
  return JSON.stringify({
    destination: input.destination.trim(),
    kind: input.kind ?? null,
    origin: input.origin?.trim() ?? null,
    from: input.from ?? null,
    to: input.to ?? null,
    travelers: input.travelers ?? null,
  });
}

export function stableSearchId(input: ComparisonSearchInput): string {
  const bytes = new TextEncoder().encode(canonicalSearch(input));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `search_${token}`;
}

export function registerComparisonSearch(input: ComparisonSearchInput): string {
  const id = stableSearchId(input);
  searches.set(id, input);
  return id;
}

export type ComparisonSearchLookup =
  | { status: 'found'; input: ComparisonSearchInput }
  | { status: 'invalid' }
  | { status: 'missing' };

export function findComparisonSearch(id: string): ComparisonSearchLookup {
  const registered = searches.get(id);
  if (registered) return { status: 'found', input: registered };

  if (!id.startsWith('search_')) return { status: 'missing' };
  const token = id.slice('search_'.length);
  if (
    !token ||
    token.length > 2048 ||
    token.length % 2 !== 0 ||
    !/^[a-f0-9]+$/.test(token)
  ) {
    return { status: 'invalid' };
  }

  try {
    const bytes = Uint8Array.from(
      token.match(/.{2}/g) ?? [],
      (pair) => Number.parseInt(pair, 16),
    );
    const decoded = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as Record<string, unknown>;
    const withoutNulls = Object.fromEntries(
      Object.entries(decoded).filter(([, value]) => value !== null),
    );
    const parsed = comparisonSearchSchema.safeParse(withoutNulls);
    return parsed.success
      ? { status: 'found', input: parsed.data }
      : { status: 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}
