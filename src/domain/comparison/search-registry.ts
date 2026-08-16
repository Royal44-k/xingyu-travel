import type { ComparisonSearchInput } from '@/domain/shared/api';

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

export function findComparisonSearch(id: string): ComparisonSearchInput | undefined {
  const registered = searches.get(id);
  if (registered) return registered;

  const token = id.startsWith('search_') ? id.slice('search_'.length) : '';
  if (!token || token.length % 2 !== 0 || !/^[a-f0-9]+$/.test(token)) return undefined;

  try {
    const bytes = Uint8Array.from(
      token.match(/.{2}/g) ?? [],
      (pair) => Number.parseInt(pair, 16),
    );
    const decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Record<
      string,
      unknown
    >;
    if (typeof decoded.destination !== 'string' || !decoded.destination) return undefined;
    if (
      decoded.kind !== null &&
      !['flight', 'hotel', 'ticket'].includes(String(decoded.kind))
    ) {
      return undefined;
    }

    return {
      destination: decoded.destination,
      ...(decoded.kind ? { kind: decoded.kind as ComparisonSearchInput['kind'] } : {}),
      ...(typeof decoded.origin === 'string' ? { origin: decoded.origin } : {}),
      ...(typeof decoded.from === 'string' ? { from: decoded.from } : {}),
      ...(typeof decoded.to === 'string' ? { to: decoded.to } : {}),
      ...(typeof decoded.travelers === 'number' ? { travelers: decoded.travelers } : {}),
    };
  } catch {
    return undefined;
  }
}
