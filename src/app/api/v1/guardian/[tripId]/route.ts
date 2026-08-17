import { riskEventsForTrip } from '@/data/risk-events';
import { createRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ tripId: string }> },
): Promise<Response> {
  const { tripId } = await context.params;
  return Response.json({
    events: riskEventsForTrip(tripId),
    request_id: createRequestId(),
    demo_mode: true,
  });
}
