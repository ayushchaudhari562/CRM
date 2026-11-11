// Location tracking: only while on duty (punched in). Used by salesman (send) and admin (view) routes.
import { prisma } from './db';
import { DAY_MS, istDay, istToday } from './dto';
import type { DayRoute, LocationPingsInput, SalesmanLocation } from '../../src/types';

const MIN_GAP_MS = 60_000; // at most one point per minute is kept

/** Keeps only points inside one of my shifts (last 24h) and >= 1 min apart. Returns how many were stored. */
export async function savePings(salesmanId: string, pings: LocationPingsInput['pings']): Promise<number> {
  const now = Date.now();
  const [shifts, last] = await Promise.all([
    prisma.attendance.findMany({ where: { salesmanId, punchInAt: { gte: new Date(now - DAY_MS) } }, select: { punchInAt: true, punchOutAt: true } }),
    prisma.locationPing.findFirst({ where: { salesmanId }, orderBy: { recordedAt: 'desc' }, select: { recordedAt: true } }),
  ]);
  if (!shifts.length) return 0; // not on duty: we don't track people off duty

  const onDuty = (t: number) => shifts.some((s) => s.punchInAt.getTime() <= t && t <= (s.punchOutAt?.getTime() ?? now));
  let prev = last?.recordedAt.getTime() ?? 0;
  const keep = pings
    .map((p) => ({ ...p, t: new Date(p.recordedAt).getTime() }))
    .filter((p) => p.t <= now + 60_000 && onDuty(Math.min(p.t, now)))
    .sort((a, b) => a.t - b.t)
    .filter((p) => (p.t - prev >= MIN_GAP_MS ? ((prev = p.t), true) : false));
  if (!keep.length) return 0;

  const { count } = await prisma.locationPing.createMany({
    data: keep.map((p) => ({ salesmanId, latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy, recordedAt: new Date(Math.min(p.t, now)) })),
  });
  return count;
}

/** Last point today for every active salesman: one query (DISTINCT ON uses the salesmanId+recordedAt index). */
export async function latestLocations(): Promise<SalesmanLocation[]> {
  const { start } = istToday();
  const rows = await prisma.$queryRaw<{ salesmanId: string; name: string; latitude: number; longitude: number; accuracy: number | null; recordedAt: Date }[]>`
    SELECT DISTINCT ON (p."salesmanId") p."salesmanId", u.name, p.latitude, p.longitude, p.accuracy, p."recordedAt"
    FROM "LocationPing" p JOIN "User" u ON u.id = p."salesmanId"
    WHERE p."recordedAt" >= ${start} AND u."isActive" AND u.role = 'SALESMAN'
    ORDER BY p."salesmanId", p."recordedAt" DESC`;
  return rows.map((r) => ({
    salesmanId: r.salesmanId,
    salesmanName: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    accuracy: r.accuracy,
    recordedAt: r.recordedAt.toISOString(),
  }));
}

const point = (lat: number | null, lng: number | null) => (lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null);

/** One salesman's day: shifts, GPS trail and visits. */
export async function dayRoute(salesmanId: string, day: string): Promise<DayRoute> {
  const { start, end } = istDay(day);
  const range = { gte: start, lt: end };
  const [shifts, points, visits] = await Promise.all([
    prisma.attendance.findMany({ where: { salesmanId, punchInAt: range }, orderBy: { punchInAt: 'asc' } }),
    prisma.locationPing.findMany({
      where: { salesmanId, recordedAt: range },
      orderBy: { recordedAt: 'asc' },
      select: { latitude: true, longitude: true, recordedAt: true },
      take: 1500, // a full day at 1/min
    }),
    prisma.meeting.findMany({
      where: { salesmanId, checkInAt: range, checkInLat: { not: null }, checkInLng: { not: null } },
      orderBy: { checkInAt: 'asc' },
      select: { id: true, checkInAt: true, checkInLat: true, checkInLng: true, client: { select: { name: true } } },
    }),
  ]);
  return {
    salesmanId,
    date: day,
    shifts: shifts.map((s) => ({
      punchInAt: s.punchInAt.toISOString(),
      punchOutAt: s.punchOutAt?.toISOString() ?? null,
      punchIn: point(s.punchInLat, s.punchInLng),
      punchOut: point(s.punchOutLat, s.punchOutLng),
    })),
    points: points.map((p) => ({ latitude: p.latitude, longitude: p.longitude, recordedAt: p.recordedAt.toISOString() })),
    visits: visits.map((v) => ({ meetingId: v.id, clientName: v.client.name, latitude: v.checkInLat!, longitude: v.checkInLng!, checkInAt: v.checkInAt.toISOString() })),
  };
}
