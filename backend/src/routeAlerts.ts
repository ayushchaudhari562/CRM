// Nightly 10:00 pm IST Route Deviation Alert to Managers.
// Checks all active salesmen's weekly plans for today. If any planned stops are still PENDING,
// marks them MISSED and alerts the manager via WhatsApp.
import { prisma } from './db';
import { istToday } from './dto';
import { sendTemplate, type SendTemplate } from './messaging';

export const ALERT_HOUR_IST = 22; // 10:00 pm India time

export async function sendNightlyRouteAlerts(now = new Date(), send: SendTemplate = sendTemplate): Promise<number> {
  const { date, start } = istToday(now);
  if (now.getTime() < start.getTime() + ALERT_HOUR_IST * 3600_000) return 0; // before 10 pm

  // Find all plans for today that have pending stops
  const plans = await prisma.weeklyPlan.findMany({
    where: { date },
    include: {
      salesman: { select: { id: true, name: true, isActive: true } },
      stops: true,
    },
  });

  const activePlans = plans.filter((p) => p.salesman.isActive && p.stops.length > 0);
  if (!activePlans.length) return 0;

  // Find active manager to receive alerts
  const manager = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true, phone: true },
  });
  if (!manager) return 0;

  let alertsSent = 0;
  const dayStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

  for (const plan of activePlans) {
    const pendingStops = plan.stops.filter((s) => s.status === 'PENDING');
    if (!pendingStops.length) continue; // all visited, no deviation

    const visitedCount = plan.stops.filter((s) => s.status === 'VISITED').length;
    const totalCount = plan.stops.length;
    const missedNames = pendingStops.map((s) => `${s.clientName} (${s.location})`).join(', ');

    // Mark pending stops as MISSED
    await prisma.plannedStop.updateMany({
      where: { id: { in: pendingStops.map((s) => s.id) } },
      data: { status: 'MISSED' },
    });

    try {
      await send(manager.phone, 'route_alert', [
        plan.salesman.name,
        `${visitedCount} of ${totalCount}`,
        dayStr,
        missedNames.slice(0, 150),
      ]);
      alertsSent++;
    } catch (e) {
      console.error(`Route alert failed for salesman ${plan.salesman.name}:`, (e as Error).message);
    }
  }

  return alertsSent;
}

