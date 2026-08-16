import type { AssistantResponse } from '@/domain/assistant/schema';
import type { NormalizedOffer } from '@/domain/comparison/types';
import type { AssistantRequest, ComparisonSearchInput } from '@/domain/shared/api';
import type { ChatMessage, TripRiskEvent } from '@/domain/trips/state';

export interface InventoryProvider {
  search(input: ComparisonSearchInput): AsyncIterable<NormalizedOffer>;
}

export interface LLMProvider {
  answer(input: AssistantRequest): Promise<AssistantResponse>;
}

export interface GuardianProvider {
  getRiskEvents(tripId: string): Promise<TripRiskEvent[]>;
}

export interface RealtimeProvider {
  listMessages(matchId: string): Promise<ChatMessage[]>;
  sendMessage(matchId: string, body: string): Promise<ChatMessage>;
}
