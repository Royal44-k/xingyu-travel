import { isKnownGuardianTrip, riskEventsForTrip } from '@/data/risk-events';
import { createRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ tripId: string }> },
): Promise<Response> {
  const { tripId } = await context.params;
  const requestId = createRequestId();
  if (!isKnownGuardianTrip(tripId)) {
    return Response.json({
      ok: false,
      error: { code: 'GUARDIAN_TRIP_NOT_FOUND', message: '未找到该行程，无法显示守护信息。' },
      request_id: requestId,
      demo_mode: true,
    }, { status: 404 });
  }
  return Response.json({
    events: riskEventsForTrip(tripId),
    request_id: requestId,
    demo_mode: true,
  });
}
