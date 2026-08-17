import { defaultPartnerIntent, type PartnerIntent } from '@/data/partners';

export function tripToPartnerIntent(trip: Pick<PartnerIntent, 'destination' | 'startDate' | 'endDate' | 'budget'>, existingIntent?: PartnerIntent): PartnerIntent {
  return {
    ...(existingIntent ?? defaultPartnerIntent),
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    budget: trip.budget,
  };
}
