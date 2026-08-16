import type { ComparisonProductKind } from '../comparison/types';

export interface ComparisonSearchInput {
  destination: string;
  kind?: ComparisonProductKind;
  origin?: string;
  from?: string;
  to?: string;
  travelers?: number;
}

export interface AssistantRequest {
  tripId: string;
  question: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
