// Follow-ups + targets logic shared by the salesman and admin routes.
import { prisma } from './db';
import type { Prisma } from './generated/prisma/client';
import { DAY_MS, istDay, istToday } from './dto';
import type { FollowUpScope, SalesmanTargetProgress, TargetProgress } from '../../src/types';

/** Where + order for a follow-up list. The 4 scopes never overlap. */
export function followUpQuery(scope: FollowUpScope, now = new Date()) {
  const { end } = istToday(now);
  const q: Record<FollowUpScope, { where: Prisma.FollowUpWhereInput; orderBy: Prisma.FollowUpOrderByWithRelationInput }> = {
    overdue: { where: { status: 'PENDING', dueAt: { lt: now } }, orderBy: { dueAt: 'asc' } },
    today: { where: { status: 'PENDING', dueAt: { gte: now, lt: end } }, orderBy: { dueAt: 'asc' } },
    upcoming: { where: { status: 'PENDING', dueAt: { gte: end } }, orderBy: { dueAt: 'asc' } },
    done: { where: { status: { in: ['DONE', 'CANCELLED'] } }, orderBy: { updatedAt: 'desc' } },
  };
  return q[scope];
}

/** Target vs. achieved for one salesman, for the last `days` India days (oldest first). */
export async function salesmanTargets(salesmanId: string, days: number): Promise<TargetProgress[]> {
  const today = istToday();
  const first = istDay(new Date(today.date.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10));
  const [targets, done] = await Promise.all([
    prisma.target.findMany({ where: { salesmanId, date: { gte: first.date, lte: today.date } } }),
    // Grouped by India day inside Postgres: one row per day, not one per meeting.
    prisma.$queryRaw<{ day: string; visits: number; deal: number }[]>`
      SELECT to_char("checkInAt" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
             count(*)::int AS visits,
             coalesce(sum("dealValue") FILTER (WHERE outcome = 'CLOSED'), 0)::float8 AS deal
      FROM "Meeting"
      WHERE "salesmanId" = ${salesmanId} AND "checkInAt" >= ${first.start} AND "checkInAt" < ${today.end}
      GROUP BY 1`,
  ]);
  const doneByDay = new Map(done.map((d) => [d.day, d]));
  const targetByDay = new Map(targets.map((t) => [t.date.toISOString().slice(0, 10), t]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(first.date.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    const t = targetByDay.get(day);
    const d = doneByDay.get(day);
    return {
      date: day,
      visitsTarget: t?.visitsTarget ?? 0,
      visitsDone: d?.visits ?? 0,
      dealValueTarget: t?.dealValueTarget == null ? null : Number(t.dealValueTarget),
      dealValue: d?.deal ?? 0,
    };
  });
}

/** Target vs. achieved for every active salesman on one India day. */
export async function dayTargets(day: string): Promise<SalesmanTargetProgress[]> {
  const { start, end, date } = istDay(day);
  const [salesmen, targets, done] = await Promise.all([
    prisma.user.findMany({ where: { role: 'SALESMAN', isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.target.findMany({ where: { date } }),
    prisma.meeting.groupBy({ by: ['salesmanId', 'outcome'], where: { checkInAt: { gte: start, lt: end } }, _count: true, _sum: { dealValue: true } }),
  ]);
  const targetBy = new Map(targets.map((t) => [t.salesmanId, t]));
  return salesmen.map((s) => {
    const t = targetBy.get(s.id);
    const mine = done.filter((g) => g.salesmanId === s.id);
    return {
      salesmanId: s.id,
      salesmanName: s.name,
      date: day,
      visitsTarget: t?.visitsTarget ?? 0,
      visitsDone: mine.reduce((sum, g) => sum + g._count, 0),
      dealValueTarget: t?.dealValueTarget == null ? null : Number(t.dealValueTarget),
      dealValue: Number(mine.find((g) => g.outcome === 'CLOSED')?._sum.dealValue ?? 0),
    };
  });
}
