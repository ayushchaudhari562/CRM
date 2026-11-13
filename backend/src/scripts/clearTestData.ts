// One-time cleanup: removes the seeded FAKE users (phones +9190000xxxxx) and everything that belongs to them
// (visits, clients, follow-ups, attendance, locations, targets, sessions). Real users are never touched.
// Safe by default: it only prints what it WOULD remove. Add --yes to really delete.
// It refuses to run unless a real manager (not a +9190000xxxxx number) exists, so nobody gets locked out.
// Run:  npm run db:clear-test-data            (preview)
//       npm run db:clear-test-data -- --yes   (delete)
import { prisma } from '../db';

const FAKE_PHONE = /^\+9190000\d{5}$/;

export interface Counts {
  users: number;
  visits: number;
  clients: number;
  followUps: number;
  attendance: number;
  locations: number;
  targets: number;
  sessions: number;
}

export async function clearTestData({ yes = false } = {}): Promise<{ counts: Counts; deleted: boolean }> {
  const all = await prisma.user.findMany({ select: { id: true, phone: true, role: true } });
  const fake = all.filter((u) => FAKE_PHONE.test(u.phone));
  const realAdmins = all.filter((u) => u.role === 'ADMIN' && !FAKE_PHONE.test(u.phone));
  if (!realAdmins.length) {
    throw new Error('No real manager exists yet. Set ADMIN_PHONES on the server first (otherwise nobody could log in as manager).');
  }
  const ids = fake.map((u) => u.id);
  const phones = fake.map((u) => u.phone);
  const bySalesman = { salesmanId: { in: ids } };
  const [visits, clients, followUps, attendance, locations, targets, sessions] = await Promise.all([
    prisma.meeting.count({ where: bySalesman }),
    prisma.client.count({ where: bySalesman }),
    prisma.followUp.count({ where: bySalesman }),
    prisma.attendance.count({ where: bySalesman }),
    prisma.locationPing.count({ where: bySalesman }),
    prisma.target.count({ where: bySalesman }),
    prisma.session.count({ where: { userId: { in: ids } } }),
  ]);
  const counts = { users: ids.length, visits, clients, followUps, attendance, locations, targets, sessions };
  if (!yes || !ids.length) return { counts, deleted: false };

  // Children first (the database refuses to remove a user that still has rows).
  await prisma.$transaction([
    prisma.followUp.deleteMany({ where: bySalesman }),
    prisma.meeting.deleteMany({ where: bySalesman }), // attachments and product links go with their visit
    prisma.client.deleteMany({ where: bySalesman }),
    prisma.attendance.deleteMany({ where: bySalesman }),
    prisma.locationPing.deleteMany({ where: bySalesman }),
    prisma.target.deleteMany({ where: bySalesman }),
    prisma.session.deleteMany({ where: { userId: { in: ids } } }),
    prisma.otpCode.deleteMany({ where: { phone: { in: phones } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return { counts, deleted: true };
}

// Only when run directly (not when imported by a test).
if (/clearTestData\.(ts|js)$/.test(process.argv[1] ?? '')) {
  const yes = process.argv.includes('--yes');
  clearTestData({ yes })
    .then(({ counts, deleted }) => {
      console.log(deleted ? 'REMOVED:' : 'Would remove (preview only, add --yes to delete):', counts);
      return prisma.$disconnect();
    })
    .catch((e: Error) => {
      console.error(e.message);
      process.exit(1);
    });
}
