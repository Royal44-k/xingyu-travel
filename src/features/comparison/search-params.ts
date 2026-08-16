import type { ComparisonProductKind } from '@/domain/comparison/types';
import type { ComparisonSearchInput } from '@/domain/shared/api';

export type ComparisonSearchParams = Record<
  string,
  string | string[] | undefined
>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function searchFromParams(
  params: ComparisonSearchParams,
): ComparisonSearchInput {
  const rawKind = firstValue(params.kind);
  const kind: ComparisonProductKind = ['flight', 'hotel', 'ticket'].includes(
    rawKind ?? '',
  )
    ? (rawKind as ComparisonProductKind)
    : 'flight';
  const rawDestination = firstValue(params.destination)?.trim();
  const destination =
    rawDestination && rawDestination.length >= 2 && rawDestination.length <= 60
      ? rawDestination
      : '大理';
  const origin = firstValue(params.origin)?.trim();
  const from = firstValue(params.from);
  const to = firstValue(params.to);
  const travelers = Number(firstValue(params.travelers));

  return {
    kind,
    destination,
    ...(origin && origin.length <= 60 ? { origin } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(Number.isInteger(travelers) && travelers >= 1 && travelers <= 9
      ? { travelers }
      : {}),
  };
}
