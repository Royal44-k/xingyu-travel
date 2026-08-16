export const tripStatuses = [
  'planning',
  'booked',
  'traveling',
  'disrupted',
  'completed',
  'cancelled',
] as const;

export type TripStatus = (typeof tripStatuses)[number];

export const tripStateTransitions: Readonly<Record<TripStatus, readonly TripStatus[]>> = {
  planning: ['booked', 'cancelled'],
  booked: ['traveling', 'disrupted', 'cancelled'],
  traveling: ['disrupted', 'completed'],
  disrupted: ['traveling', 'cancelled'],
  completed: [],
  cancelled: [],
};

export interface TripState {
  tripId: string;
  status: TripStatus;
  updatedAt: string;
  demoMode: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TripRiskEvent {
  id: string;
  tripId: string;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  observedAt: string;
  demoMode: boolean;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  sentAt: string;
  demoMode: boolean;
}
